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
 * @module audioBuffer
 */

import {
  IndexedByteArray,
  DEFAULT_WAV_WRITE_OPTIONS
} from "spessasynth_core"
// This section is identical to what's inside spessasynth_core but not being exported, that's why it's here
function fillWithDefaults(obj, defObj) {
  return { ...defObj, ...obj ?? {} };
}
function writeBinaryStringIndexed(outArray, string, padLength = 0) {
  if (padLength > 0) {
    if (string.length > padLength) string = string.slice(0, padLength)
  }
  for (let i = 0; i < string.length; i++) {
    outArray[outArray.currentIndex++] = string.charCodeAt(i);
  }
  if (padLength > string.length) {
    for (let i = 0; i < padLength - string.length; i++) {
      outArray[outArray.currentIndex++] = 0;
    }
  }
  return outArray;
}
function writeLittleEndianIndexed(dataArray, number, byteTarget) {
  for (let i = 0; i < byteTarget; i++) {
    dataArray[dataArray.currentIndex++] = number >> i * 8 & 255;
  }
}
function writeDword(dataArray, dword) {
  writeLittleEndianIndexed(dataArray, dword, 4)
}
function writeRIFFChunkParts(header, chunks, isList = false) {
  let dataOffset = 8;
  let headerWritten = header;
  const dataLength = chunks.reduce((len, c) => c.length + len, 0);
  let writtenSize = dataLength;
  if (isList) {
    dataOffset += 4;
    writtenSize += 4;
    headerWritten = "LIST";
  }
  let finalSize = dataOffset + dataLength;
  if (finalSize % 2 !== 0) finalSize++

  const outArray = new IndexedByteArray(finalSize);
  writeBinaryStringIndexed(outArray, headerWritten);
  writeDword(outArray, writtenSize);
  if (isList) writeBinaryStringIndexed(outArray, header);

  chunks.forEach(c => {
    outArray.set(c, dataOffset)
    dataOffset += c.length;
  })
  return outArray;
}
function writeRIFFChunkRaw(header, data, addZeroByte = false, isList = false) {
  if (header.length !== 4) throw new Error(`Invalid header length: ${header}`)
  let dataStartOffset = 8;
  let headerWritten = header;
  let dataLength = data.length;

  if (addZeroByte) dataLength++
  let writtenSize = dataLength;
  if (isList) {
    dataStartOffset += 4;
    writtenSize += 4;
    headerWritten = "LIST";
  }
  let finalSize = dataStartOffset + dataLength;
  if (finalSize % 2 !== 0) finalSize++

  const outArray = new IndexedByteArray(finalSize);
  writeBinaryStringIndexed(outArray, headerWritten);
  writeDword(outArray, writtenSize);

  if (isList) writeBinaryStringIndexed(outArray, header);
  outArray.set(data, dataStartOffset);
  return outArray;
}

/**
 * WAV Header Generator
 * @param {module:typeDefinitions~getWavHeaderObjectParameters} audioData - An object that contains infos about the audio
 * @param {Number} [sampleRate=48000] - Sample rate of the audio
 * @param {Object} [options=DEFAULT_WAV_WRITE_OPTIONS] - Optional, adds loop timestamps and more
 * @returns {Uint8Array} the wav header
 */
function getWavHeader({ length, numChannels },
  sampleRate = 48000, options = DEFAULT_WAV_WRITE_OPTIONS
) {
  const bytesPerSample = 2;
  const fullOptions = fillWithDefaults(options, DEFAULT_WAV_WRITE_OPTIONS);
  const loop = fullOptions.loop;
  const metadata = fullOptions.metadata;
  let infoChunk = new IndexedByteArray(0);
  const infoOn = Object.keys(metadata).length > 0;
  if (infoOn) {
    const encoder = new TextEncoder();
    const infoChunks = [
      writeRIFFChunkRaw(
        "ICMT",
        encoder.encode("Created with SpessaSynth"),
        true
      )
    ];
    if (metadata.artist) {
      infoChunks.push(
        writeRIFFChunkRaw("IART", encoder.encode(metadata.artist), true)
      );
    }
    if (metadata.album) {
      infoChunks.push(
        writeRIFFChunkRaw("IPRD", encoder.encode(metadata.album), true)
      );
    }
    if (metadata.genre) {
      infoChunks.push(
        writeRIFFChunkRaw("IGNR", encoder.encode(metadata.genre), true)
      );
    }
    if (metadata.title) {
      infoChunks.push(
        writeRIFFChunkRaw("INAM", encoder.encode(metadata.title), true)
      );
    }
    infoChunk = writeRIFFChunkParts("INFO", infoChunks, true);
  }
  let cueChunk = new IndexedByteArray(0);
  const cueOn = loop?.end !== undefined && loop?.start !== undefined;
  if (cueOn) {
    const loopStartSamples = Math.floor(loop.start * sampleRate);
    const loopEndSamples = Math.floor(loop.end * sampleRate);

    const cueStart = new IndexedByteArray(24);
    writeLittleEndianIndexed(cueStart, 0, 4);
    writeLittleEndianIndexed(cueStart, 0, 4);
    writeBinaryStringIndexed(cueStart, "data");
    writeLittleEndianIndexed(cueStart, 0, 4);
    writeLittleEndianIndexed(cueStart, 0, 4);
    writeLittleEndianIndexed(cueStart, loopStartSamples, 4);

    const cueEnd = new IndexedByteArray(24);
    writeLittleEndianIndexed(cueEnd, 1, 4);
    writeLittleEndianIndexed(cueEnd, 0, 4);
    writeBinaryStringIndexed(cueEnd, "data");
    writeLittleEndianIndexed(cueEnd, 0, 4);
    writeLittleEndianIndexed(cueEnd, 0, 4);
    writeLittleEndianIndexed(cueEnd, loopEndSamples, 4);

    cueChunk = writeRIFFChunkParts("cue ", [
      new IndexedByteArray([2, 0, 0, 0]),
      // Cue points count
      cueStart,
      cueEnd
    ]);
  }
  const headerSize = 44,
        dataSize = length * numChannels * bytesPerSample;
  const fileSize = (
    headerSize + dataSize +
    infoChunk.length + cueChunk.length - 8
  );
  const arrayBuffer = new ArrayBuffer(headerSize),
        uint8       = new Uint8Array(arrayBuffer),
        uint16      = new Uint16Array(arrayBuffer),
        uint32      = new Uint32Array(arrayBuffer);

  // Letters as numbers
  const R=82,  I=73,  F=70,
        W=87,  A=65,  V=86,  E=69,
        f=102, m=109, t=116, space=32,
        d=100, a=97;
  //                               I      bits
  const I_fileSize      = 1,  //   4,      32
        I_BlocSize      = 4,  // 16 / 4,   32
        I_AudioFormat   = 10, // 20 / 2,   16
        I_numChannels   = 11, // 22 / 2,   16
        I_sampleRate    = 6,  // 24 / 4,   32
        I_byteRate      = 7,  // 28 / 4,   32
        I_BytePerBloc   = 16, // 32 / 2,   16
        I_BitsPerSample = 17, // 36 / 2,   16
        I_dataSize      = 10; // 40 / 4,   32

  uint8.set([ R,I,F,F     ], 0)
  uint32[I_fileSize] = fileSize;

  uint8.set([ W,A,V,E     ], 8)
  uint8.set([ f,m,t,space ], 12)

  uint32[I_BlocSize]      = 16;
  uint16[I_AudioFormat]   = 1;
  uint16[I_numChannels]   = numChannels;
  uint32[I_sampleRate]    = sampleRate;
  uint32[I_byteRate]      = sampleRate * numChannels * bytesPerSample;

  uint16[I_BytePerBloc]   = numChannels * bytesPerSample;
  uint16[I_BitsPerSample] = 16;

  uint8.set([ d,a,t,a     ], 36)
  uint32[I_dataSize] = dataSize;
  return uint8;
}

/**
 * Translates to audible PCM data
 * @param {Array} audioData - An array that contains the audio buffers
 * @param {Object} options - Optional, adds loop timestamps and more
 * @returns {Uint8Array} the translated data
 */
function getData(audioData, options = DEFAULT_WAV_WRITE_OPTIONS) {
  const length = audioData[0].length,
        numChannels = audioData.length,
        fullOptions = fillWithDefaults(options, DEFAULT_WAV_WRITE_OPTIONS),
        bytesPerSample = 2;

  const [left, right] = audioData;
  const fileSize = length * numChannels * bytesPerSample,
        arrayBuffer = new ArrayBuffer(fileSize),
        Data16      = new Uint16Array(arrayBuffer);

  let currentSample = 0,
      multiplier = 32767,
      negativeMultiplier = multiplier * -1 - 1;
  // Volume
  /*if (fullOptions.normalizeAudio) {
    const numSamples = audioData[0].length;
    let maxAbsValue = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const data = audioData[ch];

      for (let i = 0; i < numSamples; i++) {
        const sample = Math.abs(data[i]);
        if (sample > maxAbsValue) {
          maxAbsValue = sample;
        }
      }
    }
    multiplier = maxAbsValue > 0
      ? 32767 / maxAbsValue
      : 1;
  }*/
  for (let i = 0; i < length; i++) {
    // Left channel
    Data16[currentSample++] = Math.min(
      multiplier, Math.max(negativeMultiplier, left[i] * multiplier)
    );
    // Right channel
    Data16[currentSample++] = Math.min(
      multiplier, Math.max(negativeMultiplier, right[i] * multiplier)
    );
  }
  return new Uint8Array(arrayBuffer);
}


export {
  getWavHeader,
  getData
}

