import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const suites = [
  "security.test.mjs",
  "stage1-core.test.mjs",
  "stage2-aquarium.test.mjs",
  "stage3-sport.test.mjs"
];

for (const file of suites) {
  const res = spawnSync(process.execPath, [path.join(testDir, file)], { stdio: "inherit" });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}
console.log(`ALL ${suites.length} WEB & SECURITY SUITES PASSED`);
