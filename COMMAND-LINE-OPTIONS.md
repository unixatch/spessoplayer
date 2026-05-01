## spessoplayer

### spessoplayer [options] \<midi\> \<soundfont\> [outFile]

### --volume[n], /volume[n],
#### &nbsp;&nbsp;-v[n], /v[n]:
  Volume to set (*default: 100%*)

  Available formats:
  - **dB** (*example -10dB*);
  - **percentages** (*example 70%*);
  - **decimals** (*example 0.9*);

### --reverb-volume[n], /reverb-volume[n],
#### &nbsp;&nbsp;-rvb[n], /rvb[n]:
  Volume to set for reverb (*default: none*)

  Same formats as volume

### --effects **effects_list**, /effects **effects_list**,
#### &nbsp;&nbsp;-e **effects_list**, /e **effects_list**:
Adds any effects that SoX provides (*e.g "reverb,fade 1"*)

### --loop[n], /loop[n],
#### &nbsp;&nbsp;-l[n], /l[n]:
  Loop x amount of times (*default: 0*)

&nbsp;&nbsp;&nbsp;<sub>(It might be slow with bigger numbers)</sub>

### --loop-start[n], /loop-start[n],
#### &nbsp;&nbsp;-ls[n], /ls[n]:
When the loop starts

### --loop-end[n], /loop-end[n],
#### &nbsp;&nbsp;-le[n], /le[n]:
When the loop ends

### --sample-rate[n], /sample-rate[n],
#### &nbsp;&nbsp;-r[n], /r[n]:
Sample rate to use (*default: 48000*)

&nbsp;&nbsp;&nbsp;<sub>(It might be slow with bigger numbers for players like mpv)</sub>

&nbsp;&nbsp;&nbsp;<sub>(Some players might downsize it to a smaller frequency)</sub>

### --format **format**, /format **format**,
#### &nbsp;&nbsp;-f **format**, /f **format**:
Format to use for stdout (*default: wav*)

Available formats:
- **wav**;
- **mp3**;
- **flac**;
- **pcm (f32le)**;

### --max-threads **n**, /max-threads **n**, --threads **n**, /threads **n**,
#### &nbsp;&nbsp;-mt **n**, /mt **n**, -T **n**, /T **n**:
Sets the amount of threads to use when writing to files.
Useful when you don't have much RAM

### --show-usage, /show-usage,
#### &nbsp;&nbsp;-U, /U:
Shows RAM usage and CPU time.
(Only works in file mode)

### --text-delay[=n], /text-delay[=n],
#### &nbsp;&nbsp;-d[=n], /d[=n]:
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
it'll write to /dev/null on Unix and \\.\nul on windows.

Mainly used for testing purposes but
can be useful when trying to debug with log options

### --verbose **n**, /verbose **n**,
#### &nbsp;&nbsp;-v **n**, /v **n**:
Sets the verbosity (*default: 2*)

### --log-file[=path], /log-file[=path],
#### &nbsp;&nbsp;-lf[=path], /lf[=path]:
Sets path to the log file (*default: ./spesso.log*)
&nbsp;&nbsp;&nbsp;<sub>(Meanwhile it writes to file, it also prints to stderr)</sub>

### --help, /help,
#### &nbsp;&nbsp;-h, /h, /?:
Shows this help message

### --version, /version
#### &nbsp;&nbsp;-V, /V:
Shows the installed version

