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
  modify({escape, colorsToUse}) {
    for (const [property, sequenceCode] of colorsToUse.values()) {
      this[property] = (
        escape +
        sequenceCode.replaceAll(" ", "") + "m"
      );
    }
  },
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
const {
  env: { FORCE_COLOR, COLORTERM, TERM }
} = process;
/* Using part of node's code so that
   it doesn't need to wait for any imports,
   either from node internally or from here */
if (FORCE_COLOR !== undefined) {
  switch (FORCE_COLOR) {
    case "":
    case "1":
    case "true":
      colorDepth = 4;
      break;
    case "2":
      colorDepth = 8;
      break;
    case "3":
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
  colors.modify({
    escape: esc+"38;5;",
    colorsToUse: [
      ["magenta",       "164"      ],
      ["brightMagenta", "201"      ],
      ["yellow",        "184; 1"   ],
      ["normalYello",   "184"      ],
      ["cyan",          "39"       ],
      ["green",         "34"       ],
      ["dimGreen",      "28"       ],
      ["normalRed",     "124"      ],
      ["red",           "196"      ],
      ["dimRed",        "88"       ],
      ["gray",          "238"      ],
      ["dimGray",       "242"      ],
      ["dimGrayBold",   "254; 2; 1"]
    ],
  })
}
// RGB color scheme
if (colorDepth === 24) {
  colors.modify({
    escape: esc+"38;2;",
    colorsToUse: [
      ["magenta",       "175;  12; 164"   ],
      ["brightMagenta", "245;  12; 224"   ],
      ["yellow",        "223; 215;   0; 1"],
      ["normalYello",   "183; 175;   0"   ],
      ["cyan",          "23;  176; 176"   ],
      ["green",         "0;   176;   4"   ],
      ["dimGreen",      "0;   126;   3"   ],
      ["normalRed",     "185;   0;   0"   ],
      ["red",           "235;   0;   0; 1"],
      ["dimRed",        "145;   0;   0"   ],
      ["gray",          "124; 124; 124"   ],
      ["dimGray",       "114; 114; 114"   ],
      ["dimGrayBold",   "152; 152; 152; 1"]
    ],
  })
}
delete colors.modify;
Object.assign(global, colors)

