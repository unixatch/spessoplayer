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
// ffmpeg check
try {
  runProgramSync({ spawnSync, program: "ffmpeg" })
} catch (e) {
  console.log("\x1b[33;4m"+"ffmpeg"+"\x1b[0;33m is not installed or it's not visible globally"+"\x1b[0m");
  if (!readline) {
    readline = await import("readline/promises");
    ({ stdin, stdout, stderr } = await import ('process'));
  }
  
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question("Do you want to install it [Y|n]? ");
  rl.close()
  //                               ↓ In case it's neither y or n
  if (/(?:y|yes)/i.test(answer) || !/(?:n|no)/.test(answer)) {
    tryToInstall("ffmpeg", spawnSync, { stdout, stderr })
  } else if (/(?:n|no)/.test(answer)) {
    console.log("\x1b[33m"+"Continuing installation, but you'll get errors when trying to convert to other formats"+"\x1b[0m")
  }
}
// SoX check
try {
  runProgramSync({ spawnSync, program: "sox" })
} catch (e) {
  console.log("\x1b[33;4m"+"sox"+"\x1b[0;33m is not installed or it's not visible globally"+"\x1b[0m");
  if (!readline) {
    readline = await import("readline/promises");
    ({ stdin, stdout, stderr } = await import ('process'));
  }
  
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question("Do you want to install it [Y|n]? ");
  rl.close()
  //                               ↓ In case it's neither y or n
  if (/(?:y|yes)/i.test(answer) || !/(?:n|no)/.test(answer)) {
    tryToInstall("sox", spawnSync, { stdout, stderr })
  } else if (/(?:n|no)/.test(answer)) {
    console.log("\x1b[33m"+"Continuing installation, but you'll get errors when trying to add effects"+"\x1b[0m")
  }
}
