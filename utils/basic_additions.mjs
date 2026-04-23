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
 * @module utils/basic_additions
 */

/**
 * Creates a new promise with
 * a pending state property attached to it
 * @param {Function} executor function that will be run just like new Promise
 * @return {Promise} a stateable promise
 */
Promise.stateable = function (func) {
  function runWithState(resolve, reject) {
    const done = () => newPromise.pending = false;
    func(
      value => (done(), resolve(value)),
      reason => (done(), reject(reason))
    )
  }
  const newPromise = new Promise(runWithState);
  newPromise.pending = true;
  return newPromise;
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
/**
 * Mixes a base class with other classes
 * so that it can be used to extend from all of them
 * @param {class}   base
 * @param {class[]} mixins
 * @return {class}
 */
export default function Mixin(base, mixins) {
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

