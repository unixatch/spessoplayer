#!/usr/bin/env node
/*
  Copyright (C) 2025  unixatch

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

import { log } from "./utils.mjs"

addEvent({ eventType: "SIGINT" })
log(1, performance.now().toFixed(2), "Added SIGINT event")
// In case the user passes some arguments
const {
  actUpOnPassedArgs,
} = await import("./cli.mjs");
log(1, performance.now().toFixed(2), "Checking passed args...")
await actUpOnPassedArgs(process.argv)


/**
 * Simply returns an object containing ffmpeg's arguments in all supported formats
 * @param {String} [outFile="pipe:1"] - file path to write to
 * @return {Object} - available formats in Object format
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
let spawn,
    spawnSync;
if (global?.toStdout) {
  await toStdout(global?.loopN, global?.volume)
  process.exit()
}
if (global?.fileOutputs?.length > 0) await toFile(global?.loopN, global?.volume)
await startPlayer(global?.loopN, global?.volume)

/**
 * Calculates the sample count to use
 * @param {class} midi - The BasicMIDI class to use
 * @param {Number} sampleRate - The sample rate to use
 * @param {Number} loopAmount - The amount of loops to do
 */
function getSampleCount(midi, sampleRate, loopAmount) {
  global.loopStart = global?.loopStart ?? midi.midiTicksToSeconds(midi.loop.start);
  let loopDetectedInMidi = false;
  if (midi.loop.start > 0) {
    loopDetectedInMidi = true;
    global.loopStart = midi.midiTicksToSeconds(midi.loop.start);
    global.loopEnd = midi.midiTicksToSeconds(midi.loop.end);
  }
  const possibleLoopAmount = (loopAmount === 0) ? loopAmount+1 : loopAmount ?? 1;
  let sampleCount;
  if ((loopAmount ?? 0) === 0) {
    sampleCount = Math.ceil(sampleRate * midi.duration);
  } else {
    let end;
    if (global?.loopEnd === undefined && !loopDetectedInMidi) {
      end = midi.duration;
    } else if (global.loopEnd !== undefined && !loopDetectedInMidi) {
      end = midi.duration - global.loopEnd;
    } else end = global.loopEnd;

    sampleCount = Math.ceil(
      sampleRate * 
      (
        midi.duration +
        ((end - global.loopStart) * possibleLoopAmount)
      )
    );
  }
  log(1, performance.now().toFixed(2), "Sample count set to " + sampleCount)
  return {
    loopDetectedInMidi,
    sampleCount
  };
}
/**
 * Initializes all the required variables for spessasynth_core usage
 * @param {any} loopAmount - the loop amount
 * @param {Number} [volume=100/100] - the volume to set
 * @param {Boolean} [isToFile=false] - defines or not audioToWav
 */
async function initSpessaSynth(loopAmount, volume = 100/100, isToFile = false) {
  let audioToWav,
      BasicMIDI,
      SoundBankLoader,
      SpessaSynthProcessor,
      SpessaSynthSequencer;
  if (isToFile) {
    ({
      audioToWav,
      BasicMIDI,
      SoundBankLoader,
      SpessaSynthProcessor,
      SpessaSynthSequencer
    } = await import("spessasynth_core"))
  } else {
    ({
      BasicMIDI,
      SoundBankLoader,
      SpessaSynthProcessor,
      SpessaSynthSequencer
    } = await import("spessasynth_core"))
  }
  const mid = fs.readFileSync(global.midiFile);
  const sf = fs.readFileSync(global.soundfontFile);
  const midi = BasicMIDI.fromArrayBuffer(mid);
  const sampleRate = global?.sampleRate ?? 48000;
  const {
    sampleCount,
    loopDetectedInMidi
  } = getSampleCount(midi, sampleRate, loopAmount);
  
  if (global.loopStart > 0 && !loopDetectedInMidi) {
    // ((midi.timeDivision * midi.tempoChanges[0].tempo)/60) * global.loopStart;
    midi.loop.start = midi.secondsToMIDITicks(global.loopStart);
  }
  if (global?.loopEnd && global.loopEnd !== midi.duration && !loopDetectedInMidi) {
    // (midi.duration - global.loopEnd) * (midi.tempoChanges[1].tempo/60) * midi.timeDivision;
    midi.loop.end = midi.secondsToMIDITicks(midi.duration - global.loopEnd);
  }
  const synth = new SpessaSynthProcessor(sampleRate, {
    enableEventSystem: false,
    enableEffects: false
  });
  synth.setMasterParameter("masterGain", volume)
  synth.soundBankManager.addSoundBank(
    SoundBankLoader.fromArrayBuffer(sf),
    "main"
  )
  await synth.processorInitialized
  const seq = new SpessaSynthSequencer(synth);
  seq.loadNewSongList([midi])
  seq.loopCount = loopAmount ?? 0;
  seq.play();
  
  addEvent({ eventType: "uncaughtException" })
  log(1, performance.now().toFixed(2), "Finished setting up SpessaSynth")
  return {
    audioToWav,
    seq, synth,
    midi,
    sampleCount, sampleRate
  }
}
/**
 * Applies effects using SoX
 * @param {Object} obj - the object passed
 * @param {Stream} obj.program - the process to spawn, sox usually
 * @param {Stream} obj.stdoutHeader - the header to process
 * @param {Stream} obj.readStream - the data to process
 * @param {Stream} obj.stdout - the destination
 * @param {String} obj.destination - the destination path
 * @param {string[]} obj.effects - all effects to pass to SoX
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
  effects = ["reverb", (global?.reverbVolume) ? global.reverbVolume : "0", "36", "100", "100", "10", "10"]
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
        if (stringOfError.match(/sox FAIL sox: \`-\' error writing output file: Connection reset by peer\n/g)
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
  readStream.pipe(sox.stdin)
  log(1, performance.now().toFixed(2), "Finished setting up SoX")
  return promisesOfPrograms;
}
/**
 * Adds events to process
 * @param {Object} obj - the object passed
 * @param {String} obj.eventType - the type of event to add
 * @param {Function} obj.func - optional function for eventType "exit"
 * @example
 * addEvent({ eventType: "SIGINT" })
 */
function addEvent({ eventType, func }) {
  if (eventType === "uncaughtException") {
    // Adds on top of spessasynth_core's uncaughtException
    const oldUncaughtException = process.rawListeners("uncaughtException")[0];
    process.removeListener("uncaughtException", oldUncaughtException)
    process.on("uncaughtException", async (error) => {
      if (global.SIGINT) return process.exit();
      if (error?.code === "EPIPE") {
        // Needed so that SoX can show its stderr
        await new Promise(resolve => {
          setTimeout(() => resolve(), 4);
        })
        console.error(`${gray}Closed the program before finishing to render${normal}`);
        return process.exit(2);
      }
      oldUncaughtException(error)
    })
    return true;
  }
  if (eventType === "exit") {
    process.on("exit", func)
    return true;
  }
  if (eventType === "SIGINT") {
    process.on("SIGINT", () => {
      console.error(`${gray}Closed with Ctrl+c${normal}`);
      global.SIGINT = true;
    })
  }
}
/**
 * Creates a Readable stream given the variables needed
 * @param {Readable} Readable - Readable stream function
 * @param {Boolean} [isStdout=false] - if it's for toStdout or not
 * @param {Object} obj - the object passed
 * @param {Number} obj.BUFFER_SIZE - static size of the buffer
 * @param {Number} obj.filledSamples - how many samples have been rendered
 * @param {Boolean} obj.lastBytes - check if it's the last sample
 * @param {Number} obj.sampleCount - sample count
 * @param {Number} obj.sampleRate - sample rate
 * @param {Number} obj.i - counter for the progress
 * @param {Number} obj.durationRounded - duration of the song rounded by percentage
 * @param {Function} obj.clearLastLines - util function to clear lines, see utils.mjs
 * @param {class} obj.seq - spessasynth_core' sequencer
 * @param {class} obj.synth - spessasynth_core's processor
 * @param {Function} obj.getData - translator: Float32Arrays → Uint8Arrays
 */
function createReadable(Readable, isStdout = false, {
  BUFFER_SIZE, filledSamples,
  lastBytes,
  sampleCount, sampleRate,
  i, durationRounded,
  clearLastLines,
  seq, synth,
  getData
}) {
  const readStream = new Readable({
    read() {
      const bufferSize = Math.min(BUFFER_SIZE, sampleCount - filledSamples);
      const left = new Float32Array(bufferSize);
      const right = new Float32Array(bufferSize);
      const arr = [left, right]
      seq.processTick();
      synth.renderAudio(
        arr, [], [],
        0,
        bufferSize
      );
      filledSamples += bufferSize;
      if (!isStdout) {
        i++;
        if (i % 100 === 0) {
          if (i > 0) clearLastLines([0, -1])
          console.info(
            `Rendered ${magenta}` +
              // Gets the ISO format and then gets mm:ss.sss
              new Date(
                (Math.floor(seq.currentTime * 100) / 100) * 1000
              )
                .toISOString()
                .replace(/.*T...(.*)Z/, "$1") +
            `${normal}`,
            "/",
            `${brightMagenta}` +
              // Same down here
              new Date(durationRounded * 1000)
                .toISOString()
                .replace(/.*T...(.*)Z/, "$1"),
            `${normal}`
          );
        }
      }
      
      if (filledSamples <= sampleCount && !lastBytes) {
        if (filledSamples === sampleCount) lastBytes = true;
        const data = getData(arr, sampleRate);
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
 * @param {Number} loopAmount - the number of loops to do
 * @param {Number} volume - the volume of the song
 * @param {Number} [obj=false] - object for additional options
 * @param {ChildProcess} obj.mpv - mpv's process
 * @param {Boolean} obj.isStartPlayer - if it's from startPlayer
 * @param {class} obj.seq - spessasynth_core's sequencer
 * @param {class} obj.synth - spessasynth_core's processor
 * @param {Number} obj.sampleCount - sample count of the song
 * @param {Number} obj.sampleRate - sample rate of the song
 */
async function toStdout(
  loopAmount,
  volume = 100/100,
  {
    mpv,
    isStartPlayer,
    seq, synth,
    sampleCount, sampleRate
  }
) {
  if (!global?.midiFile || !global?.soundfontFile) {
    throw new ReferenceError("Missing some required files")
  }
  log(1, performance.now().toFixed(2), "Started toStdout")
  if (!isStartPlayer) {
    ({
      seq, synth,
      sampleCount, sampleRate
    } = await initSpessaSynth(loopAmount, volume));
  }
  
  ({ spawn, spawnSync } = await import("child_process"));
  if (!isStartPlayer) {
    addEvent({ eventType: "exit",
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
  }
  log(1, performance.now().toFixed(2), "Added event exit")
  const {
    getWavHeader,
    getData
  } = await import("./audioBuffer.mjs")
  const { Readable } = await import("node:stream");
  
  const BUFFER_SIZE = 128;
  let filledSamples = 0;
  let lastBytes = false;
  let doneStreaming = false;

  const readStream = createReadable(Readable, true, {
    BUFFER_SIZE, filledSamples,
    lastBytes,
    sampleCount, sampleRate,
    seq, synth,
    getData
  });
  const stdoutHeader = getWavHeader({ length: sampleCount, numChannels: 2 }, sampleRate);
  log(1, performance.now().toFixed(2), "Created header file ", stdoutHeader)

  const promisesOfPrograms = [];
  switch (global?.format) {
    case "wave": {
      if (global?.effects) {
        await applyEffects({
          program: "sox",
          stdoutHeader, readStream,
          promisesOfPrograms,
          stdout: (isStartPlayer) ? mpv.stdin : undefined,
          effects: (Array.isArray(global?.effects)) ? global.effects : undefined
        })
        log(1, performance.now().toFixed(2), "Done setting up")
        break;
      }
      if (isStartPlayer) {
        mpv.stdin.write(stdoutHeader)
        readStream.pipe(mpv.stdin)
        log(1, performance.now().toFixed(2), "Done setting up")
        break;
      }
      process.stdout.write(stdoutHeader)
      readStream.pipe(process.stdout)
      log(1, performance.now().toFixed(2), "Done setting up")
      break;
    }
    case "flac": {
      const ffmpeg = spawn("ffmpeg",
        ffmpegArgs().flac,
        {stdio: [
          "pipe",
          (!isStartPlayer) ? process.stdout : mpv.stdin,
          "pipe"
        ], detached: true}
      );
      log(1, performance.now().toFixed(2), "Spawned ffmpeg with " + ffmpeg.spawnargs.join(" "))
      if (global?.effects) {
        await applyEffects({
          program: "sox",
          stdoutHeader, readStream,
          promisesOfPrograms,
          stdout: ffmpeg.stdin,
          effects: (Array.isArray(global?.effects)) ? global.effects : undefined
        })
        log(1, performance.now().toFixed(2), "Done setting up")
        break;
      }
      promisesOfPrograms.push(
        new Promise((resolve, reject) => {
          ffmpeg.on("error", e => reject(e))
          ffmpeg.on("exit", () => resolve())
        })
      )
      log(1, performance.now().toFixed(2), "Added promise")
      ffmpeg.stdin.write(stdoutHeader)
      readStream.pipe(ffmpeg.stdin)
      log(1, performance.now().toFixed(2), "Done setting up")
      break;
    }
    case "mp3": {
      const ffmpeg = spawn("ffmpeg",
        ffmpegArgs().mp3,
        {stdio: [
          "pipe",
          (!isStartPlayer) ? process.stdout : mpv.stdin,
          "pipe"
        ], detached: true}
      );
      log(1, performance.now().toFixed(2), "Spawned ffmpeg with " + ffmpeg.spawnargs.join(" "))
      if (global?.effects) {
        await applyEffects({
          program: "sox",
          stdoutHeader, readStream,
          promisesOfPrograms,
          stdout: ffmpeg.stdin,
          effects: (Array.isArray(global?.effects)) ? global.effects : undefined
        })
        log(1, performance.now().toFixed(2), "Done setting up")
        break;
      }
      promisesOfPrograms.push(
        new Promise((resolve, reject) => {
          ffmpeg.on("error", e => reject(e))
          ffmpeg.on("exit", () => resolve())
        })
      )
      log(1, performance.now().toFixed(2), "Added promise")
      ffmpeg.stdin.write(stdoutHeader)
      readStream.pipe(ffmpeg.stdin)
      log(1, performance.now().toFixed(2), "Done setting up")
      break;
    }
    case "pcm": {
      readStream.pipe((!isStartPlayer) ? process.stdout : mpv.stdin)
      log(1, performance.now().toFixed(2), "Done setting up")
      break;
    }
    
    default:
      if (global?.effects) {
        await applyEffects({
          program: "sox",
          stdoutHeader, readStream,
          promisesOfPrograms,
          stdout: (isStartPlayer) ? mpv.stdin : undefined,
          effects: (Array.isArray(global?.effects)) ? global.effects : undefined
        })
        log(1, performance.now().toFixed(2), "Done setting up")
        break;
      }
      if (isStartPlayer) {
        mpv.stdin.write(stdoutHeader)
        readStream.pipe(mpv.stdin)
        log(1, performance.now().toFixed(2), "Done setting up")
        break;
      }
      process.stdout.write(stdoutHeader)
      readStream.pipe(process.stdout)
      log(1, performance.now().toFixed(2), "Done setting up")
  }
  await Promise.all([
    new Promise((resolve, reject) => {
      readStream.on("error", e => reject(e))
      readStream.on("end", () => {
        doneStreaming = true;
        resolve()
      })
    }),
    (isStartPlayer) ? new Promise((resolve, reject) => {
      mpv.on("error", e => reject(e))
      mpv.on("exit", () => resolve())
      mpv.on("end", () => resolve())
    }) : undefined,
    ...promisesOfPrograms // If there are any
  ])
  log(1, performance.now().toFixed(2), (!isStartPlayer) ? "Finished printing to stdout" : "Finished sending data to mpv's process")
}

/**
 * Reads the generated samples from spessasynth_core
 * and renders them to a wav file
 * @param {Number} loopAmount - the number of loops to do
 * @param {Number} volume - the volume of the song
 */
async function toFile(loopAmount, volume = 100/100) {
  if (!global?.midiFile || !global?.soundfontFile || global.fileOutputs.length === 0 ) {
    throw new ReferenceError("Missing some required files")
  }
  log(1, performance.now().toFixed(2), "Started toFile")
  const {
    seq, synth,
    sampleCount, sampleRate
  } = await initSpessaSynth(loopAmount, volume, true);

  const {
    getWavHeader,
    getData
  } = await import("./audioBuffer.mjs");
  const { Readable } = await import("node:stream");
  const { clearLastLines } = await import("./utils.mjs");
  
  let i = 0;
  const durationRounded = Math.floor(seq.midiData.duration * 100) / 100;
  
  const BUFFER_SIZE = 128;
  let filledSamples = 0;
  let lastBytes = false;
  const stdoutHeader = getWavHeader({ length: sampleCount, numChannels: 2 }, sampleRate);
  log(1, performance.now().toFixed(2), "Created header file ", stdoutHeader)

  const readStream = createReadable(Readable, false, {
    BUFFER_SIZE, filledSamples,
    lastBytes,
    sampleCount, sampleRate,
    seq, synth,
    getData, i, durationRounded,
    clearLastLines
  });
  const { newFileName } = await import("./utils.mjs");
  const promisesOfPrograms = [];
  for (let outFile of global.fileOutputs) {
    switch (true) {
      case /^.*(?:\.wav|\.wave)$/.test(outFile): {
        const newName = newFileName(outFile);
        global.fileOutputs[global.fileOutputs.indexOf(outFile)] = newName;
        outFile = newName;
        
        if (global?.effects) {
          await applyEffects({
            program: "sox",
            stdoutHeader, readStream,
            promisesOfPrograms,
            destination: outFile,
            effects: (Array.isArray(global?.effects)) ? global.effects : undefined
          })
          log(1, performance.now().toFixed(2), "Done setting up wav outFile")
          break;
        }
        const wav = fs.createWriteStream(outFile);
        wav.write(stdoutHeader)
        readStream.pipe(wav)
        log(1, performance.now().toFixed(2), "Done setting up wav outFile")
        break;
      }
      case /^.*\.flac$/.test(outFile): {
        if (!spawn) ({ spawn } = await import("child_process"));
        const newName = newFileName(outFile);
        global.fileOutputs[global.fileOutputs.indexOf(outFile)] = newName;
        outFile = newFileName(outFile);
        
        const ffmpeg = spawn("ffmpeg", ffmpegArgs(outFile).flac);
        log(1, performance.now().toFixed(2), "Spawned ffmpeg with " + ffmpeg.spawnargs.join(" "))
        if (global?.effects) {
          await applyEffects({
            program: "sox",
            stdoutHeader, readStream,
            promisesOfPrograms,
            stdout: ffmpeg.stdin,
            effects: (Array.isArray(global?.effects)) ? global.effects : undefined
          })
          log(1, performance.now().toFixed(2), "Done setting up flac outFile")
          break;
        }
        promisesOfPrograms.push(
          new Promise((resolve, reject) => {
            ffmpeg.on("error", e => reject(e))
            ffmpeg.on("exit", () => resolve())
          })
        )
        log(1, performance.now().toFixed(2), "Added promise")
        ffmpeg.stdin.write(stdoutHeader)
        readStream.pipe(ffmpeg.stdin)
        log(1, performance.now().toFixed(2), "Done setting up flac outFile")
        break;
      }
      case /^.*\.mp3$/.test(outFile): {
        if (!spawn) ({ spawn } = await import("child_process"));
        const newName = newFileName(outFile);
        global.fileOutputs[global.fileOutputs.indexOf(outFile)] = newName;
        outFile = newFileName(outFile);
        
        const ffmpeg = spawn("ffmpeg", ffmpegArgs(outFile).mp3);
        log(1, performance.now().toFixed(2), "Spawned ffmpeg with " + ffmpeg.spawnargs.join(" "))
        if (global?.effects) {
          await applyEffects({
            program: "sox",
            stdoutHeader, readStream,
            promisesOfPrograms,
            stdout: ffmpeg.stdin,
            effects: (Array.isArray(global?.effects)) ? global.effects : undefined
          })
          log(1, performance.now().toFixed(2), "Done setting up mp3 outFile")
          break;
        }
        promisesOfPrograms.push(
          new Promise((resolve, reject) => {
            ffmpeg.on("error", e => reject(e))
            ffmpeg.on("exit", () => resolve())
          })
        )
        log(1, performance.now().toFixed(2), "Added promise")
        ffmpeg.stdin.write(stdoutHeader)
        readStream.pipe(ffmpeg.stdin)
        log(1, performance.now().toFixed(2), "Done setting up mp3 outFile")
        break;
      }
      case /^.*\.(?:s16le|s32le|pcm)$/.test(outFile): {
        const newName = newFileName(outFile);
        global.fileOutputs[global.fileOutputs.indexOf(outFile)] = newName;
        outFile = newFileName(outFile);
        
        const pcm = fs.createWriteStream(outFile);
        readStream.pipe(pcm)
        log(1, performance.now().toFixed(2), "Done setting up pcm outFile")
        break;
      }
    }
  }
  await Promise.all([
    new Promise((resolve, reject) => {
      readStream.on("error", e => reject(e))
      readStream.on("end", () => resolve())
    }),
    ...promisesOfPrograms // if there are any
  ])
  console.log("Written", global.fileOutputs.filter(ifil => ifil));
  // Required because some child_processes sometimes blocks node from exiting
  process.exit()
}

/**
 * Reads the generated samples from spessasynth_core
 * and plays them using mpv
 * @param {Number} loopAmount - the number of loops to do
 * @param {Number} volume - the volume of the song
 */
async function startPlayer(loopAmount, volume = 100/100) {
  ({ spawn, spawnSync } = await import("child_process"));
  const {
    seq, synth,
    sampleCount, sampleRate
  } = await initSpessaSynth(loopAmount, volume);
  const isRawAudio = (global?.format === "pcm") ? [
    "--demuxer=rawaudio",
    "--demuxer-rawaudio-format=s16le",
    "--demuxer-rawaudio-rate="+sampleRate,
    "--demuxer-rawaudio-channels=2"
  ] : "";
  const mpv = spawn("mpv", [
      ...isRawAudio,
      "-"
    ],
    {stdio: ["pipe", "inherit", "inherit"]}
  );
  await toStdout(loopAmount, volume, {
    mpv,
    isStartPlayer: true,
    seq, synth,
    sampleCount, sampleRate
  })
  // Required because some child_processes sometimes blocks node from exiting
  process.exit()
}