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
  join,
  parse
} = await import("./cli.mjs");
await actUpOnPassedArgs(process.argv)


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
  
  
  process.on("exit", () => {
    // Necessary for programs like mpv
    if (doneStreaming) process.kill(process.pid, "SIGKILL")
  })
  const { 
    getWavHeader,
    getData
  } = await import("./audioBuffer.mjs")
  const { Readable } = await import("node:stream");
  
  const BUFFER_SIZE = 128;
  let filledSamples = 0;
  let lastBytes = false;
  let doneStreaming = false;

  let readStream = new Readable({
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
      if (filledSamples <= sampleCount && !lastBytes) {
        if (filledSamples === sampleCount) lastBytes = true;
        let data = getData(arr, sampleRate);
        return this.push(data)
      }
      this.push(null)
    }
  })
  let stdoutHeader = getWavHeader(outputArray, sampleRate);
  // Frees up memory
  [outLeft, outRight, outputArray] = [null, null, null];
  switch (global?.format) {
    case "wave": {
      process.stdout.write(stdoutHeader)
      readStream.pipe(process.stdout)
      break;
    }
    case "flac": {
      const { spawn } = await import("child_process");
      const ffmpeg = spawn("ffmpeg", [
                       "-i", "-",
                       "-f", "flac",
                       "-compression_level", "12",
                       "pipe:1"
                     ], {stdio: [ "pipe", process.stdout, "pipe" ]});
      ffmpeg.stdin.write(stdoutHeader)
      readStream.pipe(ffmpeg.stdin)
      break;
    }
    case "mp3": {
      const { spawn } = await import("child_process");
      const ffmpeg = spawn("ffmpeg", [
                       "-i", "-",
                       "-f", "mp3",
                       "-b:a", "320k",
                       "pipe:1"
                     ], {stdio: [ "pipe", process.stdout, "pipe" ]});
      ffmpeg.stdin.write(stdoutHeader)
      readStream.pipe(ffmpeg.stdin)
      break;
    }
    case "pcm": {
      readStream.pipe(process.stdout)
      break;
    }
    
    default:
      process.stdout.write(stdoutHeader)
      readStream.pipe(process.stdout)
  }
  await new Promise((resolve, reject) => {
    readStream.on("error", () => reject())
    readStream.on("end", () => {
      doneStreaming = true;
      resolve()
    })
  })
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
  let readStream = new Readable({
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
      i++;
      if (i % 100 === 0) {
        if (i > 0) clearLastLines([0, -1])
        console.info(
          "Rendered",
          Math.floor(seq.currentTime * 100) / 100,
          "/",
          durationRounded
        );
      }
      
      if (filledSamples <= sampleCount && !lastBytes) {
        if (filledSamples === sampleCount) lastBytes = true;
        let data = getData(arr, sampleRate);
        return this.push(data)
      }
      this.push(null)
    }
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
  let spawn,
      ffmpegPromises = [];
  for (let outFile of global.fileOutputs) {
    switch (true) {
      case /^.*(?:\.wav|\.wave)$/.test(outFile): {
        const newName = newFileName(outFile);
        global.fileOutputs[global.fileOutputs.indexOf(outFile)] = newName;
        outFile = newName;
        
        const wav = fs.createWriteStream(outFile);
        wav.write(stdoutHeader)
        readStream.pipe(wav)
        break;
      }
      case /^.*\.flac$/.test(outFile): {
        if (!spawn) {
          ({ spawn } = await import("child_process"));
        }
        const newName = newFileName(outFile);
        global.fileOutputs[global.fileOutputs.indexOf(outFile)] = newName;
        outFile = newFileName(outFile);
        const ffmpeg = spawn("ffmpeg", [
          "-i", "-",
          "-f", "flac",
          "-compression_level", "12",
          outFile
        ]);
        ffmpegPromises.push(
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
        if (!spawn) {
          ({ spawn } = await import("child_process"));
        }
        const newName = newFileName(outFile);
        global.fileOutputs[global.fileOutputs.indexOf(outFile)] = newName;
        outFile = newFileName(outFile);
        const ffmpeg = spawn("ffmpeg", [
          "-i", "-",
          "-f", "mp3",
          "-b:a", "320k",
          outFile
        ]);
        ffmpegPromises.push(
          new Promise((resolve, reject) => {
            ffmpeg.on("error", () => reject())
            ffmpeg.on("exit", () => resolve())
          })
        )
        ffmpeg.stdin.write(stdoutHeader)
        readStream.pipe(ffmpeg.stdin)
        break;
      }
      case /^.*\.(?:s16le|pcm)$/.test(outFile): {
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
    ...ffmpegPromises // if there are any
  ])
  console.log("Written", global.fileOutputs.filter(i => i));
}