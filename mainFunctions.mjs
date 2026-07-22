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
 * @module mainFunctions
 */

const {
  parse,
  ERROR_LVL, WARNING_LVL,
  INFO_LVL,  DEBUG_LVL,
  formatStrings,
  PlainTime, fromDuration,
  log: tmpLog,
  newFileName,
  asyncSetTimeout,
  ffmpegExitHandler
} = await import("./utils/utils.mjs");

let log = tmpLog;
if (global.logThis) {
  log = tmpLog.bind(global.logThis);
  delete global.logThis;
}
let stream,
    audioBuffer,
    SpessaSynth,
    child_process,
    lastIndexOfGroup = 0,
    doneStreaming = false,
    fatalErrors;
const midiList = [],
      soundFontList = [];

/**
 * Simply returns an object containing ffmpeg's arguments in all supported formats
 * @param {String}  [outFile="pipe:1"]    file path to write to
 * @param {Boolean} [withoutBasics=false] if it shouldn't include the basic arguments
 * @return {module:typeDefinitions~ffmpegArgsObj} available formats in Object format
 */
function ffmpegArgs(outFile = "pipe:1", withoutBasics = false) {
  const BASIC_FFMPEG_ARGS = !withoutBasics ? [
    "-loglevel", "error",
    "-nostdin", // Necessary because of spawn and no shell
    "-hide_banner",
    "-i", "-"
  ] : [];
  return {
    flac: BASIC_FFMPEG_ARGS.concat([
      "-f", "flac",
      "-compression_level", "12",
      outFile
    ]),
    opus: BASIC_FFMPEG_ARGS.concat([
      "-f",   "opus",
      "-b:a", "256000",
      "-vbr", "constrained",
      outFile
    ]),
    mp3: BASIC_FFMPEG_ARGS.concat([
      "-f",  "mp3",
      "-aq", "0",
      outFile
    ])
  };
}
/**
 * Manager for all type of formats
 * @param {module:typeDefinitions~formatObjectParameters} formatObjectParameters
 * @return {Promise<Function>} Either a piping function or a promise for piping
 */
async function formatManager({
  format = true,
  readStream, rawReadStream,
  res, dryRun,
  effects, reverbVolume,
  createNewFileNameAnyway,
  fileOutputs, FO_CONSTANTS,
  stdoutHeader,
  promisesOfPrograms,
  outFile
}) {
  async function streamErrorHandling(error) {
    const { code, errno } = error;

    if ((process.argv.includes("-") || fileOutputs)
        && code === "EPIPE") {
      // Needed so that SoX can show its stderr
      await asyncSetTimeout(4)

      if (global.SIGINT) process.exit(130)
      console.error(
        formatStrings.grayedOutText,
        "Closed the program before finishing to render"
      )
      process.exit(errno)
    }
    if (code !== "EPIPE") {
      console.error(error, "\n")
      process.exit(errno)
    }
    log(ERROR_LVL, `Ignored error ${underline+code}`)
  }
  function addPipingFunction(func) {
    return (!func)
      ? pipingFunction = (whereToConnect, end, noPipe = false) => {
        if (noPipe) return addErrorEventToDest(
          readStream.once("error", streamErrorHandling)
        );
        addErrorEventToDest(
          readStream
            .once("error", streamErrorHandling)
            .pipe(whereToConnect, { end })
        )
      }
      : pipingFunction = func;
  }
  function addErrorEventToDest(dest, altThis) {
    const finalDest = altThis ?? dest,
          boundFunction = streamErrorHandling.bind(finalDest),
          reversedListOfEvents = dest.listeners("error").reverse();
    return (
      (reversedListOfEvents[0]?.name === boundFunction.name)
        ? finalDest
        : (dest.once("error", boundFunction), finalDest)
    );
  }
  let spawn;
  if (format !== "wave" && format !== ""
      && Array.isArray(outFile)) {
    ({ spawn } = child_process ??= await import("node:child_process"));
  }

  const isStdout = format !== true,
        isToFile = format === true;
  let pipingFunction;
  switch (format) {
    case "wave":
    case /^.*(?:\.wav|\.wave)$/.test(outFile): {
      let doneSettingUpMsg = "Done setting up";
      if (isToFile) {
        const newName = newFileName(outFile, createNewFileNameAnyway);
        fileOutputs[fileOutputs.indexOf(outFile)] = newName;
        outFile = newName;
        doneSettingUpMsg = "Done setting up wav outFile";
      }
      if (dryRun) {
        outFile = dryRun;
        doneSettingUpMsg = `Done setting up ${(isToFile) ? "wav outFile" : ""} in dry run mode`;
      }

      if (effects || reverbVolume !== undefined) {
        if (isStdout) {
          addPipingFunction()
        } else {
          if (effects) await applyExternalEffects({
            program: "sox",
            stdoutHeader, readStream,
            addErrorEventToDest,
            promisesOfPrograms,
            stdout: "ignore",
            destination: outFile,
            effects, reverbVolume
          })
        }
        if (isStdout) log(INFO_LVL, doneSettingUpMsg)
        break;
      }
      if (isToFile) {
        const output = fs.createWriteStream(outFile, {fd: dryRun && fs.openSync(outFile, "r+")});
        addPipingFunction((whereToConnect, end) => {
          output.write(stdoutHeader ?? "")
          addErrorEventToDest(
            readStream
              .once("error", streamErrorHandling)
              .pipe(output, { end })
          )
        })
      } else addPipingFunction()
      log(INFO_LVL, doneSettingUpMsg)
      break;
    }
    case "flac":
    case "opus":
    case "mp3": {
      addPipingFunction()
      log(INFO_LVL, `Done setting up ${format} format${(dryRun) ? " in dry run mode" : ""}`)
      break;
    }
    case Array.isArray(outFile): {
      const formatsUsed = [],
            combinedFfmpegArgs = [];
      const formats = {
        [FO_CONSTANTS.OPUS_INDEX]: "opus",
        [FO_CONSTANTS.MP3_INDEX ]: "mp3",
        [FO_CONSTANTS.FLAC_INDEX]: "flac"
      };
      for (const index of outFile) {
        const actualOutFile = fileOutputs[index];
        if (!actualOutFile) continue;

        const newName = newFileName(actualOutFile, createNewFileNameAnyway);
        fileOutputs[fileOutputs.indexOf(actualOutFile)] = newName;

        /*
           For dry-run mode it prints to stdout and
           the second argument is just for concatenating
           correctly all ffmpeg arguments
        */
        combinedFfmpegArgs.push(
          ...ffmpegArgs(
            dryRun ? undefined : newName,
            Boolean(combinedFfmpegArgs.length)
          )[formats[index]]
        )
        formatsUsed.push(formats[index])
      }
      const doneSettingUpMsg = `Done setting up ${
        dryRun
          ? formatsUsed.join(", ") + " outFiles in dry run mode"
          : formatsUsed.join(", ") + " outFiles"
      }`;

      const ffmpeg = spawn(
        "ffmpeg", combinedFfmpegArgs,
        {
          stdio: ["pipe", (dryRun ? "ignore" : "pipe"), "pipe"],
          windowsHide: true
        }
      );
      log(DEBUG_LVL,
        "Spawned ffmpeg with", "-",
        "  " + (ffmpeg.spawnargs.splice(0, 1), ffmpeg.spawnargs)
          .join(" ")
      )

      if (effects) {
        await applyExternalEffects({
          program: "sox",
          stdoutHeader, readStream,
          addErrorEventToDest,
          promisesOfPrograms,
          stdout: ffmpeg.stdin,
          effects, reverbVolume
        })
        log(INFO_LVL, doneSettingUpMsg)
        break;
      }
      ffmpeg.stderr.on("data", data => {
        (fatalErrors ??= []).push(data.toString())
      })
      promisesOfPrograms.push(
        new Promise((resolve, reject) => {
          ffmpeg
            .once("exit", exitCode => {
              log(DEBUG_LVL, "Ffmpeg exited")
              ffmpegExitHandler.call({ stderr: fatalErrors }, exitCode, resolve)
            })
            .once("error", reject)
        })
      )
      log(DEBUG_LVL, "Added ffmpeg promise")

      addPipingFunction(() => {
        ffmpeg.stdin.write(stdoutHeader)
        addErrorEventToDest(
          readStream
            .once("error", streamErrorHandling)
            .pipe(ffmpeg.stdin),
          ffmpeg
        )
      })
      log(INFO_LVL, doneSettingUpMsg)
      break;
    }
    case "pcm":
    case /^.*\.(?:s16le|f32le|pcm)$/.test(outFile): {
      if (isToFile) {
        const newName = newFileName(outFile, createNewFileNameAnyway);
        fileOutputs[fileOutputs.indexOf(outFile)] = newName;
        outFile = newName;
      }
      if (dryRun) outFile = dryRun;

      let output;
      if (isToFile) {
        output = fs.createWriteStream(outFile, {fd: dryRun && fs.openSync(outFile, "r+")});
      } else {
        output = res ?? process.stdout;
        if (dryRun) output = fs.createWriteStream(dryRun, {fd: fs.openSync(dryRun, "r+")});
      }
      log(INFO_LVL,
        isStdout
          ? "Done setting up" + ((dryRun) ? " dry run" : "")
          : "Done setting up pcm outFile" + ((dryRun) ? " in dry run mode" : "")
      )
      addPipingFunction((_, end, noPipe = false) => {
        const rawStream = rawReadStream ?? readStream;
        if (noPipe) return addErrorEventToDest(
          readStream.once("error", streamErrorHandling)
        );
        addErrorEventToDest(
          rawStream
            .once("error", streamErrorHandling)
            .pipe(output, { end })
        )
      })
      break;
    }

    // default is only used for toStdout
    default: {
      if (isToFile) break;

      const doneSettingUpMsg = "Done setting up" + ((dryRun) ? " dry run" : "");
      addPipingFunction((whereToConnect, end, noPipe = false) => {
        const destination = res ?? whereToConnect;
        if (noPipe) return addErrorEventToDest(
          readStream.once("error", streamErrorHandling)
        );
        addErrorEventToDest(
          readStream
            .once("error", streamErrorHandling)
            .pipe(destination, { end })
        )
      })
      log(INFO_LVL, doneSettingUpMsg)
    }
  }
  return pipingFunction;
}
/**
 * Calculates the sample count to use
 * @param {module:typeDefinitions~sampleCountObjectParameters} sampleCountObjectParameters
 * @return {module:typeDefinitions~getSampleCountObj} object containing loopDetectedInMidi and sampleCount
 */
function getSampleCount({
  midi,
  sampleRate = 48000,
  loopAmount,
  loopStart = midi.midiTicksToSeconds(midi.loop.start),
  loopEnd, hardStop,
  loopFade, loopFadeStart = 1, loopFadeDuration = 4,
}) {
  // Spessasynth loop detection
  const loopDetectedInMidi = midi.loop.start > 0;
  if (loopDetectedInMidi) {
    loopStart = midi.midiTicksToSeconds(midi.loop.start);
    loopEnd = midi.midiTicksToSeconds(midi.loop.end);
  }

  let sampleCount,
      durationInSeconds = midi.duration;
  if (loopAmount > 0) {
    const end = (
      !loopDetectedInMidi
        ? durationInSeconds - (loopEnd ?? 0)
        : loopEnd
    );
    const durationWithoutLoopPoints = end - loopStart;
    if (loopFade) loopAmount++

    durationInSeconds += durationWithoutLoopPoints * loopAmount;
    if (loopFade) {
      // Cut the last loop
      // except the loopFade delay and duration
      durationInSeconds -= (
        durationWithoutLoopPoints - loopFadeStart - loopFadeDuration
      );
    }
    sampleCount = Math.ceil(
      //                                                 Padding ↓
      sampleRate * (
        durationInSeconds + (hardStop === true || loopFade ? 0 : 2)
      )
    );
  }
  sampleCount ??= Math.ceil(
    sampleRate * (
      durationInSeconds + (hardStop === true || loopFade ? 0 : 2)
    )
  );
  log(DEBUG_LVL, "Sample count set to " + sampleCount)

  return {
    loopDetectedInMidi,
    durationInSeconds,
    sampleCount, startFading: loopFade && (
      (durationInSeconds - loopFadeDuration) * sampleRate
    )
  };
}
/**
 * Pretty print SpessaSynth errors
 * @param {Error}  errorObj
 * @param {String} errorObj.name    type of error
 * @param {String} errorObj.message error message
 * @param {String} filename
 */
function prettyLogSpessaSynthErrors({name: eName, message: eMessage}, filename) {
  let message;
  switch (eName) {
    case "SyntaxError":
      message = " is malformed because: ";
      break;

    case "Error":
    default:
      message = " failed to load because: ";
  }
  log(ERROR_LVL,
    red+underline + filename + normal+red,
    message,
    normalRed + eMessage
  )
  return null;
}
/**
 * Initializes all the required variables for spessasynth_core usage
 * @param {module:typeDefinitions~initObjectParameters} initObjectParameters
 * @return {Promise<module:typeDefinitions~initSpessaSynthObj|Number|null>} initSpessaSynthObj
 */
async function initSpessaSynth({
  loopAmount = 0,
  volume = 100/100,
  midiFile, soundfontFile,
  sampleRate = 48000,
  spessaSynthEffects = false, reverbVolume,
  loopStart, loopEnd,
  loopFade, loopFadeStart = 1, loopFadeDuration = 4,
  index, indexOfGroup,
  isToFile = false,
  onlySampleCount = false, onlyDuration = false,
  isStartPlayer = false, spessasynthLogging, hardStop = false
}) {
  const {
    BasicMIDI,
    SoundBankLoader,
    SpessaSynthProcessor,
    SpessaSynthSequencer,
    SpessaLog
  } = SpessaSynth ??= await import("spessasynth_core");
  if (onlySampleCount || onlyDuration || isToFile) {
    const { info, warning } = spessasynthLogging;
    SpessaLog.infoEnabled = info;
    SpessaLog.warnEnabled = warning;
  }

  let midi;
  try {
    midi = (
      (onlyDuration || isToFile)
        ? BasicMIDI.fromArrayBuffer(fs.readFileSync(midiFile))
        : midiList[index] ??= BasicMIDI.fromArrayBuffer(fs.readFileSync(midiFile))
    );
  } catch (error) {
    return prettyLogSpessaSynthErrors(
      error, midiFile
    );
  }
  if (!onlySampleCount && !onlyDuration || isStartPlayer) {
    if (midi.loop.start === Infinity) {
      log(WARNING_LVL,
        midiFile,
        "has a loop start of Infinity which is wrong, skipping..."
      )
      return null;
    }
    if (!midi.duration) {
      log(WARNING_LVL,
        midiFile, "has a duration of 0 seconds, skipping..."
      )
      return null;
    }
    if (midi.duration <= .2) {
      log(WARNING_LVL,
        midiFile,
        "has a duration <= 200 ms, looping will be disabled"
      )
    }
  }

  if (!onlySampleCount && !onlyDuration) {
    // Memory cleanup
    if (midiList.length) delete midiList[index-1];
    const {
      [lastIndexOfGroup]: lastIndex,
      [indexOfGroup]:     currentIndex
    } = soundFontList;

    if (lastIndex !== currentIndex) {
      delete soundFontList[lastIndexOfGroup];
      lastIndexOfGroup = indexOfGroup;
    }
    soundFontList[indexOfGroup] ??= (
      isToFile ? soundfontFile : fs.readFileSync(soundfontFile)
    );
  }
  const {
    sampleCount,
    durationInSeconds,
    loopDetectedInMidi, startFading
  } = getSampleCount({
    midi,
    sampleRate,
    loopAmount,
    loopStart, loopEnd, hardStop,
    loopFade, loopFadeDuration, loopFadeStart
  });
  if (onlySampleCount) return sampleCount;
  if (onlyDuration) return durationInSeconds;

  if (loopStart > 0 && !loopDetectedInMidi) {
    // ((midi.timeDivision * midi.tempoChanges[0].tempo)/60) * loopStart;
    midi.loop.start = midi.secondsToMIDITicks(loopStart);
  }
  if (loopEnd && loopEnd !== midi.duration && !loopDetectedInMidi) {
    // (midi.duration - loopEnd) * (midi.tempoChanges[1].tempo/60) * midi.timeDivision;
    midi.loop.end = midi.secondsToMIDITicks(midi.duration - loopEnd);
  }
  // Save the SoundFont2 class to soundFontList so that
  // it's a reference and not a copy next time
  if (Buffer.isBuffer(soundFontList[indexOfGroup])
      || soundFontList[indexOfGroup] instanceof SharedArrayBuffer) {
    try {
      soundFontList[indexOfGroup] = SoundBankLoader.fromArrayBuffer(soundFontList[indexOfGroup]);
    } catch (error) {
      return prettyLogSpessaSynthErrors(
        error, soundfontFile
      );
    }
  }
  const synth = new SpessaSynthProcessor(sampleRate, {
    eventsEnabled: false,
    effectsEnabled: hardStop === true ? false : spessaSynthEffects
  });
  synth.setSystemParameter("gain", volume)
  if (spessaSynthEffects) {
    synth.setSystemParameter("reverbGain", reverbVolume)
  }
  synth.synthCore.soundBankManager.addSoundBank(
    soundFontList[indexOfGroup],
    "main"
  )
  await synth.processorInitialized
  const seq = new SpessaSynthSequencer(synth);
  try {
    seq.loadNewSongList([midi])
    seq.loopCount = loopAmount;
    if (loopFade) seq.loopCount++
    seq.play();
  } catch (error) {
    return prettyLogSpessaSynthErrors(
      error, midiFile
    );
  }

  log(INFO_LVL, "Finished setting up SpessaSynth")
  return {
    seq, synth,
    midi,
    sampleCount, durationInSeconds,
    startFading
  }
}
/**
 * Applies effects using SoX
 * @param {module:typeDefinitions~effectsObjectParams} effectsObjectParams
 * @return {Promise<Array<ChildProcess,Array>>} array containing SoX's process and the array of promises for both ffmpeg and SoX processes
 *
 * @example
 * applyExternalEffects({ program: "sox", stdoutHeader, readStream })
 */
async function applyExternalEffects({
  program,
  stdoutHeader, readStream,
  addErrorEventToDest,
  promisesOfPrograms,
  stdout = process.stdout,
  destination = "-",
  effects, reverbVolume = "20"
}) {
  /*
    ffmpeg
      -i -
      -i parking-garage-response.wav
      -lavfi "afir,volume=70"
      -f wav
        pipe:1
  */
  if (!effects?.length) {
    effects = ["reverb", reverbVolume, "36", "100", "100", "10", "10"];
  }
  const { spawn } = child_process ??= await import("node:child_process");
  // In case it's custom
  if (effects[0]?.effect) {
    // cloning the effects array so that it can be unpacked
    const oldEffectsArray = [...effects];
    effects.length = 0;
    oldEffectsArray
      .forEach(({ effect, values }) => {
        if (values) {
          effects.push(effect, ...values)
          return;
        }
        effects.push(effect)
      })
  }
  const sox = spawn(program, [
    "-t", "wav", "-",
    "-t", "wav", destination,
    ...effects
  ], {
    detached: true, windowsHide: true
  });
  //  For SIGINT event to work, sometimes... ↑
  log(DEBUG_LVL,
    "Spawned SoX with", "-",
    "  " + (sox.spawnargs.splice(0, 1), sox.spawnargs)
      .join(" ")
  )

  sox.stderr.on("data", (data) => {
    const stringOfError = data.toString();
    const connectionResetRegex = /sox FAIL sox: `-' error writing output file: Connection reset by peer\n/g,
          noSeekWarning = /\n*sox WARN \w*:.*can't seek.*\n*/g;
    // Do not print if these regexes match stringOfError
    if (stringOfError.match(connectionResetRegex)
        || stringOfError.match(noSeekWarning)) return;

    const [
      numbers,
      overridableDefaults,
      wrongValue,
      failText,
      yellowWarnText,
      optionalParameters,
      optionalParametersPatch
    ] = [
      /(-*[0-9]+(?:ms|dB|%|q)*)/g,
      /(\] |\) )(\[)([\w-]*)/g,
      /(parameter )(`\w*')/g,
      /.*(sox FAIL \w*)/g,
      /.*(sox WARN \w*)/g,
      /(\[[ \w|-]*\])/g,
      /m\[0m/g
    ];
    console.error(
      stringOfError
        .replace(numbers, `${normalYellow}$1${normal}`)
        .replace(overridableDefaults, `$1$2${dimGrayBold}$3${normal}`)
        .replace(wrongValue, `$1${green}$2${normal}`)
        .replace(failText, `${red}$1${normal}`)
        .replace(yellowWarnText, `\n${yellow}$1${normal}`)
        .replace(optionalParameters,`${gray}$1${normal}`)
        .replace(optionalParametersPatch, "\x1b[0m")
    )
  })
  promisesOfPrograms.push(
    new Promise((resolve, reject) => {
      sox.once("exit", exitCode => {
        if (!exitCode) {
          log(DEBUG_LVL, "SoX exited successfully")
          return resolve(exitCode);
        }
        reject([
          `sox child_process closed with ${exitCode}\n`,
          exitCode
        ]);
      })
      .once("error", reject)
    })
      .catch(([reason, exitCode]) => {
        log(DEBUG_LVL, reason)
        process.exit(exitCode)
      })
  )
  log(DEBUG_LVL, "Added SoX promise")

  sox.stdin.write(stdoutHeader)
  addErrorEventToDest(readStream?.pipe(sox.stdin) ?? sox.stdin)
  sox.stdout.pipe(stdout)
  log(INFO_LVL, "Finished setting up SoX")
  return [sox, promisesOfPrograms];
}
/**
 * Adds events to process
 * @param  {Object}   eventObjectParameters
 * @param  {String}   eventObjectParameters.eventType the type of event to add
 * @param  {Function} [eventObjectParameters.func]    optional function for eventType "exit"
 * @return {(Boolean|Promise<Boolean>)} if it has added the event successfully or not
 * @example
 * addEvent({ eventType: "SIGINT" })
 */
function addEvent({ eventType, func }) {
  /**
   * Adds an event,
   * then it checks if it actually has been added
   * @inner
   * @private
   * @memberof module:mainFunctions
   * @param {String}   eventTypeTocheck event to add and check
   * @param {Function} funcToAdd        function to add and check
   * @return {Boolean} true if it has been added or false otherwise
   */
  function addAndCheckEvent(eventTypeTocheck, funcToAdd) {
    return (
      process
        .on(eventTypeTocheck, funcToAdd)
        .listeners(eventTypeTocheck)
        .includes(funcToAdd)
    );
  }
  switch (eventType) {
    case "toFileSIGTSTP": {
      return addAndCheckEvent("SIGTSTP", func);
    }
    case "toFileSIGTERM": {
      return addAndCheckEvent("SIGTERM", func);
    }
    case "toFileSIGQUIT": {
      return addAndCheckEvent("SIGQUIT", func);
    }
    case "toFileSIGINT": {
      return addAndCheckEvent("SIGINT", func);
    }
    case "SIGINT": {
      return addAndCheckEvent("SIGINT", () => {
        console.error(
          formatStrings.grayedOutText,
          "\nClosed with Ctrl+c"
        )
        global.SIGINT = true;
        if (process.argv.includes("-")) process.exit(130)
      });
    }
    case "stdoutExit": {
      // This event is only for node specifically
      if (process.argv0 !== "node") return;

      return addAndCheckEvent("exit", () => {
        if (!doneStreaming && !global.SIGINT) return;

        // Necessary for programs like mpv
        // (e.g. input controls don't work without this)
        fs.close(0); fs.close(1); fs.close(2)
      });
    }
  }
}
/**
 * Creates a Readable stream given the variables needed
 * @param {Readable} Readable         Readable stream function
 * @param {Boolean}  [isStdout=false] if it's for toStdout or not
 * @param {module:typeDefinitions~createReadableObjectParameters} createReadableObjectParameters
 * @return {Readable} a Readable
 */
function createReadable(Readable, isStdout = false, {
  sampleCount, index,
  seq, synth,
  getData, isf32le,
  doNotRepeat,
  hardStop, loopFade,
  loopFadeDuration = 4, loopFadeInterpolation,
  startFading,
  progressBuffers
}) {
  if (typeof startFading !== "number" && startFading !== undefined) {
    throw new TypeError(
      "startFading must be a number, " +
      `but instead received ${startFading}`
    )
  }
  // Creates the variable without losing "this" context
  const {
    midiData: { midiTicksToSeconds: tmpMTS }
  } = seq;
  const midiTicksToSeconds = tmpMTS.bind(seq.midiData);

  /**
   * Sets the rendered amount of seconds
   * with loops accounted for when they start
   * @inner
   * @private
   * @memberof module:main
   */
  function setRenderedAmount() {
    const {
      loopCount, currentTime: SCurrentTime,
      midiData: {
        loop: { start: loopStart }
      }
    } = seq;

    // Change in loopCount
    if (lastLoopCount !== loopCount) {
      lastCompletelyRenderedSeconds = progress.renderedAmount;

      const currentTime = SCurrentTime - midiTicksToSeconds(loopStart);
      progress.updateProgress(lastCompletelyRenderedSeconds + currentTime)

      lastLoopCount = loopCount;
      return;
    }
    // Use the last completely rendered seconds
    // since the last completed loop
    if (lastCompletelyRenderedSeconds) {
      const currentTime = SCurrentTime - midiTicksToSeconds(loopStart);
      progress.updateProgress(lastCompletelyRenderedSeconds + currentTime)
      return;
    }

    progress.updateProgress(SCurrentTime)
  }
  const CHANGE_IN_VOLUME     = .015,
        EASEOUTQUAD_STRENGTH = 1.25,
        EASEOUTSINE_STRENGTH = 2.25;
  /**
   * Calculates the new volume when fading
   * @return {Number} new volume
   */
  function calculateFade() {
    const {
      systemParameters: { gain }
    } = synth;
    const percentage = gain / loopFadeDuration;

    switch (loopFadeInterpolation) {
      case "sine": case 2:
        return gain - (
          CHANGE_IN_VOLUME *
          Math.sin(percentage * (Math.PI / EASEOUTSINE_STRENGTH))
        );
      case "quad": case 3:
        return gain - (
          -CHANGE_IN_VOLUME * percentage
          * (percentage - EASEOUTQUAD_STRENGTH)
        );

      default:
      case "linear": case 1:
        return gain - CHANGE_IN_VOLUME * percentage;
    }
  }
  /**
   * @typedef interleavedFloat32Channels
   * @type {Array}
   * @property {Float32Array} left  left channel
   * @property {Float32Array} right right channel
   */
  /**
   * Combines raw Float32Arrays into 1
   * @param {interleavedFloat32Channels} channels
   * @return {Buffer} interleaved float32 buffer
   */
  function getInterleavedFloat32Data([left, right]) {
    const length = left.length,
          bufferLength = length * 2 * 4,
          buffer = Buffer.alloc(bufferLength);

    let currentSample = 0;
    for (let i = 0; i < length; i++) {
      buffer.writeFloatLE(left[i],  currentSample++ << 2)
      buffer.writeFloatLE(right[i], currentSample++ << 2)
    }
    return buffer;
  }

  let textRenderingIndex = 0,
      lastBytes = false,
      filledSamples = 0,
      lastCompletelyRenderedSeconds,
      lastLoopCount = seq.loopCount,
      smoothEndingAmount;
  const startSmoothEnding = sampleCount - (2.5 * synth.sampleRate),
        BUFFER_SIZE = 128,
        left = new Float32Array(BUFFER_SIZE),
        right = new Float32Array(BUFFER_SIZE),
        stereoChannels = [left, right],
        progress = (
          (progressBuffers)
            ? new Progress(undefined, index, progressBuffers)
            : undefined
        );

  const readStream = new Readable({
    read() {
      const bufferSize = Math.min(BUFFER_SIZE, sampleCount - filledSamples);
      if (loopFade) loopFadeBlock: {
        if (synth.systemParameters.gain <= .001 || (
              seq.midiData.duration.toPrecision(3) === seq.currentTime.toPrecision(3)
              && !seq.loopCount
           )) {
          return this.push(null);
        }

        if (filledSamples < startFading) break loopFadeBlock;
        // Start of fade
        synth.setSystemParameter("gain", calculateFade())
      }
      if (!hardStop && !loopFade && filledSamples > startSmoothEnding) {
        const {
          systemParameters,
          systemParameters: { effectsEnabled, reverbGain }
        } = synth;
        let sample_rate;
        if (!smoothEndingAmount) sample_rate = (
          synth.soundBankManager.soundBankList[0]
            .soundBank.samples[0].sampleRate
        );

        if (!effectsEnabled) {
          systemParameters.delayGain      = 0;
          systemParameters.chorusGain     = 0;
          systemParameters.reverbGain     = 0;
          systemParameters.effectsEnabled = true;
        }
        smoothEndingAmount ??= sample_rate < 15000 ? 1 : 1.78;
        if (reverbGain < smoothEndingAmount) {
          systemParameters.delayGain = (
            systemParameters.chorusGain = (
              systemParameters.reverbGain += .02
            )
          );
        }
      }
      if (!lastBytes) {
        seq.processTick()
        synth.process(left, right, 0, bufferSize)
        filledSamples += bufferSize;
      }

      if (!isStdout) toFileTextRendering: {
        textRenderingIndex++
        if (!lastBytes) {
          if (textRenderingIndex % 100 !== 0) break toFileTextRendering;
        }

        if (doNotRepeat) break toFileTextRendering;
        setRenderedAmount()
        progress.updateProgress(
          (progress.renderedAmount / progress.amountToRender) * 100,
          "percentageDone"
        )
      }

      if (lastBytes) return this.push(null);
      if (filledSamples >= sampleCount) lastBytes = true;

      const data = (
        isf32le
          ? getInterleavedFloat32Data(stereoChannels)
          : getData(stereoChannels)
      );
      // Clean up old data for both channels
      left.fill(0, 0, BUFFER_SIZE)
      right.fill(0, 0, BUFFER_SIZE)
      return this.push(data)
    }
  });
  log(DEBUG_LVL, `Created Readable for ${(isStdout) ? "toStdout" : "toFile"}`)
  return readStream;
}
/**
 * Reads the generated samples from spessasynth_core
 * and spits them out to stdout
 * @param {Object}         toStdoutObjectParameters
 * @param {Number}         toStdoutObjectParameters.index        index of the song
 * @param {ResponseServer} [toStdoutObjectParameters.res]        optional ResponseServer
 * @param {module:typeDefinitions~toStdoutOptionsObject}  toStdoutObjectParameters.toStdoutOptionsObject
 * @throws {ReferenceError} if some required files are missing
 * @return {Promise<module:typeDefinitions~toStdoutArray>} toStdoutArray
 */
async function toStdout({
  index, res,
  options, options: { format = "" }
}) {
  if (!options.midiFile || !options.soundfontFile) {
    throw new ReferenceError("Missing some required files")
  }
  log(INFO_LVL, "Started toStdout")

  const initSpessaSynthObj = await initSpessaSynth({ index, ...options });
  if (initSpessaSynthObj === null) return null;
  let {
    seq, synth, sampleCount, startFading
  } = initSpessaSynthObj;

  if (!res && !process.listenerCount("exit")) {
    addEvent({ eventType: "stdoutExit" })
    log(DEBUG_LVL, "Added event exit")
  }
  const { getData } = audioBuffer ??= await import("./wavFunctions.mjs");
  const {
    promises: { finished },
    Readable
  } = stream ??= await import("node:stream");

  doneStreaming &&= false;
  let readStream = createReadable(Readable, true, {
    sampleCount,
    seq, synth,
    getData, isf32le: format === "f32le",
    hardStop: options.hardStop,
    loopFade: options.loopFade,
    loopFadeDuration: options.loopFadeDuration,
    loopFadeInterpolation: options.loopFadeInterpolation,
    startFading
  });

  let promisesOfPrograms = [];
  let pipingFunction = await formatManager({
    format, readStream, res,
    ...options,
    promisesOfPrograms
  });
  log(DEBUG_LVL, "Finished creating the stdout promise")
  return [
    pipingFunction,
    Promise.all([
      finished(readStream, { cleanup: true })
        .then(() => {
          doneStreaming = true;
          synth.synthCore
            .soundBankManager.soundBankList.splice(0)
          synth.destroySynthProcessor()
          return [
            promisesOfPrograms, pipingFunction,
            sampleCount, readStream,
            seq, synth
          ] = [];
        }),
      ...promisesOfPrograms // If there are any
    ])
  ];
}

/**
 * Reads the generated samples from spessasynth_core
 * and renders them to a wav file
 * @param {Object}      toFileObjectParameters
 * @param {Boolean}     toFileObjectParameters.spessasynthLogging      if it should print spessasynth's logs
 * @param {Boolean}     toFileObjectParameters.createNewFileNameAnyway if it's necessary to create a new file name
 * @param {Number}      toFileObjectParameters.index                   index of the song
 * @param {Object}      toFileObjectParameters.progressBuffers         progress shared buffers used by Progress class
 * @param {module:typeDefinitions~toFileOptionsObject} toFileObjectParameters.toFileOptionsObject
 * @param {Object} toFileObjectParameters.FO_CONSTANTS
 * @throws {ReferenceError} - if some required files are missing
 * @return {Promise<module:typeDefinitions~toFileArray>} array that contains the fileOutputs array and a promise
 */
async function toFile({
  spessasynthLogging,
  createNewFileNameAnyway, index,
  progressBuffers,
  options, options: {
    fileOutputs,
    fileOutputs: { length: foLength }
  },
  FO_CONSTANTS
}) {
  if (!options.midiFile || !options.soundfontFile || !foLength) {
    throw new ReferenceError("Missing some required files")
  }
  log(INFO_LVL, "Started toFile")
  const { WAV_INDEX, RAW_INDEX } = FO_CONSTANTS,
        hasf32le = fileOutputs[RAW_INDEX]?.endsWith(".f32le");
  const onlyFloat = (
    hasf32le &&
    !fileOutputs[WAV_INDEX] && foLength === 2
  );
  let stdoutHeader, getWavHeader, getData,
      seq, synth, seqFloat, synthFloat,
      sampleCount, sampleCountFloat,
      startFading;
  const initSpessaSynthObjParam = {
    index, ...options,
    spessasynthLogging, isToFile: true
  };
  if (!onlyFloat) {
    const initSpessaSynthObj = await initSpessaSynth(initSpessaSynthObjParam);
    if (initSpessaSynthObj === null) return null;
    ({
      seq, synth, sampleCount, startFading
    } = initSpessaSynthObj);
    ({
      getWavHeader, getData
    } = audioBuffer ??= await import("./wavFunctions.mjs"))
  }
  if (hasf32le) {
    const initSpessaSynthObj = await initSpessaSynth(initSpessaSynthObjParam);
    if (initSpessaSynthObj === null) return null;
    ({
      seq: seqFloat,
      synth: synthFloat,
      sampleCount: sampleCountFloat,
      startFading
    } = initSpessaSynthObj);
  }

  const {
    promises: { finished },
    Readable
  } = stream ??= await import("node:stream");

  if (!onlyFloat) {
    stdoutHeader = getWavHeader({
      length: sampleCount, numChannels: 2
    }, options.sampleRate, { title: parse(options.midiFile).name });
    log(DEBUG_LVL, "Created header file", "-", " ", stdoutHeader)
  }

  let readStream = (
    !onlyFloat
    && createReadable(Readable, false, {
      sampleCount,
      seq, synth,
      getData,
      index, progressBuffers,
      hardStop: options.hardStop,
      loopFade: options.loopFade,
      loopFadeDuration: options.loopFadeDuration,
      loopFadeInterpolation: options.loopFadeInterpolation,
      startFading
    })
  );
  let rawReadStream = (
    hasf32le
    && createReadable(Readable, false, {
      sampleCount: sampleCountFloat,
      seq: seqFloat, synth: synthFloat,
      getData, isf32le: hasf32le,
      index, progressBuffers,
      doNotRepeat: readStream && true,
      hardStop: options.hardStop,
      loopFade: options.loopFade,
      loopFadeDuration: options.loopFadeDuration,
      loopFadeInterpolation: options.loopFadeInterpolation,
      startFading
    })
  );
  let promisesOfPrograms = [],
      pipingFunctions = [];
  const addFunction = async outFile => {
    const isf32le = outFile?.endsWith(".f32le");
    pipingFunctions.push(
      await formatManager({
        readStream:    isf32le || readStream,
        rawReadStream: isf32le ? rawReadStream : undefined,
        ...options,
        createNewFileNameAnyway,
        stdoutHeader,
        promisesOfPrograms,
        FO_CONSTANTS: !outFile ? FO_CONSTANTS : undefined,
        outFile: outFile ?? (
          outFile = {...FO_CONSTANTS},
          delete outFile.WAV_INDEX,
          delete outFile.RAW_INDEX,
          Object.values(outFile)
        )
      })
    )
  };
  for (let foIndex = 0; foIndex < foLength; foIndex++) {
    const outFile = fileOutputs[foIndex];
    if (!outFile) continue;

    if (foIndex === WAV_INDEX || foIndex === RAW_INDEX) {
      await addFunction(outFile)
      continue;
    }
    await addFunction()
    break;
  }

  const finishedOptions = { cleanup: true };
  return [
    fileOutputs,
    pipingFunctions,
    Promise.all([
      Promise.all([
        rawReadStream && finished(rawReadStream, finishedOptions),
        readStream    && finished(readStream,    finishedOptions)
      ])
        .then(() => {
          synth?.synthCore
            ?.soundBankManager?.soundBankList.splice(0)
          synthFloat?.synthCore
            ?.soundBankManager?.soundBankList.splice(0)
          synth?.destroySynthProcessor()
          synthFloat?.destroySynthProcessor()
          if (seq) seq.songs.length = 0;
          if (seqFloat) seqFloat.songs.length = 0;
          return [
            sampleCount, sampleCountFloat,
            stdoutHeader,
            readStream, rawReadStream,
            seq, synth,
            seqFloat, synthFloat,
            pipingFunctions, promisesOfPrograms
          ] = [];
        }),
      ...promisesOfPrograms // if there are any
    ])
  ];
}
/**
 * A class that rappresents the toFile progress
 */
class Progress {
  #renderedAmount;
  #amountToRender;
  #percentageDone;
  #date;
  #index;
  #removeAmount;
  #removeAmountTotal;
  #toSecondsN  = PlainTime ? 1    : 1000;
  #hourN       = PlainTime ? 3600 : 3600000;
  #hourLessYes = PlainTime ? 3 : 14;
  #hourLessNo  = PlainTime ? 0 : 11;

  /**
   * Creates a partial or complete Progress class
   * @param {Number}            amountOfSongs
   * @param {Number}            [index]
   * @param {Object}            sharedBuffers
   * @param {SharedArrayBuffer} sharedBuffers.amountToRender
   * @param {SharedArrayBuffer} sharedBuffers.renderedAmount
   * @param {SharedArrayBuffer} sharedBuffers.percentageDone
   */
  constructor(
    amountOfSongs, index,
    {amountToRender, renderedAmount, percentageDone}
  ) {
    this.amountOfSongs = amountOfSongs;
    if (typeof index === "number") this.#index = index;

    this.#amountToRender = new Float32Array(amountToRender);
    this.#renderedAmount = new Float32Array(renderedAmount);
    this.#percentageDone = new Float32Array(percentageDone);
    if (!PlainTime) this.#date = new Date(0);
  }
  /**
   * Do the sum of all numbers in the array
   * @param {Float32Array} array list of numbers
   * @return {(undefined|Number)} - the sum
   */
  #sum(array) {
    if (this.#index !== undefined) return;
    let sumOfAll = 0;
    for (let i = 0; i <= this.amountOfSongs; i++) {
      const number = array[i];
      if (number) sumOfAll += number;
    }
    return sumOfAll;
  }
  /**
   * Gives the percentage done only
   * if it has the necessary informations
   * @type {(undefined|String)}
   */
  get percentageText() {
    if (this.#index !== undefined) return;
    return yellow + (
      this.#sum(this.#percentageDone).toFixed(2)
    ) + normal + "%";
  }
  /**
   * Gives the amount of minutes rendered
   * alongside the total to do only if it has the necessary informations
   * @type {(undefined|String)}
   */
  get minutesRenderedText() {
    if (this.#index !== undefined) return;

    this.#removeAmount ??= (
      (this.#amountToRender[0] * this.#toSecondsN) < this.#hourN
        ? this.#hourLessYes
        : this.#hourLessNo
    );
    const renderedAmountNumber = (
      Math.floor(
        this.#sum(this.#renderedAmount) * 100
      ) / 100 * this.#toSecondsN
    );
    if (PlainTime) return (
      magenta
        // Gets the ISO time format
        + PlainTime.add(fromDuration(`PT${renderedAmountNumber}S`))
            .toString().substring(this.#removeAmount)
      + `${normal} / ${brightMagenta}`

        + PlainTime.add(
            fromDuration(`PT${this.#amountToRender[0].toFixed(3)}S`)
          )
            .toString().substring(this.#removeAmount)
      + `${normal} | `
    );

    return (
      magenta
        // Gets the full ISO format and keeps the time part
        + (this.#date.setTime(renderedAmountNumber), this.#date)
            .toISOString().substring(this.#removeAmount, 23)
      + `${normal} / ${brightMagenta}`

        + (this.#date.setTime(this.#amountToRender[0] * 1000), this.#date)
            .toISOString().substring(this.#removeAmount, 23)
      + `${normal} | `
    );
  }
  /**
   * Updates the progress number of renderedAmount
   * by the provided index passed to the constructor
   * @param {Number} newNumber new value to replace with
   * @param {String} typeOfArray type of array to update
   * @throws {TypeError} - if trying to update with a full shared array
   */
  updateProgress(newNumber, typeOfArray = "renderedAmount") {
    if (this.#index === undefined) {
      throw new TypeError("Can't update with full shared array")
    }

    switch (typeOfArray) {
      case "renderedAmount":
        this.#renderedAmount[this.#index] = newNumber;
        break;
      case "percentageDone":
        this.#percentageDone[this.#index] = newNumber;
        break;
    }
  }
  /**
   * Adds to amountToRender
   * @param {Number} newNumber new value to replace with
   */
  addToAmountToRender(newNumber) {
    this.#amountToRender[0] += newNumber;
  }
  /**
   * Gives the amount of minutes to render
   * @type {Number}
   */
  get amountToRender() {
    return this.#amountToRender[0];
  }
  /**
   * Gives the amount of minutes rendered
   * @type {Number}
   */
  get renderedAmount() {
    if (this.#index === undefined) return;
    return this.#renderedAmount[this.#index];
  }
}
/**
 * Reads the generated samples from spessasynth_core
 * and plays them using mpv
 * @param {Options} Options Options class
 * @param {Object<Boolean>} spessasynthLogging if spessasynth's logging system should be enabled
 * @param {ChildProcess?}   loadingAnimation   animation that plays while doing work
 * @param {Boolean}         isVerboseLevelSet  if logging is enabled
 */
async function startPlayer(
  Options, spessasynthLogging,
  loadingAnimation, isVerboseLevelSet
) {
  const {
    sampleRate, format,
    daemon: daemonMode
  } = Options.all;
  const isPCM = (
    format === "pcm"   ||
    format === "f32le" || formatStrings === "s16le"
  );
  const getWavHeader = (
    !isPCM && (await import("./wavFunctions.mjs")).getWavHeader
  );
  const { spawn }        = child_process ??= await import("node:child_process"),
        { createServer } = await import("node:http");

  let relistenFunction, closing, mpv,
      port = 3000, failedAttempts = 0;
  const server = createServer(),
        listOfURLs = [],
        promisesOfPrograms = [];

  process.on("SIGUSR1", () => {
    closing = true; mpv?.kill()

    server.close(() => {
      if (process.platform === "win32") {
        return spawn(
          process.argv0, process.argv.slice(1),
          { stdio: "inherit", detached: true }
        )
          .on("spawn", process.exit)
          .unref();
      }
      process.execve(
        process.argv[0], process.argv
      )
    })
  })
  server.on("error", ({code, errno, message}) => {
    if (code !== "EADDRINUSE") {
      console.error(formatStrings.errorText, message)
      process.exit(errno)
    }
    if (failedAttempts++ > 50) {
      console.error(formatStrings.errorText,
        "Failed to open the server too many times, quitting..."
      )
      process.exit(errno)
    }

    log(WARNING_LVL,
      `[Server]: port ${port++} already in use, trying another one...`
    )
    setTimeout(
      relistenFunction ??= () => {
        server.listen({ host: "localhost", port })
      }, 200
    )
  })
  server.on("request", async (req, res) => {
    const fullUrl = new URL(req.url, `http://localhost:${port}`);
    const index = fullUrl.searchParams.get("index");

    if (fullUrl.pathname !== "/song" && index === null) {
      return res.end();
    }
    promisesOfPrograms.length &&= 0;
    const realIndex = Number(index),
          options = Options.getOptionsOfSong(realIndex);
    const length = await initSpessaSynth({
      index: realIndex, ...options,
      onlySampleCount: true, isStartPlayer: true,
      spessasynthLogging
    });
    if (length === null) {
      res.statusCode = 204;
      res.flushHeaders()
      return res.end();
    }

    let [rangeStart, rangeEnd] = (
      // Skip "bytes=" and get the numbers
      req.headers.range
        .slice(6).split("-")
    );
    rangeStart = Number(rangeStart);
    //    In case it's not specified ↓
    rangeEnd   = Number(rangeEnd || "_");
    const specificRange = (
      !Number.isNaN(rangeEnd) || rangeStart > 0
    );
    let destination, header;
    destination = await prepareDestination({
      ...options, isPCM, res, mpv, length,
      getWavHeader, promisesOfPrograms, specificRange
    }, false);
    if (Array.isArray(destination)) {
      [destination, header] = destination;
    }

    const toStdoutValue = await toStdout({
      index: realIndex,
      options, res
    });
    if (toStdoutValue === null) return;
    const [ func, readStreamPromise ] = toStdoutValue;

    let stream = (
      destination?.stdin
        ? func?.(destination?.stdin, true)
        : func?.(destination, true, specificRange)
    );
    if (!specificRange) {
      await readStreamPromise
      await Promise.all(promisesOfPrograms)

      return res.end();
    }

    // Managing Range request
    let bytesWritten = 0, bytesDone = 0;
    const amountOfBytesToWrite = rangeEnd - rangeStart;
    stream = stream ?? destination?.stdout;

    // Maybe manage the header
    // if it exists
    if (header) headerWriteBlock: {
      const headerLength = header.length;
      if (rangeStart > headerLength) break headerWriteBlock;

      const actualHeader = header.subarray(rangeStart, rangeEnd);
      bytesWritten += actualHeader.length;
      res.write(actualHeader)
      if (bytesWritten >= amountOfBytesToWrite) return res.end();
    }

    let beyondRangeStart, startBytes;
    // If it goes beyond the header
    stream.on("data", data => {
      // Skip until rangeStart is reached or it's equal
      if (!beyondRangeStart &&
          (bytesDone += data.length) < rangeStart) return;
      beyondRangeStart ||= true;

      // Inside range
      const endBytes = amountOfBytesToWrite - bytesWritten;
      const dataToWrite = data.subarray(
        startBytes ?? (startBytes = 0, rangeStart),
        endBytes
      );
      bytesWritten += dataToWrite.length;
      res.write(dataToWrite)

      if (bytesWritten >= amountOfBytesToWrite) {
        stream.removeAllListeners("data")
        res.end()
      }
    })
  })
  await new Promise(resolve => {
    server.listen({ host: "localhost", port })
      .on("listening", resolve)
  })
  const amountOfSongs = Options.amountOfSongs;
  if (daemonMode) {
    loadingAnimation?.kill()
    if (!isVerboseLevelSet) console.error(
      formatStrings.grayedOutText,
      "Started server on port " + port + "\n"
      + "Available indexes: " + (
        amountOfSongs === 1
          ? "0" : "0-"+(amountOfSongs-1)
      )
    )
    log(INFO_LVL,
      "Started server on port " + port, "-",
      "Available indexes: " + (
        amountOfSongs === 1
          ? "0" : "0-"+(amountOfSongs-1)
      )
    )
    process.on("SIGINT",  () => process.exit(130))
    if (process.argv0 === "node") {
      process.on("SIGTERM", () => {
        // Needed otherwise it messes up terminal input/output
        // (see _stty echo_ and _stty icrnl_)
        fs.close(0); fs.close(1); fs.close(2)
        process.exit()
      })
    }

    await new Promise(resolve => server.on("close", resolve))
    process.exit()
  }
  const baseUrl = `http://localhost:${port}/song`;
  for (let i = 0; i < amountOfSongs; i++) {
    const filename = Options.getSongName(i);
    listOfURLs.push(`${baseUrl}?index=${i}&name=${filename}`)
  }

  const isPcm = (
    format === "f32le"
    || format === "pcm" || format === "s16le"
  );
  const isRawAudio = isPcm ? [
    "--demuxer=rawaudio",
    "--demuxer-rawaudio-format="+(format === "f32le" ? "floatle" : "s16le"),
    "--demuxer-rawaudio-rate="+(sampleRate ?? 48000),
    "--demuxer-rawaudio-channels=2"
  ] : "";
  const msgLevel = (
    !isPcm && format !== "wave"
      ? ["--msg-level=ffmpeg=fatal"] // Hides Content-Length mismatch error
      : ""
  );
  mpv = spawn("mpv", [
    ...msgLevel,
    "-ytdl=no", // so that it doesn't retry twice
    "--prefetch-playlist=yes",
    ...isRawAudio,
    ...listOfURLs
  ], { stdio: "inherit" });
  mpv.once("spawn", () => loadingAnimation?.kill())

  await new Promise((resolve, reject) => {
    mpv.once("exit", (code, signal) => {
      switch (code) {
        case 0:
        case 4:
        case code === null && signal === "SIGINT" && code:
          resolve(code, signal)
          break;

        case 2:
        default:
          reject(code, signal)
      }
    })
  })
    // Required because otherwise it can't exit
    .then(exitCode => !closing && process.exit(exitCode))
    .catch(async (code, signal) => {
      const errno = (code === null)
        ? (await import("node:util")).convertProcessSignalToExitCode(signal)
        : code;
      console.error(
        formatStrings.errorText,
        `mpv exited with ${errno}/${signal}`
      )
      process.exit(errno)
    })
}
async function prepareDestination({
  isVerboseLevelSet, isPCM, res, mpv,
  loadingAnimation, loadingAnimationCleanupFunc,
  dryRun, length, lengthOfFiles,
  getWavHeader, midiFile, singleFile,
  sampleRate, format,
  promisesOfPrograms,
  effects, reverbVolume, specificRange
}, isStdout) {
  let effectsProcess, fatalErrors,
      converterProcess, dryRunStream;
  if (isStdout) {
    dryRunStream = (
      dryRun &&
      fs.createWriteStream(dryRun,
        {fd: fs.openSync(dryRun, "r+")}
      )
    );
  }

  let stdoutHeader, transferEncodingHandler;
  const needsConvertion = (
    format === "mp3" || format === "opus"
    || format === "flac"
  );

  // Maybe create the header
  if (!isPCM) {
    const sumOfLengths = (
      isStdout
      ? (index, previous) => index + previous
      : undefined
    );
    let midiName;
    if (!isStdout) ({ name: midiName } = parse(midiFile));
    stdoutHeader = getWavHeader(
      {
        length: (
          isStdout
          ? lengthOfFiles.reduce(sumOfLengths, 0)
          : length
        ),
        numChannels: 2
      }, sampleRate ?? 48000,
      midiFile && !isStdout
        ? { title: midiName }
        : singleFile && { title: midiName }
    );
  }
  if (needsConvertion || effects && !specificRange) {
    // Necessary because otherwise the runtime
    // doesn't write the length in hex before the data
    transferEncodingHandler = data => {
      if (res.writableEnded) return;
      res.write(data)
    }
  }

  if (needsConvertion) {
    const { spawn } = child_process ??= await import("node:child_process");
    converterProcess = spawn("ffmpeg",
      ffmpegArgs()[format],
      {
        stdio: [
          "pipe",
          (!isStdout && "pipe" || dryRunStream) ?? process.stdout,
          "pipe"
        ], windowsHide: true
      }
    );
    log(DEBUG_LVL,
      "Spawned ffmpeg with", "-",
      "  " + (converterProcess.spawnargs.splice(0, 1), converterProcess.spawnargs)
        .join(" ")
    )
    if (!isStdout && !specificRange) {
      converterProcess.stdout.on("data", transferEncodingHandler)
    }
    converterProcess.stderr.on("data", data => {
      (fatalErrors ??= []).push(data.toString())
    })
    promisesOfPrograms.push(
      new Promise(resolve => {
        converterProcess.once("exit", exitCode => {
          if (!exitCode && !isStdout) {
            log(DEBUG_LVL, "Ffmpeg exited")
            return resolve();
          }
          ffmpegExitHandler.call({ stderr: fatalErrors }, exitCode)
        })
      })
    )
  }
  // Cleans up "Starting..." message if needed
  if (isStdout && !isVerboseLevelSet) {
    process.removeListener("exit", loadingAnimationCleanupFunc)
    loadingAnimation?.kill()
    process.stderr.write("\x1b[K")
  }
  // If it needs effects, excluding some formats
  if (effects && (isStdout ? !isPCM : needsConvertion)) {
    [effectsProcess] = await applyExternalEffects({
      program: "sox",
      stdoutHeader,
      stdout: (
        converterProcess?.stdin
          ?? (!isStdout && "pipe" || dryRunStream)
      ),
      promisesOfPrograms,
      reverbVolume, effects,
      addErrorEventToDest: dest => dest.on(
        "error", () => mpv?.kill()
      )
    });
    if (!converterProcess && !specificRange) {
      effectsProcess.stdout.on("data", transferEncodingHandler)
    }
    log(INFO_LVL, "Done setting up SoX")
  } else if (needsConvertion) {
    // Or just a conversion/normal processing
    converterProcess.stdin.write(stdoutHeader)
  }
  if (!isPCM) log(DEBUG_LVL,
    "Created header file", "-", " ", stdoutHeader
  )

  let destination;
  if (specificRange) destination = (
    // Sox or Ffmpeg
    converterProcess ?? effectsProcess
  );
  destination ??= (
    effectsProcess?.stdin      // Sox or
    ?? converterProcess?.stdin // Ffmpeg or
  );
  if (isStdout) {
    destination ??= (
      // dryRun/stdout
      !isPCM && (dryRunStream ?? process.stdout).write(stdoutHeader),
      dryRunStream ?? process.stdout
    );
  } else {
    // ServerResponse
    destination ??= !specificRange ? (
      !isPCM && res.write(stdoutHeader), res
    ) : [res, stdoutHeader];
  }
  return destination;
}

export {
  ffmpegArgs,
  initSpessaSynth,
  applyExternalEffects,
  addEvent, toStdout,
  toFile, Progress,
  startPlayer, prepareDestination
}

