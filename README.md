# spessoplayer

## Description

This is a midi player/converter that uses the spessasynth_core package for maximum compatibility while also providing functionality

## Installation

```bash
$ npm install --global spessoplayer
```

You'll be prompted if you want to install ffmpeg (conversion of files), SoX (effects) and mpv (player) using your current package manager,

it is recommended to install both (*mpv*/*ffmpeg* especially)

## Basic usage

Printing to stdout:
```bash
$ spessoplayer midi.mid soundfont.sf2 -
```

Writing to file:
```bash
$ spessoplayer midi.mid soundfont.sf2 out.wav
```

Playing audio directly (mpv required):
```bash
$ spessoplayer midi.md soundfont.sf2
```

For a more comprehensive look at all the options go to [COMMAND-LINE-OPTIONS](./COMMAND-LINE-OPTIONS.md)

