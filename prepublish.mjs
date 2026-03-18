import { spawnSync } from "child_process"

const result = spawnSync("git", [
  "status", "--porcelain"
]);

if (result.stdout.length) {
  console.error("\x1b[33mStash or commit/push your local changes first\x1b[0m")
  process.exit(1)
}
