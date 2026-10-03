import { globSync } from "node:fs"
import { parse } from "node:path"
import { fork } from "node:child_process"

const isDaemon = parse(process.argv[1]).name === "daemonMode";

// Setup file path arguments
const {
  grayedOutText, globs,
  manualMidi, manualSoundfont,
  generalCliArguments, perSongCliArguments,
  addOptionalArgumentsToStdout
} = await import("./utils.mjs");

if (process.argv.includes("-h")) {
  console.log(
    addOptionalArgumentsToStdout
      .toString()
      .replace(/.*includes\((".*")\)\).*/g, "  $1"),
    "\n-e, -rvb, -ps"
  )
  process.exit(1)
}

process.on("SIGINT", () => {
  process.exitCode = 130;
  realTest?.kill()
  if (!isDaemon) console.log(grayedOutText, " Closed tester with Ctrl+c")
})
// Other arguments and run it
const args = [
  "--enable-spessasynth-warn-logging",
  "-i:2", manualMidi,      // Manually adding files
  "-i:2", manualSoundfont,
  ...globs.midis,         // Automatically adding files
  ...globs.soundfonts,
  ...(process.argv.includes("-ps") ? perSongCliArguments : [])
];
if (!isDaemon) args.push(...generalCliArguments("stdout"), "-")
          else args.push("--daemon")
addOptionalArgumentsToStdout(args)

// Start the test for real
const parsedScriptPath = parse(process.argv[1]);
const MAIN_PATH = (
  globSync(`${parsedScriptPath.dir}/../**/*.mjs`)
    .find(i => i.includes("main.mjs"))
);
const realTest = fork(MAIN_PATH, args);
const realTestPromise = new Promise((resolve, reject) => {
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
if (!isDaemon) await realTestPromise;

