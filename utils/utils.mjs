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
import Mixin from "./basic_additions.mjs"
import "./colors.mjs"

/**
 * Clears lines from the last line up
 * @param {Number} lineY - line before the cursor in negative
 * @throws {TypeError}   - if it's not a valid number
 * @example
 * // Clears only the last line
 * clearLastLines(-1)
 */
const clearLastLines = lineY => {
  if (typeof lineY !== "number" || Number.isNaN(lineY)) {
    throw new TypeError("Didn't give a valid number")
  }
  const absoluteNumber = Math.abs(lineY);
  const upNLines = `\x1b[${absoluteNumber}F`,
        clearScreenDown = "\x1b[0J";

  process.stdout.write(upNLines + clearScreenDown)
}
const debugLevels = Array(4).keys();
export const debugMaxLevel = debugLevels.length-1;
export const {
  0: ERROR_LVL, 1: WARNING_LVL,
  2: INFO_LVL,  3: DEBUG_LVL
} = [...debugLevels];
const LVL_TEXTS = {
  [ERROR_LVL]: "ERROR", [WARNING_LVL]: "WARNING",
  [INFO_LVL]: "INFO",   [DEBUG_LVL]: "DEBUG"
};
const debugLevelSpesso = Number(process.env.DEBUG_LEVEL_SPESSO),
      debugFileSpesso  = process.env.DEBUG_FILE_SPESSO;
const logMessageColors = {
  0: normalRed, 1: normalYellow,
  2: dimGray,   3: dimGray
};
/**
 * Logger
 * @param {Number} level - level of the log
 * @param {Array<(String|Uint8Array<ArrayBufferLike>)>} messages - messages to print
 */
function log(level, ...messages) {
  const time = performance.now().toFixed(2),
        date = new Date().toISOString();
  const spacesAmount = (
    date.length +
    LVL_TEXTS[level].length + 2 +
    (time.length + 7) + 2
  );
  const logOptions = this?.verboseLevel ? this : Options;

  if (Number.isNaN(debugLevelSpesso)
      && logOptions.verboseLevel === undefined) return;
  if (debugLevelSpesso < level
      || logOptions.verboseLevel < level) return;

  const message = [
    (this === logOptions ? "\r" : "") +
    brightMagenta+date+normal,
    "["+normalYellow+time+" ms"+normal+"]",
    "{"+gray+LVL_TEXTS[level]+normal+"}",
    messages
      .join("")
      // Place the header data on a new line with padding
      .replace(/header file (\d+)+/, "header file:\n"+" ".repeat(spacesAmount)+"$1")
      // Place the SoX arguments on a new line with padding
      .replace(/with (sox -t.*)/, "with:\n"+" ".repeat(spacesAmount)+"\"$1\"")
      // Place the ffmpeg arguments on a new line with padding
      .replace(/with (ffmpeg -i.*)/, "with:\n"+" ".repeat(spacesAmount)+"\"$1\"")
      // Add dimmed gray to the output
      .replace(/(.*)/s, `${logMessageColors[level]}$1${normal}`)
  ];
  if (messages[0] === "Finished printing to stdout") message.unshift("\n")
  console.error(...message)

  const path = debugFileSpesso || logOptions.logFilePath;
  if (!path) return;

  const messageLength = message.length,
        escapeSequenceRemover = /\x1b\[[0-9;]*m/g;

  for (let i = 0; i < messageLength; i++) {
    message[i] = message[i].replaceAll(escapeSequenceRemover, "");
  }
  message.push("\n")
  fs.appendFileSync(path, message.join(" "))
}
export const formatStrings = {
  errorText: red+"%s"+normal,
  warningText: yellow+"%s"+normal,
  grayedOutText: gray+"%s"+normal,
  failedCliParamWithArg: `${normalRed}%s ${underline+bold}%s${normal+normalRed} %s${normal}`,
  failedCliParam: `${normalRed}%s${normal}`
};
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
  if (!fs.existsSync(path ?? "") && !createAnyway) return path;

  const LIMIT = 900;
  const randomCharCode = () => {
    const randomInteger = Math.floor(Math.random() * LIMIT);

    switch (randomInteger) {
      case randomInteger < 33 && randomInteger:
      //     ↑ whitespace characters ↑
      case 34:  // "
      case 37:  // %
      case 42:  // *
      case 44:  // ,
      case 46:  // .
      case 47:  // /
      case 58:  // :
      case 59:  // ;
      case 60:  // >
      case 61:  // =
      case 62:  // <
      case 63:  // ?
      case 92:  // \
      case 124: // |
        return randomCharCode();

      default:
        return String.fromCharCode(randomInteger);
    }
  };
  const MAX_LENGTH = 8;
  let {
    dir: pathDir,
    name: pathFileName, ext: pathExt
  } = parse(path);
  let newString = "";

  for (let i = 0; i < MAX_LENGTH; i++) newString += randomCharCode();

  pathFileName += "__"+newString+"__";
  path = join(pathDir, pathFileName + pathExt);

  if (fs.existsSync(path)) return newFileName(path, createAnyway);
  return path;
}
/**
 * Gets sizes asynchronously for all soundfonts in the list
 * @param {Set[]} filesList list of groups of files
 * @return {Promise<Number[]>} all sizes in MB
 */
async function getSizes(filesList) {
  const statPromises = [];
  const { promises: { stat: asyncStat } } = fs;

  for (const group of filesList) {
    if (!group) continue;
    const [soundfont] = group;

    statPromises.push(
      asyncStat(soundfont)
        .then(({ size }) => size / 1024**2)
    )
  }
  return await Promise.all(statPromises)
}
/**
 * Gives an estimate of RAM usage for all threads combined
 * @param {Set[]} filesList     list of groups of files
 * @param {Number[]} fileSizes  list of file sizes
 * @param {Number} threadsCount threads count
 * @return {Number} estimate
 */
function getUsageEstimate(filesList, fileSizes, threadsCount) {
  const AVG_MODULE_CACHE_MB = 12;
  let index = 0,
      finalSize = 0;
  for (const group of filesList) {
    if (!group) { index++; continue; }

    const size = fileSizes[index],
          [_, ...{ length: midisPerSoundfont }] = group;
    const howManyTimes = (
      (midisPerSoundfont > threadsCount)
        ? threadsCount : midisPerSoundfont
    );
    finalSize += size * howManyTimes * 2;
    index++
  }
  return AVG_MODULE_CACHE_MB * threadsCount + finalSize;
}
const {
  [Symbol.for("nodejs.util.promisify.custom")]
    : asyncSetTimeout
} = setTimeout;

/**
 * A class that represents options interpreted by cli.mjs
 * @mixes (module:classes~MainOptions|module:classes~EffectsOptions)
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
   * @property {String} fileWithoutExt - filename of song without extension
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
  /**
   * Manages the addition/getters/setters
   * of options from other classes
   * @param {Object}  manageOptionObjectParameters
   * @param {String}  manageOptionObjectParameters.property
   * @param {Number}  manageOptionObjectParameters.index
   * @param {*}       manageOptionObjectParameters.value
   * @param {Boolean} manageOptionObjectParameters.setter
   * @param {Boolean} needsToBeSet
   * @param {Boolean} needsAnArray
   * @return {(undefined|Number|String|Boolean)}
   * @throws {(TypeError|Error)} if a value is not the right type or the property doesn't exist
   */
  static _manageOption(
    {property, index, value, setter = false, isStdout = false},
    needsToBeSet = true, needsAnArray = false
  ) {
    this.#checkValueAndExistence(property, "string")
    if (index) this.#checkValueAndExistence(index, "number")
    const setValue = () => this.#options[property] = value;
    const setIndex = () => this.#options[property][index] = value;
    const pushValue = () => this.#options[property].push(value)
    switch (property) {
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
      case "volume":
      case "stdoutReverbVolume": case "reverbVolume":
      case "sampleRate":
      case "loopAmount":
      case "loopStart": case "loopEnd":
      case "maxThreads":
      case "progressDelay":
      case "loopFadeStart": case "loopFadeDuration": {
        if (!needsToBeSet) return;

        this.#checkValueAndExistence(
          value, "number", (needsAnArray) ? property : undefined
        )
        if (setter) {
          if (property === "stdoutReverbVolume") {
            property = "reverbVolume";
          }
          setValue()
          break;
        }
        if (Number.isInteger(index)) setIndex(); else pushValue()
        break;
      }
      // Boolean
      case "loopFade":
      case "confirmation": case "noTable":
      case "showUsage":    case "noProgress":
      case "toStdout":     case "spessaSynthEffects": {
        if (!needsToBeSet && property === "spessaSynthEffects") {
          if (this.#options[property] === undefined) return;
          if (Number.isNaN(index)) index = this.#options[property].length-1;
          return (
            index !== undefined
              ? this.#options[property][index]
              : this.#options[property]
          );
        }
        this.#checkValueAndExistence(
          value, "boolean", needsAnArray ? property : undefined
        )
        if (property === "spessaSynthEffects" && !isStdout) {
          if (Number.isInteger(index)) setIndex(); else pushValue()
          return;
        }
        setValue()
        break;
      }
      // Strings
      case "fileOutputs":
      case "dryRun":
      case "format": case "loopFadeInterpolation": {
        if (!needsToBeSet) {
          return (
            property === "fileOutputs"
              ? "fileOutputs" in this.#options
              : undefined
          );
        }

        this.#checkValueAndExistence(
          value, "string", (needsAnArray) ? property : undefined
        )
        if (property === "dryRun") {
          this.#options.dryRun = (
            (process.platform === "win32")
              ? "\\\\.\\nul"
              : "/dev/null"
          );
          break;
        }
        if (property === "loopFadeInterpolation") {
          if (Number.isInteger(index)) setIndex(); else pushValue()
          return;
        }
        if (Number.isInteger(index)) setIndex(); else setValue()
        break;
      }
      // Array of objects
      case "stdoutEffects":
      case "effects": {
        if (!needsToBeSet) return;

        this.#checkValueAndExistence(
          value, "array", (needsAnArray) ? property : undefined
        )
        for (const effectObj of value) {
          if (typeof effectObj.effect !== "string") {
            throw new TypeError("effect property is not a string")
          }
          // Array of strings or undefined
          if (effectObj.values === undefined) continue;
          for (const string of effectObj.values) {
            if (typeof string !== "string") {
              throw new TypeError("effect property is not a string")
            }
          }
        }
        if (index === undefined && property === "stdoutEffects") {
          property = "effects";
          return setValue();
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
    this.#listOfSongs.push(
      index,
      string,
      join(parsedPath.dir, parsedPath.name)
    )
  }
  /**
   * Gives the amount of songs to do
   * @return {Number} the amount
   */
  static get amountOfSongs() {
    return this.#listOfSongs.length / 3;
  }
  /**
   * Gives the amount of groups
   * @return {Number} the amount
   */
  static get amountOfGroups() {
    return this.#options.files?.length ?? 0;
  }
  /**
   * Gives the filename of the song
   * @param {Number} index index of the song
   * @return {String} the filename without extension
   */
  static getSongName(index) {
    return this.#listOfSongs[index * 3 + 2];
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
      const indexOfName = this.#listOfSongs.indexOf(name);
      return (indexOfName !== -1) ? this.#listOfSongs[indexOfName-2] : false;
    };

    if (isAMidiSearching === undefined) {
      const midiSearchResult = midiSearch();
      return (
        midiSearchResult !== false
          ? midiSearchResult
          : soundfontSearch()
      );
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
    if (!Array.isArray(argvWithoutFileExts)) {
      throw new TypeError("argvWithoutFileExts must be an array")
    }
    if (typeof indexOfGroup !== "number") {
      throw new TypeError("index must be a number")
    }
    const group = this.#options.files[indexOfGroup];

    if (group.size > 2) return false;
    if (group.size < 2) {
      const {
        dir: fileDir, name: fileName
      } = parse(group.getIndex(0));
      const pathUpToName = join(fileDir, fileName);

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
    const actualIndex = index && index * 3;
    const {
      [actualIndex]: indexOfGroup,
      [actualIndex+1]: songFile
    } = this.#listOfSongs;
    const group = this.#options.files[indexOfGroup];

    simplifiedOptionsObject["soundfontFile"] = group.getIndex(0);
    simplifiedOptionsObject["midiFile"]      = group.get(songFile);
    simplifiedOptionsObject["indexOfGroup"]  = indexOfGroup;

    for (let i = 0; i < allOptionsLength; i++) {
      const key = allOptions[i];
      const property = this.#options[key];
      if (key === "files") continue;
      if (key === "fileOutputs") {
        simplifiedOptionsObject[key] = [...property];
        continue;
      }
      const isArray = Array.isArray(property);
      if (isArray && property.length === 1) {
        simplifiedOptionsObject[key] = property[0];
        continue;
      }
      if (isArray) {
        simplifiedOptionsObject[key] = property[index];
        continue;
      }
      simplifiedOptionsObject[key] = property;
    }
    return simplifiedOptionsObject;
  }

  /**
   * Gives all the data
   * @return {Object} the deep cloned #options object
   */
  static get all() { return structuredClone(this.#options); }
}
/**
 * A class that returns an error
 * based on child_processes' exit codes
 * @param {String}  message           message to show
 * @param {Object?} options           options passed to Error class
 * @param {Object}  stdBuffers
 * @param {Number}  stdBuffers.exitCode exit code of the child process
 * @param {Array}   stdBuffers.stdout   stdout array
 * @param {Array}   stdBuffers.stderr   stderr array
 */
class UnwantedNonZeroError extends Error {
  constructor(message, options, { exitCode, stdout, stderr }) {
    super(message, options)
    this.exitCode = exitCode;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}
/**
 * Exit event handler for ffmpeg child_processes
 * @param {Number}   exitCode
 * @param {Function} resolver in case it needs to resolve a promise
 * @return {Number?} maybe the result of the resolver
 * @throws {UnwantedNonZeroError} if the exitCode is non-zero
 */
function ffmpegExitHandler(exitCode, resolver) {
  if (exitCode === 0) return resolver?.(exitCode);

  throw new UnwantedNonZeroError(
    `ffmpeg child_process closed with ${exitCode}`,
    undefined,
    {exitCode, stdout: this.stdout, stderr: this.stderr}
  )
}

export {
  clearLastLines,
  log,
  newFileName,
  getSizes, getUsageEstimate,
  asyncSetTimeout,
  Options,
  ffmpegExitHandler
}

