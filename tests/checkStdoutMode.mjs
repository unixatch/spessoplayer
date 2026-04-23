import { globSync } from "fs"
import { parse, join } from "path"
import { fork } from "child_process"
import "../utils/colors.mjs"

process.on("SIGINT", () => {
  realTest?.kill()
  console.log(gray+"Closed tester with Ctrl+c"+normal)
  process.exit(130)
})

// Setup file path arguments
const {
  globs,
  manualMidi, manualSoundfont,
  generalCliArguments, perSongCliArguments,
  addOptionalArgumentsToStdout
} = await import("./utils.mjs")

if (process.argv.includes("-h")) {
  console.log(
    addOptionalArgumentsToStdout
      .toString()
      .replace(/.*includes\((".*")\)\).*/g, "  $1")
  )
  process.exit()
}

// Other arguments and run it
const args = [
  ...globs.midis,         // Automatically adding files
  ...globs.soundfonts,
  "-i2", manualMidi,      // Manually adding files
  "-i2", manualSoundfont,
  ...generalCliArguments("stdout"),
  ...(process.argv.includes("-ps") ? perSongCliArguments : []),
  "-"
];
addOptionalArgumentsToStdout(args)

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
  .then(process.exit)
  .catch(error => {
    console.error(error);
    process.exit(error.errno)
  })

