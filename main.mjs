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

// In case the user passes some arguments
const {
  actUpOnPassedArgs,
  join, parse
} = await import("./cli.mjs");
await actUpOnPassedArgs(process.argv)


let spawn;
if (global?.toStdout) {
  await toStdout(global?.loopN, global?.volume)
  process.exit()
}
if (global?.fileOutputs?.length > 0) await toFile(global?.loopN, global?.volume)

/**
 * Calculates the sample count to use
 * @param {class} midi - The BasicMIDI class to use
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
  return {
    loopDetectedInMidi: loopDetectedInMidi,
    sampleCount: sampleCount
  };
}
/**
 * Initializes all the required variables for spessasynth_core usage
 * @param {any} loopAmount - the loop amount
 * @param {Number} volume - the volume to set
 * @param {Boolean} isToFile - defines or not audioToWav
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
  return {
    audioToWav: audioToWav,
    seq: seq,
    synth: synth,
    midi: midi,
    sampleCount: sampleCount,
    sampleRate: sampleRate
  }
}
/**
 * Applies effects using SoX
 * @param {Stream} program - the process to spawn, sox usually
 * @param {Stream} stdoutHeader - the header to process
 * @param {Stream} readStream - the data to process
 * @param {Stream} stdout - the destination
 * 
 * @example
 * applyEffects({ program: "sox", stdoutHeader, readStream })
 */
async function applyEffects({
  program,
  stdoutHeader,
  readStream,
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
  
  promisesOfPrograms.push(
    new Promise((resolve, reject) => {
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
  return promisesOfPrograms;
}
/**
 * Adds events to process
 * @param {string} eventType - the type of event to add
 * @param {Function} func - optional function for eventType "exit"
 * @param {Boolean} isStdout - if it's the function toStdout calling
 * 
 * @example
 * addEvent({ eventType: "SIGINT" })
 */
function addEvent({ eventType, func, isStdout = false }) {
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
  if (isStdout && eventType === "exit") {
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
 * @param {Readable} Readable - a copy of the readable stream function
 * @param {Boolean} isStdout - whether or not it's for the toStdout function
 * @param {Object} Object - the object deconstructed to get all necessary variables
 */
function createReadable(Readable, isStdout = false, {
  BUFFER_SIZE,
  sampleCount,
  filledSamples,
  lastBytes,
  sampleRate, i,
  durationRounded,
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
        let data = getData(arr, sampleRate);
        return this.push(data)
      }
      this.push(null)
    }
  });
  return readStream;
}
/**
 * Reads the generated samples from spessasynth_core
 * and spits them out to stdout
 * @param {Number} loopAmount - the number of loops to do
 * @param {Number} volume - the volume of the song
 */
async function toStdout(loopAmount, volume = 100/100) {
  if (!global?.midiFile || !global?.soundfontFile) {
    throw new ReferenceError("Missing some required files")
    process.exit(1)
  }
  const {
    seq,
    synth,
    sampleCount,
    sampleRate
  } = await initSpessaSynth(loopAmount, volume);
  
  let outLeft = new Float32Array(sampleCount);
  let outRight = new Float32Array(sampleCount);
  let outputArray = [outLeft, outRight];
  
  
  addEvent({ eventType: "exit", isStdout: true, 
    func: () => {
      // Necessary for programs like mpv
      if (doneStreaming) process.kill(process.pid, "SIGKILL")
    }
  })
  addEvent({ eventType: "SIGINT" })
  const { 
    getWavHeader,
    getData
  } = await import("./audioBuffer.mjs")
  const { Readable } = await import("node:stream");
  
  const BUFFER_SIZE = 128;
  let filledSamples = 0;
  let lastBytes = false;
  let doneStreaming = false;

  let readStream = createReadable(Readable, true, {
    BUFFER_SIZE,
    filledSamples,
    lastBytes,
    sampleCount,
    sampleRate,
    seq, synth,
    getData
  });
  let stdoutHeader = getWavHeader(outputArray, sampleRate);
  // Frees up memory
  [outLeft, outRight, outputArray] = [null, null, null];
  let promisesOfPrograms = [];
  switch (global?.format) {
    case "wave": {
      if (global?.effects) {
        await applyEffects({
          program: "sox",
          stdoutHeader,
          readStream,
          promisesOfPrograms,
          effects: (Array.isArray(global?.effects)) ? global.effects : undefined
        })
        break;
      }
      process.stdout.write(stdoutHeader)
      readStream.pipe(process.stdout)
      break;
    }
    case "flac": {
      ({ spawn } = await import("child_process"));
      const ffmpeg = spawn("ffmpeg", [
                       "-i", "-",
                       "-f", "flac",
                       "-compression_level", "12",
                       "pipe:1"
                     ], {stdio: [ "pipe", process.stdout, "pipe" ], detached: true});
      if (global?.effects) {
        await applyEffects({
          program: "sox",
          stdoutHeader,
          readStream,
          promisesOfPrograms,
          stdout: ffmpeg.stdin,
          effects: (Array.isArray(global?.effects)) ? global.effects : undefined
        })
        break;
      }
      promisesOfPrograms.push(
        new Promise((resolve, reject) => {
          ffmpeg.on("error", () => reject())
          ffmpeg.on("exit", () => resolve())
        })
      )
      ffmpeg.stdin.write(stdoutHeader)
      readStream.pipe(ffmpeg.stdin)
      break;
    }
    case "mp3": {
      ({ spawn } = await import("child_process"));
      const ffmpeg = spawn("ffmpeg", [
                       "-i", "-",
                       "-f", "mp3",
                       "-aq", "0",
                       "pipe:1"
                     ], {stdio: [ "pipe", process.stdout, "pipe" ], detached: true});
      if (global?.effects) {
        await applyEffects({
          program: "sox",
          stdoutHeader,
          readStream,
          promisesOfPrograms,
          stdout: ffmpeg.stdin,
          effects: (Array.isArray(global?.effects)) ? global.effects : undefined
        })
        break;
      }
      promisesOfPrograms.push(
        new Promise((resolve, reject) => {
          ffmpeg.on("error", () => reject())
          ffmpeg.on("exit", () => resolve())
        })
      )
      ffmpeg.stdin.write(stdoutHeader)
      readStream.pipe(ffmpeg.stdin)
      break;
    }
    case "pcm": {
      readStream.pipe(process.stdout)
      break;
    }
    
    default:
      if (global?.effects) {
        await applyEffects({
          program: "sox",
          stdoutHeader,
          readStream,
          promisesOfPrograms,
          effects: (Array.isArray(global?.effects)) ? global.effects : undefined
        })
        break;
      }
      process.stdout.write(stdoutHeader)
      readStream.pipe(process.stdout)
  }
  await Promise.all([
    new Promise((resolve, reject) => {
      readStream.on("error", () => reject())
      readStream.on("end", () => {
        doneStreaming = true;
        resolve()
      })
    }),
    ...promisesOfPrograms // If there are any
  ])
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
    process.exit(1)
  }
  const {
    seq,
    synth,
    sampleCount,
    sampleRate
  } = await initSpessaSynth(loopAmount, volume, true);

  const {
    getWavHeader,
    getData
  } = await import("./audioBuffer.mjs");
  const { Readable } = await import("node:stream");
  const { clearLastLines } = await import("./utils.mjs");
  
  addEvent({ eventType: "SIGINT" })
  let i = 0;
  const durationRounded = Math.floor(seq.midiData.duration * 100) / 100;
  
  let outLeft = new Float32Array(sampleCount);
  let outRight = new Float32Array(sampleCount);
  let outputArray = [outLeft, outRight];
  
  const BUFFER_SIZE = 128;
  let filledSamples = 0;
  let lastBytes = false;
  let stdoutHeader = getWavHeader(outputArray, sampleRate);
  // Frees up memory
  [outLeft, outRight, outputArray] = [null, null, null];
  let readStream = createReadable(Readable, false, {
    BUFFER_SIZE,
    filledSamples,
    lastBytes,
    sampleCount,
    sampleRate,
    seq, synth,
    getData, i, durationRounded,
    clearLastLines
  });
  /**
   * Returns a new path with a new number (adds 1) at the end of the filename
   * if necessary otherwise it returns the given path
   * @param {string} path - The path to parse and modify if needed
   * @example
   * // It'll return out1.wav
   *    newFileName("out.wav")
   * @example
   * // It'll return out2.wav
   *    newFileName("out1.wav")
   * @returns {string} The path, modified or not
   */
  function newFileName(path) {
    if (fs.existsSync(path)) {
      const pathDir = parse(path).dir;
      const pathFileName = (parse(path).name.match(/[0-9]+$/g)?.length > 0)
        ? parse(path).name.replace(/[0-9]+$/, "")
        + (Number(parse(path).name.match(/[0-9]+$/g)[0]) + 1)
        : parse(path).name.replace(/[0-9]+$/, "") + 1;
      const pathExt = parse(path).ext;
      path = join(pathDir, pathFileName + pathExt);
      
      if (fs.existsSync(path)) return newFileName(path);
      return path;
    }
    return path;
  }
  let promisesOfPrograms = [];
  for (let outFile of global.fileOutputs) {
    switch (true) {
      case /^.*(?:\.wav|\.wave)$/.test(outFile): {
        const newName = newFileName(outFile);
        global.fileOutputs[global.fileOutputs.indexOf(outFile)] = newName;
        outFile = newName;
        
        if (global?.effects) {
            await applyEffects({
              program: "sox",
              stdoutHeader,
              readStream,
              promisesOfPrograms,
              destination: outFile,
              effects: (Array.isArray(global?.effects)) ? global.effects : undefined
            })
          break;
        }
        const wav = fs.createWriteStream(outFile);
        wav.write(stdoutHeader)
        readStream.pipe(wav)
        break;
      }
      case /^.*\.flac$/.test(outFile): {
        if (!spawn) ({ spawn } = await import("child_process"));
        const newName = newFileName(outFile);
        global.fileOutputs[global.fileOutputs.indexOf(outFile)] = newName;
        outFile = newFileName(outFile);
        
        const ffmpeg = spawn("ffmpeg", [
          "-i", "-",
          "-f", "flac",
          "-compression_level", "12",
          outFile
        ]);
        if (global?.effects) {
          await applyEffects({
            program: "sox",
            stdoutHeader,
            readStream,
            promisesOfPrograms,
            stdout: ffmpeg.stdin,
            effects: (Array.isArray(global?.effects)) ? global.effects : undefined
          })
          break;
        }
        promisesOfPrograms.push(
          new Promise((resolve, reject) => {
            ffmpeg.on("error", () => reject())
            ffmpeg.on("exit", () => resolve())
          })
        )
        ffmpeg.stdin.write(stdoutHeader)
        readStream.pipe(ffmpeg.stdin)
        break;
      }
      case /^.*\.mp3$/.test(outFile): {
        if (!spawn) ({ spawn } = await import("child_process"));
        const newName = newFileName(outFile);
        global.fileOutputs[global.fileOutputs.indexOf(outFile)] = newName;
        outFile = newFileName(outFile);
        
        const ffmpeg = spawn("ffmpeg", [
          "-i", "-",
          "-f", "mp3",
          "-aq", "0",
          outFile
        ]);
        if (global?.effects) {
          await applyEffects({
            program: "sox",
            stdoutHeader,
            readStream,
            promisesOfPrograms,
            stdout: ffmpeg.stdin,
            effects: (Array.isArray(global?.effects)) ? global.effects : undefined
          })
          break;
        }
        promisesOfPrograms.push(
          new Promise((resolve, reject) => {
            ffmpeg.on("error", () => reject())
            ffmpeg.on("exit", () => resolve())
          })
        )
        ffmpeg.stdin.write(stdoutHeader)
        readStream.pipe(ffmpeg.stdin)
        break;
      }
      case /^.*\.(?:s32le|pcm)$/.test(outFile): {
        const newName = newFileName(outFile);
        global.fileOutputs[global.fileOutputs.indexOf(outFile)] = newName;
        outFile = newFileName(outFile);
        
        const pcm = fs.createWriteStream(outFile);
        readStream.pipe(pcm)
        break;
      }
    }
  }
  await Promise.all([
    new Promise((resolve, reject) => {
      readStream.on("error", () => reject())
      readStream.on("end", () => resolve())
    }),
    ...promisesOfPrograms // if there are any
  ])
  console.log("Written", global.fileOutputs.filter(i => i));
  // Required because ffmpeg's child_process sometimes blocks node from exiting
  process.exit()
}
