import "dotenv/config";
import cron from "node-cron";
import { runSync } from "./syncFeed.js";

const args = process.argv.slice(2);

async function waitForApi(maxAttempts = 30) {
  const base = process.env.LG_API_BASE || "http://127.0.0.1:3025/api/v1";
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${base.replace(/\/api\/v1$/, "")}/api/v1/health`);
      if (res.ok) return;
    } catch {
      /* API still starting */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("API сайта не отвечает");
}

async function runOnce() {
  console.log(`[profitbase-sync] run started @ ${new Date().toISOString()}`);
  try {
    await waitForApi();
    await runSync();
  } catch (err) {
    console.error("[profitbase-sync] fatal:", err.message);
    throw err;
  }
}

if (args.includes("--watch-cron")) {
  const schedule = process.env.CRON_SCHEDULE || "0 */6 * * *";
  console.log(`[profitbase-sync] cron "${schedule}"`);
  cron.schedule(schedule, () => {
    runOnce().catch((err) => console.error("[profitbase-sync] unhandled:", err));
  });
  runOnce().catch((err) => console.error("[profitbase-sync] unhandled:", err));
} else {
  runOnce()
    .catch((err) => {
      console.error("[profitbase-sync] unhandled:", err);
      process.exitCode = 1;
    });
}
