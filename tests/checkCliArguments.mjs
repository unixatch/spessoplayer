
// Main thread/process
if (!process.argv.includes("--verbose")
    && !process.argv.includes("-h")) {
  const {fork} = await import("child_process")
  const {globSync} = await import("fs")

  const globs = {
    midis: globSync("*.mid"),
    soundfonts: globSync("*.sf2")
  };
  const args = [
    ...globs.midis,             // Automatically adding files
    ...globs.soundfonts,
    "-i2", globs.midis[0],      // Manually adding files
    "-i2", globs.soundfonts[0],
    "-f", "flac",               // format
    "--verbose",                // verboseLevel
    // Per-song settings
    "-e", "reverb",             // effects
    "-r", "48000",              // sampleRate
    "-l", "1",                  // loopAmount
    "-vol", "1",                // volume
    "-rvb", "20",               // reverbVolume
    "-ls", "1",                 // loopStart
    "-le", "40"                 // loopEnd
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
  const indexOfParameter = "2";
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
    realTest.on("exit", () => resolve())
    realTest.on("error", error => reject(error))
  })
  process.exit()
}
// Forked process
const {actUpOnPassedArgs, Options} = await import("../cli.mjs")

await actUpOnPassedArgs(process.argv)
console.log(Options.all)
