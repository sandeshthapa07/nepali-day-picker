// Runs the test suite once per time zone. Node reads TZ at startup, so each run is a new process.
import { spawnSync } from "node:child_process";

const ZONES = [
  "Asia/Kathmandu", // UTC+5:45, and +5:30 before 1986
  "America/Los_Angeles", // DST
  "Europe/London", // DST
  "Pacific/Kiritimati", // UTC+14; skipped 31 December 1994
  "Pacific/Apia", // skipped 30 December 2011
  "Pacific/Pago_Pago", // UTC-11
  "UTC",
];

let failed = 0;
for (const tz of ZONES) {
  console.log(`\n=== TZ=${tz} ===`);
  const result = spawnSync("npx", ["vitest", "run", ...process.argv.slice(2)], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, TZ: tz, EXPECTED_TZ: tz },
  });
  if (result.status !== 0) {
    failed++;
    console.error(`Tests failed with TZ=${tz}`);
  }
}
process.exit(failed ? 1 : 0);
