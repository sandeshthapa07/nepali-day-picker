// Runs the calendar tests against the oldest and newest supported react-day-picker versions.
// They are installed as dev dependencies under aliases; vitest.config.ts maps RDP to them.
import { spawnSync } from "node:child_process";

const FILES = ["test/date-lib.test.ts", "test/react.test.tsx", "test/shadcn.test.tsx"];
let failed = 0;
for (const version of ["9.7", "10"]) {
  console.log(`
=== react-day-picker ${version} ===`);
  const result = spawnSync("npx", ["vitest", "run", ...FILES], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, RDP: version },
  });
  if (result.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
