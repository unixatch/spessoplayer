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
  global.dimRed= "\x1b[31;2m"
  global.gray= "\x1b[90;1m"
  global.dimGray= "\x1b[37;2m"
  global.dimGrayBold= "\x1b[37;2;1m"
}
declareColors()

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
  for (let packageManager of packageManagers) {
    switch (packageManager) {
      case "apt":
      case "dnf":
      case "yum":
      case "zypper":
      case "pkg":
      case "winget":
      case "brew":
        // Try...catch didn't work so i had to do this abomination
        if (
          spawnSync(
            packageManager,
            ["install", packageToUse],
            { stdio: ["pipe", stdout, stderr] }
          ).error?.code === "ENOENT"
        ) {
          break;
        } else return;
      case "pacman":
        if (
          spawnSync(
            packageManager,
            ["-S", packageToUse],
            { stdio: ["pipe", stdout, stderr] }
          ).error?.code === "ENOENT"
        ) {
          break;
        } else return;
      case "emerge":
        if (
          spawnSync(
            packageManager,
            ["--ask", "--verbose", packageToUse],
            { stdio: ["pipe", stdout, stderr] }
          ).error?.code === "ENOENT"
        ) {
          break;
        } else return;
      case "apk":
        if (
          spawnSync(
            packageManager,
            ["add", packageToUse],
            { stdio: ["pipe", stdout, stderr] }
          ).error?.code === "ENOENT"
        ) {
          break;
        } else return;
    }
  }
  console.log(`${yellow}Couldn't find any package manager in the list${normal}`)
  console.log(`${yellow}install it either manually or with a package manager you use${normal}`)
}

const _dirname_ = fileURLToPath(new URL('.', import.meta.url));
export {
  _dirname_,
  clearLastLines,
  tryToInstall
}