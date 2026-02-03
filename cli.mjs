/*
  Copyright (C) 2025  unixatch

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with spessoplayer.  If not, see <https://www.gnu.org/licenses/>.
*/

import { join, basename, parse } from "path"
import { _dirname_, log, Options } from "./utils.mjs"

const regexes = {
  help: /^(?:--help|\/help|-h|\/h|\/\?)$/,
  version: /^(?:--version|\/version|-V|\/V)$/,
  uninstall: /^(?:--uninstall|\/uninstall|-u|\/u)$/,

  verboseLevel: new RegExp([
    "^(?:--verbose(?:=(?<number>\\d))*", // --verbose[=n]
    "|\\/verbose(?:=(?<number>\\d))*",   // /verbose[=n]
    "|-v(?:=(?<number>\\d))*",           // -v[=n]
    "|\\/v(?:=(?<number>\\d))*)$"        // /v[=n]
  ].join("")),

  logFile: new RegExp([
    "^(?:--log-file(?:=(?<path>\\w+))*", // --log-file[=n]
    "|\\/log-file(?:=(?<path>\\w+))*",   // /log-file[=n]
    "|-lf(?:=(?<path>\\w+))*",           // -lf[=n]
    "|\\/lf(?:=(?<path>\\w+))*)$"        // /lf[=n]
  ].join("")),

  stdout: /^-$/,
  wav: /^.*(?:\.wav|\.wave)$/,
  wavFormat: /^(?:wav|wave)$/,
  flac: /^.*\.flac$/,
  mp3: /^.*\.mp3$/,
  raw: /^.*\.(?:s16le|s32le|pcm)$/,
  rawFormat: /^(?:s16le|s32le|pcm)$/,

  input: new RegExp([
    "^(?:--input(?<index>\\d+)*",
    "|\\/input(?<index>\\d+)*",
    "|-i(?<index>\\d+)*",
    "|\\/i(?<index>\\d+)*)$"
  ].join("")),
  reverbVolume: new RegExp([
    "^(?:--reverb-volume(?<index>\\d+)*",
    "|\\/reverb-volume(?<index>\\d+)*",
    "|-rvb(?<index>\\d+)*",
    "|\\/rvb(?<index>\\d+)*)$"
  ].join("")),
  effects: new RegExp([
    "^(?:--effects(?<index>\\d+)*",
    "|\\/effects(?<index>\\d+)*",
    "|-e(?<index>\\d+)*",
    "|\\/e(?<index>\\d+)*)$"
  ].join("")),

  // stdout format must be of only 1 kind
  // otherwise players like mpv won't read the output correctly
  format: /^(?:--format|\/format|-f|\/f)$/,
  volume: new RegExp([
    "^(?:--volume(?<index>\\d+)*",
    "|\\/volume(?<index>\\d+)*",
    "|-vol(?<index>\\d+)*",
    "|\\/vol(?<index>\\d+)*)$"
  ].join("")),
  sampleRate: new RegExp([
    "^(?:--sample-rate(?<index>\\d+)*",
    "|\\/sample-rate(?<index>\\d+)*",
    "|-r(?<index>\\d+)*",
    "|\\/r(?<index>\\d+)*)$"
  ].join("")),

  loop: new RegExp([
    "^(?:--loop(?<index>\\d+)*",
    "|\\/loop(?<index>\\d+)*",
    "|-l(?<index>\\d+)*",
    "|\\/l(?<index>\\d+)*)$"
  ].join("")),
  loopStart: new RegExp([
    "^(?:--loop-start(?<index>\\d+)*",
    "|\\/loop-start(?<index>\\d+)*",
    "|-ls(?<index>\\d+)*",
    "|\\/ls(?<index>\\d+)*)$"
  ].join("")),
  loopEnd: new RegExp([
    "^(?:--loop-end(?<index>\\d+)*",
    "|\\/loop-end(?<index>\\d+)*",
    "|-le(?<index>\\d+)*",
    "|\\/le(?<index>\\d+)*)$"
  ].join("")),

  allSupportedFiles: /MThd|sfbk|DLS/,
  fileCheck: /^(?!-|\/)(?:\w|\W)*$/,

  infinity: /^(?:Infinity|infinity)$/,
  //                          HH:MM:SS.sss
  ISOTimestamp: /[0-9]{1,2}:[0-9]{2}:[0-9]{2}(\.[0-9])*/,
  areDecibels: /^(?:-|\+*)[\d.]+dB/,
  decibelNumber: /^((?:-|\+*)[\d.]+)dB/,
  isPercentage: /^[\d.]+%$/,
  percentageNumber: /^([\d.]+)%$/
};

async function get20BytesFromFile(path) {
  let fileMagicNumber;
  await new Promise(resolve => {
    const readStream = fs.createReadStream(path, { start: 0, end: 20 });
    readStream.on("data", (data) => {
      fileMagicNumber = data.toString();
      resolve()
    })
    readStream.on("error", (e) => {
      if (e.code === "ENOENT") console.error(`${red}Can't open '${path}' because it doesn't exist${normal}`)
      process.exit(1)
    })
  })
  return fileMagicNumber;
}
/**
 * Sets necessary variables in Options class for main.mjs
 * @param {Array} args - The process.argv to analyse
 */
const actUpOnPassedArgs = async (args) => {
  let lastParam,
      lastIndex,
      lastMidis = [],
      lastSoundfont;
  let newArguments = args.slice(2);
  if (newArguments.length === 0) {
    await help()
    process.exit()
  }
  if (newArguments.filter(i => regexes.help.test(i)).length > 0) {
    await help()
    process.exit()
  }
  if (newArguments.filter(i => regexes.version.test(i)).length > 0) {
    await version()
    process.exit()
  }
  if (newArguments.filter(i => regexes.uninstall.test(i)).length > 0) {
    await uninstall()
    process.exit()
  }
  
  const isVerboseLevelSet = newArguments.find(i => regexes.verboseLevel.test(i));
  if (isVerboseLevelSet) {
    let verboseOptionNumber = isVerboseLevelSet.match(regexes.verboseLevel).groups.number;
    const verboseOptionPosition = newArguments.indexOf(isVerboseLevelSet);
    
    if (!verboseOptionNumber) verboseOptionNumber = "1";
    // Delete verbose-level from newArguments
    newArguments.splice(verboseOptionPosition, 1)
    
    if (!process.env["DEBUG_LEVEL_SPESSO"]) {
      await setVerboseLevel(verboseOptionNumber)
    } else log(1, performance.now().toFixed(2), `Using variable DEBUG_LEVEL_SPESSO=${process.env["DEBUG_LEVEL_SPESSO"]}`)
  } else if (process.env["DEBUG_LEVEL_SPESSO"]) {
    log(1, performance.now().toFixed(2), `Using variable DEBUG_LEVEL_SPESSO=${process.env["DEBUG_LEVEL_SPESSO"]}`)
  }
  const isPathOfLogFileSet = newArguments.find(i => regexes.logFile.test(i));
  if (isPathOfLogFileSet
      && !isVerboseLevelSet
      && !process.env["DEBUG_LEVEL_SPESSO"]) {
    await setVerboseLevel("1")
  }
  
  if (isPathOfLogFileSet) {
    const pathOfLogFile = isPathOfLogFileSet.match(regexes.logFile).groups.path;
    const pathOfLogFilePosition = newArguments.indexOf(isPathOfLogFileSet);
    
    // Delete verbose-level from newArguments
    newArguments.splice(pathOfLogFilePosition, 1)
    
    if (!process.env["DEBUG_FILE_SPESSO"]) {
      setLogFilePath(pathOfLogFile)
    } else log(1, performance.now().toFixed(2), `Using variable DEBUG_FILE_SPESSO=${process.env["DEBUG_FILE_SPESSO"]}`)
  } else if (process.env["DEBUG_FILE_SPESSO"]) {
    log(1, performance.now().toFixed(2), `Using variable DEBUG_FILE_SPESSO=${process.env["DEBUG_FILE_SPESSO"]}`)
  }

  for (const arg of newArguments) {
    switch (arg) {
      case regexes.wav.test(arg) && arg: {
        Options.fileOutputs(0, arg);
        log(1, performance.now().toFixed(2), "Set file output to wav")
        break;
      }
      case regexes.flac.test(arg) && arg: {
        Options.fileOutputs(1, arg);
        log(1, performance.now().toFixed(2), "Set file output to flac")
        break;
      }
      case regexes.mp3.test(arg) && arg: {
        Options.fileOutputs(2, arg);
        log(1, performance.now().toFixed(2), "Set file output to mp3")
        break;
      }
      case regexes.raw.test(arg) && arg: {
        Options.fileOutputs(3, arg);
        log(1, performance.now().toFixed(2), "Set file output to pcm")
        break;
      }
      case regexes.stdout.test(arg) && arg: {
        Options.toStdout = true;
        break;
      }
      case regexes.input.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
        
        lastParam = "input";
        lastIndex = arg.match(regexes.input)?.groups;
        break;
      }
      case regexes.reverbVolume.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
        
        lastParam = "reverb";
        lastIndex = arg.match(regexes.reverbVolume)?.groups;
        break;
      }
      case regexes.volume.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
        
        lastParam = "volume";
        lastIndex = arg.match(regexes.volume)?.groups;
        break;
      }
      case regexes.effects.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
        
        lastParam = "effects";
        lastIndex = arg.match(regexes.effects)?.groups;
        break;
      }
      case regexes.format.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
        
        lastParam = "format";
        break;
      }
      case regexes.sampleRate.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
        
        lastParam = "sample-rate";
        lastIndex = arg.match(regexes.sampleRate)?.groups;
        break;
      }
      case regexes.loopStart.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
        
        lastParam = "loop-start";
        lastIndex = arg.match(regexes.loopStart)?.groups;
        break;
      }
      case regexes.loopEnd.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
        
        lastParam = "loop-end";
        lastIndex = arg.match(regexes.loopEnd)?.groups;
        break;
      }
      case regexes.loop.test(arg) && arg: {
        // In case there's no other argument
        const indexOfArg = newArguments.indexOf(arg);
        if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
        
        lastParam = "loop";
        lastIndex = arg.match(regexes.loop)?.groups;
        break;
      }
      case regexes.fileCheck.test(basename(arg)) && arg: {
        let returnedObject = await setFile({
                               lastParam, lastIndex,
                               newArguments, arg,
                               lastMidis, lastSoundfont
                             });
        if (returnedObject?.result) {
          // Reassigns the variables with the new data
          // or it does nothing (= variable is a default)
          ({
            lastMidis = lastMidis,
            lastSoundfont = lastSoundfont
          } = returnedObject);
          // Result returns true === break right now
          break;
        }
      }
      
      default:
        switch (lastParam) {
          case "loop":
            setLoop(arg, lastIndex)
            lastParam = undefined;
            break;
          case "loop-start":
            setLoopStart(arg, lastIndex)
            lastParam = undefined;
            break;
          case "loop-end":
            setLoopEnd(arg, lastIndex)
            lastParam = undefined;
            break;
          case "sample-rate":
            setSampleRate(arg, lastIndex, newArguments)
            lastParam = undefined;
            break;
          case "format":
            setFormat(arg, lastIndex)
            lastParam = undefined;
            break;
          case "volume":
            setVolume(arg, lastIndex)
            lastParam = undefined;
            break;
          case "reverb":
            setReverb(arg, lastIndex)
            lastParam = undefined;
            break;
          case "effects":
            setEffects(arg, lastIndex)
            lastParam = undefined;
            break;
          
          default:
            await help({
              errorText: red+`'${
                underline+dimRed +
                arg +
                normal+red
              }' is an invalid parameter`+normal
            })
            process.exit()
        }
    }
  }
  if (!Options.all.files
      || !Object.keys(Options.all.files).length > 0) {
    console.error(`${red}Missing required files${normal}`);
    process.exit(1)
  }
}

/**
 * Sets a supported file inside a group in Options class
 * @param {Object} passedVariables - variables injected with this object
 * @param {String} passedVariables.lastParam - last parameter that has been used last time
 * @param {String} passedVariables.lastIndex - last index that has been set last time
 * @param {String} passedVariables.newArguments - arguments passed from the terminal
 * @param {String} passedVariables.arg - argument passed to this function that is also a file path
 * @param {String} passedVariables.lastMidis - latest array of midi files to keep in mind
 * @param {String} passedVariables.lastSoundfont - latest file path of the soundfont
 * @return {(Object|false)}
 *         true if it needs to break,
 *         false if it needs to fallthrough the switch
 *         (See "case regexes.fileCheck.test(basename(arg)) && arg")
 */
const setFile = async ({
  lastParam, lastIndex,
  newArguments, arg,
  lastMidis, lastSoundfont
}) => {
  if (lastParam !== undefined && lastParam !== "input") return false;

  if (!global.fs) {
    const fs = await import("node:fs");
    global.fs = fs;
  }
  const fileMagicNumber = await get20BytesFromFile(arg);
  
  // MIDI files
  if (fileMagicNumber.includes("MThd")) {
    if (!lastSoundfont) {
      lastMidis.push(arg)
      log(1, performance.now().toFixed(2), `Set midi file to "${arg}"`)
      return {
        lastMidis,
        result: true
      };
    }
    const areThereOthers = newArguments.filter(i => {
      if (i !== arg
          && !lastMidis.includes(i)
          && i !== lastSoundfont
          && regexes.fileCheck.test(i)) {
        try {
          const beginningOfFile = new Uint8Array(20);
          fs.readSync(
            fs.openSync(i),
            beginningOfFile,
            { length: 20 }
          )
          const decodedText = new TextDecoder().decode(beginningOfFile);
          if (decodedText.match(regexes.allSupportedFiles)) return true;
        } catch (e) {
          if (e.code === "ENOENT") return false;
          throw e
        }
      }
      return false;
    });
    if (areThereOthers.length > 0) {
      lastMidis.push(arg)
      log(1, performance.now().toFixed(2), `Set midi file to "${arg}"`)
      return {
        lastMidis,
        result: true
      };
    }
    if (lastParam !== "input") {
      lastMidis.push(arg)
      Options.files(lastSoundfont, lastMidis);
      lastMidis.length = 0;
      lastSoundfont = null;
      return {
        lastMidis, lastSoundfont,
        result: true
      };
    }
    const indexesAndKeys = Object.keys(Options.all.files).map((e, i) => [i, e]);
    for (const [index, key] of indexesAndKeys) {
      if (index === Number(lastIndex?.index) ?? 0) {
        lastMidis.push(arg)
        Options.files(key, lastMidis);
        lastMidis.length = 0;
        lastSoundfont = null;
        return {
          lastMidis, lastSoundfont,
          result: true
        };
      }
    }
  }
  
  // Soundfont and downloadable sounds files
  if (fileMagicNumber.includes("sfbk")
      || fileMagicNumber.includes("DLS")) {
    if (lastMidis.length > 0) {
      lastSoundfont = arg;
      Options.files(lastSoundfont, lastMidis);
      log(1, performance.now().toFixed(2), `Set soundfont file to "${Object.keys(Options.all.files).find(i => i === arg)}"`)
      lastMidis.length = 0;
      lastSoundfont = null;
      return {
        lastMidis, lastSoundfont,
        result: true
      };
    }
    lastSoundfont = arg;
    return {
      lastSoundfont,
      result: true
    };
  }
}
/**
 * Sets the Options.loopN variable
 * @param {String} arg - the loop amount
 */
const setLoop = (arg, lastIndex) => {
  if (typeof Number(arg) === "number"
      && !regexes.infinity.test(arg)) {
    Options.loopN(Number(lastIndex?.index), Number(arg));
    log(1, performance.now().toFixed(2), `Set loop amount to ${Options.all.loopN.find(i => i === Number(arg))}`)
    return;
  }
  if (regexes.infinity.test(arg)) {
    console.error(`${normalRed}Can't use infinity, sorry${normal}`)
    process.exit(1);
  }
  console.error(`${normalRed}Passed something that wasn't a number${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.loopStart variable
 * @param {String} arg - the start of the loop in seconds or in HH:MM:SS:ms format
 */
const setLoopStart = (arg, lastIndex) => {
  if (typeof Number(arg) === "number"
      || !Number.isNaN(Date.parse(`1970T${arg}Z`))) {
    if (regexes.ISOTimestamp.test(arg)) {
      const seconds = Date.parse(`1970T${arg}Z`) / 1000;
      Options.loopStart(Number(lastIndex?.index), seconds);
      log(1, performance.now().toFixed(2), `Set loop-start to ${Options.all.loopStart.find(i => i === seconds)}`)
      return;
    }
    Options.loopStart(Number(lastIndex?.index), Number(arg));
    log(1, performance.now().toFixed(2), `Set loop-start to ${Options.all.loopStart.find(i => i === Number(arg))}`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a number or in ISO string format${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.loopEnd variable
 * @param {String} arg - the end of the loop in seconds or in HH:MM:SS:ms format
 */
const setLoopEnd = (arg, lastIndex) => {
  if (typeof Number(arg) === "number"
      || !Number.isNaN(Date.parse(`1970T${arg}Z`))) {
    if (regexes.ISOTimestamp.test(arg)) {
      const seconds = Date.parse(`1970T${arg}Z`) / 1000;
      Options.loopEnd(Number(lastIndex?.index), seconds);
      log(1, performance.now().toFixed(2), `Set loop-end to ${Options.all.loopEnd.find(i => i === seconds)}`)
      return;
    }
    Options.loopEnd(Number(lastIndex?.index), Number(arg));
    log(1, performance.now().toFixed(2), `Set loop-end to ${Options.all.loopEnd.find(i => i === Number(arg))}`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a number or in ISO string format${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.sampleRate variable
 * @param {String} arg - the sample rate to set
 */
const setSampleRate = (arg, lastIndex, newArguments) => {
  if (typeof Number(arg) === "number" && !arg.startsWith("-")) {
    const isStdout = newArguments.filter(i => regexes.stdout.test(i));
    if (isStdout.length > 0) {
      Options.stdoutSampleRate = Number(arg);
      log(1, performance.now().toFixed(2), `Set sample rate for all to ${Options.all.sampleRate} because output is stdout`)
      return;
    }
    Options.sampleRate(Number(lastIndex?.index), Number(arg));
    log(1, performance.now().toFixed(2), `Set sample rate to ${Options.all.sampleRate.find(i => i === Number(arg))}`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number${normal}`)
  process.exit(1);
}
/**
 * Simply changes how the program should log
 * @param {Number} arg - the level of how much it should log
 */
const setVerboseLevel = async (arg) => {
  const isFromUser = arg !== undefined;
  if (!arg) arg = "2";
  if (!global.fs) global.fs = await import("fs");
  if (typeof Number(arg) === "number"
      && !(Number(arg) < 0 && Number(arg) > 2)
      && !arg.startsWith("-")) {
    Options.verboseLevel = Number(arg);
    if (isFromUser) {
      log(1, performance.now().toFixed(2), `Set verbose level asked by the user to ${Number(arg)}`)
    } else log(1, performance.now().toFixed(2), `Set verbose level to ${Number(arg)}`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.format variable for use in stdout mode
 * @param {String} arg - the format to use (similar to ffmpeg's -f)
 */
const setFormat = arg => {
  switch (arg) {
    case regexes.wavFormat.test(arg) && arg: {
      Options.format = "wave";
      log(1, performance.now().toFixed(2), `Set stdout format to ${Options.all.format}`)
      return;
    }
    case "flac": {
      Options.format = "flac";
      log(1, performance.now().toFixed(2), `Set stdout format to ${Options.all.format}`)
      return;
    }
    case "mp3": {
      Options.format = "mp3";
      log(1, performance.now().toFixed(2), `Set stdout format to ${Options.all.format}`)
      return;
    }
    case regexes.rawFormat.test(arg) && arg: {
      Options.format = "pcm";
      log(1, performance.now().toFixed(2), `Set stdout format to ${Options.all.format}`)
      return;
    }
  }
  console.error(`${normalRed}Passed something that wasn't an available format${normal}`)
  process.exit(1);
}
/**
 * Applies effects from the user's string passed through --effects
 * @param {String} arg - the comma-separeted string to parse
 */
const setEffects = (arg, lastIndex) => {
  const regexListOfEffects =
    "allpass|band|bandpass|bandreject|bass|bend|biquad" +
    "|chorus|channels|compand|contrast|dcshift|deemph|delay" +
    "|dither|divide|downsample|earwax|echo|echos|equalizer" +
    "|fade|fir|firfit|flanger|gain|highpass|hilbert|input" +
    "|ladspa|loudness|lowpass|mcompand|noiseprof|noisered" +
    "|norm|oops|output|overdrive|pad|phaser|pitch|rate|remix" +
    "|repeat|reverb|reverse|riaa|silence|sinc|spectrogram" +
    "|speed|splice|stat|stats|stretch|swap|synth|tempo" +
    "|treble|tremolo|trim|upsample|vad|vol";
  const regexGroupListGetter = /([a-z]+) ?([-a-z\d ]+)?/gm;
  const regexTests = {
    // is it a list structured like
    //   <effect1>[values1],<effect2>[values2]?
    normalList: new RegExp(`${regexGroupListGetter.source},${regexGroupListGetter.source}`).test(arg),
    // is it a single effect like
    //   <effect>[values]?
    isIncorrect: new RegExp(`^${regexGroupListGetter.source}[^,](?:${regexListOfEffects}).*$`).test(arg)
  }
  if (regexTests.normalList || !regexTests.isIncorrect) {
    const list = [
      ...arg
        .matchAll(regexGroupListGetter)
        .map(i => ({
          effect: i[1],
          values: (i[2])
            ? i[2].split(
              (i[2].includes(",")) ? "," : " "
            )
            : undefined
        }) )
    ];
    
    if (!list
          .every(i => new RegExp(regexListOfEffects).test(i.effect))
    ) {
      console.error(`${normalRed}One effect that you passed doesn't exist in SoX${normal}`);
      process.exit(1);
    }
    
    Options.effects(Number(lastIndex?.index), list);
    log(1, performance.now().toFixed(2), `Set list of SoX effects as ${global.effects}`)
    return;
  }
  console.error(`${normalRed}The string for SoX effects you passed is not usable${normal}`);
  process.exit(1);
}
/**
 * Sets the Options.volume variable for the masterGain
 * @param {String} arg - the volume in either percentage, decibels or decimals
 */
const setVolume = (arg, lastIndex) => {
  if (regexes.areDecibels.test(arg)) {
    const dBNumber = Number(arg.match(regexes.decibelNumber)[1]);
    const toPercentage = 10**(dBNumber/10);
    Options.volume(Number(lastIndex?.index), toPercentage);
    log(1, performance.now().toFixed(2), `Set volume to ${Options.all.volume.find(i => i === toPercentage)}`)
    return;
  }
  if (regexes.isPercentage.test(arg)) {
    const percentage = Number(arg.match(regexes.percentageNumber)[1]);
    Options.volume(Number(lastIndex?.index), percentage / 100);
    log(1, performance.now().toFixed(2), `Set volume to ${Options.all.volume.find(i => i === percentage / 100)}`)
    return;
  }
  if (typeof Number(arg) === "number" && !arg.startsWith("-")) {
    Options.volume(Number(lastIndex?.index), Number(arg));
    log(1, performance.now().toFixed(2), `Set volume to ${Options.all.volume.find(i => i === Number(arg))}`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number/dB/percentage${normal}`)
  process.exit(1);
}
/**
 * Sets the Options.reverb variable
 * @param {String} arg - the volume in either percentage, decibels or decimals
 */
const setReverb = (arg, lastIndex) => {
  if (regexes.areDecibels.test(arg)) {
    const dBNumber = Number(arg.match(regexes.decibelNumber)[1]);
    Options.reverbVolume(Number(lastIndex?.index), dBNumber);
    Options.effects(Number(lastIndex?.index), []);
    log(1, performance.now().toFixed(2), `Set reverb volume to ${Options.all.reverbVolume.find(i => i === dBNumber)} and effects variable to ${global.effects}`)
    return;
  }
  if (regexes.isPercentage.test(arg)) {
    const percentage = Number(arg.match(regexes.percentageNumber)[1]);
    const toDB = 10 * 10**(percentage/100);
    Options.reverbVolume(Number(lastIndex?.index), toDB);
    Options.effects(Number(lastIndex?.index), []);
    log(1, performance.now().toFixed(2), `Set reverb volume to ${Options.all.reverbVolume.find(i => i === toDB)} and effects variable to ${global.effects}`)
    return;
  }
  if (typeof Number(arg) === "number" && !arg.startsWith("-")) {
    Options.reverbVolume(Number(lastIndex?.index), Number(arg));
    Options.effects(Number(lastIndex?.index), []);
    log(1, performance.now().toFixed(2), `Set reverb volume to ${Options.all.reverbVolume.find(i => i === Number(arg))} and effects variable to ${global.effects}`)
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number/dB/percentage${normal}`)
  process.exit(1);
}
/**
 * Sets the file path to the log file
 * @param {String} arg - Path to the log file
 */
const setLogFilePath = arg => {
  Options.logFilePath(arg ?? "./spesso.log");
  log(1, performance.now().toFixed(2), `Set log file path to ${Options.all.logFilePath}`)
}
/**
 * Runs uninstall.mjs and uninstall spessoplayer
 */
const uninstall = async () => {
  const { execSync } = await import("child_process");
  const uninstallScriptPath = join(_dirname_, "uninstall.mjs");
  const isGloballyInstalled = /spessoplayer/.test(execSync("npm ls -g").toString());
  
  log(1, performance.now().toFixed(2), `Launched ${uninstallScriptPath}`)
  try {
    execSync(`node ${uninstallScriptPath}`, {stdio: "inherit"})
  } catch (e) {
    if (e.status !== 0 && e.status !== 2) {
      console.error(`${red}Uninstallation interrupted with error ${e.status}${normal}`);
      process.exit(2);
    }
    if (e.status === 2) process.exit(2)
  }
  log(1, performance.now().toFixed(2), "Uninstalling spessoplayer")
  execSync(`npm uninstall ${(isGloballyInstalled) ? "-g" : ""} spessoplayer`, { cwd: ".", stdio: "inherit" })
}
/**
 * Shows the help text
 * @param {Object} errorObject - an object containing additional info that should be printed alongside help
 * @param {String} errorObject.errorText - error text that should be printed before helpText
 */
const help = async ({ errorText } = "") => {
  const optionalIndex = `${normal}[${dimGray}n${normal}]`;
  const optionalVerboseIndex = `${normal}[${dimGray}=n${normal}]`;
  
  const helpText = `${underline}spessoplayer${normal}
  ${dimGrayBold}A midi converter that uses spessasynth_core to generate the data${normal}
  
  Usage:
    ${bold}spessoplayer${normal} [${dimGray}options${normal}] <midi> <soundfont> [${dimGray}outFile${normal}]
  
  Available parameters:
    ${green}--input${optionalIndex}, ${green}/input${optionalIndex}, ${green}-i${optionalIndex}, ${green}/i${optionalIndex}:
      ${dimGray+italics}Takes the next file and puts it in the list by index${normal}
      
    ${green}--volume${optionalIndex}, ${green}/volume${optionalIndex}, ${green}-vol${optionalIndex}, ${green}/vol${optionalIndex}:
      ${dimGray+italics}Volume to set (default: 100%)${normal}
      
      ${dimGray+italics}Available formats:${normal}
      ${dimGray+italics}- dB (example -10dB)${normal}
      ${dimGray+italics}- percentages (example 70%)${normal}
      ${dimGray+italics}- decimals (example 0.9)${normal}
      
    ${green}--reverb-volume${optionalIndex}, ${green}/reverb-volume${optionalIndex}, ${green}-rvb${optionalIndex}, ${green}/rvb${optionalIndex}:
      ${dimGray+italics}Volume to set for reverb (default: none)${normal}
      ${dimGray+italics}Same formats as volume${normal}
      
    ${green}--effects${optionalIndex}, ${green}/effects${optionalIndex}, ${green}-e${optionalIndex}, ${green}/e${optionalIndex}:
      ${dimGray+italics}Adds any effects that SoX provides (e.g "reverb,fade 1")${normal}
    
    ${green}--loop${optionalIndex}, ${green}/loop${optionalIndex}, ${green}-l${optionalIndex}, ${green}/l${optionalIndex}:
      ${dimGray+italics}Loop x amount of times (default: 0)${normal}
        ${dimGray+italics}(It might be slow with bigger numbers)${normal}
      
    ${green}--loop-start${optionalIndex}, ${green}/loop-start${optionalIndex}, ${green}-ls${optionalIndex}, ${green}/ls${optionalIndex}:
      ${dimGray+italics}When the loop starts${normal}
      
    ${green}--loop-end${optionalIndex}, ${green}/loop-end${optionalIndex}, ${green}-le${optionalIndex}, ${green}/le${optionalIndex}:
      ${dimGray+italics}When the loop ends${normal}
      
    ${green}--sample-rate${optionalIndex}, ${green}/sample-rate${optionalIndex}, ${green}-r${optionalIndex}, ${green}/r${optionalIndex}:
      ${dimGray+italics}Sample rate to use (default: 48000)${normal}
        ${dimGray+italics}(It might be slow with bigger numbers for players like mpv)${normal}
        ${dimGray+italics}(Some players might downsize it to a smaller frequency)${normal}
      
    ${green}--format${normal}, ${green}/format${normal}, ${green}-f${normal}, ${green}/f${normal}:
      ${dimGray+italics}Format to use for stdout (default: wav)${normal}
      
      ${dimGray+italics}Available formats:${normal}
      ${dimGray+italics}- wav${normal}
      ${dimGray+italics}- mp3${normal}
      ${dimGray+italics}- flac${normal}
      ${dimGray+italics}- pcm (s32le)${normal}
      
    ${green}--verbose${optionalVerboseIndex}, ${green}/verbose${optionalVerboseIndex}, ${green}-v${optionalVerboseIndex}, ${green}/v${optionalVerboseIndex}:
      ${dimGray+italics}Sets the verbosity (default: 2)${normal}
      
    ${green}--log-file${normal}, ${green}/log-file${normal}, ${green}-lf${normal}, ${green}/lf${normal}:
      ${dimGray+italics}Sets path to the log file (default: ./spesso.log)${normal}
        ${dimGray+italics}(Meanwhile it writes to file, it also prints to stderr)${normal}
      
    ${green}--uninstall${normal}, ${green}/uninstall${normal}, ${green}-u${normal}, ${green}/u${normal}:
      ${dimGray+italics}Uninstalls dependencies with confirmation and the entire program${normal}
      
    ${green}--help${normal}, ${green}/help${normal}, ${green}-h${normal}, ${green}/h${normal}, ${green}/?${normal}:
      ${dimGray+italics}Shows this help message${normal}
    
    ${green}--version${normal}, ${green}/version${normal}:
      ${dimGray+italics}Shows the installed version${normal}
  `
  if (process.env.PAGER) {
    const { spawnSync } = await import("child_process");
    const PAGERCommand = process.env.PAGER.split(" ").slice(0, 1),
          PAGERArguments = process.env.PAGER.split(" ").slice(1);
    spawnSync(
      ...PAGERCommand,
      [...PAGERArguments],
      {
        stdio: ["pipe", "inherit", "inherit"],
        input: (errorText)
          ? errorText+"\n"+helpText
          : helpText
      }
    )
    return;
  }
  if (errorText) console.error(errorText)
  console.log(helpText)
}
/**
 * Shows the version number taken from package.json
 */
const version = async () => {
  const fs = await import("node:fs");
  const packageJSONPath = join(_dirname_, "package.json");
  const { versionNumber } = JSON.parse(fs.readFileSync(packageJSONPath).toString());
  
  log(1, performance.now().toFixed(2), `Taken version number from ${packageJSONPath}`)
  console.log(`${green + versionNumber + normal}`)
}

export {
  actUpOnPassedArgs,
  join, parse,
  Options
}

