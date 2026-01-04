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
if (process.argv.slice(2).length > 0) {
  const { actUpOnPassedArgs } = await import("./cli.mjs");
  await actUpOnPassedArgs(process.argv)
}


if (global?.toStdout) {
  await toStdout(global?.loopN)
  process.exit()
}
if (global?.fileOutputs?.length > 0) await toFile(global?.loopN)

/**
 * Calculates the sample count to use
 * @param {class} midi - The BasicMIDI class to use
 */
function getSampleCount(midi, sampleRate, loopAmount) {
  global.loopStart = global?.loopStart ?? midi.midiTicksToSeconds(midi.loop.start);
  global.loopEnd = global?.loopEnd ?? midi.midiTicksToSeconds(midi.loop.end);
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
    sampleCount = Math.ceil(
      sampleRate * 
      (
        midi.duration +
        ((global.loopEnd - global.loopStart) * possibleLoopAmount)
      )
    );
  }
  return {
    loopDetectedInMidi: loopDetectedInMidi,
    sampleCount: sampleCount
  };
}
/**
 * Reads the generated samples from spessasynth_core
 * and spits them out to stdout
 * @param {Number} loopAmount - the number of loops to do
 */
async function toStdout(loopAmount) {
  if (!global?.midiFile || !global?.soundfontFile) {
    throw new ReferenceError("Missing some required files")
    process.exit(1)
  }
  const {
    BasicMIDI,
    SoundBankLoader,
    SpessaSynthProcessor,
    SpessaSynthSequencer
  } = await import("spessasynth_core")
  const mid = fs.readFileSync(global.midiFile);
  const sf = fs.readFileSync(global.soundfontFile);
  const midi = BasicMIDI.fromArrayBuffer(mid);
  const sampleRate = global?.sampleRate ?? 48000;
  const {
    sampleCount,
    loopDetectedInMidi
  } = getSampleCount(midi, sampleRate, loopAmount);
  
  if (global.loopStart > 0 && !loopDetectedInMidi) {
    midi.loop.start = midi.timeDivision * (global.loopStart*2);
  }
  const synth = new SpessaSynthProcessor(sampleRate, {
    enableEventSystem: false,
    enableEffects: false
  });
  synth.soundBankManager.addSoundBank(
    SoundBankLoader.fromArrayBuffer(sf),
    "main"
  );
  await synth.processorInitialized;
  const seq = new SpessaSynthSequencer(synth);
  seq.loadNewSongList([midi]);
  seq.loopCount = loopAmount ?? 0;
  seq.play();
  
  let outLeft = new Float32Array(sampleCount);
  let outRight = new Float32Array(sampleCount);
  let outputArray = [outLeft, outRight]
  
  
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
                       "pipe:1"
                     ], {stdio: [ "pipe", process.stdout, "pipe" ]});
      ffmpeg.stdin.write(stdoutHeader)
      readStream.pipe(ffmpeg.stdin)
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
 */
async function toFile(loopAmount) {
  if (!global?.midiFile || !global?.soundfontFile || global.fileOutputs.length === 0 ) {
    throw new ReferenceError("Missing some required files")
    process.exit(1)
  }
  const {
    audioToWav,
    BasicMIDI,
    SoundBankLoader,
    SpessaSynthProcessor,
    SpessaSynthSequencer
  } = await import("spessasynth_core")
  const mid = fs.readFileSync(global.midiFile);
  const sf = fs.readFileSync(global.soundfontFile);
  const midi = BasicMIDI.fromArrayBuffer(mid);
  const sampleRate = global?.sampleRate ?? 48000;
  const {
    sampleCount,
    loopDetectedInMidi
  } = getSampleCount(midi, sampleRate, loopAmount);
  
  if (global.loopStart > 0 && !loopDetectedInMidi) {
    midi.loop.start = midi.timeDivision * (global.loopStart*2);
  }
  const synth = new SpessaSynthProcessor(sampleRate, {
    enableEventSystem: false,
    enableEffects: false
  });
  synth.soundBankManager.addSoundBank(
    SoundBankLoader.fromArrayBuffer(sf),
    "main"
  );
  await synth.processorInitialized;
  const seq = new SpessaSynthSequencer(synth);
  seq.loadNewSongList([midi]);
  seq.loopCount = loopAmount ?? 0;
  seq.play();
  
  let outLeft = new Float32Array(sampleCount);
  let outRight = new Float32Array(sampleCount);
  let outputArray = [outLeft, outRight]
  
  const BUFFER_SIZE = 128;
  let filledSamples = 0;
  let lastBytes = false;
  let doneStreaming = false;

  while (filledSamples < sampleCount) {
    // Process sequencer
    seq.processTick();
    // Render
    const bufferSize = Math.min(BUFFER_SIZE, sampleCount - filledSamples);
    synth.renderAudio(outputArray, [], [], filledSamples, bufferSize);
    filledSamples += bufferSize;
  }
  
  let translatedFilePath;
  for (let outFile of global.fileOutputs) {
    switch (outFile) {
      case /^.*(?:\.wav|\.wave)$/.test(outFile) && outFile: {
        const translatedFile = audioToWav(outputArray, sampleRate);
        translatedFilePath = outFile;
        fs.writeFileSync(translatedFilePath, new Uint8Array(translatedFile))
        break;
      }
      case /^.*\.flac$/.test(outFile) && outFile: {
        const translatedFile = audioToWav(outputArray, sampleRate);
        const { spawnSync } = await import("child_process");
        translatedFilePath = outFile;
        spawnSync("ffmpeg", [
          "-i", "-",
          "-f", "flac",
          translatedFilePath
        ], { 
          input: new Uint8Array(translatedFile), 
          maxBuffer: 30000000 // 30 MB in bytes
        });
        break;
      }
    }
  }
  console.log(`Written to ${translatedFilePath}`);
}