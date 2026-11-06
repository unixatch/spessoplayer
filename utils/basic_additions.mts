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
 * Adds unshift functionality to Set
 * @return {Set} - an updated set with the values added on the left
 */
Set.prototype.addLeft = function (valueToAdd) {
  const newValue = new Set([valueToAdd]).union(this);
  this.clear()
  for (const value of newValue) this.add(value)
  return this;
}
/**
 * Adds value retrieval from given index functionality to Set
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
  if (!valueToFind) return this.values().next().value;
  for (const value of this.values()) {
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
  - let → const aggregate;
  - let → const copyProps;
  - propsToIgnore variable;
  - source → sourceToInclude;
  - new lines inside copyProps;
  - Added typescript types;
*/
type CopiedClass<T = {}> = { [P in keyof T]: T[P] }
type Constructor<T = {}> = abstract new (...args: any[]) => CopiedClass<T>
/**
 * Mixes a base class with other classes
 * so that it can be used to extend from all of them
 */
export default function Mixin<
  T extends Constructor, Y extends Constructor
>(base: T, source: Y): T & Y {
  /*  create aggregation class  */
  abstract class __Aggregate extends base {
    constructor (...args: any[]) {
      /*  call base class constructor  */
      super(...args)

      /*  call mixin's initializer  */
      if (typeof source.prototype.initializer === "function")
        source.prototype.initializer.apply(this, args)
    }
  };
  const aggregate = __Aggregate;

  const propsToIgnore = "initializer|constructor|prototype|"+
                        "arguments|caller|name|"+
                        "bind|call|apply|"+
                        "toString|"+
                        "length";
  /*  copy properties  */
  const copyProps = <T extends Constructor>(
    target: CopiedClass<T>, sourceToInclude: CopiedClass<T>
  ): void => {
    Object.getOwnPropertyNames(sourceToInclude)
      .concat(Object.getOwnPropertySymbols(sourceToInclude))
      .forEach((prop) => {
        if (prop.match(new RegExp(`^(?:${propsToIgnore})$`)))
            return;
        Object.defineProperty(
          target,
          prop,
          Object.getOwnPropertyDescriptor(sourceToInclude, prop)
        )
      })
  }

  /*  copy all properties of all mixins into aggregation class  */
  copyProps(aggregate.prototype, source.prototype)
  copyProps(aggregate, source)

  return aggregate as typeof aggregate & Y;
}

