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

import * as fs from "node:fs";
import {
    audioToWav,
    BasicMIDI,
    SoundBankLoader,
    SpessaSynthProcessor,
    SpessaSynthSequencer
} from "spessasynth_core";

// In case the user passes some arguments
if (process.argv.slice(2).length > 0) {
  const { actUpOnPassedArgs } = await import("./cli.mjs");
  await actUpOnPassedArgs(process.argv)
}


if (global?.toStdout) await toStdout(global?.loopN)

async function toStdout(loopAmount) {
  if (!global?.midiFile || !global?.soundfontFile) {
    throw new ReferenceError("Missing some required files")
    process.exit(1)
  }
  const mid = fs.readFileSync(global.midiFile);
  const sf = fs.readFileSync(global.soundfontFile);
  const midi = BasicMIDI.fromArrayBuffer(mid);
  const sampleRate = global?.sampleRate ?? 48000;
  const sampleCount = Math.ceil(
    sampleRate * 
    midi.duration * (loopAmount ?? 1)
  );
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
    getWavData
  } = await import("./audioBuffer.mjs")
  const { Readable } = await import("node:stream");
  
  const BUFFER_SIZE = 128;
  let filledSamples = 0;
  let lastBytes = false;
  let doneStreaming = false;
  /**
   * Reads the generated samples from SpessaSynth
   * and spits them out to stdout
   */
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
        let data = getWavData(arr, sampleRate);
        return this.push(data)
      }
      this.push(null)
    }
  })
  let header = getWavHeader(outputArray, sampleRate)
  process.stdout.write(header)
  readStream.pipe(process.stdout)
  await new Promise((resolve, reject) => {
    readStream.on("error", () => reject())
    readStream.on("end", () => {
      doneStreaming = true;
      resolve()
    })
  })
}