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
 * Checks program existance synchronously
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

