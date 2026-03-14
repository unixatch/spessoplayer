/*
  Copyright (C) 2026  unixatch

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

/**
 * @module utils
 */

import { join, parse } from "path"

function declareColors() {
  // Custom formatting
  global.normal= "\x1b[0m"
  global.bold= "\x1b[1m"
  global.italics= "\x1b[3m"
  global.underline= "\x1b[4m"
  // Actual colors
  global.yellow= "\x1b[33;1m"
  global.normalYellow= "\x1b[33m"
  global.magenta= "\x1b[35m"
  global.brightMagenta= "\x1b[95m"
  global.dimYellow = "\x1b[2;33m"
  global.green= "\x1b[32m"
  global.dimGreen= "\x1b[32;2m"
  global.normalRed= "\x1b[31m"
  global.red= "\x1b[31;1m"
  global.normalRed= "\x1b[31m"
  global.dimRed= "\x1b[31;2m"
  global.gray= "\x1b[90;1m"
  global.dimGray= "\x1b[37;2m"
  global.dimGrayBold= "\x1b[37;2;1m"
}
declareColors()

/**
 * Clears lines from the last line up
 * @param {Number[]} lines - two numbers, x and y values
 * @throws {TypeError} - if the passed argument isn't an array,
 *                       if one of its values is a string or
 *                       it can't be converted to an integer
 * @example
 * // Clears only the last line
 * clearLastLines([0, -1])
 */
const clearLastLines = lines => {
  if (!Array.isArray(lines)) throw new TypeError("Didn't give an array");
  let lineX, lineY;
  lines
    .forEach((line, i) => {
      if (typeof line === "string") throw new TypeError(`Gave string "${line}", numbers only allowed`)
      const int = parseInt(line);
      if (isNaN(int)) throw new TypeError("Didn't give a number")
      if (i === 0) {
        lineX = line;
      } else lineY = line;
    })
  process.stdout
    .moveCursor(lineX, lineY);
  process.stdout
    .clearScreenDown();
}
/**
 * Logger
 * @param {Number} level - level of the log
 * @param {Number} time - time that it takes to creates this log
 * @param {string[]} ...messages - messages to print
 */
function log(level, time, ...messages) {
  const spacesAmount = new Date().toISOString().length + ((time+"").length + 7) + 2;
  const debugLevelSpesso = process.env["DEBUG_LEVEL_SPESSO"];
  const debugFileSpesso = process.env["DEBUG_FILE_SPESSO"];
  if (debugLevelSpesso
      && debugLevelSpesso <= level
      || Options.verboseLevel <= level) {
    const message = [
      new Date(),
      "["+time+" ms]",
      messages
        .join("")
        // Place the header data on a new line with padding
        .replace(/header file (\d+)+/, "header file:\n"+" ".repeat(spacesAmount)+"$1")
        // Place the SoX arguments on a new line with padding
        .replace(/with (sox -t.*)/, "with:\n"+" ".repeat(spacesAmount)+"\"$1\"")
        // Place the ffmpeg arguments on a new line with padding
        .replace(/with (ffmpeg -i.*)/, "with:\n"+" ".repeat(spacesAmount)+"\"$1\"")
        // Add dimmed gray to the output
        .replace(/(.*)/s, `${dimGray}$1${normal}`)
    ];
    if (messages[0] === "Finished printing to stdout") message.unshift("\n")
    console.error(...message);
    const path = debugFileSpesso || Options.logFilePath;
    if (path) {
      message[0] = message[0].toISOString();
      message[message.length-1] = message[message.length-1].replace(/\x1b\[.{1,10}m/, "")
      message.push("\n")
      fs.appendFileSync(path, message.join(" "))
    }
  }
}
/**
 * Returns a new path with a new number (adds 1) at the end of the filename
 * if necessary otherwise it returns the given path
 * @param {String} path - The path to parse and modify if needed
 * @example
 * // It'll return out1.wav
 *    newFileName("out.wav")
 * @example
 * // It'll return out2.wav
 *    newFileName("out1.wav")
 * @returns {String} The path, modified or not
 */
function newFileName(path, createAnyway = false) {
  if (!fs.existsSync(path) && !createAnyway) return path;
  
  const pathDir = parse(path).dir;
  const pathFileName = (parse(path).name.match(/[0-9]+$/g)?.length > 0)
    ? parse(path).name.replace(/[0-9]+$/, "")
    + (Number(parse(path).name.match(/[0-9]+$/g)[0]) + 1)
    : parse(path).name.replace(/[0-9]+$/, "") + 1;
  const pathExt = parse(path).ext;
  path = join(pathDir, pathFileName + pathExt);
  
  if (fs.existsSync(path)) return newFileName(path, createAnyway);
  return path;
}
/**
 * Adds unshift functionality to Set
 * @param {Array} value - value to add
 * @return {Set} - an updated set with the values added on the left
 */
Set.prototype.addLeft = function (value) {
  const newValue = new Set([value]).union(this);
  this.clear()
  for (const value of newValue) this.add(value)
  return this;
}
/**
 * Adds value retrieval from given index functionality to Set
 * @param {Number} index - index to get
 * @throws {TypeError} - if it's not a number
 * @return {*} - the value at the specified index in the Set
 */
Set.prototype.getIndex = function (index) {
  if (typeof index !== "number") {
    throw new TypeError(`${index} is not a number`)
  }
  const helper = this.values().map((v, i) => [i, v]);
  for (const [i, v] of helper) {
    if (i === index) return v;
  }
}
/**
 * Adds value retrieval functionality to Set
 * @param {*} value - value to search
 * @return {*} found value or undefined
 */
Set.prototype.get = function (valueToFind) {
  for (const value of this.values()) {
    if (!valueToFind) return value;
    if (value === valueToFind) return value;
  }
}
/**
 * A class that represents options interpreted by cli.mjs
 */
class Options {
  /**
   * Main private object that contains the data
   * @type {Object}
   * @private
   */
  static #options = {};
  /**
   * @typedef list_Of_Songs
   * @type {Array[]}
   * @property {Number} 0 - group index
   * @property {String} 1 - filename of song
   * @private
   */
  /**
   * List of all songs
   * @type {list_Of_Songs}
   * @private
   */
  static #listOfSongs = [];
  /**
   * @typedef list_Of_Soundfonts
   * @type {Array[]}
   * @property {Number} 0 - group index
   * @property {String} 1 - filename of soundfont
   * @private
   */
  /**
   * List of all soundfonts
   * @type {list_Of_Soundfonts}
   * @private
   */
  static #listOfSoundfonts = new Map();
  /**
   * Asynchronously creates a copy
   * of process.argv without file extensions
   * (See isAutomaticBasenameGroup method)
   * @type {String[]}
   * @private
   */
  static #argvWithoutFileExtensions = new Promise(resolve => {
    const newArguments = process.argv.slice(2),
          newArgumentsLength = newArguments.length;
    for (let i = 0; i < newArgumentsLength; i++) {
      const parsedElement = parse(newArguments[i]);
      newArguments[i] = join(parsedElement.dir, parsedElement.name);
    }
    resolve(newArguments)
  });

  /**
   * @function #checkValueAndExistence
   * @desc type checker
   * @param {*} value - any kind of value to check
   * @param {String} requiredType - type that must be correct
   * @param {String} property - any kind of property to add to #options
   * @param {Boolean} isObject - if the property should be an object
   * @memberof Options
   * @private
   * @throws {TypeError} - if it's not of valid type
   */
  static #checkValueAndExistence(value, requiredType, property, isObject) {
    if (requiredType !== "array" || !Array.isArray(value)) {
      if (typeof value !== requiredType) {
        throw new TypeError(`${value} is not of type ${requiredType}`)
      }
    }
    if (property && !this.#options[property]) {
      if (isObject) return this.#options[property] = {};
      this.#options[property] = [];
    }
  }
  /**
   * Sets verboseLevel
   * @param {Number} number - verboseLevel's number
   */
  static set verboseLevel(number) {
    this.#checkValueAndExistence(number, "number")
    this.#options.verboseLevel = number;
  }
  /**
   * Gives verboseLevel's number
   * @return {Number} verboseLevel's number
   */
  static get verboseLevel() {
    return this.#options.verboseLevel;
  }
  /**
   * Sets logFilePath
   * @param {String} path - path to write to
   */
  static set logFilePath(path) {
    this.#checkValueAndExistence(path, "string")
    this.#options.logFilePath = path;
  }
  /**
   * Gives logFilePath
   * @return {String} logFilePath
   */
  static get logFilePath() {
    return this.#options.logFilePath;
  }
  /**
   * Sets toStdout boolean
   * @param {Boolean} value - enable or disable printing to stdout
   */
  static set toStdout(value) {
    this.#checkValueAndExistence(value, "boolean")
    this.#options.toStdout = value;
  }
  /**
   * Sets the stdout format
   * @param {String} string - a string representing the format
   */
  static set format(string) {
    this.#checkValueAndExistence(string, "string")
    this.#options.format = string;
  }
  /**
   * Adds a path to write to in a particular format
   * @param {Number} index - index of the internal array
   * @param {String} string - string to add to the specified index
   */
  static fileOutputs(index, string) {
    this.#checkValueAndExistence(index, "number")
    this.#checkValueAndExistence(string, "string", "fileOutputs")
    this.#options.fileOutputs[index] = string;
  }
  /**
   * Change reverb's volume of a specific file
   * @param {Number} index - index of the file's option
   * @param {Number} number - the volume value as a float or integer
   */
  static reverbVolume(index, number) {
    this.#checkValueAndExistence(index, "number")
    this.#checkValueAndExistence(number, "number", "reverbVolume")
    if (!Number.isNaN(index)) return this.#options.reverbVolume[index] = number;
    this.#options.reverbVolume.push(number)
  }
  /**
   * Adds a list of effects to a specific file
   * @param {Number} index - index of the file
   * @param {Array} arrayOfObjects - an array of object effects
   */
  static effects(index, arrayOfObjects) {
    this.#checkValueAndExistence(index, "number")
    this.#checkValueAndExistence(arrayOfObjects, "array", "effects")
    if (Number.isNaN(index)) return this.#options.effects.push(arrayOfObjects);
    this.#options.effects[index] = arrayOfObjects;
  }
  /**
   * Change general volume of a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - volume value as a float or integer
   */
  static volume(index, number) {
    this.#checkValueAndExistence(index, "number")
    this.#checkValueAndExistence(number, "number", "volume")
    if (!Number.isNaN(index)) return this.#options.volume[index] = number;
    this.#options.volume.push(number);
  }
  /**
   * Sets the sample rate of the stdout output
   * @param {Number} number - sample rate to set for all files in stdout
   */
  static set stdoutSampleRate(number) {
    this.#checkValueAndExistence(number, "number")
    this.#options.sampleRate = number;
  }
  /**
   * Sets the sample rate of a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - sample rate to set
   */
  static sampleRate(index, number) {
    this.#checkValueAndExistence(index, "number")
    this.#checkValueAndExistence(number, "number", "sampleRate")
    if (!Number.isNaN(index)) return this.#options.sampleRate[index] = number;
    this.#options.sampleRate.push(number);
  }
  /**
   * Sets the amount of loops to do for a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - how many loops to do
   */
  static loopN(index, number) {
    this.#checkValueAndExistence(index, "number")
    this.#checkValueAndExistence(number, "number", "loopN")
    if (!Number.isNaN(index)) return this.#options.loopN[index] = number;
    this.#options.loopN.push(number);
  }
  /**
   * Sets when the loop starts for a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - start of the loop as a float or integer
   */
  static loopStart(index, number) {
    this.#checkValueAndExistence(index, "number")
    this.#checkValueAndExistence(number, "number", "loopStart")
    if (!Number.isNaN(index)) return this.#options.loopStart[index] = number;
    this.#options.loopStart.push(number);
  }
  /**
   * Sets when the loop ends for a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - end of the loop as a float
   */
  static loopEnd(index, number) {
    this.#checkValueAndExistence(index, "number")
    this.#checkValueAndExistence(number, "number", "loopEnd")
    if (!Number.isNaN(index)) return this.#options.loopEnd[index] = number;
    this.#options.loopEnd.push(number);
  }
  /**
   * The main method to add a file to the list of Sets
   * @param {Number} index - index of the group of files
   * @param {String} string - file to add
   * @param {Boolean} isSoundfont - if it's a soundfont, then add as a first element
   * @param {Boolean} replace - if it should delete the first element before adding the soundfont
   */
  static files(index, string, isSoundfont = false, replace = false) {
    this.#checkValueAndExistence(index, "number")
    this.#checkValueAndExistence(string, "string", "files")
    this.#checkValueAndExistence(isSoundfont, "boolean")
    this.#checkValueAndExistence(replace, "boolean")
    const group = this.#options.files;
    if (!group[index]) group[index] = new Set();
    if (isSoundfont) {
      if (replace) {
        const indexZero = group[index].getIndex(0);
        group[index].delete(indexZero)
      }
      group[index].addLeft(string)
      this.#listOfSoundfonts.set(string, index)
      return;
    }
    group[index].add(string)
    this.#listOfSongs.push([index, string])
  }
  /**
   * Gives the amount of songs to do
   * @return {Number} the amount
   */
  static get amountOfSongs() {
    return this.#listOfSongs.length;
  }
  /**
   * Gives the amount of groups
   * @return {Number} the amount
   */
  static get amountOfGroups() {
    return this.#options.files?.length ?? 0;
  }
  /**
   * Gives the last known group's index that has been added
   * @return {(Number|undefined)} index of the group
   */
  static get lastKnownGroupIndex() {
    if (!this.#options.files
        || !this.#options.files.length) return;

    return this.amountOfGroups-1;
  }
  /**
   * Checks if there's a file somewhere
   * that has exactly the same name as the user needs
   * @param {String} name - basename to search for
   * @param {(Boolean|undefined)} isAMidiSearching - if arg inside setFiles is a midi or it needs to search everywhere
   * @return {(Number|false)} the index of the group or false if it didn't find any match
   */
  static searchAddedFile(name, isAMidiSearching) {
    const soundfontSearch = () => {
      const indexOfGroup = [
        this.#listOfSoundfonts.get(name+".sf2"),
        this.#listOfSoundfonts.get(name+".dls")
      ];
      for (const typeOfFile of indexOfGroup) {
        if (typeOfFile !== undefined) return typeOfFile;
      }
      return false;
    };
    const midiSearch = () => {
      const flattenMidis = [].concat(...this.#listOfSongs);
      
      const indexOfIndexOfGroup = flattenMidis.indexOf(name+".mid");
      if (indexOfIndexOfGroup !== -1) return flattenMidis[indexOfIndexOfGroup-1];
      return false;
    };

    if (isAMidiSearching === undefined) return midiSearch() || soundfontSearch();
    if (isAMidiSearching) return soundfontSearch();
    return midiSearch();
  }
  /**
   * Checks if a group is an automatic basename group
   * @param {Number} indexOfGroup - index of the group
   * @return {(true|false)}
   * @throws {TypeError} - if index is not a number
   */
  static async isAutomaticBasenameGroup(indexOfGroup) {
    if (typeof indexOfGroup !== "number") throw new TypeError("index must be a number")
    const group = this.#options.files[indexOfGroup];

    if (group.size > 2) return false;
    if (group.size < 2) {
      const parsedFirstFile = parse(group.getIndex(0)),
            pathUpToName = join(parsedFirstFile.dir, parsedFirstFile.name);

      const noExtNewArguments = (await this.#argvWithoutFileExtensions).slice();
      const indexOfFile = noExtNewArguments.indexOf(pathUpToName);
      delete noExtNewArguments[indexOfFile]
      return noExtNewArguments.includes(pathUpToName);
    }

    const [soundfont, midi] = [group.getIndex(0), group.getIndex(1)];
    return parse(soundfont).name === parse(midi).name;
  }
  /**
   * Creates a new Object similar to this.#options but with only
   * the songs' options included
   * @param {Number} index - index of the song
   * @return {Object} an object containing the song's options
   */
  static getOptionsOfSong(index) {
    this.#checkValueAndExistence(index, "number")
    const allOptions = Object.keys(this.#options),
          allOptionsLength = allOptions.length,
          simplifiedOptionsObject = {};
    const [indexOfGroup, songFile] = this.#listOfSongs[index];
    const group = this.#options.files[indexOfGroup];
    
    simplifiedOptionsObject["soundfontFile"] = group.getIndex(0);
    simplifiedOptionsObject["midiFile"] = group.get(songFile);
    simplifiedOptionsObject["indexOfGroup"] = indexOfGroup;
    
    for (let i = 0; i < allOptionsLength; i++) {
      const key = allOptions[i];
      if (key === "files") continue;
      if (key === "fileOutputs") {
        simplifiedOptionsObject[key] = structuredClone(this.#options[key]);
        continue;
      }
      const isArray = Array.isArray(this.#options[key]);
      if (isArray && this.#options[key].length === 1) {
        simplifiedOptionsObject[key] = this.#options[key][0];
        continue;
      }
      if (isArray) {
        simplifiedOptionsObject[key] = this.#options[key][index];
        continue;
      }
      simplifiedOptionsObject[key] = this.#options[key];
    }
    return simplifiedOptionsObject;
  }
  
  /**
   * Gives all the data
   * @return {Object} the deep cloned #options object
   */
  static get all() { return structuredClone(this.#options); }
}

export {
  clearLastLines,
  log,
  newFileName,
  Options
}

