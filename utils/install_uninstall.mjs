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
 * @module utils/install_uninstall
 */

import "./colors.mjs"

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
 * Checks program existence synchronously
 * @param {Object} obj - the obj passed
 * @param {Function} obj.spawnSync - child_process.spawnSync
 * @param {String} obj.program - program to find
 * @param {string[]} obj.args - optional arguments
 * @param {(string|string[])} obj.stdioArray - stdio to set for the process
 * @throws {ReferenceError} - if it can't find the program requested
 */
function runProgramSync({ spawnSync, program, args = [], stdioArray = "pipe" }) {
  const code = spawnSync(
    program,
    args,
    { stdio: stdioArray }
  )?.error?.code

  if (code === "ENOENT") {
    throw new ReferenceError("Program doesn't exist")
  } else return true
}
/**
 * Tries to check and install the program via a package manager
 * @param {String} packageToUse - package to search and install
 * @param {Function} spawnSync - child_process.spawnSync
 * @param {Object} stdioObj - object passed for stdout and stderr
 * @param {Writable} obj.stdout - process' stdout
 * @param {Writable} obj.stderr - process' stderr
 */
function tryToInstall(packageToUse, spawnSync, { stdout, stderr }) {
  const packageManagers = [
    "apt",
    "dnf",
    "yum",
    "zypper",
    "pacman",
    "emerge",
    "pkg",
    "winget",
    "brew",
    "rpm",
    "apk"
  ];
  for (const packageManager of packageManagers) {
    switch (packageManager) {
      case "apt":
      case "dnf":
      case "yum":
      case "zypper":
      case "pkg":
      case "winget":
      case "brew":
        try {
          return runProgramSync({
            spawnSync,
            program: packageManager,
            args: ["install", packageToUse],
            stdioArray: ["pipe", stdout, stderr]
          })
        } catch { break; }
      case "pacman":
        try {
          return runProgramSync({
            spawnSync,
            program: packageManager,
            args: ["-S", packageToUse],
            stdioArray: ["pipe", stdout, stderr]
          })
        } catch { break; }
      case "emerge":
        try {
          return runProgramSync({
            spawnSync,
            program: packageManager,
            args: ["--ask", "--verbose", packageToUse],
            stdioArray: ["pipe", stdout, stderr]
          })
        } catch { break; }
      case "apk":
        try {
          return runProgramSync({
            spawnSync,
            program: packageManager,
            args: ["add", packageToUse],
            stdioArray: ["pipe", stdout, stderr]
          })
        } catch { break; }
    }
  }
  console.warn(`${yellow}Couldn't find any package manager in the list${normal}`)
  console.warn(`${yellow}install it either manually or with a package manager you use${normal}`)
}
/**
 * Tries to check and uninstall the program via a package manager
 * @param {String} packageToUse - package to search and install
 * @param {Function} spawnSync - child_process.spawnSync
 * @param {Object} stdioObj - object passed for stdout and stderr
 * @param {Writable} obj.stdout - process' stdout
 * @param {Writable} obj.stderr - process' stderr
 */
function tryToUninstall(packageToUse, spawnSync, { stdout, stderr }) {
  const packageManagers = [
    "apt",
    "dnf",
    "yum",
    "zypper",
    "pacman",
    "emerge",
    "pkg",
    "winget",
    "brew",
    "rpm",
    "apk"
  ];
  for (const packageManager of packageManagers) {
    switch (packageManager) {
      case "apt":
      case "dnf":
      case "yum":
      case "zypper":
        try {
          return runProgramSync({
            spawnSync,
            program: packageManager,
            args: ["remove", packageToUse],
            stdioArray: ["pipe", stdout, stderr]
          })
        } catch { break; }
      case "pkg":
      case "winget":
      case "brew":
        try {
          return runProgramSync({
            spawnSync,
            program: packageManager,
            args: ["uninstall", packageToUse],
            stdioArray: ["pipe", stdout, stderr]
          })
        } catch { break; }
      case "pacman":
        try {
          return runProgramSync({
            spawnSync,
            program: packageManager,
            args: ["-Rs", packageToUse],
            stdioArray: ["pipe", stdout, stderr]
          })
        } catch { break; }
      case "emerge":
        try {
          return runProgramSync({
            spawnSync,
            program: packageManager,
            args: ["--ask", "--verbose", "--depclean", packageToUse],
            stdioArray: ["pipe", stdout, stderr]
          })
        } catch { break; }
      case "apk":
        try {
          return runProgramSync({
            spawnSync,
            program: packageManager,
            args: ["del", packageToUse],
            stdioArray: ["pipe", stdout, stderr]
          })
        } catch { break; }
    }
  }
  console.warn(`${yellow}Couldn't find any package manager in the list${normal}`)
  console.warn(`${yellow}uninstall it either manually or with a package manager you use${normal}`)
}

export {
  runProgramSync,
  tryToInstall,
  tryToUninstall
}

