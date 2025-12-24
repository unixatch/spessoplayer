import {
  IndexedByteArray,
  DEFAULT_WAV_WRITE_OPTIONS
} from "spessasynth_core"
function fillWithDefaults(obj, defObj) {
  return {
    ...defObj,
    ...obj ?? {}
  };
}
function writeBinaryStringIndexed(outArray, string, padLength = 0) {
  if (padLength > 0) {
    if (string.length > padLength) {
      string = string.slice(0, padLength);
    }
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
  if (finalSize % 2 !== 0) {
    finalSize++;
  }
  const outArray = new IndexedByteArray(finalSize);
  writeBinaryStringIndexed(outArray, headerWritten);
  writeDword(outArray, writtenSize);
  if (isList) {
    writeBinaryStringIndexed(outArray, header);
  }
  chunks.forEach((c) => {
    outArray.set(c, dataOffset);
    dataOffset += c.length;
  });
  return outArray;
}
function writeRIFFChunkRaw(header, data, addZeroByte = false, isList = false) {
  if (header.length !== 4) {
    throw new Error(`Invalid header length: ${header}`);
  }
  let dataStartOffset = 8;
  let headerWritten = header;
  let dataLength = data.length;
  if (addZeroByte) {
    dataLength++;
  }
  let writtenSize = dataLength;
  if (isList) {
    dataStartOffset += 4;
    writtenSize += 4;
    headerWritten = "LIST";
  }
  let finalSize = dataStartOffset + dataLength;
  if (finalSize % 2 !== 0) {
    finalSize++;
  }
  const outArray = new IndexedByteArray(finalSize);
  writeBinaryStringIndexed(outArray, headerWritten);
  writeDword(outArray, writtenSize);
  if (isList) {
    writeBinaryStringIndexed(outArray, header);
  }
  outArray.set(data, dataStartOffset);
  return outArray;
}

function getWavHeader(audioData, sampleRate, options = DEFAULT_WAV_WRITE_OPTIONS) {
  const length = audioData[0].length;
  const numChannels = audioData.length;
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
  const cueOn = loop?.end !== void 0 && loop?.start !== void 0;
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
  const headerSize = 44;
  const dataSize = length * numChannels * bytesPerSample;
  const fileSize = headerSize + dataSize + infoChunk.length + cueChunk.length - 8;
  const header = new Uint8Array(headerSize);
  header.set([82, 73, 70, 70], 0);
  header.set(
    new Uint8Array([
      fileSize & 255,
      fileSize >> 8 & 255,
      fileSize >> 16 & 255,
      fileSize >> 24 & 255
    ]),
    4
  );
  header.set([87, 65, 86, 69], 8);
  header.set([102, 109, 116, 32], 12);
  header.set([16, 0, 0, 0], 16);
  header.set([1, 0], 20);
  header.set([numChannels & 255, numChannels >> 8], 22);
  header.set(
    new Uint8Array([
      sampleRate & 255,
      sampleRate >> 8 & 255,
      sampleRate >> 16 & 255,
      sampleRate >> 24 & 255
    ]),
    24
  );
  const byteRate = sampleRate * numChannels * bytesPerSample;
  header.set(
    new Uint8Array([
      byteRate & 255,
      byteRate >> 8 & 255,
      byteRate >> 16 & 255,
      byteRate >> 24 & 255
    ]),
    28
  );
  header.set([numChannels * bytesPerSample, 0], 32);
  header.set([16, 0], 34);
  header.set([100, 97, 116, 97], 36);
  header.set(
    new Uint8Array([
      dataSize & 255,
      dataSize >> 8 & 255,
      dataSize >> 16 & 255,
      dataSize >> 24 & 255
    ]),
    40
  );
  return header;
}
function getWavData(audioData, sampleRate, options = DEFAULT_WAV_WRITE_OPTIONS) {
  const length = audioData[0].length;
  const numChannels = audioData.length;
  const fullOptions = fillWithDefaults(options, DEFAULT_WAV_WRITE_OPTIONS);
  const headerSize = 44;
  const bytesPerSample = 2;

  const dataSize = length * numChannels * bytesPerSample;
  const fileSize = dataSize;
  
  let wavData = new Uint8Array(fileSize);
  let offset = 0;
  // Volume
  let multiplier = 32767;
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
    audioData.forEach((d) => {
      const sample = Math.min(32767, Math.max(-32768, d[i] * multiplier));
      wavData[offset++] = sample & 255;
      wavData[offset++] = sample >> 8 & 255;
    });
  }
  return wavData;
}


export { 
  getWavHeader,
  getWavData
}