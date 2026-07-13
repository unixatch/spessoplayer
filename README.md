# spessoplayer

## Description

This is a midi player/converter that uses the spessasynth_core package for maximum compatibility while also providing functionality

## Installation

For better performance:
```bash
deno install --global --node-modules-dir \
    --allow-scripts=npm:spessoplayer \
    --allow-run="sox,ffmpeg,bash,zsh" --allow-env spessoplayer
echo 'export PATH="$HOME/.deno/bin:$PATH"' >> ~/.bashrc
```
or you can use npm/node:
```bash
npm install --global spessoplayer
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

Starting a server (daemon mode):
```bash
$ spessoplayer --daemon midi.md soundfont.sf2
```

For a more comprehensive look at all the options go to [COMMAND-LINE-OPTIONS](./COMMAND-LINE-OPTIONS.md)

<!-- !!! Note -->

**NOTE**: For deno, you'll need to give it some permissions:
- _env_ (color detection, log verbosity and log file path);
- _run_ (format convertions or sox effects);
- _sys_ (when using file mode for creating threads);
- _read_ (read provided files);
- _net_ (to create a localhost server for communicating with mpv);

The format is like --allow-\<permission\>

