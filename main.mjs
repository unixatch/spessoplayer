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
  ERROR_LVL, WARNING_LVL,
  INFO_LVL,  DEBUG_LVL,
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
// In case the user passes some arguments
const {
  actUpOnPassedArgs,
  Options, FO_CONSTANTS
} = await import("./cli.mjs");
await actUpOnPassedArgs(process.argv)

if (process.listeners("SIGINT")) {
  log(DEBUG_LVL, "SIGINT event was added")
}
if (process.listeners("unhandledRejection")) {
  log(DEBUG_LVL, "unhandledRejection event was added")
}
log(INFO_LVL, "Checked passed args")

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
    clearLastLines(-1)
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

    lengthOfFiles.push(
      await initSpessaSynth({
        index: i, ...options,
        onlySampleCount: true
      })
    )
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
  const needsConvertion = listOfOptions?.format?.match(/(?:wave|pcm|s16le|f32le)/) === null;
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
      && (listOfOptions?.format?.match(/(?:pcm|s16le|f32le)/) === null
      || !listOfOptions?.format)) {
    [effectsProcess] = await applyEffects({
      program: "sox",
      stdoutHeader,
      stdout: converterProcess?.stdin ?? dryRunStream,
      promisesOfPrograms,
      // TODO: effects system needs to overhauled
      //effects: listOfOptions?.effects[0]
    });
    log(INFO_LVL, "Done setting up SoX")
  } else if (needsConvertion) {
    // Or just a conversion/normal processing
    converterProcess.stdin.write(stdoutHeader)
  }
  log(DEBUG_LVL, "Created header file ", stdoutHeader)

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

    func?.(destination, i === amountOfSongs-1)
    await promise
  }
  await Promise.all(promisesOfPrograms)
  if (dryRun) console.error("Done dry running")
  process.exit()
}

if (!isToStdout && !isToFile?.length > 0) {
  if (dryRun) {
    console.error(`${yellow}Can't dry run the player${normal}`)
    process.exit(2)
  }
  await startPlayer(Options)
}
// +++ toFile section +++
const amountOfSongs = Options.amountOfSongs;
const {
  files: filesList,
  files: {
    length: filesListLength
  },
  showUsage, textDelay, noProgress
} = listOfOptions;
// Calculates amountToRender (length of all songs combined)
// before anything else so that the percentages are correct
const perSongOptions = [];
const progressBuffers = {
  amountToRender: new SharedArrayBuffer(4),
  renderedAmount: new SharedArrayBuffer(4 * amountOfSongs),
  percentageDone: new SharedArrayBuffer(4 * amountOfSongs)
};
const progress = new Progress(amountOfSongs, undefined, progressBuffers);
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
const sharedFilesMap = new Map();
let promisesOfSharedFiles = [];
const {
  promises: {
    readFile: asyncReadFile,
    unlink: asyncUnlink
  }
} = fs;
for (let i = 0; i < filesListLength; i++) {
  const [soundfontFile] = filesList[i] ?? 0;
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
promisesOfSharedFiles = null;

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
  /**
   * Calculates the amount of threads
   * @param {Number} cores amount of cores available
   * @return {Number} threads count
   */
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
const RENDER_TEXTS_DELAY = 500,
      listOfPromises = new Map(),
      unlinkPromises = [];
const { Worker } = await import("worker_threads"),
      { availableParallelism } = await import("os");
const fileSizes = await getSizes(filesList);
const resourceLimits = new function () {
  const DEFAULT_MAX_OLD_GEN = 20;
  const getSize = (index, previous) => (
    (previous > index) ? previous : index
  );
  let biggestFileSize = fileSizes.reduce(getSize) * 2 + 5;
  if (biggestFileSize < DEFAULT_MAX_OLD_GEN) {
    biggestFileSize = DEFAULT_MAX_OLD_GEN;
  }
  return {
    maxOldGenerationSizeMb: biggestFileSize,
    maxYoungGenerationSizeMb: biggestFileSize / 2
  };
};
const maxThreads = listOfOptions?.maxThreads ?? calculateMaxThreads(availableParallelism()),
      workers = [];
const up1Line = "\x1b[F",
      clearCurrentLine = "\x1b[2K",
      startOfLine = "\r";
let firstRender = true,
    renderTextsInterval,
    cpuUsageData = process.cpuUsage(),
    finalFileOutputs = [];

addEvent({ eventType: "toFileSIGINT",
  func: () => {
    clearInterval(renderTextsInterval)
    for (const worker of workers) worker.terminate()
    finalFileOutputs = finalFileOutputs.filter(ifil => ifil);

    // Try to cleanup abandoned files
    // only if it's not in dry run mode
    if (dryRun) return;
    const notENOENT = error => (
      error.code !== "ENOENT" && console.error(error)
    );
    for (const {files, finished} of finalFileOutputs) {
      if (finished) continue;

      for (const file of files) {
        if (!file) continue;
        unlinkPromises.push(asyncUnlink(file).catch(notENOENT))
      }
    }
  }
})
/**
 * Main function that renders progress text
 * @param {class} progress class used to get information
 */
const renderTextsFunction = progress => {
  const moreInfos = showUsage ? (
    ` || ${cyan}${
      (process.memoryUsage.rss() / 1024**2).toFixed(2)
    }${normal} MB, ${normalYellow}${
      (
        cpuUsageData = process.cpuUsage(cpuUsageData),
        cpuUsageData.user
      ).toPrecision(6)
    }${normal} CPU`
  ) : "";

  process.stderr.write(
    // Clears old text
    (!firstRender ? up1Line : "") +
    clearCurrentLine + startOfLine +
    // Renders new text
    progress.minutesRenderedText +
    progress.percentageText +
    moreInfos + "\n"
  )
  firstRender &&= false;
};
/**
 * Adds an event to target only once
 * and does nothing if listenerCount > 0
 * @param {*}        target    where to attach the event
 * @param {String}   eventName event name
 * @param {Function} func      function to use when the event fires
 * @return {(*|null)} the target or null
 */
const addEventOnce = (target, eventName, func) => {
  return (
    !target.listenerCount(eventName)
      ? target.on(eventName, func)
      : null
  );
};
/**
 * A function that coordinates the worker
 * @param {Function} resolve
 * @param {Function} reject
 * @this Array<Number, Worker>
 */
const stateablePromiseFunction = function (resolve, reject) {
  const [i, currentWorker] = this;
  addEventOnce(currentWorker, "error", reject)
  addEventOnce(currentWorker, "exit", resolve)

  currentWorker.on("message", message => {
    renderTextsInterval ??= (
      noProgress ?? setInterval(
        renderTextsFunction,
        textDelay ?? RENDER_TEXTS_DELAY,
        progress
      )
    );
    if (message === "DONE_RENDERING") {
      currentWorker.removeAllListeners("message")
      return resolve(finalFileOutputs[i].finished = true);
    }
    if (typeof message === "object") finalFileOutputs[i] = message;
  })
};
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
    progressBuffers, options, FO_CONSTANTS,
    index: i, filesListLength
  };
  const currentWorker = workers[currentThread] ??= new Worker(
    import.meta.dirname+"/fileWriter_worker.mjs",
    { workerData, resourceLimits }
  );

  listOfPromises.set(currentThread,
    Promise.stateable(
      stateablePromiseFunction.bind([i, currentWorker])
    )
  )
  if (i >= maxThreads) currentWorker.postMessage(workerData)
}
// Terminate last idle workers since they're unused
const workersEntries = workers.reverse().entries();
for (const [index, worker] of workersEntries) {
  const indexOfPromise = (
    amountOfSongs < maxThreads
      ? amountOfSongs - 1 - index
      : maxThreads    - 1 - index
  );
  const promise = listOfPromises.get(indexOfPromise);
  if (promise.pending) break;
  worker.terminate()
}

await Promise.all(listOfPromises.values())
clearInterval(renderTextsInterval)
// Renders the last bit so that it is 100%
if (!global.SIGINT) renderTextsFunction(progress)
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

