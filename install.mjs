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
    runProgramSync({ spawnSync, program })
  } catch {
    console.log("\x1b[33;4m"+program+"\x1b[0;33m is not installed or it's not visible globally"+"\x1b[0m");
    if (!readline) {
      readline = await import("readline/promises");
      ({ stdin, stdout, stderr } = await import ('process'));
    }
    
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const answer = await rl.question("Do you want to install it [Y|n]? ");
    rl.close()
    //                               ↓ In case it's neither y or n
    if (/(?:y|yes)/i.test(answer) || !/(?:n|no)/.test(answer)) {
      tryToInstall(program, spawnSync, { stdout, stderr })
    } else if (/(?:n|no)/.test(answer)) {
      console.log("\x1b[33m"+noInstallMsg+"\x1b[0m")
    }
  }
}
// ffmpeg check
await runCheck(
  "ffmpeg",
  "Continuing installation, but you'll get errors when trying to convert to other formats"
)
// SoX check
await runCheck(
  "sox",
  "Continuing installation, but you'll get errors when trying to add effects"
)
// mpv check
await runCheck(
  "mpv",
  "Continuing installation, but you'll get errors when trying to play songs directly"
)
export runCheck
