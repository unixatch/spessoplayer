import { globSync } from "fs"
import { parse, join } from "path"

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
globs.midis = globs.midis.filter(i => i !== manualMidi);
globs.soundfonts = globs.soundfonts.filter(i => i !== manualSoundfont);

function addOptionalArgumentsToStdout(args) {
  if (process.argv.includes("-f"))   args.push("-f", "flac")
  if (process.argv.includes("-rvb")) args.push("-rvb", "20")
  if (process.argv.includes("-l"))   args.push("-l", "1")
  return args;
}
function addOptionalArgumentsToFile(args) {
  if (process.argv.includes("-fo")) args.push(
    "out.flac", "out.mp3",
    "out.pcm"
  )
  if (process.argv.includes("-U"))   args.push("-U")
  if (process.argv.includes("-d"))   args.push("-d=1000")
  if (process.argv.includes("-np"))  args.push("-np")
  if (process.argv.includes("-rvb")) args.push("-rvb", "20")
  if (process.argv.includes("-l"))   args.push("-l", "1")
  if (process.argv.includes("-T"))   args.push("-T", "4")
  return args;
}
function addOptionalCliArguments(args) {
  // toStdout
  if (process.argv.includes("-"))   args.unshift("-")
  // fileOutputs
  if (process.argv.includes("-fo")) args.unshift(
    "out.wav",
    "out.flac",
    "out.mp3",
    "out.pcm"
  )
  // logFilePath
  if (process.argv.includes("-lf")) args.push("-lf")
  return args;
}
function generalCliArguments(mode) {
  switch (mode) {
    case "stdout":
    case "toFile":
      return ["--verbose", "--dry-run"];

    default:
      return [
        "-f", "flac",         // format
        "--dry-run",
        "--confirm",          // confirmation
        "--max-threads", "4", // threads to use for toFile
        "--verbose"           // verboseLevel, must be the last
      ];
  }
}
const perSongCliArguments = [
  "-e", "reverb", // effects
  "-r", "48000",  // sampleRate
  "-l", "1",      // loopAmount
  "-vol", "1",    // volume
  "-rvb", "20",   // reverbVolume
  "-ls", "1",     // loopStart
  "-le", "40"     // loopEnd
];

export {
  globs,
  manualMidi, manualSoundfont,
  addOptionalArgumentsToStdout, addOptionalArgumentsToFile,
  addOptionalCliArguments,
  generalCliArguments, perSongCliArguments
}

