#!/usr/bin/env node
/*
  Copyright (C) 2024  unixatch

    it under the terms of the GNU General Public License as published by
    This program is free software: you can redistribute it and/or modify
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with fix-retroarch-image-playlist.  If not, see <https://www.gnu.org/licenses/>.
*/

import * as fs from "node:fs";
import {
    audioToWav,
    BasicMIDI,
    SoundBankLoader,
    SpessaSynthProcessor,
    SpessaSynthSequencer
} from "spessasynth_core";
const { 
  getWavHeader,
  getWavData
} = await import("./audioBuffer.mjs")

// Process arguments
const args = process.argv.slice(2);
/* if (args.length !== 3) {
    console.info(
        "Usage: tsx index.ts <soundbank path> <midi path> <wav output path>"
    );
    process.exit();
} */
const mid = fs.readFileSync(args[0]);
const sf = fs.readFileSync(args[1]);
const midi = BasicMIDI.fromArrayBuffer(mid);
const sampleRate = 48000;
const loop = 1;
const sampleCount = Math.ceil(sampleRate * (midi.duration* loop));
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
seq.loopCount = (loop === 0 || loop === 1) 
  ? (loop === 0) ? 0 : (loop === 1) ? 1 : loop-1
  : loop-1;
seq.play();

let outLeft = new Float32Array(sampleCount);
let outRight = new Float32Array(sampleCount);
let outputArray = [outLeft, outRight]


// Note: buffer size is recommended to be very small, as this is the interval between modulator updates and LFO updates
const BUFFER_SIZE = 128;
let filledSamples = 0,
    oldFilledSamples = 0;
let lastBytes = false;

const { Readable } = await import("node:stream");
const audioStream = new Readable({
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
      if (filledSamples !== BUFFER_SIZE) {
        let data = getWavData(arr, sampleRate);
        this.push(data)
      } else this.push("")
    }
  }
})
let header = getWavHeader(outputArray, sampleRate)
process.stdout.write(header)
audioStream.pipe(process.stdout)
process.on("SIGPIPE", () => process.exit())