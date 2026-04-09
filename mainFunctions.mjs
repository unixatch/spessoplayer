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

import {
  log,
  newFileName
} from "./utils/utils.mjs"

let stream,
    audioBuffer,
    SpessaSynth,
    child_process,
    doneStreaming = false;
const midiList = [],
      soundFontList = [];

/**
 * Simply returns an object containing ffmpeg's arguments in all supported formats
 * @param {String} [outFile="pipe:1"] file path to write to
 * @return {module:typeDefinitions~ffmpegArgsObj} available formats in Object format
 */
function ffmpegArgs(outFile = "pipe:1") {
  const BASIC_FFMPEG_ARGS = [
    "-loglevel", "fatal",
    "-hide_banner",
    "-i", "-"
  ];
  return {
    flac: BASIC_FFMPEG_ARGS.concat([
      "-f", "flac",
      "-compression_level", "12",
      outFile
    ]),
    mp3: BASIC_FFMPEG_ARGS.concat([
      "-f", "mp3",
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
  readStream, res, dryRun,
  effects,
  index,
  createNewFileNameAnyway,
  fileOutputs,
  stdoutHeader,
  promisesOfPrograms,
  outFile
}) {
  async function streamErrorHandling(error) {
    const { code, errno } = error;

    if ((process.argv.includes("-") || fileOutputs)
        && code === "EPIPE") {
      // Needed so that SoX can show its stderr
      await new Promise(resolve => {
        setTimeout(() => resolve(), 4);
      })
      if (global.SIGINT) process.exit(130)
      console.error(`${gray}Closed the program before finishing to render${normal}`)
      process.exit(errno)
    }
    if (code !== "EPIPE") {
      console.error(error, "\n")
      process.exit(errno)
    }
  }
  function addPipingFunction(func) {
    return (!func)
      ? pipingFunction = (whereToConnect, end) => {
        addErrorEventToDest(
          readStream
            .on("error", streamErrorHandling)
            .pipe(whereToConnect, { end })
        )
      }
      : pipingFunction = func;
  }
  function addErrorEventToDest(dest, altThis) {
    const finalDest = (altThis) ? altThis : dest,
          boundFunction = streamErrorHandling.bind(finalDest),
          reversedListOfEvents = dest.listeners("error").reverse();
    return (
      (reversedListOfEvents[0]?.name === boundFunction.name)
        ? finalDest
        : (dest.on("error", boundFunction), finalDest)
    );
  }
  let spawn;
  if (format !== "wave" && format !== ""
      && !/^.*(?:\.wav|\.wave)$/.test(outFile)
      && !/^.*\.(?:s16le|s32le|pcm)$/.test(outFile)) {
    ({ spawn } = child_process ??= await import("child_process"));
  }
  let toFileFormat;
  switch (format) {
    case /^.*\.flac$/.test(outFile):
      toFileFormat = "flac";
      break;
    case /^.*\.mp3$/.test(outFile):
      toFileFormat = "mp3";
      break;
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

      if (effects) {
        if (isStdout) {
          addPipingFunction();
        } else {
          await applyEffects({
            program: "sox",
            stdoutHeader, readStream,
            promisesOfPrograms,
            destination: outFile,
            effects: (Array.isArray(effects)) ? effects[index] : undefined
          })
        }
        log(1, performance.now().toFixed(2), doneSettingUpMsg)
        break;
      }
      if (isToFile) {
        const output = fs.createWriteStream(outFile, {fd: dryRun && fs.openSync(outFile, "r+")});
        addPipingFunction((whereToConnect, end) => {
          output.write(stdoutHeader ?? "")
          addErrorEventToDest(
            readStream
              .on("error", streamErrorHandling)
              .pipe(output, { end })
          )
        })
      } else addPipingFunction()
      log(1, performance.now().toFixed(2), doneSettingUpMsg)
      break;
    }
    case "flac":
    case "mp3": {
      addPipingFunction()
      log(1, performance.now().toFixed(2), `Done setting up ${format} format${(dryRun) ? " in dry run mode" : ""}`)
      break;
    }
    case /^.*\.flac$/.test(outFile):
    case /^.*\.mp3$/.test(outFile): {
      let doneSettingUpMsg = `Done setting up ${toFileFormat} outFile`;
      const newName = newFileName(outFile, createNewFileNameAnyway);
      fileOutputs[fileOutputs.indexOf(outFile)] = newName;
      outFile = newFileName(outFile, createNewFileNameAnyway);
      if (dryRun) {
        outFile = undefined;
        doneSettingUpMsg = `Done setting up ${toFileFormat} outFile in dry run mode`;
      }

      const ffmpeg = spawn(
        "ffmpeg",
        ffmpegArgs(outFile)[toFileFormat],
        { stdio: ["pipe", ((dryRun) ? "ignore" : "pipe"), "pipe"] }
      );
      log(1, performance.now().toFixed(2), "Spawned ffmpeg with " + ffmpeg.spawnargs.join(" "))
      if (effects) {
        await applyEffects({
          program: "sox",
          stdoutHeader, readStream,
          promisesOfPrograms,
          stdout: ffmpeg.stdin,
          effects: (Array.isArray(effects)) ? effects[index] : undefined
        })
        log(1, performance.now().toFixed(2), doneSettingUpMsg)
        break;
      }
      promisesOfPrograms.push(
        new Promise((resolve, reject) => {
          ffmpeg.on("error", reject)
          ffmpeg.on("exit", resolve)
        })
      )
      log(1, performance.now().toFixed(2), "Added promise")
      addPipingFunction(() => {
        ffmpeg.stdin.write(stdoutHeader)
        addErrorEventToDest(
          readStream
            .on("error", streamErrorHandling)
            .pipe(ffmpeg.stdin),
          ffmpeg
        )
      })
      log(1, performance.now().toFixed(2), doneSettingUpMsg)
      break;
    }
    case "pcm":
    case /^.*\.(?:s16le|s32le|pcm)$/.test(outFile): {
      if (isToFile) {
        const newName = newFileName(outFile, createNewFileNameAnyway);
        fileOutputs[fileOutputs.indexOf(outFile)] = newName;
        outFile = newFileName(outFile, createNewFileNameAnyway);
      }
      if (dryRun) outFile = dryRun;

      let output;
      if (isToFile) {
        output = fs.createWriteStream(outFile, {fd: dryRun && fs.openSync(outFile, "r+")});
      } else {
        output = (res) ? res : process.stdout;
        if (dryRun) output = fs.createWriteStream(dryRun, {fd: fs.openSync(dryRun, "r+")});
      }
      log(1,
        performance.now().toFixed(2),
        (isStdout)
          ? "Done setting up" + ((dryRun) ? " dry run" : "")
          : "Done setting up pcm outFile" + ((dryRun) ? " in dry run mode" : "")
      )
      addPipingFunction((whereToConnect, end) => {
        addErrorEventToDest(
          readStream
            .on("error", streamErrorHandling)
            .pipe(output, { end })
        )
      })
      break;
    }

    // default is only used for toStdout
    default: {
      if (isToFile) break;

      const doneSettingUpMsg = "Done setting up" + ((dryRun) ? " dry run" : "");
      addPipingFunction((whereToConnect, end) => {
        const destination = (res) ? res : whereToConnect;
        addErrorEventToDest(
          readStream
            .on("error", streamErrorHandling)
            .pipe(destination, { end })
        )
      })
      log(1, performance.now().toFixed(2), doneSettingUpMsg)
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
  loopEnd
}) {
  let loopDetectedInMidi = false;
  if (midi.loop.start > 0) {
    loopDetectedInMidi = true;
    loopStart = midi.midiTicksToSeconds(midi.loop.start);
    loopEnd = midi.midiTicksToSeconds(midi.loop.end);
  }
  const possibleLoopAmount = (loopAmount === 0) ? loopAmount+1 : loopAmount ?? 1;
  let sampleCount,
      durationInSeconds = midi.duration;
  if ((loopAmount ?? 0) === 0) {
    sampleCount = Math.ceil(sampleRate * durationInSeconds);
  } else {
    let end;
    if (loopEnd === undefined && !loopDetectedInMidi) {
      end = midi.duration;
    } else if (loopEnd !== undefined && !loopDetectedInMidi) {
      end = midi.duration - loopEnd;
    } else end = loopEnd;

    durationInSeconds = midi.duration + ((end - loopStart) * possibleLoopAmount);
    sampleCount = Math.ceil(sampleRate * durationInSeconds);
  }
  log(1, performance.now().toFixed(2), "Sample count set to " + sampleCount)
  return {
    loopDetectedInMidi,
    durationInSeconds,
    sampleCount
  };
}
/**
 * Initializes all the required variables for spessasynth_core usage
 * @param {module:typeDefinitions~initObjectParameters} initObjectParameters
 * @return {Promise<module:typeDefinitions~initSpessaSynthObj|Number>} initSpessaSynthObj
 */
async function initSpessaSynth({
  loopAmount = 0,
  volume = 100/100,
  midiFile, soundfontFile,
  sampleRate = 48000,
  loopStart, loopEnd,
  index, indexOfGroup,
  isToFile = false,
  onlySampleCount = false, onlyDuration = false
}) {
  const {
    BasicMIDI,
    SoundBankLoader,
    SpessaSynthProcessor,
    SpessaSynthSequencer
  } = SpessaSynth ??= await import("spessasynth_core");

  const midi = (
    (onlyDuration || isToFile)
      ? BasicMIDI.fromArrayBuffer(fs.readFileSync(midiFile))
      : midiList[index] ??= BasicMIDI.fromArrayBuffer(fs.readFileSync(midiFile))
  );
  if (!onlySampleCount && !onlyDuration) {
    soundFontList[indexOfGroup] ??= (
      (isToFile)
        ? soundfontFile
        : fs.readFileSync(soundfontFile)
    );
  }
  const {
    sampleCount,
    durationInSeconds,
    loopDetectedInMidi
  } = getSampleCount({
    midi,
    sampleRate,
    loopAmount,
    loopStart, loopEnd
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
  const synth = new SpessaSynthProcessor(sampleRate, {
    enableEventSystem: false,
    enableEffects: false
  });
  synth.setMasterParameter("masterGain", volume)
  // Save the SoundFont2 class to soundFontList so that
  // it's a reference and not a copy next time
  if (Buffer.isBuffer(soundFontList[indexOfGroup])
      || soundFontList[indexOfGroup] instanceof SharedArrayBuffer) {
    soundFontList[indexOfGroup] = SoundBankLoader.fromArrayBuffer(soundFontList[indexOfGroup]);
  }
  synth.soundBankManager.addSoundBank(
    soundFontList[indexOfGroup],
    "main"
  )
  await synth.processorInitialized
  const seq = new SpessaSynthSequencer(synth);
  seq.loadNewSongList([midi])
  seq.loopCount = loopAmount;
  seq.play();

  log(1, performance.now().toFixed(2), "Finished setting up SpessaSynth")
  return {
    seq, synth,
    midi,
    sampleCount, durationInSeconds
  }
}
/**
 * Applies effects using SoX
 * @param {module:typeDefinitions~effectsObjectParams} effectsObjectParams
 * @return {Promise<Array<ChildProcess,Array>>} array containing SoX's process and the array of promises for both ffmpeg and SoX processes
 *
 * @example
 * applyEffects({ program: "sox", stdoutHeader, readStream })
 */
async function applyEffects({
  program,
  stdoutHeader, readStream,
  promisesOfPrograms,
  stdout = process.stdout,
  destination = "-",
  effects = ["reverb", "20", "36", "100", "100", "10", "10"]
}) {
  /*
    ffmpeg
      -i -
      -i parking-garage-response.wav
      -lavfi "afir,volume=70"
      -f wav
        pipe:1
  */
  const { spawn } = child_process ??= await import("child_process");
  // In case it's custom
  if (effects[0]?.effect) {
    // cloning the effects array so that it can be unpacked
    const oldEffectsArray = [...effects];
    effects.length = 0;
    oldEffectsArray
      .forEach((i) => {
        if (i.values) {
          effects.push(i.effect, ...i.values)
          return;
        }
        effects.push(i.effect)
      })
  }
  const sox = spawn(program, [
    "-t", "wav", "-",
    "-t", "wav", destination,
    ...effects
  ], {stdio: ["pipe", stdout, "pipe"], detached: true})
  //  For SIGINT event to work, sometimes... ↑
  log(1, performance.now().toFixed(2), "Spawned SoX with " + sox.spawnargs.join(" "))

  promisesOfPrograms.push(
    new Promise(resolve => {
      sox.stderr.on("data", (data) => {
        const stringOfError = data.toString();
        // Do not print if these match stringOfError
        if (stringOfError.match(/sox FAIL sox: `-' error writing output file: Connection reset by peer\n/g)
            || stringOfError.match(/\n*sox WARN \w*:.*can't seek.*\n*/g)) return;

        const modifiedString = stringOfError
          .replace( // Adds yellow to numbers
            /(-*[0-9]+(?:ms|dB|%|q)*)/g,
            `${normalYellow}$1${normal}`
          )
          .replace( // Adds bold gray to the default parameters that can be overriden
            /(\] |\) )(\[)([\w-]*)/g,
            `$1$2${dimGrayBold}$3${normal}`
          )
          .replace( // Adds green to the parameter that has wrong values
            /(parameter )(`\w*')/g,
            `$1${green}$2${normal}`
          )
          .replace( // Adds red to the sox FAIL... text
            /(sox FAIL \w*)/g,
            `${red}$1${normal}`
          )
          .replace( // Adds yellow and a new line to the warn text for programs like mpv
            /(sox WARN \w*)/g,
            `\n${yellow}$1${normal}`
          )
          .replace( // Adds gray to the optional parameters for the effects
            /(\[[ \w|-]*\])/g,
            `${gray}$1${normal}`
          )
          // Patch for the regex above
          .replace(/m\[0m/g, "\x1b[0m");

        console.error(modifiedString);
      })
      sox.on("exit", resolve)
    })
  )
  sox.stdin.write(stdoutHeader)
  readStream?.pipe(sox.stdin)
  log(1, performance.now().toFixed(2), "Finished setting up SoX")
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
    case "toFileSIGINT": {
      return addAndCheckEvent("SIGINT", func);
    }
    case "SIGINT": {
      function SIGINTFunction() {
        console.error(`${gray}Closed with Ctrl+c${normal}`);
        global.SIGINT = true;
        if (process.argv.includes("-")) process.exit(130)
      }
      return addAndCheckEvent("SIGINT", SIGINTFunction);
    }
    case "stdoutExit": {
      return new Promise(resolve => {
        if (child_process) return resolve(child_process.spawnSync);

        import("child_process")
          .then(module => {
            child_process ??= module;
            resolve(module.spawnSync)
          })
      }).then(spawnSync => {
        function stdoutExit() {
          if (!doneStreaming && !global.SIGINT) return;

          // Necessary for programs like mpv
          const commandToSend = (
            (process.platform === "win32")
              ? () => spawnSync("taskkill", [
                  "/PID", process.pid, "/T", "/F"
                ])
              : () => process.kill(process.pid, "SIGKILL")
          );
          const argumentsForCommand = [],
                searchCommand = (process.platform === "win32") ? "tasklist" : "ps";
          let regexForCommand;

          // Windows
          if (process.platform === "win32") {
            const arrayOfProgramsWinVersion = ["mpv.exe"];
            regexForCommand = new RegExp(
              `(?:${arrayOfProgramsWinVersion.join("|")})\\s*(?<pid>\\d+)`,
              "g"
            );
          } else {
            // Unix
            const arrayOfPrograms = ["mpv"];
            argumentsForCommand.push(
              "-o", "pid,comm",
              "-C", "node,"+arrayOfPrograms.join(",")
            )
            regexForCommand = new RegExp(
              `(?<pid>\\d+) (?:${arrayOfPrograms.join("|")})`,
              "g"
            );
          }

          // Get PIDs by group name ?<pid>
          const iteratorObject = (
            spawnSync(searchCommand, argumentsForCommand)
               .stdout.toString()
               .matchAll(regexForCommand)
               .map(i => i.groups)
          );
          // If it matches something,
          // check whether it's a connected pipe to the program before SIGKILLing
          for (const foundProgram of iteratorObject) {
            const pid = Number(foundProgram.pid);
            if (pid >= process.pid && pid <= process.pid+20
                || process.platform === "win32") {
              commandToSend()
              break;
            }
          }
        }
        return addAndCheckEvent("exit", stdoutExit);
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
  getData,
  progressBuffers
}) {
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
        midiTicksToSeconds,
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

  let textRenderingIndex = 0,
      lastBytes = false,
      filledSamples = 0,
      lastCompletelyRenderedSeconds,
      lastLoopCount = seq.loopCount;
  const BUFFER_SIZE = 128,
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
      seq.processTick()
      synth.renderAudio(
        stereoChannels, [], [],
        0,
        bufferSize
      )
      filledSamples += bufferSize;
      if (!isStdout) toFileTextRendering: {
        textRenderingIndex++
        if (!lastBytes) {
          if (textRenderingIndex % 100 !== 0) break toFileTextRendering;
        }

        setRenderedAmount()
        progress.updateProgress(
          (progress.renderedAmount / progress.amountToRender) * 100,
          "percentageDone"
        )
      }

      if (filledSamples <= sampleCount && !lastBytes) {
        if (filledSamples === sampleCount) lastBytes = true;
        const data = getData(stereoChannels);
        // Clean up old data for both channels
        left.fill(0, 0, BUFFER_SIZE)
        right.fill(0, 0, BUFFER_SIZE)
        return this.push(data)
      }
      this.push(null)
    }
  });
  log(1, performance.now().toFixed(2), `Created Readable for ${(isStdout) ? "toStdout" : "toFile"}`)
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
  log(1, performance.now().toFixed(2), "Started toStdout")
  const {
    seq, synth, sampleCount
  } = await initSpessaSynth({ index, ...options });

  if (!res && !process.listenerCount("exit")) {
    addEvent({ eventType: "stdoutExit" })
    log(1, performance.now().toFixed(2), "Added event exit")
  }
  const { getData } = audioBuffer ??= await import("./audioBuffer.mjs");
  const {
    promises: { finished },
    Readable
  } = stream ??= await import("node:stream");

  doneStreaming &&= false;
  const readStream = createReadable(Readable, true, {
    sampleCount,
    seq, synth,
    getData
  });

  const promisesOfPrograms = [];
  const pipingFunction = await formatManager({
    format, readStream,
    index, res,
    ...options,
    promisesOfPrograms
  });
  log(1, performance.now().toFixed(2), "Finished creating the stdout promise")
  return [
    pipingFunction,
    Promise.all([
      finished(readStream, { cleanup: true })
        .then(() => {
          doneStreaming = true;
          synth.soundBankManager.soundBankList.splice(0)
          return synth.destroySynthProcessor();
        }),
      ...promisesOfPrograms // If there are any
    ])
  ];
}

/**
 * Reads the generated samples from spessasynth_core
 * and renders them to a wav file
 * @param {Object}      toFileObjectParameters
 * @param {Boolean}     toFileObjectParameters.createNewFileNameAnyway if it's necessary to create a new file name
 * @param {Number}      toFileObjectParameters.index                   index of the song
 * @param {Object}      toFileObjectParameters.progressBuffers         progress shared buffers used by Progress class
 * @param {module:typeDefinitions~toFileOptionsObject} toFileObjectParameters.toFileOptionsObject
 * @throws {ReferenceError} - if some required files are missing
 * @return {Promise<module:typeDefinitions~toFileArray>} array that contains the fileOutputs array and a promise
 */
async function toFile({
  createNewFileNameAnyway, index,
  progressBuffers,
  options
}) {
  if (!options.midiFile
      || !options.soundfontFile
      || options.fileOutputs.length === 0) {
    throw new ReferenceError("Missing some required files")
  }
  log(1, performance.now().toFixed(2), "Started toFile")
  const {
    seq, synth, sampleCount
  } = await initSpessaSynth({ index, ...options, isToFile: true });

  const {
    getWavHeader,
    getData
  } = audioBuffer ??= await import("./audioBuffer.mjs");
  const {
    promises: { finished },
    Readable
  } = stream ??= await import("node:stream");

  const stdoutHeader = getWavHeader({ length: sampleCount, numChannels: 2 }, options.sampleRate);
  log(1, performance.now().toFixed(2), "Created header file ", stdoutHeader)

  const readStream = createReadable(Readable, false, {
    sampleCount,
    seq, synth,
    getData,
    index, progressBuffers
  });
  const promisesOfPrograms = [],
        pipingFunctions = [];
  for (let outFile of options.fileOutputs) {
    const pipingFunction = await formatManager({
      readStream,
      index, ...options,
      createNewFileNameAnyway,
      stdoutHeader,
      promisesOfPrograms, outFile
    });
    pipingFunctions.push(pipingFunction)
  }
  return [
    options.fileOutputs,
    pipingFunctions,
    Promise.all([
      finished(readStream, { cleanup: true })
        .then(() => {
          synth.soundBankManager.soundBankList.splice(0)
          return synth.destroySynthProcessor();
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
  #index;

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
    return yellow+(this.#sum(this.#percentageDone).toFixed(2))+normal+"%";
  }
  /**
   * Gives the amount of minutes rendered
   * alongside the total to do only if it has the necessary informations
   * @type {(undefined|String)}
   */
  get minutesRenderedText() {
    if (this.#index !== undefined) return;
    return `${magenta}`
            // Gets the ISO format and then gets mm:ss.sss
            + new Date(
                (Math.floor(this.#sum(this.#renderedAmount) * 100) / 100) * 1000
              )
                .toISOString()
                .replace(/.*T...(.*)Z/, "$1")
            + `${normal}`
            + " / "
            + `${brightMagenta}`
              // Same down here
            + new Date(this.#amountToRender * 1000)
                .toISOString()
                .replace(/.*T...(.*)Z/, "$1")
            + `${normal}`;
  }
  /**
   * Updates the progress number of renderedAmount
   * by the provided index passed to the constructor
   * @param {Number} newNumber new value to replace with
   * @param {String} typeOfArray type of array to update
   * @throws {TypeError} - if trying to update with a full shared array
   */
  updateProgress(newNumber, typeOfArray = "renderedAmount") {
    if (this.#index === undefined) throw new TypeError("Can't update with full shared array")

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
 */
async function startPlayer(Options) {
  const listOfOptions = Options.all;
  const { getWavHeader }     = await import("./audioBuffer.mjs"),
        { spawn }            = child_process ??= await import("child_process"),
        { createServer }     = await import("http");

  const port = 3000,
        server = createServer(),
        filesList = listOfOptions.files,
        listOfURLs = [],
        promisesOfPrograms = [];

  server.on("request", async (req, res) => {
    const fullUrl = new URL(req.url, `http://localhost:${port}`);
    const index = fullUrl.searchParams.get("index");

    if (fullUrl.pathname !== "/song" && index === null) {
      return res.end();
    }
    const realIndex = Number(index),
          options = Options.getOptionsOfSong(realIndex);
    const length = await initSpessaSynth({
      index: realIndex, ...options,
      onlySampleCount: true
    });

    let effectsProcess,
        converterProcess;
    // Creating the header
    const stdoutHeader = getWavHeader({ length, numChannels: 2 }, listOfOptions?.sampleRate ?? 48000);

    // Needed even if it's wrong because
    // otherwise mpv gives out a fatal error
    // only if it's a flac convertion (buggy ffmpeg?)
    if (listOfOptions?.format === "flac") {
      res.setHeader("Content-Length", length << 4)
      res.flushHeaders()
    }

    // If it needs to be converted
    const needsConvertion = listOfOptions?.format?.match(/(?:wave|pcm|s16le|s32le)/) === null;
    if (needsConvertion) {
      const { spawn } = child_process ??= await import("child_process");
      converterProcess = spawn("ffmpeg",
        ffmpegArgs()[listOfOptions?.format],
        {stdio: ["pipe", res.socket, "pipe"]}
      );
    }
    // If it needs effects
    if (listOfOptions?.effects
        && (listOfOptions?.format?.match(/(?:pcm|s16le|s32le)/) === null
        || !listOfOptions?.format)) {
      [effectsProcess] = await applyEffects({
        program: "sox",
        stdoutHeader,
        stdout: (converterProcess) ? converterProcess.stdin : res.socket,
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
      res.write(stdoutHeader)
      destination = res;
    }
    const [ func, promise ] = await toStdout({
      index: realIndex,
      options, res
    });
    if (func) func(destination, true)
    await Promise.all([promise, promisesOfPrograms])

    return res.end();
  })
  const amountOfSongs = Options.amountOfSongs;
  for (let i = 0; i < amountOfSongs; i++) {
    listOfURLs.push(`http://localhost:${port}/song?index=${i}`)
  }
  server.listen({ host: "localhost", port })

  const isRawAudio = (listOfOptions?.format === "pcm") ? [
    "--demuxer=rawaudio",
    "--demuxer-rawaudio-format=s16le",
    "--demuxer-rawaudio-rate="+(listOfOptions?.sampleRate ?? 48000),
    "--demuxer-rawaudio-channels=2"
  ] : "";
  const msgLevel = (!listOfOptions?.format?.match(/wave|pcm/))
                      // Hide Content-Length mismatch error
                    ? ["--msg-level=ffmpeg=fatal"]
                    : [];
  const mpv = spawn("mpv", [
    ...msgLevel,
    ...isRawAudio,
    ...listOfURLs
  ], { stdio: "inherit" });
  await new Promise((resolve, reject) => {
    mpv.on("exit", (code, signal) => {
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
    .then(process.exit)
    .catch(async (code, signal) => {
      const errno = (code === null)
        ? (await import("util")).convertProcessSignalToExitCode(signal)
        : code;
      console.error(
        `${red}mpv exited with ${errno}/${signal+normal}`
      )
      process.exit(errno)
    })
}

export {
  ffmpegArgs,
  initSpessaSynth,
  applyEffects,
  addEvent,
  toStdout,
  toFile,
  Progress,
  startPlayer
}

