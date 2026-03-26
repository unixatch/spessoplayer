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
 * @module utils/utils
 */

import { join, parse, sep } from "path"
import { classes } from "./classes.mjs"

// Custom formatting
global.normal = "\x1b[0m"           /** @global */
global.bold = "\x1b[1m"             /** @global */
global.italics = "\x1b[3m"          /** @global */
global.underline = "\x1b[4m"        /** @global */
// Actual colors
global.yellow = "\x1b[33;1m"        /** @global */
global.normalYellow = "\x1b[33m"    /** @global */
global.magenta = "\x1b[35m"         /** @global */
global.brightMagenta = "\x1b[95m"   /** @global */
global.dimYellow = "\x1b[2;33m"     /** @global */
global.green = "\x1b[32m"           /** @global */
global.dimGreen = "\x1b[32;2m"      /** @global */
global.normalRed = "\x1b[31m"       /** @global */
global.red = "\x1b[31;1m"           /** @global */
global.normalRed = "\x1b[31m"       /** @global */
global.dimRed = "\x1b[31;2m"        /** @global */
global.gray = "\x1b[90;1m"          /** @global */
global.dimGray = "\x1b[37;2m"       /** @global */
global.dimGrayBold = "\x1b[37;2;1m" /** @global */

/**
 * @typedef lines
 * @type {Number[]}
 * @property {Number} x x axis
 * @property {Number} [y] y axis
 */
/**
 * Clears lines from the last line up
 * @param {lines} lines - two numbers, x and y values
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
 * @param {String} time - time that it takes to creates this log
 * @param {Array<(String|Uint8Array<ArrayBufferLike>)>} messages - messages to print
 */
function log(level, time, ...messages) {
  const spacesAmount = new Date().toISOString().length + (time.length + 7) + 2;
  const debugLevelSpesso = Number(process.env["DEBUG_LEVEL_SPESSO"]);
  const debugFileSpesso = process.env["DEBUG_FILE_SPESSO"];
  if (Number.isNaN(debugLevelSpesso)
      && Options.verboseLevel === undefined) return;
  if (debugLevelSpesso > level
      || Options.verboseLevel > level) return;

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
  if (!path) return;
  message[0] = message[0].toISOString();
  message[message.length-1] = message[message.length-1].replaceAll(/\x1b\[.{1,10}m/g, "")
  message.push("\n")
  fs.appendFileSync(path, message.join(" "))
}
/**
 * Returns a new path with a new number (adds 1) at the end of the filename
 * if necessary otherwise it returns the given path
 * @param {String} path - The path to parse and modify if needed
 * @param {Boolean} createAnyway - If it should
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
  if (index === 0) return this.values().next().value;
  let i = 0;
  for (const v of this.values()) {
    if (i === index) return v;
    i++;
  }
}
/**
 * Adds value retrieval functionality to Set
 * @param {*} valueToFind - value to search
 * @return {*} found value or undefined
 */
Set.prototype.get = function (valueToFind) {
  for (const value of this.values()) {
    if (!valueToFind) return value;
    if (value === valueToFind) return value;
  }
}
/*
  Author's copyright/license:
    https://github.com/rse/aggregation?tab=readme-ov-file#license

    Copyright (c) 2015-2021 Dr. Ralf S. Engelschall (http://engelschall.com/)

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be included
    in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

  Only modifications include:
  - propsToIgnore variable;
  - new lines inside copyProps;
 */
function Mixin(base, mixins) {
  /*  create aggregation class  */
  let aggregate = class __Aggregate extends base {
    constructor (...args) {
      /*  call base class constructor  */
      super(...args)

      /*  call mixin's initializer  */
      mixins.forEach((mixin) => {
        if (typeof mixin.prototype.initializer === "function")
          mixin.prototype.initializer.apply(this, args)
      })
    }
  };

  const propsToIgnore = "initializer|constructor|prototype|"+
                        "arguments|caller|name|"+
                        "bind|call|apply|"+
                        "toString|"+
                        "length";
  /*  copy properties  */
  let copyProps = (target, source) => {
    Object.getOwnPropertyNames(source)
      .concat(Object.getOwnPropertySymbols(source))
      .forEach((prop) => {
        if (prop.match(new RegExp(`^(?:${propsToIgnore})$`)))
            return;
        Object.defineProperty(
          target,
          prop,
          Object.getOwnPropertyDescriptor(source, prop)
        )
      })
  }

  /*  copy all properties of all mixins into aggregation class  */
  mixins.forEach((mixin) => {
    copyProps(aggregate.prototype, mixin.prototype)
    copyProps(aggregate, mixin)
  })

  return aggregate
}
/**
 * A class that represents options interpreted by cli.mjs
 */
class Options extends Mixin(classes[0], classes.slice(1)) {
  /**
   * Main private object that contains the data
   * @type {Object}
   * @private
   */
  static #options = {};
  /**
   * @typedef list_Of_Songs
   * @type {Array}
   * @property {Number} index - group index
   * @property {String} file - filename of song
   * @private
   */
  /**
   * List of all songs
   * @type {list_Of_Songs}
   * @private
   */
  static #listOfSongs = [];
  /**
   * List of all soundfonts
   * @type {Map<String, Number>}
   * @private
   */
  static #listOfSoundfonts = new Map();

  /**
   * @function #checkValueAndExistence
   * @desc type checker
   * @param {*} value - any kind of value to check
   * @param {String} requiredType - type that must be correct
   * @param {String} [property] - any kind of property to add to #options
   * @memberof Options
   * @private
   * @throws {TypeError} - if it's not of valid type
   */
  static #checkValueAndExistence(value, requiredType, property) {
    if (requiredType !== "array" || !Array.isArray(value)) {
      if (typeof value !== requiredType) {
        throw new TypeError(`${value} is not of type ${requiredType}`)
      }
    }
    if (property) this.#options[property] ??= [];
  }
  static _manageOption(
    {property, index, value, setter = false},
    needsToBeSet = true, needsAnArray = false
  ) {
    this.#checkValueAndExistence(property, "string")
    if (index) this.#checkValueAndExistence(index, "number")
    const setValue = () => this.#options[property] = value;
    const setIndex = () => this.#options[property][index] = value;
    const pushValue = () => this.#options[property].push(value)
    switch (property) {
      // Getters
      case "verboseLevel":
      case "logFilePath": {
        if (!needsToBeSet) return this.#options[property];

        this.#checkValueAndExistence(
          value, (property === "verboseLevel") ? "number" : "string"
        )
        setValue()
        break;
      }
      // Numbers
      case "verboseLevel":
      case "reverbVolume":
      case "volume":
      case "sampleRate":
      case "loopN":
      case "loopAmount":
      case "loopStart":
      case "loopEnd": {
        if (!needsToBeSet) return;

        this.#checkValueAndExistence(
          value, "number", (needsAnArray) ? property : undefined
        )
        if (setter) {
          setValue()
          break;
        }
        if (Number.isInteger(index)) setIndex(); else pushValue()
        break;
      }
      // Boolean
      case "confirmation":
      case "noTable":
      case "toStdout": {
        this.#checkValueAndExistence(value, "boolean")
        setValue()
        break;
      }
      // Strings
      case "fileOutputs":
      case "logFilePath":
      case "format": {
        if (!needsToBeSet) return;

        this.#checkValueAndExistence(
          value, "string", (needsAnArray) ? property : undefined
        )
        if (Number.isInteger(index)) setIndex(); else setValue()
        break;
      }
      // Array of objects
      case "effects": {
        if (!needsToBeSet) return;

        this.#checkValueAndExistence(
          value, "array", (needsAnArray) ? property : undefined
        )
        for (const effectObj of value) {
          if (typeof effectObj.effect !== "string") throw new TypeError("effect property is not a string")
          // Array of strings or undefined
          if (effectObj.values === undefined) continue;
          for (const string of effectObj.values) {
            if (typeof string !== "string") throw new TypeError("effect property is not a string")
          }
        }
        if (Number.isInteger(index)) setIndex(); else pushValue()
        break;
      }

      default:
        throw new Error(property+" doesn't exist")
    }
  }
  /**
   * The main method to add a file to the list of Sets
   * @param {Number} index - index of the group of files
   * @param {String} string - file to add
   * @param {Boolean} [isSoundfont=false] - if it's a soundfont, then add as a first element
   * @param {Boolean} [replace=false] - if it should delete the first element before adding the soundfont
   */
  static files(index, string, isSoundfont = false, replace = false) {
    this.#checkValueAndExistence(index, "number")
    this.#checkValueAndExistence(string, "string", "files")
    this.#checkValueAndExistence(isSoundfont, "boolean")
    this.#checkValueAndExistence(replace, "boolean")
    const groups = this.#options.files,
          parsedPath = parse(string);
    groups[index] ??= new Set();

    if (isSoundfont) {
      const oldIndexZero = groups[index].getIndex(0);
      if (replace) groups[index].delete(oldIndexZero)
      groups[index].addLeft(string)

      if (oldIndexZero === groups[index].getIndex(0)) return;
      if (replace) {
        const oldIndexZeroWithoutExt = join(parse(oldIndexZero).dir, parse(oldIndexZero).name);
        this.#listOfSoundfonts.delete(oldIndexZeroWithoutExt)
      }
      this.#listOfSoundfonts.set(
        join(parsedPath.dir, parsedPath.name),
        index
      )
      return;
    }
    const oldSize = groups[index].size;
    groups[index].add(string)

    if (oldSize === groups[index].size) return;
    this.#listOfSongs.push([
      index,
      string,
      join(parsedPath.dir, parsedPath.name)
    ])
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
   * Gives a compatible list of
   * this.#options.files for console.table
   * @return {(undefined|Object[])} - undefined if it's undefined or empty,
   *                                  an array of objects that contain a soundfont and its midis
   */
  static getConfirmationTable() {
    if (!this.#options.files
        || !this.#options.files.length) return;

    const table = [],
          listOfFiles = this.#options.files;
    let indexOfSets = 0;
    for (const setOfFiles of listOfFiles) {
      if (!setOfFiles) {
        indexOfSets++
        continue;
      }
      const values = [...setOfFiles],
            parsedValues = [],
            MAX_DEEP_LEVEL = 3;

      // Truncate after MAX_DEEP_LEVEL folders deep
      let indexInsideSet = 0;
      for (const v of values) {
        const parsedPath = parse(v);

        if (!parsedPath.dir) {
          parsedValues[indexInsideSet] = v;
          indexInsideSet++
          continue;
        }
        const splitDir = parsedPath.dir.split(sep).slice(0, MAX_DEEP_LEVEL);
        parsedValues[indexInsideSet] = join(splitDir.join(sep), "...") + parsedPath.base;
        indexInsideSet++
      }

      const soundfont = parsedValues[0],
            midis = parsedValues.slice(1);
      table[indexOfSets] = { soundfont, midis };
      indexOfSets++
    }
    return table;
  }
  /**
   * Checks if there's a file somewhere
   * that has exactly the same name as the user needs
   * @param {String} name - basename to search for
   * @param {(Boolean|undefined)} [isAMidiSearching] - if arg inside setFiles is a midi or it needs to search everywhere
   * @return {(Number|false)} the index of the group or false if it didn't find any match
   */
  static searchAddedFile(name, isAMidiSearching) {
    const soundfontSearch = () => {
      const indexOfGroup = this.#listOfSoundfonts.get(name);
      return (indexOfGroup !== undefined) ? indexOfGroup : false;
    };
    const midiSearch = () => {
      const flattenMidis = [].concat(...this.#listOfSongs);
      const indexOfName = flattenMidis.indexOf(name);
      return (indexOfName !== -1) ? flattenMidis[indexOfName-2] : false;
    };

    if (isAMidiSearching === undefined) {
      const midiSearchResult = midiSearch();
      return (midiSearchResult !== false)
                ? midiSearchResult
                : soundfontSearch();
    }
    return (isAMidiSearching) ? soundfontSearch() : midiSearch();
  }
  /**
   * Checks if a group is an automatic basename group
   * @param {String[]} argvWithoutFileExts - process.argv without file extensions
   * @param {Number} indexOfGroup - index of the group
   * @return {(true|false)}
   * @throws {TypeError} - if index is not a number
   */
  static isAutomaticBasenameGroup(argvWithoutFileExts, indexOfGroup) {
    if (!Array.isArray(argvWithoutFileExts)) throw new TypeError("argvWithoutFileExts must be an array")
    if (typeof indexOfGroup !== "number") throw new TypeError("index must be a number")
    const group = this.#options.files[indexOfGroup];

    if (group.size > 2) return false;
    if (group.size < 2) {
      const parsedFirstFile = parse(group.getIndex(0)),
            pathUpToName = join(parsedFirstFile.dir, parsedFirstFile.name);

      const noExtNewArguments = [...argvWithoutFileExts];
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
          simplifiedOptionsObject = Object.create(null);
    const [indexOfGroup, songFile] = this.#listOfSongs[index];
    const group = this.#options.files[indexOfGroup];

    simplifiedOptionsObject["soundfontFile"] = group.getIndex(0);
    simplifiedOptionsObject["midiFile"] = group.get(songFile);
    simplifiedOptionsObject["indexOfGroup"] = indexOfGroup;

    for (let i = 0; i < allOptionsLength; i++) {
      const key = allOptions[i];
      if (key === "files") continue;
      if (key === "fileOutputs") {
        simplifiedOptionsObject[key] = [...this.#options[key]];
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

