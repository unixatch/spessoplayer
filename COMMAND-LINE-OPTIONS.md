## spessoplayer

### spessoplayer [options] \<midi\> \<soundfont\> [outFile]

### Parameter Indexes:

  Each parameter can take an optional index
  that points to each song's index ([n])

  The only exception is the input parameter
  which instead points to a group index
  (e.g. midi.mid and sf.sf2 as group 0 and so on)

  If no index is provided, it can be:

  _0_ or the _last index_ of the parameter

  **NOTE**: Some options in stdout mode don't let you
  choose an index because it'd break audio players,
  like for example sample-rate

### Available parameters:

### --input[n] **file**, /input[n] **file**,
#### -i[n] **file**, /i[n] **file**:
  Takes the following **file** and puts it in the list by n

### --volume[n] **amount**, /volume[n] **amount**,
#### &nbsp;&nbsp;-v[n] **amount**, /v[n] **amount**:
  Volume to set (*default: 100%*)

  Available formats:
  - **dB** (*example -10dB*);
  - **percentages** (*example 70%*);
  - **decimals** (*example 0.9*);

### --reverb-volume[n] **amount**, /reverb-volume[n] **amount**,
#### &nbsp;&nbsp;-rvb[n] **amount**, /rvb[n] **amount**:
Volume to set for reverb

Same formats as volume but with different results
because it's a builtin effect

&nbsp;&nbsp;&nbsp;<sub>(confilcts with --effects) (*default: none*)</sub>

### --effects **effects_list**, /effects **effects_list**,
#### &nbsp;&nbsp;-e **effects_list**, /e **effects_list**:
Adds any effects that SoX provides (*e.g "reverb,fade 1"*)

### --no-smooth-end[n], /no-smooth-end[n], --hard-stop[n], /hard-stop[n],
#### &nbsp;&nbsp;-nose[n], /nose[n], -hs[n], /hs[n]:
Disables the gradual/smooth effect
that is added at the end of the song

&nbsp;&nbsp;&nbsp;<sub>(confilcts with a builtin effect such as *reverb-volume*)

### --loop[n] **seconds**, /loop[n] **seconds**,
#### &nbsp;&nbsp;-l[n] **seconds**, /l[n] **seconds**:
  Loop x amount of times (*default: 0*)

&nbsp;&nbsp;&nbsp;<sub>(It might be slow with bigger numbers)</sub>

### --loop-start[n] **seconds**, /loop-start[n] **seconds**,
#### &nbsp;&nbsp;-ls[n] **seconds**, /ls[n] **seconds**:
The loop will start after **seconds**

### --loop-end[n] **seconds**, /loop-end[n] **seconds**,
#### &nbsp;&nbsp;-le[n] **seconds**, /le[n] **seconds**:
The loop will restart at [-] **seconds** from the end

### --loop-fade, /loop-fade,
#### &nbsp;&nbsp;-lF, /lF:
It does 1 more loop on top of yours
and then it fades away slowly based on loop-fade-start

&nbsp;&nbsp;&nbsp;<sub>(Doesn't work without the loop parameter turned on)</sub>

### --loop-fade-start[n] **seconds**, /loop-fade-start[n] **seconds**,
#### &nbsp;&nbsp;-lFs[n] **seconds**, /lFs[n] **seconds**:
When the loop fade starts (*default: 1*)

### --loop-fade-interpolation[n] **type**, /loop-fade-interpolation[n] **type**,
#### &nbsp;&nbsp;-lFi[n] **type**, /lFi[n] **type**:
How much the loop fade should last (*default: 4*)

### --sample-rate[n] **samples**, /sample-rate[n] **samples**,
#### &nbsp;&nbsp;-r[n] **samples**, /r[n] **samples**:
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

### --progress-delay **milliseconds**, /progress-delay **milliseconds**,
#### &nbsp;&nbsp;-d **milliseconds**, /d **milliseconds**:
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

### --daemon, /daemon,
#### &nbsp;&nbsp;-D, /D:
Enables daemon mode (also known as a server)

### --verbose **n**, /verbose **n**,
#### &nbsp;&nbsp;-v **n**, /v **n**:
Sets the verbosity (*default: 2*)

### --enable-spessasynth[-warn|-info]-logging:
Enables spessasynth's logging system,
basically only used for debugging.

It can be used in 2 ways:
- Info and warn enabled
- Only 1 of the two types enabled

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

