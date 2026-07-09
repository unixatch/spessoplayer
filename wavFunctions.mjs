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
 * @module wavFunctions
 */

/**
 * Combines multiple RIFF/WAV chunks
 * @param {String}       header start and title of the chunk list
 * @param {Uint8Array[]} chunks list of chunks to add
 * @return {Uint8Array} completed LIST/INFO chunk
 */
function writeMultipleChunks(header, chunks) {
  let dataOffset = 12;
  let dataLength = 0;
  for (const {length} of chunks) dataLength += length;

  const writtenSize = dataLength + 4;
  let finalSize = dataOffset + dataLength;
  if (finalSize % 2 !== 0) finalSize++

  const uint8 = new Uint8Array(finalSize);
  uint8.set(encoder.encode("LIST"), 0)
  uint8[4] = writtenSize;
  uint8[5] = writtenSize >> 8;
  uint8[6] = writtenSize >> 16;
  uint8[7] = writtenSize >> 24;
  uint8.set(encoder.encode(header), 8)

  for (const c of chunks) {
    uint8.set(c, dataOffset)
    dataOffset += c.length;
  }
  return uint8;
}
/**
 * Encodes a single RIFF/WAV chunk
 * @param {String}     header start and title of the chunk
 * @param {Uint8Array} data   description of the chunk
 * @return {Uint8Array} completed chunk
 */
function writeSingleChunk(header, data) {
  const dataStartOffset = 8;
  //                  padding of 0 ↓
  const dataLength = data.length + 1;

  let finalSize = dataStartOffset + dataLength;
  if (finalSize % 2 !== 0) finalSize++

  const uint8 = new Uint8Array(finalSize);
  uint8.set(encoder.encode(header), 0)
  uint8[4] = dataLength;
  uint8[5] = dataLength >> 8;
  uint8[6] = dataLength >> 16;
  uint8[7] = dataLength >> 24;

  uint8.set(data, dataStartOffset)
  return uint8;
}

let encoder;
/**
 * WAV Header Generator
 * @param {module:typeDefinitions~getWavHeaderObjectParameters} audioData - An object that contains infos about the audio
 * @param {Number} [sampleRate=48000]    - Sample rate of the audio
 * @param {Object} [options]             - adds metadata and more
 * @param {Object} [options.metadata={}] - metadata to add to the header
 * @returns {Uint8Array} the wav header
 */
function getWavHeader({ length, numChannels },
  sampleRate = 48000, metadata = {}
) {
  const bytesPerSample = 2;
  let infoChunk;
  const infoOn = Object.keys(metadata).length > 0;
  if (infoOn) {
    encoder = new TextEncoder();
    const infoChunks = [
      writeSingleChunk(
        "ICMT",
        encoder.encode("Created with SpessaSynth and spessoplayer")
      )
    ];
    if (metadata.artist) infoChunks.push(
      writeSingleChunk("IART", encoder.encode(metadata.artist))
    )
    if (metadata.album) infoChunks.push(
      writeSingleChunk("IPRD", encoder.encode(metadata.album))
    )
    if (metadata.genre) infoChunks.push(
      writeSingleChunk("IGNR", encoder.encode(metadata.genre))
    )
    if (metadata.title) infoChunks.push(
      writeSingleChunk("INAM", encoder.encode(metadata.title))
    )
    infoChunk = writeMultipleChunks("INFO", infoChunks);
  }
  const headerSize = 44 + (infoChunk?.length ?? 0),
        dataSize = length * numChannels * bytesPerSample;
  const fileSize = (
    headerSize + dataSize + (infoChunk?.length ?? 0) - 8
  );
  const uint8 = new Uint8Array(headerSize);

  // Letters as numbers
  const R=82,  I=73,  F=70,
        W=87,  A=65,  V=86,  E=69,
        f=102, m=109, t=116, space=32,
        d=100, a=97;

  uint8[0]  = R
  uint8[1]  =  I
  uint8[2]  =   F
  uint8[3]  =    F;
  uint8[4] = fileSize;
  uint8[5] = fileSize >> 8;
  uint8[6] = fileSize >> 16;
  uint8[7] = fileSize >> 24;

  uint8[8]  = W
  uint8[9]  =  A
  uint8[10] =   V
  uint8[11] =    E;
  uint8[12] = f
  uint8[13] =  m
  uint8[14] =   t;
  uint8[15] = space;

  // BlocSize
  uint8[16] = 16;
  uint8[17] = 0;
  uint8[18] = 0;
  uint8[19] = 0;
  // AudioFormat
  uint8[20] = 1;
  uint8[21] = 0;
  uint8[22] = numChannels;
  uint8[23] = numChannels >> 8;
  uint8[24] = sampleRate;
  uint8[25] = sampleRate >> 8;
  uint8[26] = sampleRate >> 16;
  uint8[27] = sampleRate >> 24;

  const fileSampleRate = sampleRate * numChannels * bytesPerSample;
  // byteRate
  uint8[28] = fileSampleRate;
  uint8[29] = fileSampleRate >> 8;
  uint8[30] = fileSampleRate >> 16;
  uint8[31] = fileSampleRate >> 24;

  const bytePerBlock = numChannels * bytesPerSample;
  uint8[32] = bytePerBlock;
  uint8[33] = bytePerBlock >> 8;
  // BitsPerSample
  uint8[34] = 16;
  uint8[35] = 0;

  if (infoOn) {
    uint8.set(infoChunk, 36)

    const infoLength = infoChunk.length;
    let afterInfoOffset = infoLength + 36;
    uint8[afterInfoOffset++] = d
    uint8[afterInfoOffset++] =  a
    uint8[afterInfoOffset++] =   t
    uint8[afterInfoOffset++] =    a;
    uint8[afterInfoOffset++] = dataSize;
    uint8[afterInfoOffset++] = dataSize >> 8;
    uint8[afterInfoOffset++] = dataSize >> 16;
    uint8[afterInfoOffset++] = dataSize >> 24;
    return uint8;
  }
  uint8[36] = d
  uint8[37] =  a
  uint8[38] =   t
  uint8[39] =    a;
  uint8[40] = dataSize;
  uint8[41] = dataSize >> 8;
  uint8[42] = dataSize >> 16;
  uint8[43] = dataSize >> 24;
  return uint8;
}

const MAX_SIGNED_16INT = 32767,
      MIN_SIGNED_16INT = -(MAX_SIGNED_16INT) - 1;
/**
 * Translates to audible PCM data
 * @param {Array} audioData - An array that contains the audio buffers
 * //param {Object} options - Optional, adds loop timestamps and more
 * @returns {Uint8Array} the translated data
 */
function getData(audioData/*, options = DEFAULT_WAV_WRITE_OPTIONS*/) {
  const {
    length: numChannels,
    0: { length }
  } = audioData;
  const // fullOptions = fillWithDefaults(options, DEFAULT_WAV_WRITE_OPTIONS),
        bytesPerSample = 2;

  const [left, right] = audioData;
  const fileSize = length * numChannels * bytesPerSample,
        arrayBuffer = new ArrayBuffer(fileSize),
        Data16      = new Uint16Array(arrayBuffer);

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
    MAX_SIGNED_16INT = maxAbsValue > 0
      ? 32767 / maxAbsValue
      : 1;
  }*/
  let currentSample = 0;
  for (let i = 0; i < length; i++) {
    /*
      Basically it amplifies the float 32bit little endian data
      and caps it to the 16bit signed integer limits.
      It does it on both channels.

      TLDR:
        Must be:
          amplified_sample >= MIN_SIGNED_16INT
          amplified_sample <= MAX_SIGNED_16INT

        Otherwise one of these:
          MIN_SIGNED_16INT
          MAX_SIGNED_16INT
    */
    // <- Left channel <-
    const amplifiedLeft = left[i] * MAX_SIGNED_16INT;
    Data16[currentSample++] = (
      Math.min(
        MAX_SIGNED_16INT,
        Math.max(MIN_SIGNED_16INT, amplifiedLeft)
      )
    );
    // -> Right channel ->
    const amplifiedRight = right[i] * MAX_SIGNED_16INT;
    Data16[currentSample++] = (
      Math.min(
        MAX_SIGNED_16INT,
        Math.max(MIN_SIGNED_16INT, amplifiedRight)
      )
    );
  }
  return new Uint8Array(arrayBuffer);
}


export {
  getWavHeader,
  getData
}

