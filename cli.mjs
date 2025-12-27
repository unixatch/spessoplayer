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

const actUpOnPassedArgs = async (args) => {
  let lastParam;
  const newArguments = args.slice(2);
  if (newArguments.length !== 0) {
    for (const arg of newArguments) {
      switch (arg) {
        case /^(?:.*\.mid)$/.test(arg) && arg: {
          global.midiFile = arg;
          break;
        }
        case /^(?:.*\.sf2)$/.test(arg) && arg: {
          global.soundfontFile = arg;
          break;
        }
        case /^(?:-)$/.test(arg) && arg: {
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
  }
}

const setLoop = arg => {
  if (!/^(?:Infinity|infinity)$/.test(arg)
      || typeof Number(arg) !== "number") {
    throw new TypeError("Passed something that wasn't either Infinity or any number")
  }
  global.parameter = "--loop";
  global.loopN = arg;
}
const setSampleRate = arg => {
  global.parameter = "--sample-rate";
  global.sampleRate = arg;
}
const help = () => {
  const helpText = `${underline}spessoplayer${normal}
  ${dimGrayBold}A midi converter that uses spessasynth_core to generate the data${normal}
  
  Available parameters:
    ${green}--loop${normal}, ${green}/loop${normal}, ${green}-l${normal}, ${green}/l${normal}:
      ${dimGray+italics}Loop x amount of times${normal}
      
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