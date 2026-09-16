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
 * Adds/updates properties with an index to Options class
 * @param {(MainOptions|EffectsOptions)} that
 * @param {Array<String|Number|*>} list things to add
 */
function addIndexedProperties(that, list) {
  for (let i = list.length; --i;) {
    if (i < 0) break;
    const {
      [i]: value, [i-1]: index, [i-2]: property
    } = list;

    _manageOption({ property, index, value }, true, true, that)
    i -= 2;
  }
}
let setValue, setOrPushValue;
/**
 * @function #checkValueAndExistence
 * @desc type checker
 * @param {*} value - any kind of value to check
 * @param {String} requiredType - type that must be correct
 * @param {String} [property] - any kind of property to add to #options
 * @memberof Options
 * @private
 * @throws {TypeError} - if it's not of valid type
 * @return {Boolean} if it all goes well
 */
function checkValueAndExistence(value, requiredType, property, that) {
  if (requiredType !== "array" || !Array.isArray(value)) {
    if (typeof value !== requiredType) {
      throw new TypeError(`${value} is not of type ${requiredType}`)
    }
  }
  if (property) that._options[property] ??= [];
}
/**
 * Manages the addition/getters/setters
 * of options from other classes
 * @param {Object}  manageOptionObjectParameters
 * @param {String}  manageOptionObjectParameters.property
 * @param {Number}  manageOptionObjectParameters.index
 * @param {*}       manageOptionObjectParameters.value
 * @param {Boolean} manageOptionObjectParameters.setter
 * @param {Boolean} needsAnArray
 * @private
 * @return {(undefined|Number|String|Boolean)}
 * @throws {(TypeError|Error)} if a value is not the right type or the property doesn't exist
 */
function _manageOption(
  {property, index, value, setter = false, isStdout = false},
  needsToBeSet = false, needsAnArray = false, that
) {
  checkValueAndExistence(property, "string")
  if (index) checkValueAndExistence(index, "number")
  setValue ??= (property, value) => that._options[property] = value;
  setOrPushValue ??= (property, value, index) => (
    Number.isInteger(index)
      ? that._options[property][index] = value
      : that._options[property].push(value)
  );
  switch (property) {
    case "logFilePath": {
      return that.manageAuxiliaryFileOptions(property, value, index, needsToBeSet);
    }
    case "verboseLevel": {
      checkValueAndExistence(value, "number")
      return setValue(property, value);
    }
    // Numbers
    case "stdoutReverbVolume": { property = "reverbVolume"; } // falls through
    case "volume": case "drumsVolume": case "channelVolume":
    case "reverbVolume":
    case "sampleRate":
    case "loopAmount":
    case "loopStart": case "loopEnd":
    case "maxThreads":
    case "progressDelay":
    case "loopFadeStart": case "loopFadeDuration": {
      checkValueAndExistence(
        value,
        property === "channelVolume"
          ? "array"
            // miditicks prefix for loop parameters
          : (value[0] === "@" ? "string" : "number"),
        (needsAnArray) ? property : undefined,
        that
      )
      return (
        setter
          ? setValue(property, value)
          : setOrPushValue(property, value, index)
      )
    }
    // Boolean
    case "loopFade":     case "daemon":
    case "confirmation": case "noTable":
    case "showUsage":    case "noProgress":
    case "toStdout":     case "spessaSynthEffects":
    case "hardStop": {
      checkValueAndExistence(
        value, "boolean", needsAnArray ? property : undefined, that
      )
      return (
        (property === "spessaSynthEffects" && !isStdout)
        || property === "hardStop"
          ? setOrPushValue(property, value, index)
          : setValue(property, value)
      );
    }
    // Strings
    case "dryRun": case "fileOutputs": {
      that.manageAuxiliaryFileOptions(property, value, index);
      return;
    }
    case "format": case "loopFadeInterpolation": {
      checkValueAndExistence(
        value, "string", (needsAnArray) ? property : undefined, that
      )
      return (
        Number.isInteger(index) || property === "loopFadeInterpolation"
          ? setOrPushValue(property, value, index)
          : setValue(property, value)
      );
    }
    // Array of objects
    case "stdoutEffects": case "effects": {
      checkValueAndExistence(
        value, "array", (needsAnArray) ? property : undefined, that
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
        return setValue(property, value);
      }
      setOrPushValue(property, value, index)
      break;
    }

    default:
      throw new Error(property+" doesn't exist")
  }
}

/**
 * Main options class that contains general options
 * @mixin MainOptions
 */
class MainOptions {
  /**
   * Adds a parameter string value by index
   * @param {String}                           name property's name
   * @param {(Number|NaN)}                     index song's index
   * @param {(String|Number|Boolean|Number[])} value string to add
   * @throws {TypeError} if index is not a number or name is not a string
   */
  static addIndexedStringValue(name, index, value) {
    if (name === "hardStop") value = true;

    _manageOption({
      property: name,
      index: !Number.isNaN(index) ? index : undefined,
      value
    }, true, true, this);
  }
  /** @alias addIndexedStringValue */
  static addIndexedNumberValue  = this.addIndexedStringValue;
  /** @alias addIndexedStringValue */
  static addIndexedBooleanValue = this.addIndexedStringValue;
  /** @alias addIndexedStringValue */
  static addIndexedArrayValue = this.addIndexedStringValue;

  /**
   * Adds a parameter boolean value
   * @param {String}           name  property's name
   * @param {(Boolean|String)} value boolean to add
   * @throws {TypeError} if name is not a string
   */
  static addBooleanValue(name, value) {
    if (name === "daemon") value = true;
    if (name === "dryRun") value = "";

    _manageOption(
      { property: name, value },
      undefined, undefined, this
    )
  }
  /** @alias addBooleanValue */
  static addStringValue = this.addBooleanValue;

  /**
   * Adds a parameter number value
   * @param {String} name  property's name
   * @param {Number} value boolean to add
   * @throws {TypeError} if name is not a string
   */
  static addNumberValue(name, value) {
    let isSetter;
    switch (name) {
      case "progressDelay": case "maxThreads":
      case "sampleRate":
        isSetter = true;
    }
    _manageOption({
      property: name, value, setter: isSetter
    }, undefined, undefined, this)
  }
  /**
   * Retrieves a property's value
   * @param {String} name  property's name
   * @return {*} value of the property
   * @throws {TypeError} if name is not a string
   */
  static getValue(name) {
    return this._manageOption({ property: name }, false);
  }
  /**
   * Retrieves a property's value
   * @param {String} name  property's name
   * @param {Number} index property's index
   * @return {*} value of the property
   * @throws {TypeError} if name is not a string
   */
  static getIndexedValue(name, index) {
    return this._manageOption({ property: name, index }, false);
  }
}

/**
 * An options class that
 * manages options regarding effects and more
 * @mixin EffectsOptions
 */
class EffectsOptions {
  /**
   * Returns if effects are handled by spessasynth
   * @param {String}  parameter paramter that wants to check
   * @param {Number}  index     index of the song
   * @param {Boolean} isStdout  if it's stdout mode
   * @return {Boolean} if it's spessasynth or SoX
   */
  static externalEffectProcesser(index, isStdout) {
    const isBuiltin = this._manageOption({
      property: "spessaSynthEffects",
      index: !isStdout ? index : undefined
    }, false);

    if (isBuiltin === undefined) return;
    return !isBuiltin;
  }
  /**
   * Adds a list of effects to a specific file
   * @param {Number} index - index of the file
   * @param {Array} arrayOfObjects - an array of object effects
   */
  static effects(index, arrayOfObjects) {
    const _index = Number.isNaN(index) ? undefined : index;
    addIndexedProperties(this, [
      "effects", _index, arrayOfObjects,
      "spessaSynthEffects", _index, false
    ])
  }
  /**
   * Sets the stdout array of effects
   * @param {Array} arrayOfObjects - an array of object effects
   */
  static set stdoutEffects(arrayOfObjects) {
    _manageOption({
      property: "stdoutEffects",
      value: arrayOfObjects, setter: true
    })
    _manageOption({
      property: "spessaSynthEffects",
      value: false, isStdout: true
    })
  }
  /**
   * Change reverb's volume of a specific file
   * @param {Number} index - index of the file's option
   * @param {Number} number - the volume value as a float or integer
   */
  static reverbVolume(index, number) {
    const _index = !Number.isNaN(index) ? index : undefined;
    addIndexedProperties(this, [
      "reverbVolume", _index, number,
      "spessaSynthEffects", _index, true
    ])
  }
}

export const classes = [
  MainOptions, EffectsOptions
];

