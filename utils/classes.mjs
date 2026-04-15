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
 * @module classes
 */

/**
 * @function checkValue
 * @desc type checker
 * @param {*} value - any kind of value to check
 * @param {String} requiredType - type that must be correct
 * @throws {TypeError} - if it's not of valid type
 */
function checkValue(value, requiredType) {
  if (requiredType !== "array" || !Array.isArray(value)) {
    if (typeof value !== requiredType) {
      throw new TypeError(`${value} is not of type ${requiredType}`)
    }
  }
}

/**
 * Main options class that contains general options
 * @mixin MainOptions
 */
class MainOptions {
  /**
   * Sets verboseLevel
   * @param {Number} number - verboseLevel's number
   */
  static set verboseLevel(number) {
    this._manageOption({property: "verboseLevel", value: number})
  }
  /**
   * Gives verboseLevel's number
   * @return {Number} verboseLevel's number
   */
  static get verboseLevel() {
    return this._manageOption({property: "verboseLevel"}, false);
  }
  /**
   * Sets logFilePath
   * @param {String} path - path to write to
   */
  static set logFilePath(path) {
    this._manageOption({property: "logFilePath", value: path})
  }
  /**
   * Gives logFilePath
   * @return {String} logFilePath
   */
  static get logFilePath() {
    return this._manageOption({property: "logFilePath"}, false)
  }
  /**
   * Sets toStdout boolean
   * @param {Boolean} value - enable or disable printing to stdout
   */
  static set toStdout(value) {
    this._manageOption({property: "toStdout", value})
  }
  /**
   * Sets confirmation boolean
   * @param {Boolean} value - enable or disable confirmation
   */
  static set confirmation(value) {
    this._manageOption({property: "confirmation", value})
  }
  /**
   * Sets noTable boolean
   * @param {Boolean} value - enable or disable tabling the confirmation prompt
   */
  static set noTable(value) {
    this._manageOption({property: "noTable", value})
  }
  /**
   * Sets dryRun path string
   * @param {Boolean} value - path to use for the dry run
   */
  static dryRun() {
    this._manageOption({property: "dryRun", value: ""})
  }
  /**
   * Sets the maximum of threads to use in file mode
   * @param {Boolean} value - number of threads
   */
  static set maxThreads(value) {
    this._manageOption({property: "maxThreads", value, setter: true })
  }
  /**
   * Sets the stdout format
   * @param {String} string - a string representing the format
   */
  static set format(string) {
    this._manageOption({property: "format", value: string})
  }
  /**
   * Adds a path to write to in a particular format
   * @param {Number} index - index of the internal array
   * @param {String} string - string to add to the specified index
   */
  static fileOutputs(index, string) {
    checkValue(index, "number")
    this._manageOption({property: "fileOutputs", index, value: string}, true, true)
  }
  /**
   * Checks if it has fileOutputs
   * @return {Boolean} file mode or not
   */
  static isFileMode() {
    return this._manageOption({property: "fileOutputs"}, false);
  }
  /**
   * Change general volume of a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - volume value as a float or integer
   */
  static volume(index, number) {
    checkValue(index, "number")
    this._manageOption({
      property: "volume",
      index: (!Number.isNaN(index)) ? index : undefined,
      value: number
    }, true, true)
  }
  /**
   * Sets the sample rate of the stdout output
   * @param {Number} number - sample rate to set for all files in stdout
   */
  static set stdoutSampleRate(number) {
    this._manageOption({property: "sampleRate", value: number, setter: true})
  }
  /**
   * Sets the sample rate of a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - sample rate to set
   */
  static sampleRate(index, number) {
    checkValue(index, "number")
    this._manageOption({
      property: "sampleRate",
      index: (!Number.isNaN(index)) ? index : undefined,
      value: number
    }, true, true)
  }
  /**
   * Sets the amount of loops to do for a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - how many loops to do
   */
  static loopAmount(index, number) {
    checkValue(index, "number")
    this._manageOption({
      property: "loopAmount",
      index: (!Number.isNaN(index)) ? index : undefined,
      value: number
    }, true, true)
  }
  /**
   * Sets when the loop starts for a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - start of the loop as a float or integer
   */
  static loopStart(index, number) {
    checkValue(index, "number")
    this._manageOption({
      property: "loopStart",
      index: (!Number.isNaN(index)) ? index : undefined,
      value: number
    }, true, true)
  }
  /**
   * Sets when the loop ends for a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - end of the loop as a float
   */
  static loopEnd(index, number) {
    checkValue(index, "number")
    this._manageOption({
      property: "loopEnd",
      index: (!Number.isNaN(index)) ? index : undefined,
      value: number
    }, true, true)
  }
}

/**
 * An options class that
 * manages options regarding effects and more
 * @mixin EffectsOptions
 */
class EffectsOptions {
  /**
   * Adds a list of effects to a specific file
   * @param {Number} index - index of the file
   * @param {Array} arrayOfObjects - an array of object effects
   */
  static effects(index, arrayOfObjects) {
    checkValue(index, "number")
    this._manageOption({
      property: "effects",
      index: (Number.isNaN(index)) ? undefined : index,
      value: arrayOfObjects
    }, true, true)
  }
  /**
   * Change reverb's volume of a specific file
   * @param {Number} index - index of the file's option
   * @param {Number} number - the volume value as a float or integer
   */
  static reverbVolume(index, number) {
    checkValue(index, "number")
    this._manageOption({
      property: "reverbVolume",
      index: (!Number.isNaN(index)) ? index : undefined,
      value: number
    }, true, true)
  }
}

export let classes = [
  MainOptions, EffectsOptions
];

