import { globSync } from "fs"
import { parse, join } from "path"

const indexOfParameter = "2";
// Main thread/process
if (!process.argv.includes("--verbose")
    && !process.argv.includes("-h")) {
  const { fork } = await import("child_process");

  const globs = {
    midis: globSync("*.mid"),
    soundfonts: globSync("*.sf2")
  };
  const globsWithExts = {
    midis: [...globs.midis],
    soundfonts: [...globs.soundfonts]
  };
  globsWithExts.midis
    .forEach((e, i, a) => a[i] = join(parse(e).dir, parse(e).name))
  globsWithExts.soundfonts
    .forEach((e, i, a) => a[i] = join(parse(e).dir, parse(e).name))

  const manualMidi = globs.midis.filter(i => {
    return globsWithExts.soundfonts.find(i2 => {
      return join(parse(i).dir, parse(i).name) === i2;
    });
  })[0];
  const manualSoundfont = globs.soundfonts.filter(i => {
    return globsWithExts.midis.find(i2 => {
      return join(parse(i).dir, parse(i).name) === i2;
    });
  })[0];
  globs.midis = globs.midis.filter(i => i !== manualMidi)
  globs.soundfonts = globs.soundfonts.filter(i => i !== manualSoundfont)
  const args = [
    ...globs.midis,                 // Automatically adding files
    ...globs.soundfonts,
    "-i2", manualMidi,           // Manually adding files
    "-i2", manualSoundfont,
    "-f", "flac",                   // format
    "--verbose",                    // verboseLevel
    // Per-song settings
    "-e", "reverb",                 // effects
    "-r", "48000",                  // sampleRate
    "-l", "1",                      // loopAmount
    "-vol", "1",                    // volume
    "-rvb", "20",                   // reverbVolume
    "-ls", "1",                     // loopStart
    "-le", "40"                     // loopEnd
  ];
  // toStdout
  if (process.argv.includes("-")) args.unshift("-")
  // fileOutputs
  if (process.argv.includes("-fo")) args.unshift(
    "out.wav",
    "out.flac",
    "out.mp3",
    "out.pcm"
  )
  // logFilePath
  if (process.argv.includes("-lf")) args.push("-lf")

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
  const realTest = fork(process.argv[1], args.concat(positionalArgs));
  await new Promise((resolve, reject) => {
    realTest.on("exit", resolve)
    realTest.on("error", reject)
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

