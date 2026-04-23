import { globSync } from "fs"
import { parse, join } from "path"

const indexOfParameter = "2";
// Main thread/process
if (!process.argv.includes("--verbose")
    && !process.argv.includes("-h")) {
  const {
    globs,
    manualMidi, manualSoundfont,
    generalCliArguments, perSongCliArguments,
    addOptionalCliArguments
  } = await import("./utils.mjs")

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
      console.error(error);
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
  actUpOnPassedArgs, Options
} = await import(CLI_PATH);

await actUpOnPassedArgs(process.argv)
console.log(Options.all)
console.log(
  "files:",
  process.argv
    .slice(2, process.argv.lastIndexOf("-i"+indexOfParameter)+2)
)
console.log(
  "other args:",
  process.argv
    .slice(process.argv.lastIndexOf("-i"+indexOfParameter)+2)
)

