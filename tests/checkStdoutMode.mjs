import { globSync } from "fs"
import { parse, join } from "path"
import { fork } from "child_process"

// Setup file path arguments
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


// Other arguments and run it
const args = [
  ...globs.midis,         // Automatically adding files
  ...globs.soundfonts,
  "-i2", manualMidi,      // Manually adding files
  "-i2", manualSoundfont,
  "--verbose",            // verboseLevel
  "--dry-run",            // dryRun, the most important flag
  "-"
];
if (process.argv.includes("-f")) args.push("-f", "flac")
if (process.argv.includes("-rvb")) args.push("-rvb", "20")
if (process.argv.includes("-l")) args.push("-l", "1")

// Start the test for real
const parsedScriptPath = parse(process.argv[1]);
const MAIN_PATH = (
  globSync(`${parsedScriptPath.dir}/../**/*.mjs`)
    .find(i => i.includes("main.mjs"))
);
const realTest = fork(MAIN_PATH, args);
await new Promise((resolve, reject) => {
  realTest.on("exit", resolve)
  realTest.on("error", reject)
})
  .then(process.exit)
  .catch(error => {
    console.error(e);
    process.exit(e.errno)
  })

