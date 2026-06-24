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
  INFO_LVL, DEBUG_LVL,
  formatStrings, log,
  clearLastLines,
  getSizes, getUsageEstimate,
  ffmpegExitHandler
} from "./utils/utils.mjs"
import {
  ffmpegArgs,
  initSpessaSynth,
  applyExternalEffects,
  addEvent,
  toStdout,
  Progress,
  startPlayer
} from "./mainFunctions.mjs"
import {
  manageVerboseOptions,
  actUpOnPassedArgs,
  Options, FO_CONSTANTS
} from "./cli.mjs"

const argv = process.argv,
      spessasynthLogging = { info: false, warning: false };
if (argv.includes("--enable-spessasynth-logging")) {
  spessasynthLogging.info = true;
  spessasynthLogging.warning = true;
}
if (!spessasynthLogging.info && !spessasynthLogging.warning) {
  if (argv.includes("--enable-spessasynth-info-logging")) {
    spessasynthLogging.info = true;
  }
  if (argv.includes("--enable-spessasynth-warn-logging")) {
    spessasynthLogging.warning = true;
  }
}
let isVerboseLevelSet;
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
  isVerboseLevelSet = await manageVerboseOptions({
    DEBUG_LEVEL_SPESSO,  DEBUG_FILE_SPESSO,
    debugLevelSpessoMsg, debugFileSpessoMsg
  });
}

addEvent({ eventType: "SIGINT" })
log(DEBUG_LVL, "SIGINT event has been added")
process.on("unhandledRejection", console.error)
log(DEBUG_LVL, "unhandledRejection event has been added")

// In case the user passes some arguments
const loadingAnimation = await actUpOnPassedArgs(undefined, isVerboseLevelSet);
log(INFO_LVL, "Checked passed args")

const listOfOptions = Options.all;
const {
  dryRun,
  confirmation, noTable,
  toStdout: isToStdout,
  fileOutputs: isToFile
} = listOfOptions;

if (confirmation) {
  loadingAnimation?.kill()
  const infos = Options.getConfirmationTable();
  if (noTable) {
    for (const i of infos) console.log(i)
  } else console.table(Options.getConfirmationTable())

  const readline = await import("node:readline/promises");
  const question = async () => {
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
  process.stdout.on("error", error => {
    if (global.SIGINT) process.exit(130)

    if (error.code === "EPIPE") {
      console.error(
        formatStrings.grayedOutText,
        "Stdout was closed before finishing to render"
      )
      process.exit(error.errno)
    }
    console.error(error)
  })
  const {
    sampleRate: stdoutSampleRate = 48000,
    format: stdoutFormat,
    effects: effectsList, reverbVolume
  } = listOfOptions;

  let fatalErrors;
  const perSongOptions = [],
        lengthOfFiles = [],
        promisesOfPrograms = [],
        { getWavHeader } = await import("./audioBuffer.mjs");
  const amountOfSongs = Options.amountOfSongs;
  for (let i = 0; i < amountOfSongs; i++) {
    const options = perSongOptions[i] = Options.getOptionsOfSong(i);
    if (!options) continue;

    const sampleCount = await initSpessaSynth({
      index: i, ...options,
      onlySampleCount: true,
      spessasynthLogging
    });
    if (!sampleCount) continue;
    lengthOfFiles.push(sampleCount)
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
    length: lengthOfFiles.reduce(sumOfLengths, 0),
    numChannels: 2
  }, stdoutSampleRate);

  const ffmpegFormats   = /(?:flac|mp3)/,
        losslessFormats = /(?:pcm|s16le|f32le)/;
  const needsConvertion = stdoutFormat?.match(ffmpegFormats);

  if (needsConvertion) {
    const { spawn } = await import("node:child_process");
    converterProcess = spawn("ffmpeg",
      ffmpegArgs()[stdoutFormat],
      {stdio: [
        "pipe",
        dryRunStream ?? process.stdout,
        "pipe"
      ]}
    );
    converterProcess.stderr.on("data", data => {
      (fatalErrors ??= []).push(data.toString())
    })
    converterProcess.once("exit", exitCode => {
      ffmpegExitHandler.call({ stderr: fatalErrors }, exitCode)
    })
  }
  // Cleans up "Starting..." message if needed
  if (!isVerboseLevelSet) {
    loadingAnimation?.kill()
    process.stderr.write("\x1b[K")
  }
  // If it needs effects, excluding lossless formats
  if (effectsList && !stdoutFormat?.match(losslessFormats)) {
    [effectsProcess] = await applyExternalEffects({
      program: "sox",
      stdoutHeader,
      stdout: converterProcess?.stdin ?? dryRunStream,
      promisesOfPrograms,
      reverbVolume,
      effects: effectsList,
      addErrorEventToDest: dest => dest.on("error", () => {})
    });
    log(INFO_LVL, "Done setting up SoX")
  } else if (needsConvertion) {
    // Or just a conversion/normal processing
    converterProcess.stdin.write(stdoutHeader)
  }
  log(DEBUG_LVL, "Created header file ", stdoutHeader)

  const destination = (
    effectsProcess?.stdin      // Sox or
    ?? converterProcess?.stdin // Ffmpeg or
    ?? (
      // dryRun/stdout
      (dryRunStream ?? process.stdout).write(stdoutHeader),
       dryRunStream ?? process.stdout
    )
  );
  for (let i = 0; i < amountOfSongs; i++) {
    const options = perSongOptions[i];
    if (!options) continue;
    const toStdoutValue = await toStdout({ index: i, options });
    if (toStdoutValue === null) continue;
    const [ func, promise ] = toStdoutValue;

    func?.(destination, i === amountOfSongs-1)
    await promise
  }
  await Promise.all(promisesOfPrograms)
  if (dryRun) console.error("Done dry running")
  process.exit()
}

if (!isToStdout && !isToFile?.length > 0) {
  loadingAnimation?.kill()
  if (dryRun) {
    console.error(
      formatStrings.warningText,
      "Can't dry run the player"
    )
    process.exit(2)
  }
  await startPlayer(Options, spessasynthLogging, loadingAnimation)
}

// +++ toFile section +++
const showCursor = "\x1b[?25h",
      hideCursor = "\x1b[?25l",
      clearCurrentLine = "\x1b[2K",
      startOfLine = "\r";
let isCursorHidden = true;
const pauseProcess = () => {
  process.stderr.write(showCursor)
  process.kill(process.pid, "SIGSTOP")
};
const showFileList = (isDryRun, partial = false) => (
  console.log(
    !partial
      ? clearCurrentLine + startOfLine + showCursor + "Written"
      : "Written only",
    finalFileOutputs.filter(i => {
      if (i.finished) {
        delete i.finished;
        return true;
      }
      return false;
    }),
    isDryRun
      ? `\b\nbut actually ${bold}nothing${normal} was written...`
      : "\b"
  )
);
addEvent({ eventType: "toFileSIGTSTP",
  func: () => (isCursorHidden &&= false, pauseProcess())
})
addEvent({ eventType: "toFileSIGTERM",
  func: () => (process.stderr.write(showCursor+"\n"), process.exit(143))
})
addEvent({ eventType: "toFileSIGINT",
  func: () => {
    const cleanLine = clearCurrentLine + startOfLine + showCursor;
    try { renderTextsInterval } catch(error) {
      if (error.name !== "ReferenceError") return console.error(error);
      return process.stderr.write(cleanLine);
    }
    clearInterval(renderTextsInterval)
    process.stderr.write(cleanLine)
    for (const worker of workers) worker.terminate()
    finalFileOutputs = finalFileOutputs.filter(ifil => ifil);

    // Try to cleanup abandoned files
    // only if it's not in dry run mode
    if (dryRun) {
      try {
        finishLine // might trigger the catch
        showFileList(dryRun, true)
        return process.exit(130);
      } catch (error) {
        return (
          error.name !== "ReferenceError"
            ? console.error(error) : undefined
        );
      }
    }
    const notENOENT = error => (
      error.code !== "ENOENT" && console.error(error)
    );
    let finishLineActive = false;
    for (const {files, finished} of finalFileOutputs) {
      if (finished) continue;

      for (const file of files) {
        if (!file) continue;
        try {
          // Monkey patch mode
          if (finishLine) unlinkSync(file)
          finishLineActive ||= true;
          continue;
        } catch (error) {
          // Normal mode
          if (error.code === "ENOENT") continue;
          if (error.name !== "ReferenceError") return console.error(error);

          unlinkPromises.push(asyncUnlink(file).catch(notENOENT))
          continue;
        }
      }
    }
    if (finishLineActive) {
      showFileList(dryRun, true)
      return process.exit(130);
    }
  }
})
process.stderr.write(hideCursor)

const amountOfSongs = Options.amountOfSongs;
const {
  files: filesList,
  files: {
    length: filesListLength
  },
  showUsage, progressDelay, noProgress,
  maxThreads: OMaxThreads
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
    onlyDuration: true,
    spessasynthLogging
  });
  if (duration === null) continue;
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
  },
  unlinkSync
} = fs;
for (let i = 0; i < filesListLength; i++) {
  const [soundfontFile] = filesList[i] ?? "";
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
const { Worker } = await import("node:worker_threads"),
      { availableParallelism } = await import("node:os");
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
const maxThreads = OMaxThreads ?? calculateMaxThreads(availableParallelism()),
      workers = [];
let renderTextsInterval,
    cpuUsageData = process.cpuUsage(),
    finalFileOutputs = [];
/**
 * Main function that renders progress text
 * @param {Progress} progressClass class used to get information
 */
const renderTextsFunction = progressClass => {
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
    (!isCursorHidden
      ? (isCursorHidden ||= true, hideCursor) : ""
    ) +
    // Clears old text
    clearCurrentLine + startOfLine +
    // Renders new text
    progressClass.minutesRenderedText +
    progressClass.percentageText +
    moreInfos
  )
};
/**
 * Adds an event to target only once
 * and does nothing if listenerCount > 0
 * @param {*}        target    where to attach the event
 * @param {String}   eventName event name
 * @param {Function} func      function to use when the event fires
 * @return {(*|false)} the target or false if it exists
 */
const addEventOnce = (target, eventName, func) => (
  !target.listenerCount(eventName)
    && target.on(eventName, func)
);
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
      !isVerboseLevelSet && (
        loadingAnimation?.kill(),
        process.stderr.write("\x1b[K")
      ),
      noProgress ?? setInterval(
        renderTextsFunction,
        progressDelay ?? RENDER_TEXTS_DELAY,
        progress
      )
    );
    if (message === "DONE_RENDERING"
        || message === "FAILED_INITIALIZATION") {
      currentWorker.removeAllListeners("message")
      return resolve(
        message !== "FAILED_INITIALIZATION"
          ? finalFileOutputs[i].finished = true
          : null
      );
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
  if (i && !currentThread) {
    await Promise.all(listOfPromises.values())
    if (global.SIGINT) break;
  }

  options.soundfontFile = sharedFilesMap.get(options.soundfontFile);
  const workerData = {
    progressBuffers, options, FO_CONSTANTS,
    index: i, filesListLength,
    verboseLevel: Options.verboseLevel,
    logFilePath:  Options.logFilePath,
    spessasynthLogging
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

const finishLine = true;
Promise.all(listOfPromises.values()).then(async () => {
  clearInterval(renderTextsInterval)
  // Renders the last bit so that it is 100%
  if (!global.SIGINT) renderTextsFunction(progress)
  if (global.SIGINT) {
    await Promise.all(unlinkPromises)
    showFileList(dryRun, true)
    process.exit(130)
  }

  // Close workers before continuing
  // otherwise it gets stuck
  for (const worker of workers) worker.terminate()

  showFileList(dryRun)
  // Required because some child_processes sometimes blocks node from exiting
  process.exit()
})
  .catch(console.error)

