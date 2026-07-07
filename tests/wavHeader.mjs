import { getWavHeader } from "../wavFunctions.mjs"
import { equal        } from "node:assert"
import { audioToWav   } from "spessasynth_core"

const length = 60*48000;
const fakeAudioLeft  = new Float32Array(length);
const fakeAudioRight = new Float32Array(length);
fakeAudioLeft .fill(0)
fakeAudioRight.fill(0)

const metadata = {
  artist: "hugo", title: "song000", album: "hi", genre: "mm"
};
const firstHeader = getWavHeader(
  { numChannels: 2, length }, 48000, metadata
);
const secondHeader = new Uint8Array(
  audioToWav(
    [fakeAudioLeft, fakeAudioRight], 48000, { metadata }
  ).slice(0, 44)
);

console.error("\x1b[33;4mspessoplayer:\x1b[0m\n", firstHeader )
console.error("\x1b[35;4mspessasynth:\x1b[0m\n",  secondHeader)
try {
  equal(firstHeader+"", secondHeader+"")
  console.error("\x1b[32;1mIdentical headers\x1b[0m\n")
} catch {
  console.error("\x1b[31;1;3mHeaders differ\x1b[0m\n" )
}

