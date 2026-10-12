import { spawnSync } from "node:child_process"
import "./utils/colors.mts"

const result = spawnSync("git", [
  "status", "--porcelain"
]);

if (result.stdout.length) {
  console.error(
    normalYellow+"%s"+normal,
    "Stash or commit/push your local changes first"
  )
  process.exit(1)
}

