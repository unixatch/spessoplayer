## spessoplayer

### spessoplayer [options] \<midi\> \<soundfont\> [outFile]

### --volume, /volume,
#### &nbsp;&nbsp;-v, /v:
  Volume to set (*default: 100%*)

  Available formats:
  - **dB** (*example -10dB*);
  - **percentages** (*example 70%*);
  - **decimals** (*example 0.9*);

### --reverb-volume, /reverb-volume,
#### &nbsp;&nbsp;-rvb, /rvb:
  Volume to set for reverb (*default: none*)

  Same formats as volume

### --effects, /effects,
#### &nbsp;&nbsp;-e, /e:
Adds any effects that SoX provides (*e.g "reverb,fade 1"*)

### --loop, /loop,
#### &nbsp;&nbsp;-l, /l:
  Loop x amount of times (*default: 0*)

&nbsp;&nbsp;&nbsp;<sub>(It might be slow with bigger numbers)</sub>

### --loop-start, /loop-start,
#### &nbsp;&nbsp;-ls, /ls:
When the loop starts

### --loop-end, /loop-end,
#### &nbsp;&nbsp;-le, /le:
When the loop ends

### --sample-rate, /sample-rate,
#### &nbsp;&nbsp;-r, /r:
Sample rate to use (*default: 48000*)

&nbsp;&nbsp;&nbsp;<sub>(It might be slow with bigger numbers for players like mpv)</sub>

&nbsp;&nbsp;&nbsp;<sub>(Some players might downsize it to a smaller frequency)</sub>

### --format, /format,
#### &nbsp;&nbsp;-f, /f:
Format to use for stdout (*default: wav*)

Available formats:
- **wav**;
- **mp3**;
- **flac**;
- **pcm (s32le)**;

### --max-threads, /max-threads, --threads, /threads,
#### &nbsp;&nbsp;-mt, /mt, -T, /T:
Sets the amount of threads to use when writing to files.
Useful when you don't have much RAM

### --show-usage, /show-usage,
#### &nbsp;&nbsp;-U, /U:
Shows RAM usage and CPU time.
(Only works in file mode)

### --text-delay, /text-delay,
#### &nbsp;&nbsp;-d, /d:
Changes how fast it renders text.
(Only works in file mode)
NOTE: Going below the default will hurt performance

### --no-progress, /no-progress,
#### &nbsp;&nbsp;-np, /np:
Disables progress text rendering
(Only works in file mode)

### --ask, /ask, --confirm, /confirm,
#### &nbsp;&nbsp;-a, /a, -c, /c:
Asks for confirmation before proceeding

### --no-table, /no-table,
#### &nbsp;&nbsp;-nt, /nt:
When asking for confirmation,
it'll show the information in a JSON-like format instead of a table

### --dry-run, /dry-run, --test, /test, --null, /null,
#### &nbsp;&nbsp;-dr, /dr, -t, /t, -0, /0:
Runs the program as normal but
it'll write to /dev/null on unix and \\.\nul on windows.

Mainly used for testing purposes but
can be useful when trying to debug with log options

### --verbose, /verbose,
#### &nbsp;&nbsp;-v, /v:
Sets the verbosity (*default: 2*)

### --log-file, /log-file,
#### &nbsp;&nbsp;-lf, /lf:
Sets path to the log file (*default: ./spesso.log*)
&nbsp;&nbsp;&nbsp;<sub>(Meanwhile it writes to file, it also prints to stderr)</sub>

### --help, /help,
#### &nbsp;&nbsp;-h, /h, /?:
Shows this help message

### --version, /version
#### &nbsp;&nbsp;-V, /V:
Shows the installed version

