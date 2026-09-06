#!/usr/bin/env node
/**
 * Импорт FEEDS_JSON из .env в таблицу feed_links через Admin API.
 * Usage: node deploy/yugaktsent/scripts/seed-feed-links-from-env.mjs [/path/to/.env]
 */
import { readFileSync } from "node:fs";

const envPath = process.argv[2] || "/var/www/yugaktsent-lg/.env";
const envText = readFileSync(envPath, "utf8");
const match = envText.match(/^FEEDS_JSON='(.*)'$/m);
if (!match) {
  console.error("FEEDS_JSON not found in", envPath);
  process.exit(1);
}

const feeds = JSON.parse(match[1]);
const base = (process.env.LG_API_BASE || "http://127.0.0.1:3025/api/v1").replace(/\/$/, "");
const email = process.env.LG_ADMIN_EMAIL || "admin@livegrid.ru";
const password = process.env.LG_ADMIN_PASSWORD || "admin123!";
const regionCode = process.env.YUGAKTSENT_REGION_CODE || "anapa";

async function login() {
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login HTTP ${res.status}`);
  const data = await res.json();
  return data.accessToken;
}

async function api(token, path, { method = "GET", body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path}: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const token = await login();
const regions = await api(token, "/admin/regions");
const region = (Array.isArray(regions) ? regions : []).find((r) => r.code === regionCode);
if (!region) throw new Error(`Region ${regionCode} not found`);

const existing = await api(token, "/admin/feed-links");
const existingUrls = new Set((existing || []).map((f) => f.feedUrl));

let created = 0;
for (const feed of feeds) {
  const feedUrl = feed.feed_url || feed.feedUrl;
  if (!feedUrl || existingUrls.has(feedUrl)) continue;
  await api(token, "/admin/feed-links", {
    method: "POST",
    body: {
      regionId: region.id,
      name: feed.name,
      feedUrl,
      blockName: feed.block_name || feed.blockName || feed.name,
      provider: "profitbase",
      isEnabled: true,
    },
  });
  existingUrls.add(feedUrl);
  created += 1;
  console.log(`+ ${feed.name}`);
}

console.log(`Done: ${created} feed(s) created`);
