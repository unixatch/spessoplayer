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
  newFileName,
  clearLastLines
} from "./utils/utils.mjs"

let spawn,
    spawnSync,
    BasicMIDI,
    SoundBankLoader,
    SpessaSynthProcessor,
    SpessaSynthSequencer;
const soundFontList = [];

/**
 * @typedef ffmpegArgsObj
 * @type {Object}
 * @property {String[]} flac
 * @property {String[]} mp3
 */
/**
 * Simply returns an object containing ffmpeg's arguments in all supported formats
 * @param {String} [outFile="pipe:1"] - file path to write to
 * @return {ffmpegArgsObj} - available formats in Object format
 */
function ffmpegArgs(outFile = "pipe:1") {
  return {
    flac: [
      "-i", "-",
      "-f", "flac",
      "-compression_level", "12",
      outFile
    ],
    mp3: [
      "-i", "-",
      "-f", "mp3",
      "-aq", "0",
      outFile
    ]
  };
}
/**
 * Manager for all type of formats
 * @param {Object} formatObj - necessary object
 * @param {(String|Boolean)} [formatObj.format=true] - type of format
 * @param {Readable} formatObj.readStream - ReadStream for piping
 * @param {ResponseServer} [formatObj.res] - optional ResponseServer
 * @param {Object[]} [formatObj.effects] - list of effects to apply
 * @param {Number} formatObj.index - index of the song
 * @param {Boolean} [formatObj.createNewFileNameAnyway] - if it's necessary to create a new file name
 * @param {String[]} [formatObj.fileOutputs] - list of file outputs
 * @param {Uint8Array} [formatObj.stdoutHeader] - header of the file
 * @param {Promise[]} formatObj.promisesOfPrograms - list of promises for ffmpeg and SoX
 * @param {String} [formatObj.outFile] - file name to output
 * @return {Promise<Function>} - Either a piping function or a promise for piping
 */
async function formatManager({
  format = true,
  readStream, res,
  effects,
  index,
  createNewFileNameAnyway,
  fileOutputs,
  stdoutHeader,
  promisesOfPrograms,
  outFile
}) {
  function addPipingFunction(func) {
    return (!func)
      ? pipingFunction = (whereToConnect, end) => {
        readStream.pipe(whereToConnect, { end })
      }
      : pipingFunction = func;
  }
  if (format !== "wave" && format !== ""
      && !/^.*(?:\.wav|\.wave)$/.test(outFile)
      && !/^.*\.(?:s16le|s32le|pcm)$/.test(outFile)) {
    if (!spawn) ({ spawn } = await import("child_process"));
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
        const output = fs.createWriteStream(outFile);
        addPipingFunction(() => {
          output.write(stdoutHeader ?? "")
          readStream.pipe(output)
        })
      } else addPipingFunction()
      log(1, performance.now().toFixed(2), doneSettingUpMsg)
      break;
    }
    case "flac":
    case "mp3": {
      pipingFunction = (whereToConnect, end) => {
        readStream.pipe(whereToConnect, { end })
      };
      log(1, performance.now().toFixed(2), `Done setting up ${format} format`)
      break;
    }
    case /^.*\.flac$/.test(outFile):
    case /^.*\.mp3$/.test(outFile): {
      const doneSettingUpMsg = `Done setting up ${toFileFormat} outFile`;
      const newName = newFileName(outFile, createNewFileNameAnyway);
      fileOutputs[fileOutputs.indexOf(outFile)] = newName;
      outFile = newFileName(outFile, createNewFileNameAnyway);
      
      const ffmpeg = spawn("ffmpeg", ffmpegArgs(outFile)[toFileFormat]);
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
          ffmpeg.on("error", e => reject(e))
          ffmpeg.on("exit", () => resolve())
        })
      )
      log(1, performance.now().toFixed(2), "Added promise")
      addPipingFunction(() => {
        ffmpeg.stdin.write(stdoutHeader)
        readStream.pipe(ffmpeg.stdin)
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
      
      let output;
      if (isToFile) {
        output = fs.createWriteStream(outFile);
      } else {
        output = (res) ? res : process.stdout;
      }
      log(1,
        performance.now().toFixed(2),
        (isStdout)
          ? "Done setting up"
          : "Done setting up pcm outFile"
      )
      addPipingFunction(() => readStream.pipe(output))
      break;
    }
    
    // default is only used for toStdout
    default: {
      if (isToFile) break;
      
      const doneSettingUpMsg = "Done setting up";
      if (effects) {
        addPipingFunction()
        log(1, performance.now().toFixed(2), doneSettingUpMsg)
        break;
      }
      log(1, performance.now().toFixed(2), doneSettingUpMsg)
      addPipingFunction(() => {
        readStream.pipe((res) ? res : process.stdout)
      })
    }
  }
  return pipingFunction;
}
/**
 * @typedef getSampleCountObj
 * @type {Object}
 * @property {Boolean} loopDetectedInMidi
 * @property {Number} durationInSeconds
 * @property {Number} sampleCount
 */
/**
 * Calculates the sample count to use
 * @param {Object} sampleCountObj - necessary object
 * @param {BasicMIDI} sampleCountObj.midi - The BasicMIDI class to use
 * @param {Number} [sampleCountObj.sampleRate=48000] - The sample rate to use
 * @param {Number} [sampleCountObj.loopAmount] - The amount of loops to do
 * @param {Number} [sampleCountObj.loopStart=midi.midiTicksToSeconds(midi.loop.start)] - start of loop
 * @param {Number} [sampleCountObj.loopEnd] - end of loop
 * @return {getSampleCountObj} object containing loopDetectedInMidi and sampleCount
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
 * @typedef initSpessaSynthObj
 * @type {Object}
 * @property {SpessaSynthSequencer} seq
 * @property {SpessaSynthProcessor} synth
 * @property {BasicMIDI} midi
 * @property {Number} sampleCount
 * @property {Number} sampleRate
 * @property {Number} durationInSeconds
 */
/**
 * Initializes all the required variables for spessasynth_core usage
 * @param {Object} initObj - necessary object
 * @param {Number} [initObj.loopAmount=0] - the loop amount
 * @param {Number} [initObj.volume=100/100] - the volume to set
 * @param {String} initObj.midiFile - midi file
 * @param {String} initObj.soundfontFile - soundfont file
 * @param {Number} [initObj.sampleRate=48000] - sample rate
 * @param {Number} initObj.loopStart - start of loop
 * @param {Number} initObj.loopEnd - end of loop
 * @param {Number} initObj.indexOfGroup - index of the Set/group the song is in
 * @param {Boolean} [initObj.onlySampleCount=false] - if it should return just the sample count of the song and do nothing else
 * @return {Promise<initSpessaSynthObj|Number>} initSpessaSynthObj
 */
async function initSpessaSynth({
  loopAmount = 0,
  volume = 100/100,
  midiFile, soundfontFile,
  sampleRate = 48000,
  loopStart, loopEnd,
  indexOfGroup, onlySampleCount = false
}) {
  if (!SpessaSynthProcessor) {
    ({
      BasicMIDI,
      SoundBankLoader,
      SpessaSynthProcessor,
      SpessaSynthSequencer
    } = await import("spessasynth_core"));
  }
  const mid = fs.readFileSync(midiFile);
  let sf;
  if (!onlySampleCount) sf = soundFontList[indexOfGroup] ??= fs.readFileSync(soundfontFile);
  const midi = BasicMIDI.fromArrayBuffer(mid);
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
  if (Buffer.isBuffer(sf)) {
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
  
  addEvent({ eventType: "uncaughtException" })
  log(1, performance.now().toFixed(2), "Finished setting up SpessaSynth")
  return {
    seq, synth,
    midi,
    sampleCount, sampleRate,
    durationInSeconds
  }
}
/**
 * Applies effects using SoX
 * @param {Object} obj - the object passed
 * @param {String} obj.program - the process to spawn, sox usually
 * @param {Stream} obj.stdoutHeader - the header to process
 * @param {Stream} [obj.readStream] - the data to process
 * @param {Promise[]} obj.promisesOfPrograms - list of promises for ffmpeg and SoX
 * @param {Stream} [obj.stdout=process.stdout] - the destination
 * @param {String} [obj.destination="-"] - the destination path
 * @param {(String[]|Object[])} [obj.effects=String[]] - all effects to pass to SoX
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
  if (!spawn) ({ spawn } = await import("child_process"));
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
      sox.on("exit", () => resolve())
    })
  )
  sox.stdin.write(stdoutHeader)
  readStream?.pipe(sox.stdin)
  log(1, performance.now().toFixed(2), "Finished setting up SoX")
  return [sox, promisesOfPrograms];
}
/**
 * Adds events to process
 * @param {Object} obj - the object passed
 * @param {String} obj.eventType - the type of event to add
 * @param {Function} [obj.func] - optional function for eventType "exit"
 * @return {Boolean} if it has added the event successfully or not
 * @example
 * addEvent({ eventType: "SIGINT" })
 */
function addEvent({ eventType, func }) {
  switch (eventType) {
    case "uncaughtException": {
      // Adds on top of spessasynth_core's uncaughtException
      const oldUncaughtException = process.rawListeners("uncaughtException")[0];
      process.removeListener("uncaughtException", oldUncaughtException)
      const hasBeenAdded = process.on("uncaughtException",
        async (error, origin) => {
          if (global.SIGINT) return process.exit();
          if (error?.code === "EPIPE") {
            // Needed so that SoX can show its stderr
            await new Promise(resolve => {
              setTimeout(() => resolve(), 4);
            })
            console.error(`${gray}Closed the program before finishing to render${normal}`);
            return process.exit(2);
          }
          oldUncaughtException(error, origin)
        }
      ).listeners("uncaughtException").length > 0;
      return hasBeenAdded;
    }
    case "exit": {
      const hasBeenAdded = process.on("exit", func).listeners("exit").length > 0;
      return hasBeenAdded;
    }
    case "renderTexts": {
      const hasBeenAdded = process.stdout.on("renderTexts",
        (progress) => {
          clearLastLines([0, -1])
          console.info(
            progress.minutesRenderedText,
            "| " + progress.percentageText
          )
        }
      ).listeners("renderTexts").length > 0;
      return hasBeenAdded;
    }
    case "SIGINT": {
      const hasBeenAdded = process.on("SIGINT", () => {
        console.error(`${gray}Closed with Ctrl+c${normal}`);
        global.SIGINT = true;
      }).listeners("SIGINT").length > 0;
      return hasBeenAdded;
    }
  }
}
/**
 * Creates a Readable stream given the variables needed
 * @param {Readable} Readable - Readable stream function
 * @param {Boolean} [isStdout=false] - if it's for toStdout or not
 * @param {Object} obj - the object passed
 * @param {Number} obj.sampleCount - sample count
 * @param {Number} obj.sampleRate - sample rate
 * @param {Number} [obj.index] - index of the song
 * @param {Number} [obj.i] - counter for the progress
 * @param {Number} [obj.durationRounded] - duration of the song rounded by percentage
 * @param {Object} [obj.progress] - progress information object
 * @param {SpessaSynthSequencer} obj.seq - spessasynth_core' sequencer
 * @param {SpessaSynthProcessor} obj.synth - spessasynth_core's processor
 * @param {Function} obj.getData - translator: Float32Arrays → Uint8Arrays
 * @return {Readable} a Readable
 */
function createReadable(Readable, isStdout = false, {
  sampleCount, sampleRate,
  index, i, durationRounded,
  progress,
  seq, synth,
  getData
}) {
  /**
   * Calculates the rendered amount of seconds
   * with loops accounted for when they start
   * @inner
   * @private
   * @memberof module:main
   */
  function calculateRenderedAmount() {
    // Change in loopCount
    if (lastLoopCount !== seq.loopCount) {
      lastCompletelyRenderedSeconds = progress.renderedAmount[index];

      const loopStart = seq.midiData.loop.start;
      const currentTime = seq.currentTime - seq.midiData.midiTicksToSeconds(loopStart);
      progress.renderedAmount[index] = lastCompletelyRenderedSeconds + currentTime;

      lastLoopCount = seq.loopCount;
      return;
    }
    // Use the last completely rendered seconds
    // since the last completed loop
    if (lastCompletelyRenderedSeconds) {
      const loopStart = seq.midiData.loop.start;
      const currentTime = seq.currentTime - seq.midiData.midiTicksToSeconds(loopStart);
      progress.renderedAmount[index] = lastCompletelyRenderedSeconds + currentTime;
      return;
    }

    progress.renderedAmount[index] = seq.currentTime;
  }

  let lastBytes = false,
      filledSamples = 0,
      lastCompletelyRenderedSeconds,
      lastLoopCount = seq.loopCount;
  const BUFFER_SIZE = 128,
        left = new Float32Array(BUFFER_SIZE),
        right = new Float32Array(BUFFER_SIZE),
        arr = [left, right];
  if (progress) {
    if (!process.stdout.listeners("renderTexts").length > 0) {
      addEvent({ eventType: "renderTexts" })
    }
    progress.amountToRender += durationRounded;
  }

  const readStream = new Readable({
    read() {
      const bufferSize = Math.min(BUFFER_SIZE, sampleCount - filledSamples);
      seq.processTick()
      synth.renderAudio(
        arr, [], [],
        0,
        bufferSize
      )
      filledSamples += bufferSize;
      if (!isStdout) toFileRendering: {
        i++
        if (i % 100 !== 0) break toFileRendering;

        calculateRenderedAmount()
        progress.percentageDone[index] = (progress.renderedAmount[index] / progress.amountToRender) * 100;
        process.stdout.emit("renderTexts", progress)
      }
      
      if (filledSamples <= sampleCount && !lastBytes) {
        if (filledSamples === sampleCount) lastBytes = true;
        const data = getData(arr, sampleRate);
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
 * @typedef toStdoutArray
 * @type {Array}
 * @property {Number} sampleCount
 * @property {Function} pipingFunction
 * @property {Promise<Array>} sampleCount
 */
/**
 * Reads the generated samples from spessasynth_core
 * and spits them out to stdout
 * @param {Object} obj1
 * @param {Number} obj1.index - index of the song
 * @param {ResponseServer} [obj1.res] - optional ResponseServer
 * @param {Number} [obj1.loopAmount] - the number of loops to do
 * @param {Number} [obj1.loopStart] - start of loop
 * @param {Number} [obj1.loopEnd] - end of loop
 * @param {Number} [obj1.sampleRate] - sample rate
 * @param {Number} [obj1.volume=100/100] - the volume of the song
 * @param {String} obj1.midiFile - midi file
 * @param {String} obj1.soundfontFile - soundfont file
 * @param {String} [obj1.format] - format of the somg
 * @param {Object[]} [obj1.effects] - effects for the song
 * @param {Number} obj1.indexOfGroup - index of the Set/group the song is in
 * @throws {ReferenceError} - if some required files are missing
 * @return {Promise<toStdoutArray>} toStdoutArray
 */
async function toStdout({
  index, res,
  loopAmount,
  loopStart, loopEnd,
  sampleRate = 48000,
  volume = 100/100,
  midiFile, soundfontFile,
  format, effects,
  indexOfGroup
}) {
  if (!midiFile || !soundfontFile) {
    throw new ReferenceError("Missing some required files")
  }
  log(1, performance.now().toFixed(2), "Started toStdout")
  let seq, synth, sampleCount;
  ({
    seq, synth,
    sampleCount, sampleRate
  } = await initSpessaSynth({
    loopAmount,
    volume,
    midiFile, soundfontFile,
    sampleRate,
    loopStart, loopEnd,
    indexOfGroup
  }));
  
  if (!spawn || !spawnSync) {
    ({ spawn, spawnSync } = await import("child_process"));
  }
  if (!res && !process.listenerCount("exit")) addEvent({ eventType: "exit",
    func: () => {
      // Necessary for programs like mpv
      if (doneStreaming) {
        let command,
            commandToSend,
            argumentsForCommand,
            regexForCommand;
        const arrayOfProgramsWinVersion = ["mpv.exe"];
        const arrayOfPrograms = ["mpv"];
        
        switch (process.platform) {
          case "win32":
            command = "tasklist";
            argumentsForCommand = [];
            regexForCommand = new RegExp(
              `(?:${arrayOfProgramsWinVersion.join("|")})\\s*(?<pid>\\d+)`,
              "g"
            );
            commandToSend = () => spawnSync("taskkill", [
              "/PID", process.pid, "/T", "/F"
            ]);
            break;
          
          case "linux":
          case "android":
          case "darwin":
            command = "ps";
            argumentsForCommand = [
              "-o", "pid,comm",
              "-C", "node,"+arrayOfPrograms.join(",")
            ];
            regexForCommand = new RegExp(
              `(?<pid>\\d+) (?:${arrayOfPrograms.join("|")})`,
              "g"
            );
            commandToSend = () => process.kill(process.pid, "SIGKILL");
            break;
        }
        
        // Get PIDs by group name ?<pid>
        const iteratorObject = spawnSync(command, argumentsForCommand)
                                 .stdout.toString()
                                 .matchAll(regexForCommand)
                                 .map(i => i.groups);
        // If it matches something,
        // check whether it's a connected pipe to the program before SIGKILLing
        for (const foundProgram of iteratorObject) {
          if (Number(foundProgram.pid) >= process.pid
              && Number(foundProgram.pid) <= process.pid+20) commandToSend()
          if (process.platform === "win32") commandToSend()
        }
      }
    }
  })
  log(1, performance.now().toFixed(2), "Added event exit")
  const { getData } = await import("./audioBuffer.mjs")
  const {
    promises: { finished },
    Readable
  } = await import("node:stream");
  
  let doneStreaming = false;
  const readStream = createReadable(Readable, true, {
    sampleCount, sampleRate,
    seq, synth,
    getData
  });

  const promisesOfPrograms = [];
  const pipingFunction = await formatManager({
    format: format ?? "",
    readStream, index, res,
    effects,
    promisesOfPrograms
  });
  log(1, performance.now().toFixed(2), "Finished creating the stdout promise")
  return [
    pipingFunction,
    Promise.all([
      finished(readStream, { cleanup: true })
        .then(() => {
          doneStreaming = true;
          return synth.clearCache();
        }),
      ...promisesOfPrograms // If there are any
    ])
  ];
}

/**
 * @typedef toFileArray
 * @type {Array}
 * @property {String[]} fileOutputs
 * @property {pipingFunction} pipingFunction
 * @property {Promise<Array>} Promise
 */
/**
 * Reads the generated samples from spessasynth_core
 * and renders them to a wav file
 * @param {Object} toFileObj - necessary object
 * @param {Boolean} toFileObj.createNewFileNameAnyway - if it's necessary to create a new file name
 * @param {Object} toFileObj.index - index of the song
 * @param {Object} toFileObj.progress - progress information object
 * @param {Number} [toFileObj.loopAmount] - loop amount
 * @param {Number} [toFileObj.loopStart] - start of loop
 * @param {Number} [toFileObj.loopEnd] - end of loop
 * @param {String} toFileObj.midiFile - midi file
 * @param {String} toFileObj.soundfontFile - soundfont file
 * @param {String[]} toFileObj.fileOutputs - list of file output names
 * @param {Number} [toFileObj.sampleRate] - sample rate
 * @param {Object[]} [toFileObj.effects] - optional list of effects to add
 * @param {Number} toFileObj.indexOfGroup - index of the Set/group the song is in
 * @param {Number} toFileObj.volume - the volume of the song
 * @throws {ReferenceError} - if some required files are missing
 * @return {Promise<toFileArray>} array that contains the fileOutputs array and a promise
 */
async function toFile({
  createNewFileNameAnyway, index, progress,
  loopAmount, loopStart, loopEnd,
  volume = 100/100,
  midiFile, soundfontFile, fileOutputs,
  sampleRate = 48000,
  effects, indexOfGroup
}) {
  if (!midiFile || !soundfontFile || fileOutputs.length === 0) {
    throw new ReferenceError("Missing some required files")
  }
  log(1, performance.now().toFixed(2), "Started toFile")
  const {
    seq, synth,
    sampleCount,
    durationInSeconds
  } = await initSpessaSynth({
    loopAmount,
    volume,
    midiFile, soundfontFile,
    sampleRate,
    loopStart, loopEnd,
    indexOfGroup
  });

  const {
    getWavHeader,
    getData
  } = await import("./audioBuffer.mjs");
  const {
    promises: { finished },
    Readable
  } = await import("node:stream");
  
  let i = 0;
  const durationRounded = Math.floor(durationInSeconds * 100) / 100;
  
  const stdoutHeader = getWavHeader({ length: sampleCount, numChannels: 2 }, sampleRate);
  log(1, performance.now().toFixed(2), "Created header file ", stdoutHeader)

  const readStream = createReadable(Readable, false, {
    sampleCount, sampleRate,
    seq, synth,
    getData,
    index, i, durationRounded,
    progress
  });
  const promisesOfPrograms = [],
        pipingFunctions = [];
  for (let outFile of fileOutputs) {
    const pipingFunction = await formatManager({
      readStream,
      effects, index,
      createNewFileNameAnyway,
      fileOutputs,
      stdoutHeader,
      promisesOfPrograms, outFile
    });
    pipingFunctions.push(pipingFunction)
  }
  return [
    fileOutputs,
    pipingFunctions,
    Promise.all([
      finished(readStream, { cleanup: true })
        .then(() => synth.destroySynthProcessor()),
      ...promisesOfPrograms // if there are any
    ])
  ];
}

/**
 * Reads the generated samples from spessasynth_core
 * and plays them using mpv
 * @param {Options} Options - Options class
 */
async function startPlayer(Options) {
  const listOfOptions = Options.all;
  ({ spawn, spawnSync } = await import("child_process"));
  const { createServer } = await import("http"),
        { getWavHeader } = await import("./audioBuffer.mjs");
  
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
      index: realIndex,
      ...options,
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
      if (!spawn) ({ spawn } = await import("child_process"));
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
      index: realIndex, res,
      ...options
    });
    if (func) await func(destination, true)
    await promise
    await Promise.all(promisesOfPrograms)
    
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
    mpv.on("error", e => reject(e))
    mpv.on("exit", () => resolve())
  })
  // Required because otherwise it can't exit
  process.exit()
}

export {
  initSpessaSynth,
  applyEffects,
  addEvent,
  toStdout,
  toFile,
  startPlayer
}

