#!/usr/bin/env node
/*
  Copyright (C) 2026  unixatch

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

/**
 * @module uninstall
 */

const { spawnSync } = await import("child_process");
const {
  clearLastLines,
  runProgramSync,
  tryToUninstall,
} = await import("./utils/install_uninstall.mjs");

let readline,
    stdin,
    stdout,
    stderr;
/**
 * Checks if a program exists, if it doesn't exist,
 * it asks the user for confirmation to install via package managers
 * @param {String} program - the program to check
 * @param {String} [noUninstallMsg=""] - the message to show when the user refuses to install it
 */
async function runCheck(program, noUninstallMsg = "", questionOnly = false) {
  try {
    if (!questionOnly) runProgramSync({ spawnSync, program })

    if (!readline) {
      readline = await import("readline/promises");
      ({ stdin, stdout, stderr } = await import ("process"));
    }

    const rl = readline.createInterface({ input: stdin, output: stdout });
    const isSox = (program === "sox") ? "[Y|n]" : "[y|N]";
    const answer = await rl.question("Do you want to uninstall it " + isSox + "? ");
    rl.close()
    //      ↓ In case it's empty
    if (!/^\s*$/.test(answer)) {
      if (program === "sox") {
        return tryToUninstall(program, spawnSync, { stdout, stderr })
      }
      return console.warn(normalYellow + noUninstallMsg + normal)
    }
    if (/^(?:y|yes)$/i.test(answer)) {
      return tryToUninstall(program, spawnSync, { stdout, stderr })
    }
    if (/^(?:n|no)$/i.test(answer)) {
      console.warn(normalYellow + noUninstallMsg + normal)
    }
    clearLastLines([0, -1])
    return await runCheck(program, noUninstallMsg, true);
  } catch (e) {
    if (e.name === "AbortError") {
      console.error(`\n${gray}Uninstallation of dependencies interrupted with Ctrl+c${normal}`);
      process.exit(2)
    }
    if (e.message === "Program doesn't exist") {
      console.warn("\x1b[33;4m"+program+"\x1b[0;33m is not installed or it's not visible globally\x1b[0m")
      console.warn("\x1b[33mSkipping \x1b[4m"+program+"\x1b[0m")
      return;
    }
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

