# spessoplayer

## Description

This is a midi player/converter that uses the spessasynth_core package for maximum compatibility while also providing functionality

## Installation

```bash
$ npm install --global spessoplayer
```

You'll be prompted if you want to install ffmpeg (convertion of files) and SoX (effects) using your current package manager,

it is recommended to install both (they weigh *~10.2* MB combined)

## Basic usage

For printing to stdout:
```bash
$ spessoplayer midi.mid soundfont.sf2 -
```

For writing to file:
```bash
$ spessoplayer midi.mid soundfont.sf2 out.wav
```

for a more comprehensive look at all the options go to [COMMAND-LINE-OPTIONS](./COMMAND-LINE-OPTIONS.md)