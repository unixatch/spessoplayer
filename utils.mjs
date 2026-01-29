/*
  Copyright (C) 2025  unixatch

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

import { join, parse } from "path"
import { fileURLToPath } from "url"

function declareColors() {
  // Custom formatting
  global.normal= "\x1b[0m"
  global.bold= "\x1b[1m"
  global.italics= "\x1b[3m"
  global.underline= "\x1b[4m"
  // Actual colors
  global.yellow= "\x1b[33;1m"
  global.normalYellow= "\x1b[33m"
  global.magenta= "\x1b[35m"
  global.brightMagenta= "\x1b[95m"
  global.dimYellow = "\x1b[2;33m"
  global.green= "\x1b[32m"
  global.dimGreen= "\x1b[32;2m"
  global.normalRed= "\x1b[31m"
  global.red= "\x1b[31;1m"
  global.normalRed= "\x1b[31m"
  global.dimRed= "\x1b[31;2m"
  global.gray= "\x1b[90;1m"
  global.dimGray= "\x1b[37;2m"
  global.dimGrayBold= "\x1b[37;2;1m"
}
declareColors()

/**
 * Clears lines from the last line up
 * @param {Number[]} lines - two numbers, x and y values
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
 * Runs program synchronously and throws a ReferenceError if it doesn't find it
 * @param {Object} obj - the obj passed
 * @param {Function} obj.spawnSync - child_process.spawnSync
 * @param {String} obj.program - program to find
 * @param {string[]} obj.args - optional arguments
 * @param {(string|string[])} obj.stdioArray - stdio to set for the process
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
/**
 * Logger
 * @param {Number} level - level of the log
 * @param {Number} time - time that it takes to creates this log
 * @param {string[]} ...messages - messages to print
 */
function log(level, time, ...messages) {
  const spacesAmount = new Date().toISOString().length + ((time+"").length + 7) + 2;
  const debugLevelSpesso = process.env["DEBUG_LEVEL_SPESSO"];
  const debugFileSpesso = process.env["DEBUG_FILE_SPESSO"];
  if (debugLevelSpesso
      && debugLevelSpesso <= level
      || global.verboseLevel <= level) {
    const message = [
      new Date(),
      "["+time+" ms]",
      messages
        .join("")
        // Place the header data on a new line with padding
        .replace(/header file (\d+)+/, "header file:\n"+" ".repeat(spacesAmount)+"$1")
        // Place the SoX arguments on a new line with padding
        .replace(/with (sox -t.*)/, "with:\n"+" ".repeat(spacesAmount)+"\"$1\"")
        // Place the ffmpeg arguments on a new line with padding
        .replace(/with (ffmpeg -i.*)/, "with:\n"+" ".repeat(spacesAmount)+"\"$1\"")
        // Add dimmed gray to the output
        .replace(/(.*)/s, `${dimGray}$1${normal}`)
    ];
    if (messages[0] === "Finished printing to stdout") message.unshift("\n")
    console.error(...message);
    const path = debugFileSpesso || global.logFilePath;
    if (path) {
      message[0] = message[0].toISOString();
      message[message.length-1] = message[message.length-1].replace(/\x1b\[.{1,10}m/, "")
      message.push("\n")
      fs.appendFileSync(path, message.join(" "))
    }
  }
}
/**
 * Returns a new path with a new number (adds 1) at the end of the filename
 * if necessary otherwise it returns the given path
 * @param {String} path - The path to parse and modify if needed
 * @example
 * // It'll return out1.wav
 *    newFileName("out.wav")
 * @example
 * // It'll return out2.wav
 *    newFileName("out1.wav")
 * @returns {String} The path, modified or not
 */
function newFileName(path) {
  if (fs.existsSync(path)) {
    const pathDir = parse(path).dir;
    const pathFileName = (parse(path).name.match(/[0-9]+$/g)?.length > 0)
      ? parse(path).name.replace(/[0-9]+$/, "")
      + (Number(parse(path).name.match(/[0-9]+$/g)[0]) + 1)
      : parse(path).name.replace(/[0-9]+$/, "") + 1;
    const pathExt = parse(path).ext;
    path = join(pathDir, pathFileName + pathExt);
    
    if (fs.existsSync(path)) return newFileName(path);
    return path;
  }
  return path;
}

/**
 * Simply returns the programs' current directory
 * @type {String}
 */
const _dirname_ = fileURLToPath(new URL(".", import.meta.url));
export {
  _dirname_,
  clearLastLines,
  runProgramSync,
  tryToInstall,
  tryToUninstall,
  log,
  newFileName
}
