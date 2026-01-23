#!/usr/bin/env node
/*
  Copyright (C) 2025  unixatch

    it under the terms of the GNU General Public License as published by
    This program is free software: you can redistribute it and/or modify
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with spessoplayer.  If not, see <https://www.gnu.org/licenses/>.
*/

const { spawnSync } = await import("child_process");
const { runProgramSync, tryToInstall } = await import("./utils.mjs");

let readline,
    stdin,
    stdout,
    stderr;
/**
 * Checks if a program exists, if it doesn't exist,
 * it asks the user for confirmation to install via package managers
 * @param {String} program - the program to check
 * @param {String} [noInstallMsg=""] - the message to show when the user refuses to install it
 */
async function runCheck(program, noInstallMsg = "") {
  try {
    if (!readline) {
      readline = await import("readline/promises");
      ({ stdin, stdout, stderr } = await import ('process'));
    }
    
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const answer = await rl.question("Do you want to uninstall it [Y|n]? ");
    rl.close()
    //                               ↓ In case it's neither y or n
    if (/(?:y|yes)/i.test(answer) || !/(?:n|no)/.test(answer)) {
      tryToUnInstall(program, spawnSync, { stdout, stderr })
    } else if (/(?:n|no)/.test(answer)) {
      console.log("\x1b[33m"+noInstallMsg+"\x1b[0m")
    }
  } catch (e) {
    console.error(e);
    process.exit(1)
  }
}
// ffmpeg check
await runCheck(
  "ffmpeg",
  "Continuing uninstallation, keeping ffmpeg"
)
// SoX check
await runCheck(
  "sox",
  "Continuing uninstallation, keeping SoX"
)
// mpv check
await runCheck(
  "mpv",
  "Continuing uninstallation, keeping mpv"
)
export runCheck
