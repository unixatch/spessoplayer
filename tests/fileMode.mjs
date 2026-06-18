import { globSync } from "node:fs"
import { parse } from "node:path"
import { fork } from "node:child_process"

// Setup file path arguments
const {
  grayedOutText, globs,
  manualMidi, manualSoundfont,
  generalCliArguments, perSongCliArguments,
  addOptionalArgumentsToFile
} = await import("./utils.mjs");

if (process.argv.includes("-h")) {
  console.log(
    addOptionalArgumentsToFile
      .toString()
      .replace(/.*includes\((".*")\)\).*/g, "  $1"),
    "\n-e, -rvb"
  )
  process.exit(1)
}

process.on("SIGINT", () => {
  process.exitCode = 130;
  realTest?.kill()
  console.log(grayedOutText, " Closed tester with Ctrl+c")
})
// Other arguments and run it
const args = [
  "--enable-spessasynth-warn-logging",
  "-i2", manualMidi,      // Manually adding files
  "-i2", manualSoundfont,
  ...globs.midis,         // Automatically adding files
  ...globs.soundfonts,
  ...generalCliArguments("toFile"),
  ...(process.argv.includes("-ps") ? perSongCliArguments : []),
  "out.wav"
];
addOptionalArgumentsToFile(args)

// Start the test for real
const parsedScriptPath = parse(process.argv[1]);
const MAIN_PATH = (
  globSync(`${parsedScriptPath.dir}/../**/*.mjs`)
    .find(i => i.includes("main.mjs"))
);
const realTest = fork(MAIN_PATH, args);
await new Promise((resolve, reject) => {
  realTest.once("exit", resolve)
  realTest.once("error", reject)
})
  .then(exitCode => {
    if (process.exitCode === 130) return process.exit();
    process.exit(exitCode)
  })
  .catch(error => {
    console.error(error)
    process.exit(error.errno)
  })

