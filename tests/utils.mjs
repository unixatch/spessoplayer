import { globSync } from "fs"
import { parse, join } from "path"
import "../utils/colors.mjs"

export const grayedOutText = gray+"%s"+normal;

let globs, globsWithExts, manualMidi, manualSoundfont;
if (!process.argv.includes("-h")) {
  globs = {
    midis: globSync("*.mid"),
    soundfonts: globSync("*.sf2")
  };
  globsWithExts = {
    midis: [...globs.midis],
    soundfonts: [...globs.soundfonts]
  };
  globsWithExts.midis
    .forEach((e, i, a) => a[i] = join(parse(e).dir, parse(e).name))
  globsWithExts.soundfonts
    .forEach((e, i, a) => a[i] = join(parse(e).dir, parse(e).name))

  manualMidi = globs.midis.filter(i => (
    globsWithExts.soundfonts.find(i2 => (
      join(parse(i).dir, parse(i).name) === i2
    ))
  ))[0];
  manualSoundfont = globs.soundfonts.filter(i => (
    globsWithExts.midis.find(i2 => (
      join(parse(i).dir, parse(i).name) === i2
    ))
  ))[0];
  globs.midis = globs.midis.filter(i => i !== manualMidi);
  globs.soundfonts = globs.soundfonts.filter(i => i !== manualSoundfont);
}

function addOptionalArgumentsToStdout(args) {
  // Confirmation
  if (process.argv.includes("-a"))   args.push("-a")
  if (process.argv.includes("-nt"))  args.push("-nt")
  // Format
  if (process.argv.includes("-f"))   args.push("-f", "flac")
  // SoX reverb effect
  if (process.argv.includes("-rvb")) args.push("-rvb", "20")
  // Looping
  if (process.argv.includes("-l"))   args.push("-l", "1")
  // Loop fading
  if (process.argv.includes("-lF"))  args.push("-lF")
  // Loop fading start
  if (process.argv.includes("-lFs")) args.push("-lFs", "3")
  // Loop fading duration
  if (process.argv.includes("-lFd")) args.push("-lFd", "6")
  // Loop fading interpolation
  if (process.argv.includes("-lFi")) args.push("-lFi", "2")
  return args;
}
function addOptionalArgumentsToFile(args) {
  if (process.argv.includes("-fo")) args.push(
    "out.flac", "out.mp3",
    "out.pcm"
  )
  // Confirmation
  if (process.argv.includes("-a"))   args.push("-a")
  if (process.argv.includes("-nt"))  args.push("-nt")
  // Progress options
  if (process.argv.includes("-U"))   args.push("-U")
  if (process.argv.includes("-d"))   args.push("-d=1000")
  if (process.argv.includes("-np"))  args.push("-np")
  // SoX reverb effect
  if (process.argv.includes("-rvb")) args.push("-rvb", "20")
  // Looping
  if (process.argv.includes("-l"))   args.push("-l", "1")
  // Loop fading
  if (process.argv.includes("-lF"))  args.push("-lF")
  // Loop fading start
  if (process.argv.includes("-lFs")) args.push("-lFs", "3")
  // Loop fading duration
  if (process.argv.includes("-lFd")) args.push("-lFd", "6")
  // Loop fading interpolation
  if (process.argv.includes("-lFi")) args.push("-lFi", "2")
  // Threads count
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
        "--dry-run",          // Only test
        "--no-progress",
        "--text-delay=75",    // How fast it renders progress
        "--show-usage",       // RAM usage and CPU time
        "--no-table",         // Plain files object
        "--confirm",          // confirmation
        "--max-threads", "4", // threads to use for toFile
        "--loop-fade",        // adds 1 loop on top of loop but only has a fade
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
  "-le", "40",    // loopEnd
  "-lFs", "3",    // loopFadeStart
  "-lFd", "6",    // loopFadeDuration
  "-lFi", "2"     // loopFadeInterpolation
];

export {
  globs,
  manualMidi, manualSoundfont,
  addOptionalArgumentsToStdout, addOptionalArgumentsToFile,
  addOptionalCliArguments,
  generalCliArguments, perSongCliArguments
}

