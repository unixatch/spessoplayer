import { globSync } from "node:fs"
import { parse } from "node:path"

// Setup file path arguments
const {
  globs,
  manualMidi, manualSoundfont,
  generalCliArguments, perSongCliArguments,
  addOptionalCliArguments
} = await import("./utils.mjs");

// Shows the test's options
if (process.argv.includes("-h")) {
  console.log(
    addOptionalCliArguments
      .toString()
      .replace(/.*includes\((".*")\)\).*/g, "  $1")
      .replace(/.*\/\/.*\n/g, ""),
    "\n-e, -rvb"
  )
  process.exit(1)
}

// Main thread/process
const indexOfParameter = "2";
if (!process.argv.includes("--verbose")) {
  const args = [
    "-i2", manualMidi,        // Manually adding files
    "-i2", manualSoundfont,
    ...globs.midis,           // Automatically adding files
    ...globs.soundfonts,
    ...generalCliArguments(),
    ...perSongCliArguments,
    "--enable-spessasynth-warn-logging"
  ];
  addOptionalCliArguments(args)

  // Manually setting options at indexes
  const positionalArgs = [];
  for (let i = args.indexOf("--verbose")+1; i < args.length; i++) {
    if (args[i] === "-lf"
        || args[i] === "--enable-spessasynth-warn-logging") continue;
    if (args[i].startsWith("-")) {
      positionalArgs.push(args[i]+indexOfParameter)
      continue;
    }
    positionalArgs.push(args[i])
  }
  // Start the test for real
  const { fork } = await import("node:child_process");
  const realTest = fork(process.argv[1], args.concat(positionalArgs));
  await new Promise((resolve, reject) => {
    realTest.once("exit", resolve)
    realTest.once("error", reject)
  })
    .then(process.exit)
    .catch(error => {
      console.error(error)
      process.exit(error.errno)
    })
}

// Forked process
const parsedScriptPath = parse(process.argv[1]);
const CLI_PATH = (
  globSync(`${parsedScriptPath.dir}/../**/*.mjs`)
    .find(i => i.includes("cli.mjs"))
);
const {
  manageVerboseOptions,
  actUpOnPassedArgs, Options
} = await import(CLI_PATH);

const {
  env: { DEBUG_LEVEL_SPESSO, DEBUG_FILE_SPESSO }
} = process;
const debugLevelSpessoMsg = `Using variable DEBUG_LEVEL_SPESSO=${DEBUG_LEVEL_SPESSO}`,
      debugFileSpessoMsg  = `Using variable DEBUG_FILE_SPESSO=${DEBUG_FILE_SPESSO}`;
if (DEBUG_LEVEL_SPESSO && DEBUG_FILE_SPESSO) {
  const UTILS_PATH = (
    globSync(`${parsedScriptPath.dir}/../**/*.mjs`)
      .find(i => i.includes("utils/utils.mjs"))
  );
  const { INFO_LVL, log } = await import(UTILS_PATH);

  log(INFO_LVL, debugLevelSpessoMsg)
  log(INFO_LVL, debugFileSpessoMsg)
} else {
  await manageVerboseOptions({
    DEBUG_LEVEL_SPESSO,  DEBUG_FILE_SPESSO,
    debugLevelSpessoMsg, debugFileSpessoMsg
  })
}

await actUpOnPassedArgs(process.argv)
console.log(
  "Argv files:",
  process.argv.slice(2, process.argv.lastIndexOf("-f"))
)
console.log(
  "other args:",
  process.argv.slice(process.argv.lastIndexOf("-f"))
)
console.log("Options.all:", Options.all)

