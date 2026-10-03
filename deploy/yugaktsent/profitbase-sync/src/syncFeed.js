import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fetchProfitbaseFeed } from "./profitbaseFeed.js";
import { LiveGridClient } from "./livegridClient.js";

async function loadState(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return { feeds: {}, regionId: null };
  }
}

async function saveState(filePath, state) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2));
}

function planImage(offer) {
  const plan = offer.images?.find((i) => i.type === "plan");
  return plan?.url || offer.images?.[0]?.url || null;
}

export async function syncFeed(feedConfig, lg, state, feedKey) {
  const feedUrl = feedConfig.feed_url;
  if (!feedUrl) return { skipped: true, reason: "no feed_url" };

  if (feedConfig.regionId) {
    lg.regionId = feedConfig.regionId;
    lg.blocksByName.clear();
  } else {
    await lg.ensureRegion();
  }

  const blockName =
    feedConfig.block_name ||
    feedConfig.name ||
    feedConfig.development_name ||
    "ЖК";
  const offers = await fetchProfitbaseFeed(feedUrl);
  const block = await lg.ensureBlock(blockName);
  const bucket = state.feeds[feedKey] || (state.feeds[feedKey] = {});

  const skipMedia =
    process.env.FEED_SKIP_MEDIA === "1" || process.env.FEED_SKIP_MEDIA === "true";

  // Корпуса и обложку заводим один раз на фид, до разбора лотов:
  // из корпусов карточка ЖК берёт срок сдачи, из обложки — фото.
  const seenBuildings = new Map();
  for (const offer of offers) {
    if (!offer.buildingName) continue;
    if (!seenBuildings.has(offer.buildingName)) {
      seenBuildings.set(offer.buildingName, offer.completionQuarter ?? null);
    }
  }
  for (const [name, deadline] of seenBuildings) {
    await lg.ensureBuilding(block.id, name, deadline);
  }

  const cover = offers.find((o) => o.buildingImage)?.buildingImage;
  if (cover) await lg.setBlockCover(block.id, cover);

  const result = {
    feed: feedKey,
    block: blockName,
    total: offers.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < offers.length; i++) {
    const offer = offers[i];
    try {
      // Существующее объявление обновляем даже без площади в фиде:
      // цена и статус важнее, а площадь в базе уже есть.
      const isUpdate = Boolean(bucket[offer.externalId]?.listingId);
      const payload = lg.buildApartmentPayload(offer, block.id, isUpdate);
      if (!payload) {
        result.skipped += 1;
        continue;
      }

      if (!skipMedia) {
        const planUrl = planImage(offer);
        if (planUrl) {
          try {
            payload.apartment.planUrl = await lg.uploadRemoteImage(planUrl);
          } catch (err) {
            console.warn(
              `[profitbase-sync] media skip ${offer.externalId}: ${err.message}`,
            );
          }
        }
      }

      const existing = bucket[offer.externalId];
      if (!existing?.listingId) {
        const created = await lg.createListing(payload);
        bucket[offer.externalId] = {
          listingId: created.id,
          price: offer.price,
          status: offer.status,
        };
        result.created += 1;
      } else {
        await lg.updateListing(existing.listingId, {
          price: payload.price,
          status: payload.status,
          isPublished: payload.isPublished,
          apartment: payload.apartment,
        });
        bucket[offer.externalId].price = offer.price;
        bucket[offer.externalId].status = offer.status;
        result.updated += 1;
      }

      if ((i + 1) % 25 === 0) {
        console.log(
          `[profitbase-sync] ${feedKey}: ${i + 1}/${offers.length} created=${result.created} updated=${result.updated}`,
        );
      }
    } catch (err) {
      result.errors.push({ externalId: offer.externalId, error: err.message });
    }
  }

  if (feedConfig.id) {
    try {
      const status =
        result.total === 0
          ? "empty"
          : result.errors?.length
            ? "error"
            : "ok";
      await lg.markFeedSynced(feedConfig.id, {
        status,
        total: result.total,
        created: result.created,
        updated: result.updated,
        errors: result.errors?.length ?? 0,
      });
    } catch (err) {
      console.warn(`[profitbase-sync] mark-synced ${feedConfig.id}: ${err.message}`);
    }
  }

  return result;
}

async function resolveFeeds(lg) {
  try {
    const rows = await lg.loadFeedLinks();
    if (Array.isArray(rows) && rows.length > 0) {
      console.log(`[profitbase-sync] loaded ${rows.length} feed(s) from API`);
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        feed_url: row.feedUrl,
        block_name: row.blockName || row.name,
        regionId: row.regionId,
        region: row.region,
      }));
    }
  } catch (err) {
    console.warn(`[profitbase-sync] feed-links API unavailable: ${err.message}`);
  }

  if (process.env.FEEDS_JSON) {
    console.log("[profitbase-sync] using FEEDS_JSON env fallback");
    return JSON.parse(process.env.FEEDS_JSON);
  }

  return [];
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Не задана переменная окружения ${name} — укажите её в .env на сервере`,
    );
  }
  return v;
}

/**
 * Простая блокировка от параллельных прогонов.
 *
 * Без неё два запуска (служба по cron и ручной) читают одно состояние,
 * оба не находят объявления и создают их заново — так в каталоге появились
 * дубли на 889 лотов. Состояние в файле не спасает: его перезаписывает
 * тот, кто финишировал последним.
 */
async function withLock(stateFile, fn) {
  const { open, unlink, readFile } = await import("node:fs/promises");
  const lockPath = `${stateFile}.lock`;
  const STALE_MS = 30 * 60 * 1000;

  let handle;
  try {
    handle = await open(lockPath, "wx");
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
    // Замок мог остаться от упавшего прогона: считаем его протухшим,
    // если процесса уже нет или он держится дольше получаса.
    let stale = true;
    try {
      const raw = await readFile(lockPath, "utf8");
      const { pid, startedAt } = JSON.parse(raw);
      const tooOld = Date.now() - Number(startedAt || 0) > STALE_MS;
      let alive = false;
      if (pid) {
        try {
          process.kill(Number(pid), 0);
          alive = true;
        } catch {
          alive = false;
        }
      }
      stale = tooOld || !alive;
    } catch {
      stale = true;
    }
    if (!stale) {
      console.log("[profitbase-sync] другой прогон уже идёт — пропускаем");
      return;
    }
    console.warn("[profitbase-sync] снимаю протухший замок");
    await unlink(lockPath).catch(() => {});
    handle = await open(lockPath, "wx");
  }

  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: Date.now() }));
    await handle.close();
    return await fn();
  } finally {
    await unlink(lockPath).catch(() => {});
  }
}

export async function runSync(opts = {}) {
  const stateFile = process.env.STATE_FILE || "./state.json";
  return withLock(stateFile, () => runSyncUnlocked(opts));
}

async function runSyncUnlocked({ persist } = {}) {
  const base = process.env.LG_API_BASE || "http://127.0.0.1:3025/api/v1";
  // Учётка только из окружения: значений по умолчанию быть не должно.
  const email = requireEnv("LG_ADMIN_EMAIL");
  const password = requireEnv("LG_ADMIN_PASSWORD");
  const stateFile = process.env.STATE_FILE || "./state.json";

  const lg = new LiveGridClient(base, email, password);
  await lg.login();
  // Справочник типов комнат нужен до разбора лотов: без него комнатность
  // некуда записать, и прайс по типам квартир в карточке остаётся пустым.
  await lg.ensureRoomTypes();

  const feeds = await resolveFeeds(lg);
  if (!Array.isArray(feeds) || feeds.length === 0) {
    console.log("[profitbase-sync] no feeds configured — nothing to sync");
    return;
  }

  const region = await lg.ensureRegion();

  const state = await loadState(stateFile);
  state.regionId = region.id;
  if (!state.feeds) state.feeds = {};

  console.log(
    `[profitbase-sync] region=${region.code} (${region.id}), feeds=${feeds.length}`,
  );

  for (let idx = 0; idx < feeds.length; idx++) {
    const feed = feeds[idx];
    const key = feed.id || feed.name || `feed-${idx}`;
    console.log(`[profitbase-sync] syncing "${key}"…`);
    const result = await syncFeed(feed, lg, state, key);
    console.log(`[profitbase-sync]   → ${JSON.stringify({ ...result, errors: result.errors?.slice(0, 3) })}`);
    if (persist) await persist(state);
    else await saveState(stateFile, state);
  }

  await saveState(stateFile, state);

  try {
    await lg.refreshCatalogCache();
    console.log("[profitbase-sync] catalog cache refreshed");
  } catch (err) {
    console.warn(`[profitbase-sync] refresh-cache failed: ${err.message}`);
  }

  console.log(`[profitbase-sync] done @ ${new Date().toISOString()}`);
}
