#!/usr/bin/env node
/*
  Copyright (C) 2026  unixatch

    it under the terms of the GNU General Public License as published by
    This program is free software: you can redistribute it and/or modify
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with spessoplayer.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * @module main
 */

import { log, clearLastLines } from "./utils/utils.mjs"
import {
  ffmpegArgs,
  initSpessaSynth,
  applyEffects,
  addEvent,
  toStdout,
  toFile,
  Progress,
  startPlayer
} from "./mainFunctions.mjs"

addEvent({ eventType: "SIGINT" })
process.on("unhandledRejection", i => console.error(i))
log(1, performance.now().toFixed(2), "Added SIGINT event")
// In case the user passes some arguments
const {
  actUpOnPassedArgs,
  Options
} = await import("./cli.mjs");
log(1, performance.now().toFixed(2), "Checking passed args...")
await actUpOnPassedArgs(process.argv)
const listOfOptions = Options.all;
const {
  dryRun, confirmation,
  toStdout: isToStdout,
  fileOutputs: isToFile
} = listOfOptions;

if (confirmation) {
  const infos = Options.getConfirmationTable();
  if (listOfOptions?.noTable) {
    for (const i of infos) console.log(i)
  } else console.table(Options.getConfirmationTable())

  const readline = await import("readline/promises");
  async function question() {
    let answer;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    answer = await rl.question("Is this setup correct [Y|n]? ");
    rl.close()

    if (/^(?:y|yes)$/i.test(answer) || /^\s*$/.test(answer)) return;
    if (/^(?:n|no)$/i.test(answer)) {
      console.warn(`${gray}Closing then...${normal}`)
      process.exit()
    }
    clearLastLines([0, -1])
    return await question();
  }
  await question()
}

// +++ toStdout section +++
if (isToStdout) {
  const filesList = listOfOptions.files,
        lengthOfFiles = [],
        promisesOfPrograms = [],
        { getWavHeader } = await import("./audioBuffer.mjs");
  const amountOfSongs = Options.amountOfSongs;
  for (let i = 0; i < amountOfSongs; i++) {
    const options = Options.getOptionsOfSong(i);
    if (!options) continue;
    const length = await initSpessaSynth({
      index: i, ...options,
      onlySampleCount: true
    });
    lengthOfFiles.push(length)
  }

  let effectsProcess,
      converterProcess;
  const dryRunStream = (
    dryRun &&
    fs.createWriteStream(dryRun,
      {fd: fs.openSync(dryRun, "r+")}
    )
  );

  // Creating the header
  const sumOfLengths = (index, previous) => index + previous;
  const stdoutHeader = getWavHeader({
    length: lengthOfFiles.reduce(sumOfLengths),
    numChannels: 2
  }, listOfOptions?.sampleRate ?? 48000);

  // If it needs to be converted
  const needsConvertion = listOfOptions?.format?.match(/(?:wave|pcm|s16le|s32le)/) === null;
  if (needsConvertion) {
    const { spawn } = await import("child_process");
    converterProcess = spawn("ffmpeg",
      ffmpegArgs()[listOfOptions?.format],
      {stdio: [
        "pipe",
        dryRunStream ?? process.stdout,
        "pipe"
      ]}
    );
  }
  // If it needs effects
  if (listOfOptions?.effects
      && (listOfOptions?.format?.match(/(?:pcm|s16le|s32le)/) === null
      || !listOfOptions?.format)) {
    [effectsProcess] = await applyEffects({
      program: "sox",
      stdoutHeader,
      stdout: converterProcess?.stdin ?? dryRunStream,
      promisesOfPrograms,
      // TODO: effects system needs to overhauled
      //effects: listOfOptions?.effects[0]
    });
    log(1, performance.now().toFixed(2), "Done setting up SoX")
  } else if (needsConvertion) {
    // Or just a convertion/normal processing
    converterProcess.stdin.write(stdoutHeader)
  }
  log(1, performance.now().toFixed(2), "Created header file ", stdoutHeader)

  let destination;
  // When SoX exists
  if (effectsProcess) {
    destination = effectsProcess.stdin;
  }
  // When only ffmpeg exists
  if (converterProcess && !effectsProcess) {
    destination = converterProcess.stdin;
  }
  // When neither of child_processes exist
  if (!effectsProcess && !converterProcess) {
    (dryRunStream ?? process.stdout).write(stdoutHeader)
    destination = dryRunStream ?? process.stdout;
  }
  for (let i = 0; i < amountOfSongs; i++) {
    const options = Options.getOptionsOfSong(i);
    if (!options) continue;
    const [ func, promise ] = await toStdout({ index: i, options });

    if (func) func(destination, i === amountOfSongs-1)
    await promise
  }
  await Promise.all(promisesOfPrograms)
  if (dryRun) console.error("Done dry running")
  process.exit()
}

// +++ toFile section +++
if (isToFile?.length > 0) {
  const amountOfSongs = Options.amountOfSongs;
  const progressBuffers = {
          amountToRender: new SharedArrayBuffer(4),
          renderedAmount: new SharedArrayBuffer(4 * amountOfSongs),
          percentageDone: new SharedArrayBuffer(4 * amountOfSongs)
        },
        progress = new Progress(amountOfSongs, undefined, progressBuffers);
  for (let i = 0; i < amountOfSongs; i++) {
    const options = Options.getOptionsOfSong(i);
    if (!options) continue;

    const duration = await initSpessaSynth({
      index: i, ...options,
      onlyDuration: true
    });
    const durationRounded = Math.floor(duration * 100) / 100;
    progress.addToAmountToRender(durationRounded)
  }

  const filesListLength = listOfOptions.files.length,
        RENDER_TEXTS_DELAY = 50,
        listOfPromises = new Map();
  const { Worker } = await import("worker_threads"),
        { availableParallelism } = await import("os"),
        cores = availableParallelism(),
        maxThreads = (amountOfSongs > cores * 2) ? cores * 2 : cores,
        workers = [];
  let fileOutputs,
      firstRender = true,
      renderTextsInterval,
      finalFileOutputs = [];

  addEvent({ eventType: "toFileSIGINT",
    func: () => {
      clearInterval(renderTextsInterval)
      for (const worker of workers) worker.terminate()
      finalFileOutputs = finalFileOutputs.filter(ifil => ifil);

      // Try to cleanup abandoned files
      // only if it's not in dry run mode
      if (dryRun) return;
      for (const {files} of finalFileOutputs) {
        for (const file of files) {
          try {
            fs.unlinkSync(file)
          } catch (error) {
            if (error.code !== "ENOENT") console.error(error)
          }
        }
      }
    }
  })
  for (let i = 0; i < amountOfSongs; i++) {
    const options = Options.getOptionsOfSong(i);
    if (fileOutputs) options.fileOutputs = fileOutputs;

    // Waits for all workers to finish
    // if the max of available threads
    // at once has been reached
    const currentThread = i % maxThreads;
    if (i !== 0 && !(currentThread)) {
      const results = await Promise.all(listOfPromises.values());
      // Don't continue if SIGINT was sent
      if (results.join("").includes("1".repeat(maxThreads))) break;
    }

    const workerDataObject = {
      amountOfSongs, progressBuffers,
      options, index: i, filesListLength
    };
    workers[currentThread] ??= new Worker("./fileWriter_worker.mjs", { workerData: workerDataObject });

    listOfPromises.set(currentThread, (
      new Promise((resolve, reject) => {
        const hasErrorEvent = workers[currentThread].listeners("error");
        const hasExitEvent = workers[currentThread].listeners("exit");
        if (!hasErrorEvent.length) workers[currentThread].on("error", reject)
        if (!hasExitEvent.length) workers[currentThread].on("exit", resolve)

        workers[currentThread].on("message", (message) => {
          renderTextsInterval ??= setInterval(progress => {
            if (!firstRender) clearLastLines([0, -1])
            console.error(
              progress.minutesRenderedText,
              "|", progress.percentageText
            )
            firstRender &&= false;
          }, RENDER_TEXTS_DELAY, progress);
          if (message === "DONE_RENDERING") {
            workers[currentThread].removeAllListeners("message")
            return resolve();
          }
          if (typeof message === "object") return finalFileOutputs.push(message);
        })
      })
    ))
    if (i >= maxThreads) workers[currentThread].postMessage(workerDataObject)
  }
  await Promise.all(listOfPromises.values())
  clearInterval(renderTextsInterval)
  if (global.SIGINT) process.exit(2)

  // Close workers before continuing
  // otherwise it gets stuck
  for (const worker of workers) worker.terminate()

  finalFileOutputs = finalFileOutputs.filter(ifil => ifil);
  // Sorts them after being asynchronously unorganized
  const compareAscendingly = (p, i) => p.index - i.index;
  finalFileOutputs.sort(compareAscendingly)

  console.log("Written", finalFileOutputs);
  if (dryRun) console.error("but actually nothing was written...")
  // Required because some child_processes sometimes blocks node from exiting
  process.exit()
}

if (dryRun) {
  console.error(`${yellow}Can't dry run the player${normal}`)
  process.exit(2)
}
await startPlayer(Options)

