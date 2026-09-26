/**
 * Backfill block render images + apartment planUrl from Profitbase feeds.
 * Run on server: cd /var/www/yugaktsent-lg && source .env && node deploy/yugaktsent/scripts/backfill-media.mjs
 */
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { File } from "node:buffer";
import { fetchProfitbaseFeed } from "../profitbase-sync/src/profitbaseFeed.js";
import { LiveGridClient } from "../profitbase-sync/src/livegridClient.js";

/** Учётка админа берётся только из окружения: значений по умолчанию быть не должно. */
function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Не задана переменная окружения ${name} — укажите её в .env на сервере`);
    process.exit(1);
  }
  return v;
}


const execFileAsync = promisify(execFile);

async function psql(sql) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const { stdout } = await execFileAsync("psql", [url, "-tAc", sql], {
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

async function login() {
  const base = process.env.LG_API_BASE || "http://127.0.0.1:3025/api/v1";
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: requireEnv("LG_ADMIN_EMAIL"),
      password: requireEnv("LG_ADMIN_PASSWORD"),
    }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  const { accessToken } = await res.json();
  return { base, token: accessToken };
}

async function uploadRemote(api, token, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType =
    res.headers.get("content-type")?.split(";")[0]?.trim() ||
    (url.match(/\.png(\?|$)/i) ? "image/png" : "image/jpeg");
  const ext = contentType.includes("png") ? "png" : "jpg";
  const form = new FormData();
  form.append("file", new File([buf], `pb-${Date.now()}.${ext}`, { type: contentType }));
  const up = await fetch(`${api}/admin/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!up.ok) throw new Error(`upload: ${up.status} ${(await up.text()).slice(0, 120)}`);
  const data = await up.json();
  return data.url || data.publicUrl;
}

function planImage(offer) {
  return offer.images?.find((i) => i.type === "plan")?.url || offer.images?.[0]?.url || null;
}

function houseImage(offers) {
  for (const o of offers) {
    const h = o.images?.find((i) => i.type === "house");
    if (h?.url) return h.url;
  }
  return offers[0]?.images?.[0]?.url || null;
}

async function main() {
  const { base, token } = await login();
  const lg = new LiveGridClient(base, requireEnv("LG_ADMIN_EMAIL"), requireEnv("LG_ADMIN_PASSWORD"));
  await lg.login();
  let feeds = [];
  try {
    feeds = (await lg.loadFeedLinks()).map((row) => ({
      name: row.name,
      feed_url: row.feedUrl,
      block_name: row.blockName || row.name,
    }));
  } catch {
    feeds = JSON.parse(process.env.FEEDS_JSON || "[]");
  }

  const statePath =
    process.env.STATE_FILE ||
    "/var/www/yugaktsent-lg/deploy/yugaktsent/profitbase-sync/state.json";
  const state = JSON.parse(await readFile(statePath, "utf8").catch(() => "{}"));
  if (!state.feeds) state.feeds = {};

  let blockImages = 0;
  let planUpdates = 0;

  for (const feed of feeds) {
    const key = feed.name || feed.block_name;
    const offers = await fetchProfitbaseFeed(feed.feed_url);
    console.log(`[backfill] ${key}: ${offers.length} offers`);

    const blockName = feed.block_name || feed.name;
    const blockIdRaw = await psql(
      `SELECT b.id FROM blocks b JOIN feed_regions r ON r.id = b.region_id WHERE r.code = 'anapa' AND b.name = '${blockName.replace(/'/g, "''")}' LIMIT 1`,
    );
    const blockId = Number.parseInt(blockIdRaw, 10);
    if (!Number.isFinite(blockId)) {
      console.warn(`[backfill] block not found: ${blockName}`);
      continue;
    }

    const imgCount = await psql(
      `SELECT count(*)::text FROM block_images WHERE block_id = ${blockId}`,
    );
    if (imgCount === "0") {
      const remote = houseImage(offers);
      if (remote) {
        try {
          const url = await uploadRemote(base, token, remote);
          await psql(
            `INSERT INTO block_images (block_id, url, kind, sort_order) VALUES (${blockId}, '${url.replace(/'/g, "''")}', 'RENDER', 0)`,
          );
          blockImages += 1;
          console.log(`[backfill] block image ${blockName} → ${url}`);
        } catch (err) {
          console.warn(`[backfill] block image failed ${blockName}: ${err.message}`);
        }
      }
    }

    const bucket = state.feeds[key] || {};
    for (const offer of offers) {
      const rec = bucket[offer.externalId];
      if (!rec?.listingId) continue;
      const hasPlan = await psql(
        `SELECT CASE WHEN coalesce(plan_url, '') <> '' THEN '1' ELSE '0' END FROM listing_apartments WHERE listing_id = ${rec.listingId}`,
      );
      if (hasPlan === "1") continue;
      const remote = planImage(offer);
      if (!remote) continue;
      try {
        const url = await uploadRemote(base, token, remote);
        await psql(
          `UPDATE listing_apartments SET plan_url = '${url.replace(/'/g, "''")}' WHERE listing_id = ${rec.listingId}`,
        );
        planUpdates += 1;
        if (planUpdates % 50 === 0) console.log(`[backfill] plans updated: ${planUpdates}`);
      } catch (err) {
        if (planUpdates < 5) console.warn(`[backfill] plan ${offer.externalId}: ${err.message}`);
      }
    }
  }

  console.log(`[backfill] done blockImages=${blockImages} planUpdates=${planUpdates}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
