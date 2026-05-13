import { globSync } from "fs"
import { parse } from "path"

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
      .replace(/.*\/\/.*\n/g, "")
  )
  process.exit(1)
}

// Main thread/process
const indexOfParameter = "2";
if (!process.argv.includes("--verbose")) {
  const args = [
    ...globs.midis,           // Automatically adding files
    ...globs.soundfonts,
    "-i2", manualMidi,        // Manually adding files
    "-i2", manualSoundfont,
    ...generalCliArguments(),
    ...perSongCliArguments
  ];
  addOptionalCliArguments(args)

  // Manually setting options at indexes
  const positionalArgs = [];
  for (let i = args.indexOf("--verbose")+1; i < args.length; i++) {
    if (args[i].includes("-lf")) continue;
    if (args[i].includes("-")) {
      positionalArgs.push(args[i]+indexOfParameter)
      continue;
    }
    positionalArgs.push(args[i])
  }
  // Start the test for real
  const { fork } = await import("child_process");
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
  log(INFO_LVL, debugLevelSpessoMsg)
  log(INFO_LVL, debugFileSpessoMsg)
  isVerboseLevelSet = true;
} else {
  await manageVerboseOptions({
    DEBUG_LEVEL_SPESSO,  DEBUG_FILE_SPESSO,
    debugLevelSpessoMsg, debugFileSpessoMsg
  })
}

await actUpOnPassedArgs(process.argv)
console.log(Options.all)
console.log(
  "Argv files:",
  process.argv
    .slice(2, process.argv.lastIndexOf("-i"+indexOfParameter)+2)
)
console.log(
  "other args:",
  process.argv
    .slice(process.argv.lastIndexOf("-i"+indexOfParameter)+2)
)

