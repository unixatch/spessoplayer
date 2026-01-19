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
import { _dirname_ } from "./utils.mjs"

/**
 * Sets necessary variables in global object for main.mjs
 * @param {Array} args - The process.argv to analyse
 */
const actUpOnPassedArgs = async (args) => {
  let lastParam;
  const newArguments = args.slice(2);
  if (newArguments.length !== 0) {
    if (newArguments.filter(i => /^(?:--help|\/help|-h|\/h|\/\?)$/.test(i)).length > 0) {
      help()
      process.exit()
    }
    if (newArguments.filter(i => /^(?:--version|\/version)$/.test(i)).length > 0) {
      await version()
      process.exit()
    }
    global.fileOutputs = [];
    for (const arg of newArguments) {
      switch (arg) {
        case /^.*(?:\.wav|\.wave)$/.test(arg) && arg: {
          global.fileOutputs[0] = arg;
          break;
        }
        case /^.*\.flac$/.test(arg) && arg: {
          global.fileOutputs[1] = arg;
          break;
        }
        case /^.*\.mp3$/.test(arg) && arg: {
          global.fileOutputs[2] = arg;
          break;
        }
        case /^.*\.(?:s32le|pcm)$/.test(arg) && arg: {
          global.fileOutputs[3] = arg;
          break;
        }
        case /^-$/.test(arg) && arg: {
          global.toStdout = true;
          break;
        }
        case /^(?:--reverb-volume|\/reverb-volume|-rvb|\/rvb)$/.test(arg) && arg: {
          // In case there's no other argument
          const indexOfArg = newArguments.indexOf(arg);
          if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
          
          lastParam = "reverb"
          break;
        }
        case /^(?:--volume|\/volume|-v|\/v)$/.test(arg) && arg: {
          // In case there's no other argument
          const indexOfArg = newArguments.indexOf(arg);
          if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
          
          lastParam = "volume"
          break;
        }
        case /^(?:--effects|\/effects|-e|\/e)$/.test(arg) && arg: {
          // In case there's no other argument
          const indexOfArg = newArguments.indexOf(arg);
          if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
          
          lastParam = "effects"
          break;
        }
        case /^(?:--format|\/format|-f|\/f)$/.test(arg) && arg: {
          // In case there's no other argument
          const indexOfArg = newArguments.indexOf(arg);
          if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
          
          lastParam = "format"
          break;
        }
        case /^(?:--sample-rate|\/sample-rate|-r|\/r)$/.test(arg) && arg: {
          // In case there's no other argument
          const indexOfArg = newArguments.indexOf(arg);
          if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
          
          lastParam = "sample-rate"
          break;
        }
        case /^(?:--loop-start|\/loop-start|-ls|\/ls)$/.test(arg) && arg: {
          // In case there's no other argument
          const indexOfArg = newArguments.indexOf(arg);
          if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
          
          lastParam = "loop-start"
          break;
        }
        case /^(?:--loop-end|\/loop-end|-le|\/le)$/.test(arg) && arg: {
          // In case there's no other argument
          const indexOfArg = newArguments.indexOf(arg);
          if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
          
          lastParam = "loop-end"
          break;
        }
        case /^(?:--loop|\/loop|-l|\/l)$/.test(arg) && arg: {
          // In case there's no other argument
          const indexOfArg = newArguments.indexOf(arg);
          if (newArguments[indexOfArg + 1] === undefined) throw new ReferenceError("Missing necessary argument");
          
          lastParam = "loop"
          break;
        }
        case /^(?!-|\/)(?:\w|\W)*$/.test(basename(arg)) && arg: {
          if (lastParam === undefined) {
            const fs = await import("node:fs");
            global["fs"] = fs;
            let fileMagicNumber;
            await new Promise((resolve, reject) => {
              const readStream = fs.createReadStream(arg, { start: 0, end: 20 });
              readStream.on("data", (data) => {
                fileMagicNumber = data.toString();
                resolve()
              })
              readStream.on("error", (e) => {
                if (e.code === "ENOENT") console.error(`${red}Can't open '${arg}' because it doesn't exist${normal}`)
                process.exit(1)
              })
            })
            // MIDI files
            if (fileMagicNumber.includes("MThd")) {
              global.midiFile = arg;
              break;
            }
            if (fileMagicNumber.includes("sfbk")) {
              // Soundfont files
              global.soundfontFile = arg;
              break;
            }
            if (fileMagicNumber.includes("DLS")) {
              // Downloadable sounds files
              global.soundfontFile = arg;
              break;
            }
          }
        }
        
        default:
          if (lastParam === "loop") {
            setLoop(arg)
            break;
          }
          if (lastParam === "loop-start") {
            setLoopStart(arg)
            break;
          }
          if (lastParam === "loop-end") {
            setLoopEnd(arg)
            break;
          }
          if (lastParam === "sample-rate") {
            setSampleRate(arg)
            break;
          }
          if (lastParam === "format") {
            setFormat(arg)
            break;
          }
          if (lastParam === "volume") {
            setVolume(arg)
            break;
          }
          if (lastParam === "reverb") {
            setReverb(arg)
            break;
          }
          if (lastParam === "effects") {
            setEffects(arg)
            break;
          }
          // Invalid param
          console.log(red+`'${
            underline+dimRed +
            arg +
            normal+red
          }' is an invalid parameter`+normal)
          help()
          process.exit()
      }
    }
    if (global.fileOutputs.length === 0
        && !global?.toStdout) {
      console.error(`${normalYellow}Action not specified${normal}`);
      help()
      process.exit(2)
    }
    if (global?.midiFile === undefined) {
      console.error(`${red}Missing a required midi file${normal}`);
      process.exit(1)
    }
    if (global?.soundfontFile === undefined) {
      console.error(`${red}Missing a required soundfont file${normal}`);
      process.exit(1)
    }
  } else {
    help()
    process.exit()
  }
}

/**
 * Sets the global.loopN variable
 * @param {string} arg - the loop amount
 */
const setLoop = arg => {
  if (typeof Number(arg) === "number"
      && !/^(?:Infinity|infinity)$/.test(arg)) {
    global.loopN = Number(arg);
    return;
  }
  if (/^(?:Infinity|infinity)$/.test(arg)) {
    console.error(`${normalRed}Can't use infinity, sorry${normal}`)
    process.exit(1);
  }
  console.error(`${normalRed}Passed something that wasn't a number${normal}`)
  process.exit(1);
}
/**
 * Sets the global.loopStart variable
 * @param {string} arg - the start of the loop in seconds or in HH:MM:SS:ms format
 */
const setLoopStart = arg => {
  if (typeof Number(arg) === "number"
      || Date.parse(`1970T${arg}Z`) !== NaN) {
    if (/[0-9]{1,2}:[0-9]{2}:[0-9]{2}(\.[0-9])*/.test(arg)) {
      const seconds = Date.parse(`1970T${arg}Z`) / 1000;
      global.loopStart = seconds;
      return;
    }
    global.loopStart = Number(arg);
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a number or in ISO string format${normal}`)
  process.exit(1);
}
/**
 * Sets the global.loopEnd variable
 * @param {string} arg - the end of the loop in seconds or in HH:MM:SS:ms format
 */
const setLoopEnd = arg => {
  if (typeof Number(arg) === "number"
      || Date.parse(`1970T${arg}Z`) !== NaN) {
    if (/[0-9]{1,2}:[0-9]{2}:[0-9]{2}(\.[0-9])*/.test(arg)) {
      const seconds = Date.parse(`1970T${arg}Z`) / 1000;
      global.loopEnd = seconds;
      return;
    }
    global.loopEnd = Number(arg);
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a number or in ISO string format${normal}`)
  process.exit(1);
}
/**
 * Sets the global.sampleRate variable
 * @param {string} arg - the sample rate to set
 */
const setSampleRate = arg => {
  if (typeof Number(arg) === "number" && !arg.startsWith("-")) {
    global.sampleRate = Number(arg);
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number${normal}`)
  process.exit(1);
}
/**
 * Sets the global.format variable for use in stdout mode
 * @param {string} arg - the format to use (similar to ffmpeg's -f)
 */
const setFormat = arg => {
  switch (arg) {
    case /^(?:wav|wave)$/.test(arg) && arg: {
      global.format = "wave";
      return;
    }
    case "flac": {
      global.format = "flac";
      return;
    }
    case "mp3": {
      global.format = "mp3";
      return;
    }
    case /^(?:s32le|pcm)$/.test(arg) && arg: {
      global.format = "pcm";
      return;
    }
  }
  console.error(`${normalRed}Passed something that wasn't an available format${normal}`)
  process.exit(1);
}
/**
 * Applies effects from the user's string passed through --effects
 * @param {string} arg - the comma-separeted string to parse
 */
const setEffects = arg => {
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
    
    global.effects = list;
    return;
  }
  console.error(`${normalRed}The string for SoX effects you passed is not usable${normal}`);
  process.exit(1);
}
/**
 * Sets the global.volume variable for the masterGain
 * @param {string} arg - the volume in either percentage, decibels or decimals
 */
const setVolume = arg => {
  if (/^(?:\-|\+*)[\d.]+dB/.test(arg)) {
    const dBNumber = Number(arg.match(/^((?:\-|\+*)[\d.]+)dB/)[1]);
    const toPercentage = 10**(dBNumber/10);
    global.volume = toPercentage;
    return;
  }
  if (/^[\d.]+%$/.test(arg)) {
    const percentage = Number(arg.match(/^([\d.]+)%$/)[1]);
    global.volume = percentage / 100;
    return;
  }
  if (typeof Number(arg) === "number" && !arg.startsWith("-")) {
    global.volume = Number(arg);
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number/dB/percentage${normal}`)
  process.exit(1);
}
/**
 * Sets the global.reverb variable
 * @param {string} arg - the volume in either percentage, decibels or decimals
 */
const setReverb = arg => {
  if (/^(?:\-|\+*)[\d.]+dB/.test(arg)) {
    const dBNumber = Number(arg.match(/^((?:\-|\+*)[\d.]+)dB/)[1]);
    global.reverbVolume = dBNumber;
    global.effects = true;
    return;
  }
  if (/^[\d.]+%$/.test(arg)) {
    const percentage = Number(arg.match(/^([\d.]+)%$/)[1]);
    const toDB = 10 * 10**(percentage/100);
    global.reverbVolume = toDB;
    global.effects = true;
    return;
  }
  if (typeof Number(arg) === "number" && !arg.startsWith("-")) {
    global.reverbVolume = Number(arg);
    global.effects = true;
    return;
  }
  console.error(`${normalRed}Passed something that wasn't a valid number/dB/percentage${normal}`)
  process.exit(1);
}
/**
 * Shows the help text
 */
const help = () => {
  const helpText = `${underline}spessoplayer${normal}
  ${dimGrayBold}A midi converter that uses spessasynth_core to generate the data${normal}
  
  Usage:
    ${bold}spessoplayer${normal} [${dimGray}options${normal}] <midi> <soundfont> [${dimGray}outFile${normal}]
  
  Available parameters:
    ${green}--volume${normal}, ${green}/volume${normal}, ${green}-v${normal}, ${green}/v${normal}:
      ${dimGray+italics}Volume to set (default: 100%)${normal}
      
      ${dimGray+italics}Available formats:${normal}
      ${dimGray+italics}- dB (example -10dB)${normal}
      ${dimGray+italics}- percentages (example 70%)${normal}
      ${dimGray+italics}- decimals (example 0.9)${normal}
      
    ${green}--reverb-volume${normal}, ${green}/reverb-volume${normal}, ${green}-rvb${normal}, ${green}/rvb${normal}:
      ${dimGray+italics}Volume to set for reverb (default: none)${normal}
      ${dimGray+italics}Same formats as volume${normal}
      
    ${green}--effects${normal}, ${green}/effects${normal}, ${green}-e${normal}, ${green}/e${normal}:
      ${dimGray+italics}Adds any effects that SoX provides (e.g "reverb,fade 1")${normal}
    
    ${green}--loop${normal}, ${green}/loop${normal}, ${green}-l${normal}, ${green}/l${normal}:
      ${dimGray+italics}Loop x amount of times (default: 0)${normal}
        ${dimGray+italics}(It might be slow with bigger numbers)${normal}
      
    ${green}--loop-start${normal}, ${green}/loop-start${normal}, ${green}-ls${normal}, ${green}/ls${normal}:
      ${dimGray+italics}When the loop starts${normal}
      
    ${green}--loop-end${normal}, ${green}/loop-end${normal}, ${green}-le${normal}, ${green}/le${normal}:
      ${dimGray+italics}When the loop ends${normal}
      
    ${green}--sample-rate${normal}, ${green}/sample-rate${normal}, ${green}-r${normal}, ${green}/r${normal}:
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
      
    ${green}--help${normal}, ${green}/help${normal}, ${green}-h${normal}, ${green}/h${normal}, ${green}/?${normal}:
      ${dimGray+italics}Shows this help message${normal}
    
    ${green}--version${normal}, ${green}/version${normal}:
      ${dimGray+italics}Shows the installed version${normal}
  `
  console.log(helpText)
}
/**
 * Shows the version number taken from package.json
 */
const version = async () => {
  const fs = await import("node:fs");
  const packageJSONPath = join(_dirname_, "package.json");
  const { version } = JSON.parse(fs.readFileSync(packageJSONPath).toString());
  
  console.log(`${green + version + normal}`)
}

export {
  actUpOnPassedArgs,
  join, parse
}