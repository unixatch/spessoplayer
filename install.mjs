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
 * @module install
 */

import { spawnSync } from "child_process"
import {
  clearLastLines,
  formatStrings,
  runProgramSync,
  tryToInstall,
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
 * @param {String} [noInstallMsg=""] - the message to show when the user refuses to install it
 */
async function runCheck(program, noInstallMsg = "") {
  let exists = true;
  try {
    runProgramSync({ spawnSync, program })
  } catch (e) {
    if (e.message !== "Program doesn't exist") {
      console.error(e)
      console.error(
        formatStrings.errorText,
        `There was an error while trying to check ${program}, exiting...`
      )
      process.exit(1)
    }
    exists = false;
  }
  if (exists) return;

  console.warn(
    normalYellow+underline+"%s"+normal+normalYellow+" %s"+normal,
    program, "is not installed or it's not visible globally"
  )
  readline ??= await import("readline/promises");

  async function question() {
    let answer;
    try {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      answer = await rl.question("Do you want to install it [Y|n]? ");
      rl.close()
    } catch (e2) {
      if (e2.name === "AbortError") {
        console.error(
          formatStrings.grayedOutText,
          "\nInstallation of dependencies interrupted with Ctrl+c"
        )
        process.exit(2)
      }
    }
    //                                    ↓ In case it's empty
    if (/^(?:y|yes)$/i.test(answer) || /^\s*$/.test(answer)) {
      return tryToInstall(program, spawnSync, {
        stdout: process.stdout, stderr: process.stderr
      })
    }
    if (/^(?:n|no)$/i.test(answer)) {
      console.warn(normalYellow+noInstallMsg+normal)
    }
    clearLastLines(-1)
    return await question();
  }
  await question();
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

// Auto-complete installation
const { platform } = process;
const isUnix = (
  platform === "darwin"  ||
  platform === "linux"   ||
  platform === "android"
);
let zshFailed = false;
const autoCompleteErrorMessageFormat = `${gray}%s ${underline}%s${normal+gray} %s${normal}`,
      installedMessageFormat = `${green}[autocomplete]: Successfully installed ${underline}%s${normal+green} auto-completion${normal}`,
      existingInstallationMessageFormat = `${normalYellow}[autocomplete]: ${underline}%s${normal+normalYellow} auto-completion already installed${normal}`;

/**
 * Manages errors that occur in the try block
 * @param {String} shell   shell being checked
 * @param {Error}  error   Error object
 * @param {String} message message to print
 */
function manageAutocompleteErrors(shell, error, message) {
  if (error.message !== "Program doesn't exist") {
    console.error(formatStrings.errorText, error)
    process.exit(1)
  }
  if (!isUnix) return;

  console.error(autoCompleteErrorMessageFormat,
    "[autocomplete]:", shell, message
  )
  if (shell === "zsh") zshFailed = true;
}

// zsh auto-complete
try {
  runProgramSync({ spawnSync, program: "zsh" })
  if (await manageAutocomplete("zsh", isUnix)) {
    console.log(installedMessageFormat, "zsh")
  } else {
    console.log(existingInstallationMessageFormat, "zsh")
  }
} catch (error) {
  manageAutocompleteErrors("zsh", error,
    "was not found, moving on to bash..."
  )
}
// bash auto-complete
try {
  runProgramSync({ spawnSync, program: "bash" })
  if (await manageAutocomplete("bash", isUnix)) {
    console.log(installedMessageFormat, "bash")
  } else {
    console.log(existingInstallationMessageFormat, "bash")
  }
} catch (error) {
  manageAutocompleteErrors("bash", error,
    `was not found${
      zshFailed
        ? ", no autocomplete will be installed"
        : ""
    }`
  )
}

