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
 * Clears lines from the last line up
 * @param {Number} lineY - line before the cursor in negative
 * @throws {TypeError}   - if it's not a valid number
 * @example
 * // Clears only the last line
 * clearLastLines(-1)
 */
const clearLastLines = lineY => {
  if (typeof lineY !== "number" || isNaN(lineY)) {
    throw new TypeError("Didn't give a valid number")
  }
  const absoluteNumber = Math.abs(lineY);
  const upNLines = `\x1b[${absoluteNumber}F`,
        clearScreenDown = "\x1b[0J";

  process.stdout.write(upNLines + clearScreenDown)
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
    program, args,
    { stdio: stdioArray }
  )?.error?.code

  if (code === "ENOENT") {
    throw new ReferenceError("Program doesn't exist")
  } else return true
}
export const formatStrings = {
  errorText: red+"%s"+normal,
  noteText: normalYellow+"%s"+normal,
  warningText: yellow+"%s"+normal,
  grayedOutText: gray+"%s"+normal
};
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
  console.warn(
    formatStrings.warningText,
    "Couldn't find any package manager in the list"
  )
  console.warn(
    formatStrings.warningText,
    "install it either manually or with a package manager you use"
  )
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
  console.warn(
    formatStrings.warningText,
    "Couldn't find any package manager in the list"
  )
  console.warn(
    formatStrings.warningText,
    "uninstall it either manually or with a package manager you use"
  )
}
/**
 * Tries to install auto completion scripts on Unix
 * @param {String}  shell  shell to manage
 * @param {Boolean} isUnix if it's a unix os
 * @param {Boolean} [uninstall=false] if it should remove the symlink instead of adding it
 */
async function manageAutocomplete(shell, isUnix, uninstall = false) {
  if (!isUnix) return;

  const {
    existsSync, symlinkSync, unlinkSync
  } = await import("fs");
  const {
    env: { TERMUX__ROOTFS_DIR }
  } = process;

  // Managing paths
  const isZsh = shell === "zsh";
  const completionFolder = `${
    TERMUX__ROOTFS_DIR
      ? TERMUX__ROOTFS_DIR+"/usr" : "/usr"
  }/${
    isZsh
      ? "share/zsh/site-functions"
      : "share/bash-completion/completions"
  }`;
  const destination = completionFolder+"/"+(
    isZsh ? "_spessoplayer" : "spessoplayer"
  );

  if (!existsSync(destination)) {
    if (uninstall) return;
    symlinkSync(
      isZsh
        ? process.cwd() + "/zsh_completion"
        : process.cwd() + "/bash_completion",
      destination
    )
    return true;
  } else if (uninstall) {
    unlinkSync(destination)
    return true;
  }
}

export {
  clearLastLines,
  runProgramSync,
  tryToInstall,
  tryToUninstall,
  manageAutocomplete
}

