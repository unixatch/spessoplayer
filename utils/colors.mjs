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
 * @module utils/colors
 */

const esc = "\x1b[";
const colors = {
  // Custom formatting
  normal:        `${esc}0m`,
  bold:          `${esc}1m`,
  italics:       `${esc}3m`,
  underline:     `${esc}4m`,
  // Actual colors
  yellow:        `${esc}33;1m`,
  normalYellow:  `${esc}33m`,
  magenta:       `${esc}35m`,
  cyan:          `${esc}36m`,
  brightMagenta: `${esc}95m`,
  dimYellow:     `${esc}2;33m`,
  green:         `${esc}32m`,
  dimGreen:      `${esc}32;2m`,
  normalRed:     `${esc}31m`,
  red:           `${esc}31;1m`,
  dimRed:        `${esc}31;2m`,
  gray:          `${esc}90;1m`,
  dimGray:       `${esc}37;2m`,
  dimGrayBold:   `${esc}37;2;1m`
};

let colorDepth;
const { FORCE_COLOR, COLORTERM, TERM } = process.env;
/* Using part of node's code so that
   it doesn't need to wait for any imports,
   either from node internally or from here */
if (FORCE_COLOR !== undefined) {
  switch (FORCE_COLOR) {
    case '':
    case '1':
    case 'true':
      colorDepth = 4;
      break;
    case '2':
      colorDepth = 8;
      break;
    case '3':
      colorDepth = 24;
      break;
    default:
      colorDepth = 1;
  }
}
if (COLORTERM === "truecolor"
    || COLORTERM === "24bit"
    || TERM?.includes("truecolor")) colorDepth ??= 24;
if (TERM?.startsWith("xterm-256")) colorDepth ??= 8;
// If the above fails, let node check
colorDepth ??= (await import("tty")).WriteStream(1).getColorDepth();

// 256 color scheme
if (colorDepth === 8) {
  const esc256 = esc+"38;5;";
  colors.magenta =       `${esc256}164m`
  colors.brightMagenta = `${esc256}201m`
  colors.yellow =        `${esc256}184;1m`
  colors.normalYellow =  `${esc256}184m`
  colors.cyan =          `${esc256}39m`
  colors.green =         `${esc256}34m`
  colors.dimGreen =      `${esc256}28m`
  colors.normalRed =     `${esc256}124m`
  colors.red =           `${esc256}196m`
  colors.dimRed =        `${esc256}88m`
  colors.gray =          `${esc256}238m`
  colors.dimGray =       `${esc256}242m`
  colors.dimGrayBold =   `${esc256}254;2;1m`
}
// RGB color scheme
if (colorDepth === 24) {
  const escRGB = esc+"38;2;";
  colors.magenta =       `${escRGB}175;12;164m`
  colors.brightMagenta = `${escRGB}245;12;224m`
  colors.yellow =        `${escRGB}223;215;0;1m`
  colors.normalYellow =  `${escRGB}183;175;0m`
  colors.cyan =          `${escRGB}23;176;176m`
  colors.green =         `${escRGB}0;176;4m`
  colors.dimGreen =      `${escRGB}0;126;3m`
  colors.normalRed =     `${escRGB}185;0;0m`
  colors.red =           `${escRGB}235;0;0;1m`
  colors.dimRed =        `${escRGB}145;0;0m`
  colors.gray =          `${escRGB}124;124;124m`
  colors.dimGray =       `${escRGB}114;114;114m`
  colors.dimGrayBold =   `${escRGB}152;152;152;1m`
}
Object.assign(global, colors)

