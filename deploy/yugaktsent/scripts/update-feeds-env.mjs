#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const envPath = process.argv[2] || "/var/www/yugaktsent-lg/.env";

const newFeed = {
  name: "Хозяин Морей",
  feed_url:
    "https://pb16100.tochno.profitbase.ru/export/profitbase_xml/b0e4c95d324cf97e540324cec236aea0?scheme=https",
  block_name: "ЖК Хозяин Морей",
};

let env = readFileSync(envPath, "utf8");
const match = env.match(/^FEEDS_JSON='(.*)'$/m);
if (!match) throw new Error(`FEEDS_JSON not found in ${envPath}`);

const feeds = JSON.parse(match[1]);
const exists = feeds.some((f) => f.feed_url === newFeed.feed_url);
if (!exists) feeds.push(newFeed);

env = env.replace(/^FEEDS_JSON=.*$/m, `FEEDS_JSON='${JSON.stringify(feeds)}'`);
writeFileSync(envPath, env);
console.log(`Updated ${envPath}: ${feeds.length} feeds${exists ? " (already had this feed)" : ""}`);
