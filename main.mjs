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

import {
  log,
  clearLastLines,
  getSizes, getUsageEstimate
} from "./utils/utils.mjs"
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
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question("Is this setup correct [Y|n]? ");
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
        perSongOptions = [],
        lengthOfFiles = [],
        promisesOfPrograms = [],
        { getWavHeader } = await import("./audioBuffer.mjs");
  const amountOfSongs = Options.amountOfSongs;
  for (let i = 0; i < amountOfSongs; i++) {
    const options = perSongOptions[i] = Options.getOptionsOfSong(i);
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
    const options = perSongOptions[i];
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
  // Calculates amountToRender (length of all songs combined)
  // before anything else so that the percentages are correct
  const amountOfSongs = Options.amountOfSongs,
        filesList = listOfOptions.files,
        perSongOptions = [];
  const progressBuffers = {
          amountToRender: new SharedArrayBuffer(4),
          renderedAmount: new SharedArrayBuffer(4 * amountOfSongs),
          percentageDone: new SharedArrayBuffer(4 * amountOfSongs)
        },
        progress = new Progress(amountOfSongs, undefined, progressBuffers);
  for (let i = 0; i < amountOfSongs; i++) {
    const options = perSongOptions[i] = Options.getOptionsOfSong(i);
    if (!options) continue;

    const duration = await initSpessaSynth({
      index: i, ...options,
      onlyDuration: true
    });
    const durationRounded = Math.floor(duration * 100) / 100;
    progress.addToAmountToRender(durationRounded)
  }

  // Loads soundfonts before doing the work
  // for memory usage reasons
  const sharedFilesMap = new Map(),
        promisesOfSharedFiles = [];
  const {
    promises: {
      stat: asyncStat,
      readFile: asyncReadFile,
      unlink: asyncUnlink
    }
  } = fs;
  for (let i = 0; i < amountOfSongs; i++) {
    const { soundfontFile } = perSongOptions[i] ?? 0;
    if (!soundfontFile) continue;

    promisesOfSharedFiles.push(
      asyncReadFile(soundfontFile)
        .then(buffer => {
          const sharedBuffer = new SharedArrayBuffer(buffer.length);

          new Uint8Array(sharedBuffer).set(buffer, 0)
          sharedFilesMap.set(soundfontFile, sharedBuffer)
        })
    )
  }
  await Promise.all(promisesOfSharedFiles)

  let calculateMaxThreads;
  {
    /*
      This is managed this way so that
      _maxThreads is predictable
      every time the function starts and
      can't be changed accidentally
    */
    let _maxThreads;
    const OFFSET_MB = 100;
    calculateMaxThreads = cores => {
      _maxThreads ??= cores;

      const limitMB = (process.availableMemory() / 1024**2) - OFFSET_MB;
      if (limitMB < getUsageEstimate(filesList, fileSizes, _maxThreads)) {
        _maxThreads -= (_maxThreads > 4) ? 2 : 1;
      }
      if (getUsageEstimate(filesList, fileSizes, _maxThreads) > limitMB) {
        return calculateMaxThreads();
      }

      const oldMaxThreads = _maxThreads;
      _maxThreads = null;
      return oldMaxThreads;
    };
  }
  // Starting the actual work
  const filesListLength = listOfOptions.files.length,
        RENDER_TEXTS_DELAY = 50,
        listOfPromises = new Map(),
        unlinkPromises = [];
  const { Worker } = await import("worker_threads"),
        { availableParallelism } = await import("os");
  const fileSizes = await getSizes(filesList);
  const resourceLimits = new function () {
    const getSize = (index, previous) => (previous > index) ? previous : index ;
    const biggestFileSize = fileSizes.reduce(getSize) * 2 + 5;
    return {
      maxOldGenerationSizeMb: biggestFileSize,
      maxYoungGenerationSizeMb: biggestFileSize / 2
    };
  };
  const maxThreads = listOfOptions?.maxThreads ?? calculateMaxThreads(availableParallelism()),
        workers = [];
  let firstRender = true,
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
      const notENOENT = error => (error.code !== "ENOENT") && console.error(error);
      for (const {files, finished} of finalFileOutputs) {
        if (finished) continue;

        for (const file of files) {
          unlinkPromises.push(asyncUnlink(file).catch(notENOENT))
        }
      }
    }
  })
  for (let i = 0; i < amountOfSongs; i++) {
    const options = perSongOptions[i];
    if (!options) continue;

    // Waits for all workers to finish
    // if the max of available threads
    // at once has been reached
    const currentThread = (maxThreads === 1) ? 0 : i % maxThreads;
    if (i !== 0 && !(currentThread)) {
      await Promise.all(listOfPromises.values())
      if (global.SIGINT) break;
    }

    options.soundfontFile = sharedFilesMap.get(options.soundfontFile);
    const workerData = {
      progressBuffers, options,
      index: i, filesListLength
    };
    const currentWorker = workers[currentThread] ??= new Worker(
      "./fileWriter_worker.mjs",
      { workerData, resourceLimits }
    );

    listOfPromises.set(currentThread, (
      new Promise((resolve, reject) => {
        const hasErrorEvent = currentWorker.listeners("error");
        const hasExitEvent = currentWorker.listeners("exit");
        if (!hasErrorEvent.length) currentWorker.on("error", reject)
        if (!hasExitEvent.length) currentWorker.on("exit", resolve)

        currentWorker.on("message", (message) => {
          renderTextsInterval ??= setInterval(progress => {
            if (!firstRender) clearLastLines([0, -1])
            console.error(
              progress.minutesRenderedText,
              "|", progress.percentageText
            )
            firstRender &&= false;
          }, RENDER_TEXTS_DELAY, progress);

          if (message === "DONE_RENDERING") {
            currentWorker.removeAllListeners("message")
            return resolve(finalFileOutputs[i].finished = true);
          }
          if (typeof message === "object") finalFileOutputs[i] = message;
        })
      })
    ))
    if (i >= maxThreads) currentWorker.postMessage(workerData)
  }
  await Promise.all(listOfPromises.values())
  clearInterval(renderTextsInterval)
  if (global.SIGINT) {
    await Promise.all(unlinkPromises)
    console.log(
      "Written only",
      finalFileOutputs.filter(i => {
        if (i.finished) {
          delete i.finished;
          return true;
        }
      })
    )
    if (dryRun) console.error(`but actually ${bold}nothing${normal} was written...`)
    process.exit(130)
  }

  // Close workers before continuing
  // otherwise it gets stuck
  for (const worker of workers) worker.terminate()

  finalFileOutputs.forEach(i => delete i.finished)
  console.log("Written", finalFileOutputs);
  if (dryRun) console.error(`but actually ${bold}nothing${normal} was written...`)
  // Required because some child_processes sometimes blocks node from exiting
  process.exit()
}

if (dryRun) {
  console.error(`${yellow}Can't dry run the player${normal}`)
  process.exit(2)
}
await startPlayer(Options)

