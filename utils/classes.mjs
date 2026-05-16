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
 * Adds a new property to Options class
 * @param {MainOptions} that
 * @param {String} property name of property to add
 * @param {*} value what to add to the property
 * @param {Boolean} isSetter if it's a setter
 */
function addProperty(that, property, value, isSetter) {
  that._manageOption({
    property, value, setter: isSetter
  });
}
/**
 * Adds/updates a property with an index to Options class
 * @param {(MainOptions|EffectsOptions)} that
 * @param {String} property name of property to add
 * @param {Number?} index index of the array
 * @param {*} value value to add
 */
function addIndexedProperty(that, property, index, value) {
  that._manageOption({
    property, index, value
  }, true, true);
}
/**
 * Gets the property from Options class
 * @param {MainOptions} that
 * @param {String} property name of the property to retrieve
 * @return {*} value of the property
 */
function getProperty(that, property) {
  return that._manageOption({property}, false);
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
    addProperty(this, "verboseLevel", number)
  }
  /**
   * Gives verboseLevel's number
   * @return {Number} verboseLevel's number
   */
  static get verboseLevel() {
    return getProperty(this, "verboseLevel");
  }
  /**
   * Sets logFilePath
   * @param {String} path - path to write to
   */
  static set logFilePath(path) {
    addProperty(this, "logFilePath", path)
  }
  /**
   * Gives logFilePath
   * @return {String} logFilePath
   */
  static get logFilePath() {
    return getProperty(this, "logFilePath");
  }
  /**
   * Sets toStdout boolean
   * @param {Boolean} value - enable or disable printing to stdout
   */
  static set toStdout(value) {
    addProperty(this, "toStdout", value)
  }
  /**
   * Sets confirmation boolean
   * @param {Boolean} value - enable or disable confirmation
   */
  static set confirmation(value) {
    addProperty(this, "confirmation", value)
  }
  /**
   * Sets noTable boolean
   * @param {Boolean} value - enable or disable tabling the confirmation prompt
   */
  static set noTable(value) {
    addProperty(this, "noTable", value)
  }
  /**
   * Sets noProgress boolean
   * @param {Boolean} value - enable or disable text rendering in file mode
   */
  static set noProgress(value) {
    addProperty(this, "noProgress", value)
  }
  /**
   * Sets showUsage boolean
   * @param {Boolean} value - enable or disable showing usage of RAM or CPU time
   */
  static set showUsage(value) {
    addProperty(this, "showUsage", value)
  }
  /**
   * Sets textDelay number
   * @param {Number} value - sets the text delay for file mode
   */
  static set textDelay(value) {
    addProperty(this, "textDelay", value, true)
  }
  /**
   * Sets dryRun path string
   * @param {Boolean} value - path to use for the dry run
   */
  static dryRun() {
    addProperty(this, "dryRun", "")
  }
  /**
   * Sets the maximum of threads to use in file mode
   * @param {Boolean} value - number of threads
   */
  static set maxThreads(value) {
    addProperty(this, "maxThreads", value, true)
  }
  /**
   * Sets the stdout format
   * @param {String} string - a string representing the format
   */
  static set format(string) {
    addProperty(this, "format", string)
  }
  /**
   * Adds a path to write to in a particular format
   * @param {Number} index - index of the internal array
   * @param {String} string - string to add to the specified index
   */
  static fileOutputs(index, string) {
    checkValue(index, "number")
    addIndexedProperty(this, "fileOutputs", index, string)
  }
  /**
   * Checks if it has fileOutputs
   * @return {Boolean} file mode or not
   */
  static isFileMode() {
    return getProperty(this, "fileOutputs");
  }
  /**
   * Change general volume of a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - volume value as a float or integer
   */
  static volume(index, number) {
    checkValue(index, "number")
    addIndexedProperty(
      this, "volume",
      !isNaN(index) ? index : undefined,
      number
    )
  }
  /**
   * Sets the sample rate of the stdout output
   * @param {Number} number - sample rate to set for all files in stdout
   */
  static set stdoutSampleRate(number) {
    addProperty(this, "sampleRate", number, true)
  }
  /**
   * Sets the sample rate of a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - sample rate to set
   */
  static sampleRate(index, number) {
    checkValue(index, "number")
    addIndexedProperty(
      this, "sampleRate",
      !isNaN(index) ? index : undefined,
      number
    )
  }
  /**
   * Sets the amount of loops to do for a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - how many loops to do
   */
  static loopAmount(index, number) {
    checkValue(index, "number")
    addIndexedProperty(
      this, "loopAmount",
      !isNaN(index) ? index : undefined,
      number
    )
  }
  /**
   * Sets when the loop starts for a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - start of the loop as a float or integer
   */
  static loopStart(index, number) {
    checkValue(index, "number")
    addIndexedProperty(
      this, "loopStart",
      !isNaN(index) ? index : undefined,
      number
    )
  }
  /**
   * Sets when the loop ends for a specific file
   * @param {Number} index - index of the file
   * @param {Number} number - end of the loop as a float
   */
  static loopEnd(index, number) {
    checkValue(index, "number")
    addIndexedProperty(
      this, "loopEnd",
      !isNaN(index) ? index : undefined,
      number
    )
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
    addIndexedProperty(
      this, "effects",
      isNaN(index) ? undefined : index,
      arrayOfObjects
    )
  }
  /**
   * Change reverb's volume of a specific file
   * @param {Number} index - index of the file's option
   * @param {Number} number - the volume value as a float or integer
   */
  static reverbVolume(index, number) {
    checkValue(index, "number")
    addIndexedProperty(
      this, "reverbVolume",
      !isNaN(index) ? index : undefined,
      number
    )
  }
}

export let classes = [
  MainOptions, EffectsOptions
];

