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

import { spawnSync } from "child_process"
import {
  clearLastLines,
  formatStrings,
  runProgramSync,
  tryToUninstall,
  manageAutocomplete
} from "./utils/install_uninstall.mjs"

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

    readline ??= await import("readline/promises");
    const rl = readline.createInterface({
      input: process.stdin, output: process.stdout
    });
    const isSox = (program === "sox") ? "[Y|n]" : "[y|N]";
    const answer = await rl.question(
      `[${underline+program+normal}]: Do you want to uninstall it ${isSox}? `
    );
    rl.close()

    switch (answer.trim().toLowerCase()) {
      case "y": case "yes":
        return tryToUninstall(program, spawnSync, {
          stdout: process.stdout, stderr: process.stderr
        });
      case "n": case "no":
        return console.warn(normalYellow + noUninstallMsg + normal);

      case "":
        // In case it's empty
        if (program === "sox") {
          return tryToUninstall(program, spawnSync, {
            stdout: process.stdout, stderr: process.stderr
          });
        }
        return console.warn(normalYellow + noUninstallMsg + normal)
    }
    clearLastLines(-1)
    return await runCheck(program, noUninstallMsg, true);
  } catch (e) {
    if (e.name === "AbortError") {
      console.error(
        formatStrings.grayedOutText,
        "\nUninstallation of dependencies interrupted with Ctrl+c"
      )
      process.exit(2)
    }
    if (e.message === "Program doesn't exist") {
      const unrecognisedProgramFormat = `${normalYellow+underline}%s${normal+normalYellow} %s${normal}`;
      console.warn(
        unrecognisedProgramFormat,
        program, "is not installed or it's not visible globally"
      )
      const skipFormat = `${normalYellow}%s ${underline}%s${normal}`;
      console.warn(skipFormat, "Skipping", program)
      return;
    }
    console.error(e)
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

// Auto-complete installation
const { platform } = process;
const isUnix = (
  platform === "darwin"  ||
  platform === "linux"   ||
  platform === "android"
);
const removedMessageFormat = `${green}[autocomplete]: Successfully uninstalled ${underline}%s${normal+green} auto-completion${normal}`;
if (await manageAutocomplete("zsh",  isUnix, true)) {
  console.log(removedMessageFormat, "zsh")
}
if (await manageAutocomplete("bash", isUnix, true)) {
  console.log(removedMessageFormat, "bash")
}

