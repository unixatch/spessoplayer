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

import { join } from "path"
import "./utils.mjs"

const actUpOnPassedArgs = async (args) => {
  let lastParam;
  const newArguments = args.slice(2);
  if (newArguments.length !== 0) {
    for (const arg of newArguments) {
      switch (arg) {
        case /^.*\.mid$/.test(arg) && arg: {
          global.midiFile = arg;
          break;
        }
        case /^.*\.sf2$/.test(arg) && arg: {
          global.soundfontFile = arg;
          break;
        }
        case /^.*(?:\.wav|\.wave)$/.test(arg) && arg: {
          global.waveFile = arg;
          break;
        }
        case /^-$/.test(arg) && arg: {
          global.toStdout = true;
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
        case /^(?:--help|\/help|-h|\/h|\/\?)$/.test(arg) && arg: {
          help()
          process.exit()
        }
        case /^(?:--version|\/version|-v|\/v)$/.test(arg) && arg: {
          version()
          process.exit()
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
    if (global?.waveFile === undefined) global.waveFile = "out.wav"
  }
}

const setLoop = arg => {
  if (typeof Number(arg) === "number"
      && !/^(?:Infinity|infinity)$/.test(arg)) {
    global.parameter = "--loop";
    global.loopN = Number(arg);
    return;
  }
  if (/^(?:Infinity|infinity)$/.test(arg)) {
    throw new Error("Can't use infinity, sorry")
  }
  throw new TypeError("Passed something that wasn't a number")
}
const setLoopStart = arg => {
  if (typeof Number(arg) === "number"
      || Date.parse(`1970T${arg}Z`) !== NaN) {
    if (/[0-9]{1,2}:[0-9]{2}:[0-9]{2}(\.[0-9])*/.test(arg)) {
      const seconds = Date.parse(`1970T${arg}Z`) / 1000;
      global.parameter = "--loop-start";
      global.loopStart = seconds;
      return;
    }
    global.parameter = "--loop-start";
    global.loopStart = Number(arg);
    return;
  }
  throw new TypeError("Passed something that wasn't a number or in ISO string format")
}
const setLoopEnd = arg => {
  if (typeof Number(arg) === "number"
      || Date.parse(`1970T${arg}Z`) !== NaN) {
    if (/[0-9]{1,2}:[0-9]{2}:[0-9]{2}(\.[0-9])*/.test(arg)) {
      const seconds = Date.parse(`1970T${arg}Z`) / 1000;
      global.parameter = "--loop-end";
      global.loopStart = seconds;
      return;
    }
    global.parameter = "--loop-end";
    global.loopStart = Number(arg);
    return;
  }
  throw new TypeError("Passed something that wasn't a number or in ISO string format")
}
const setSampleRate = arg => {
  if (typeof Number(arg) === "number") {
    global.parameter = "--sample-rate";
    global.sampleRate = Number(arg);
    return;
  }
  throw new TypeError("Passed something that wasn't a number")
}
const help = () => {
  const helpText = `${underline}spessoplayer${normal}
  ${dimGrayBold}A midi converter that uses spessasynth_core to generate the data${normal}
  
  Usage:
    ${bold}spessoplayer${normal} [${dimGray}options${normal}] <midi> <soundfont>
  
  Available parameters:
    ${green}--loop${normal}, ${green}/loop${normal}, ${green}-l${normal}, ${green}/l${normal}:
      ${dimGray+italics}Loop x amount of times${normal}
      ${dimGray+italics}(It might be slow with bigger numbers)${normal}
      
    ${green}--loop-start${normal}, ${green}/loop-start${normal}, ${green}-ls${normal}, ${green}/ls${normal}:
      ${dimGray+italics}When the loop starts${normal}
      
    ${green}--loop-end${normal}, ${green}/loop-end${normal}, ${green}-le${normal}, ${green}/le${normal}:
      ${dimGray+italics}When the loop ends${normal}
      
    ${green}--sample-rate${normal}, ${green}/sample-rate${normal}, ${green}-r${normal}, ${green}/r${normal}:
      ${dimGray+italics}Sample rate to use${normal}
      ${dimGray+italics}(It might be slow with bigger numbers for players like mpv)${normal}
      ${dimGray+italics}(Some players might downsize it to a smaller frequency)${normal}
      
    ${green}--help${normal}, ${green}/help${normal}, ${green}-h${normal}, ${green}/h${normal}, ${green}/?${normal}:
      ${dimGray+italics}Shows this help message${normal}
    
    ${green}--version${normal}, ${green}/version${normal}, ${green}-v${normal}, ${green}/v${normal}:
      ${dimGray+italics}Shows the installed version${normal}
  `
  console.log(helpText)
}
const version = () => {
  const packageJSONPath = join(__dirname, "package.json");
  const { version } = JSON.parse(readFileSync(packageJSONPath).toString());
  
  console.log(`${green + version + normal}`)
}

export {
  actUpOnPassedArgs
}