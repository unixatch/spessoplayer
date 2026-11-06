import { spawnSync } from "node:child_process"
import "./utils/colors.mts"

const result = spawnSync("git", [
  "diff", "--quiet", // "--exit-code" implied
  "HEAD"
]);

// (false) 0 is clean,
// (true)  1 means there are changes
if (result.status) {
  console.error(
    normalYellow+"%s"+normal,
    "Stash or commit/push your local changes first"
  )
  process.exit(1)
}

