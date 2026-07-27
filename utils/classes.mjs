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

    that._manageOption({ property, index, value }, true, true)
    i -= 2;
  }
}

/**
 * Main options class that contains general options
 * @mixin MainOptions
 */
class MainOptions {
  static addIndexedStringValue(name, index, value) {
    checkValue(index, "number")
    if (name === "hardStop") value = true;

    this._manageOption({
      property: name,
      index: !Number.isNaN(index) ? index : undefined,
      value
    }, true, true);
  }
  static addIndexedNumberValue  = this.addIndexedStringValue;
  static addIndexedBooleanValue = this.addIndexedStringValue;

  static addBooleanValue(name, value) {
    if (name === "daemon") value = true;
    if (name === "dryRun") value = "";

    this._manageOption({ property: name, value })
  }
  static addStringValue = this.addBooleanValue;

  static addNumberValue(name, value) {
    let isSetter;
    switch (name) {
      case "progressDelay": case "maxThreads":
      case "sampleRate":
        isSetter = true;
    }
    this._manageOption({
      property: name, value, setter: isSetter
    })
  }
  static getValue(name) {
    return this._manageOption({ property: name }, false);
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
    checkValue(index, "number")
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
    this._manageOption({
      property: "stdoutEffects",
      value: arrayOfObjects, setter: true
    })
    this._manageOption({
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
    checkValue(index, "number")
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

