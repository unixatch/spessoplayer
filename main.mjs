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
  INFO_LVL, DEBUG_LVL, WARNING_LVL,
  formatStrings, log,
  clearLastLines,
  getSizes, getUsageEstimate
} from "./utils/utils.mjs"
import {
  initSpessaSynth,
  addEvent, toStdout,
  Progress, startPlayer,
  prepareDestination
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
const [
  loadingAnimation, loadingAnimationCleanupFunc
] = await actUpOnPassedArgs(undefined, isVerboseLevelSet);
log(INFO_LVL, "Checked passed args")

const listOfOptions = Options.all;
const {
  dryRun, format,
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
  const isPCM = (
    format === "pcm"   ||
    format === "f32le" || formatStrings === "s16le"
  );
  const perSongOptions = [], lengthOfFiles = [],
        promisesOfPrograms = [];
  const getWavHeader = (
    !isPCM && (await import("./wavFunctions.mjs")).getWavHeader
  );
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

  const destination = await prepareDestination({
    isVerboseLevelSet, isPCM,
    loadingAnimation, loadingAnimationCleanupFunc,
    ...listOfOptions, lengthOfFiles,
    getWavHeader, promisesOfPrograms,
    singleFile: amountOfSongs === 1,
    midiFile: (
      amountOfSongs === 1
        ? perSongOptions[0].midiFile
        : undefined
    )
  }, true);

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
  if (dryRun) {
    console.error(
      formatStrings.warningText,
      "Can't dry run the player"
    )
    process.exit(2)
  }
  await startPlayer(
    Options, spessasynthLogging,
    loadingAnimation, isVerboseLevelSet
  )
}

// +++ toFile section +++
const showCursor = "\x1b[?25h",
      hideCursor = "\x1b[?25l",
      clearCurrentLine = "\x1b[2K",
      startOfLine = "\r";
let isCursorHidden = true;
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
/**
 * A small handler function only for specific signals
 * @param {String} signal signal name
 */
const signalHandler = signal => {
  switch (signal) {
    case "SIGTSTP":
      isCursorHidden &&= false;
      process.stderr.write(showCursor)
      process.kill(process.pid, "SIGSTOP")
      break;
    case "SIGQUIT":
    case "SIGTERM": {
      const isTermination = signal === "SIGTERM";
      // Tries to clean up if needed
      try {
        clearInterval(renderTextsInterval)
        for (const worker of workers) worker.terminate()
      } catch (error) {
        if (error.name !== "ReferenceError") {
          console.error(error)
          return process.exit(isTermination ? 143 : 131);
        }
      }
      process.stderr.write(
        `\n${gray}${
          isTermination ? "Terminated" : "Quitted"
        } the program${normal}\n`
        + showCursor
      )
      process.exit(isTermination ? 143 : 131)
      break;
    }
  }
};
addEvent({ eventType: "toFileSIGTSTP", func: signalHandler })
addEvent({ eventType: "toFileSIGTERM", func: signalHandler })
addEvent({ eventType: "toFileSIGQUIT", func: signalHandler })
addEvent({ eventType: "toFileSIGINT",
  func: () => {
    // In case it hasn't even reached the starting point
    // of the main file mode loop
    try {
      clearInterval(renderTextsInterval)
    } catch (error) {
      if (error.name === "ReferenceError") return process.exitCode = 130;
      console.error(error)
      return process.exitCode = 130;
    }
    for (const worker of workers) worker.terminate()
    finalFileOutputs = finalFileOutputs.filter(ifil => ifil);

    // Try to cleanup abandoned files
    // only if it's not in dry run mode
    if (dryRun) {
      showFileList(dryRun, true)
      return process.exitCode = 130;
    }
    const notENOENT = error => (
      error.code !== "ENOENT" && console.error(error)
    );
    for (const {files, finished} of finalFileOutputs) {
      if (finished) continue;

      for (const file of files) {
        if (!file) continue;
        asyncUnlink(file).catch(notENOENT)
      }
    }
    showFileList(dryRun, true)
    return process.exitCode = 130;
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
  }
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
  let _maxThreads, beforeAmount;
  const OFFSET_MB = 100;
  /**
   * Calculates the amount of threads
   * @param {Number}  cores    amount of cores available
   * @param {Boolean} fromUser if the core count is from the user or it's automatic
   * @return {Number} threads count
   */
  calculateMaxThreads = (cores, fromUser) => {
    if ((_maxThreads ??= cores) <= 0) {
      console.error(formatStrings.errorText,
        "Thread creation isn't possible with currently available RAM"
      )
      process.exit(1)
    }
    beforeAmount ??= cores;

    const limitMB = (process.availableMemory() / 1024**2) - OFFSET_MB;
    if (limitMB < getUsageEstimate(filesList, fileSizes, _maxThreads)) {
      if (fromUser) {
        console.error(formatStrings.errorText,
          "Memory is too low,",
          `\ntry lowering the ${underline}amount of threads${endUnderline} or free up RAM`
        )
        process.exit(1)
      }
      const amount = (_maxThreads > 4) ? 2 : 1;
      _maxThreads -= amount;
    }
    if (getUsageEstimate(filesList, fileSizes, _maxThreads) > limitMB) {
      return calculateMaxThreads();
    }
    if (_maxThreads !== beforeAmount) {
      log(WARNING_LVL, "Lowered threads amount to ", _maxThreads)
    }

    const oldMaxThreads = _maxThreads;
    _maxThreads = null;
    return oldMaxThreads;
  };
}
// Starting the actual work
const RENDER_TEXTS_DELAY = 500,
      listOfPromises = new Map();
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
const maxThreads = calculateMaxThreads(
  OMaxThreads ?? availableParallelism(), OMaxThreads !== undefined
);
const workers = [];
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
const workerPromiseFunction = function (resolve, reject) {
  const [index, currentWorker] = this;
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
        message !== "FAILED_INITIALIZATION" && !global.SIGINT
          ? finalFileOutputs[index].finished = true
          : null
      );
    }
    if (typeof message === "object") finalFileOutputs[index] = message;
  })
};

let index = 0;
/**
 * Main function that starts the file mode loop.
 * It maybe starts each thread and then waits for the active threads to finish
 * then it recursively calls itself to do it all over or it closes the loop
 * @return {(this|undefined)}
 */
async function fileModeMain() {
  for (
    let currentThread = 0;
    currentThread < maxThreads; (index++, currentThread++)
  ) {
    if (index >= amountOfSongs) break;
    const options = perSongOptions[index];
    if (!options) continue;

    options.soundfontFile = sharedFilesMap.get(options.soundfontFile);
    const workerData = {
      progressBuffers, options, FO_CONSTANTS,
      index, filesListLength,
      verboseLevel: Options.verboseLevel,
      logFilePath:  Options.logFilePath,
      spessasynthLogging
    };
    const existentWorker = workers[currentThread] !== undefined;
    const currentWorker = workers[currentThread] ??= new Worker(
      import.meta.dirname+"/fileWriter_worker.mjs",
      { workerData, resourceLimits }
    );

    listOfPromises.set(currentThread,
      new Promise(
        workerPromiseFunction.bind([index, currentWorker])
      )
    )
    if (existentWorker) currentWorker.postMessage(workerData)
  }
  await Promise.all(listOfPromises.values())
  if (index < amountOfSongs-1) return fileModeMain();

  // Closure from here on
  // Terminate workers since they're done
  for (const worker of workers) { worker.terminate() }

  clearInterval(renderTextsInterval)
  // Renders the last bit so that it is 100%
  renderTextsFunction(progress)
  showFileList(dryRun)
  // Required because some child_processes sometimes blocks node from exiting
  process.exit()
}
fileModeMain()

