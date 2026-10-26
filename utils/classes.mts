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
import type { Options } from "./utils.mts"

type listUsedInReverse = Array<
  | string   | number    | boolean
  | object[] | undefined
>;
/**
 * Adds/updates properties with an index to Options class
 * @param {(MainOptions|EffectsOptions)} that
 * @param {Array<String|Number|*>} list things to add
 */
function addIndexedProperties(
  that: MainOptions | EffectsOptions,
  list: listUsedInReverse
): void {
  for (let i = list.length; --i;) {
    if (i < 0) break;
    const {
      [i]: value, [i-1]: index, [i-2]: property
    } = list;

    MainOptions.addIndexedValue.call(
      that,
      (property as string),
      (index as undefined | number),
      (value as object[] | number | boolean)
    )
    i -= 2;
  }
}
/** Sets a property with value */
const setValue = function (
  this: Options, property: string, value: any
): any {
  this._options[property] = value;
}
/** Sets a property to an index with a given value */
const setOrPushValue = function (
  this: Options,
  property: string, value: any, index?: number
): any | number {
  return (
    Number.isInteger(index)
      ? this._options[property][index!] = value
      : this._options[property].push(value)
  );
};
/**
 * @function #checkValueAndExistence
 * @description type checker
 * @param {*} value - any kind of value to check
 * @param {String} requiredType - type that must be correct
 * @param {String} [property] - any kind of property to add to #options
 * @memberof Options
 * @private
 * @throws {TypeError} - if it's not of valid type
 * @return {Boolean} if it all goes well
 */
function checkValueAndExistence(
  value: any, requiredType: string,
  property?: string | undefined, that?: Options
): void {
  if (requiredType !== "array" || !Array.isArray(value)) {
    if (typeof value !== requiredType) {
      throw new TypeError(`${value} is not of type ${requiredType}`)
    }
  }
  if (property) that!._options[property] ??= [];
}

type indexedStringValue = string | number | number[] | boolean | object[]
/**
 * Main options class that contains general options
 * @mixin MainOptions
 */
class MainOptions {
  /**
   * Adds a parameter string value by index
   * @throws {TypeError} if index is not a number or name is not a string
   */
  static addIndexedStringValue(
    this: Options,
    name: string, index: number | typeof NaN | undefined,
    value: indexedStringValue
  ): indexedStringValue | void {
    if (Number.isNaN(index)) index = undefined;

    switch (name) {
      // Numbers
      case "sampleRate":
      case "volume":      case "reverbVolume":
      case "drumsVolume": case "channelVolume":
      case "loopAmount":  case "loopStart": case "loopEnd":
      case "loopFadeStart": case "loopFadeDuration": {
        let type = "number";
        if (name === "channelVolume") type = "array";
        if (typeof value === "string" && value[0] === "@") type = "string";

        checkValueAndExistence(value, type, name, this)
        return setOrPushValue.call(this, name, value, index);
      }
      // Booleans
      case "externalEffects": case "hardStop": {
        if (name === "hardStop") value = true;
        checkValueAndExistence(value, "boolean", name, this)

        return setOrPushValue.call(this, name, value, index);
      }
      // Strings
      case "loopFadeInterpolation": {
        checkValueAndExistence(value, "string", name, this)
        return setOrPushValue.call(this, name, value, index);
      }
      case "fileOutputs": {
        checkValueAndExistence(value, "string", name, this)
        this.manageAuxiliaryFileOptions(name, value, index);
        return;
      }
      // Array of objects
      case "effects": case "stdoutEffects": {
        checkValueAndExistence(value, "array", name, this)

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
        setOrPushValue.call(this, name, value, index)
        break;
      }

      default:
        throw new Error(name+" doesn't exist")
    }
  }
  /** @alias addIndexedStringValue */
  static addIndexedNumberValue  = this.addIndexedStringValue;
  /** @alias addIndexedStringValue */
  static addIndexedBooleanValue = this.addIndexedStringValue;
  /** @alias addIndexedStringValue */
  static addIndexedArrayValue = this.addIndexedStringValue;
  /** @alias addIndexedStringValue */
  static addIndexedValue = this.addIndexedStringValue;

  /**
   * Adds a parameter boolean value
   * @throws {TypeError} if name is not a string
   */
  static addBooleanValue(
    this: Options,
    name: string, value: boolean | string
  ): boolean | string | void {
    switch (name) {
      // Boolean
      case "daemon":       case "loopFade":
      case "confirmation": case "noTable":
      case "showUsage":    case "noProgress":
      case "toStdout":     case "externalEffects":
        if (name === "daemon") value = true;
        checkValueAndExistence(value, "boolean", undefined, this)

        return setValue.call(this, name, value);

      // Strings
      case "logFilePath": case "dryRun":
        if (name === "dryRun") value = "";
        this.manageAuxiliaryFileOptions(name, value)
        return;

      case "format":
        checkValueAndExistence(value, "string", undefined, this)
        return setValue.call(this, name, value);

      // Array of objects
      case "stdoutEffects":
        name = "effects";
        return setValue.call(this, name, value);

      default:
        throw new Error(name+" doesn't exist")
    }
  }
  /** @alias addBooleanValue */
  static addStringValue = this.addBooleanValue;
  static addArrayValue = this.addBooleanValue;

  /**
   * Adds a parameter number value
   * @throws {TypeError} if name is not a string
   */
  static addNumberValue(name: string, value: number): number {
    switch (name) {
      case "verboseLevel": {
        checkValueAndExistence(value, "number")
        return setValue.call(this, name, value);
      }
      case "stdoutReverbVolume": { name = "reverbVolume"; } // falls through
      case "sampleRate": case "songIndex":
      case "maxThreads": case "progressDelay":
        checkValueAndExistence(value, "number", undefined, this)
        return setValue.call(this, name, value);

      default:
        throw new Error(name+" doesn't exist")
    }
  }
  /**
   * Retrieves a property's value
   * @throws {TypeError} if name is not a string
   */
  static getValue(this: Options, name: string): any {
    return (
      name === "logFilePath"
        ? this.manageAuxiliaryFileOptions(name, undefined, undefined, true)
        : this._options[name]
    )
  }
  /**
   * Retrieves a property's value
   * @param {String} name  property's name
   * @param {Number} index property's index
   * @return {*} value of the property
   * @throws {TypeError} if name is not a string
   */
  static getIndexedValue(
    this: Options, name: string, index: number
  ): any | undefined {
    if (name === "externalEffects" && Number.isNaN(index)) {
      index = this._options[name].length-1;
    }
    return this._options?.[name]?.[index];
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
   * @param {Number}  index     index of the song
   * @return {Boolean} true == SoX/external, false == spessasynth/internal
   */
  static externalEffectProcesser(index: number): boolean | undefined {
    const externalEffects = this._options.externalEffects;
    if (externalEffects === undefined) return;
    if (Number.isNaN(index)) index = externalEffects.length-1;

    return externalEffects[index];
  }
  /**
   * Adds a list of effects to a specific file
   * @param {Number} index - index of the file
   * @param {Array} arrayOfObjects - an array of object effects
   */
  static effects(index: number, arrayOfObjects: object[]): void {
    const _index = Number.isNaN(index) ? undefined : index;
    addIndexedProperties(this, [
      "effects", _index, arrayOfObjects,
      "externalEffects", _index, true
    ])
  }
  /**
   * Change reverb's volume of a specific file
   * @param {Number} index - index of the file's option
   * @param {Number} number - the volume value as a float or integer
   */
  static reverbVolume(index: number, number: number): void {
    const _index = !Number.isNaN(index) ? index : undefined;
    addIndexedProperties(this, [
      "reverbVolume", _index, number,
      "externalEffects", _index, false
    ])
  }
}

export const classes = [
  MainOptions, EffectsOptions
];

