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

const { spawnSync } = await import("child_process");
const {
  clearLastLines,
  formatStrings,
  runProgramSync,
  tryToInstall
} = await import("./utils/install_uninstall.mjs");

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
  } catch (e) {
    if (e.message !== "Program doesn't exist") {
      console.error(e)
      console.error(
        formatStrings.errorText,
        `There was an error while trying to check ${program}, exiting...`
      )
      process.exit(1)
    }
    console.warn(
      normalYellow+underline+"%s"+normal+normalYellow+" %s"+normal,
      program, "is not installed or it's not visible globally"
    )
    if (!readline) {
      readline = await import("readline/promises");
      ({ stdin, stdout, stderr } = process);
    }

    async function question() {
      let answer;
      try {
        const rl = readline.createInterface({ input: stdin, output: stdout });
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
        return tryToInstall(program, spawnSync, { stdout, stderr })
      }
      if (/^(?:n|no)$/i.test(answer)) {
        console.warn(normalYellow+noInstallMsg+normal)
      }
      clearLastLines(-1)
      return await question();
    }
    await question();
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

