## spessoplayer

### spessoplayer [options] \<midi\> \<soundfont\> [outFile]

### Ways to add files:

There are 2 main ways to add files:

- Using the _**input**_ parameter with/without an index;
- Using the group separator (**\\|** or _**"|"**_);

First option is for when you need
to really force the order of groups

Second option is more suitable for most common cases
and you should it try first
when the automatic order is not good enough

Here some examples:

    song.mid song2.mid soundfontfile.sf2

    song.mid song2.mid soundfontfile.sf2
    \| another_song.mid another_song2.mid another_soundfont.sf2

    -i song.mid -i song2.mid -i soundfontfile.sf2
    -i:2 song.mid -i:2 song2.mid -i:2 soundfontfile.sf2

### Parameter Indexes:

Each parameter can take an optional index
that points to each song's index ([:n])

The only exception is the input parameter
which instead points to a group index
(e.g. midi.mid and sf.sf2 as group 0 and so on)

If no index is provided, it can be:

  _0_ or the _last index_ of the parameter

**NOTE**: Some options in stdout mode don't let you choose an index
because it'd break audio players, like for example sample-rate

### Available parameters:

### --input[:n] **file**, /input[:n] **file**,
####   -i[:n] **file**, /i[:n] **file**:

Takes the following **file** and puts it in the list by n

### --volume[:n] **amount**, /volume[:n] **amount**,
####   -v[:n] **amount**, /v[:n] **amount**:

Volume to set (*default: 100%*)

Available formats:

- **dB** (*example -10dB*);
- **percentages** (*example 70%*);
- **decimals** (*example 0.9*);

### --reverb-volume[:n] **amount**, /reverb-volume[:n] **amount**,
####   -rvb[:n] **amount**, /rvb[:n] **amount**:

Volume to set for reverb

Same formats as volume but with different results
because it's a builtin effect

   <sub>(confilcts with --effects) (*default: none*)</sub>

### --effects[:n] **effects_list**, /effects[:n] **effects_list**,
####   -e[:n] **effects_list**, /e[:n] **effects_list**:

Adds any effects that SoX provides (*e.g "reverb,fade 1"*)

### --no-smooth-end[:n], /no-smooth-end[:n], --hard-stop[:n], /hard-stop[:n],
####   -nose[:n], /nose[:n], -hs[:n], /hs[:n]:

Disables the gradual/smooth effect
that is added at the end of the song

   <sub>(confilcts with a builtin effect such as *reverb-volume*)

### --loop[:n] **seconds**, /loop[:n] **seconds**,
####   -l[:n] **seconds**, /l[:n] **seconds**:

Loop x amount of times (*default: 0*)

   <sub>(It might be slow with bigger numbers)</sub>

### --loop-start[:n] **seconds**, /loop-start[:n] **seconds**,
####   -ls[:n] **seconds**, /ls[:n] **seconds**:

The loop will start after **seconds**

### --loop-end[:n] **seconds**, /loop-end[:n] **seconds**,
####   -le[:n] **seconds**, /le[:n] **seconds**:

The loop will restart at [-] **seconds** from the end

### --loop-fade, /loop-fade,
####   -lF, /lF:

It does 1 more loop on top of yours and
then it fades away slowly based on loop-fade-start

   <sub>(Doesn't work without the loop parameter turned on)</sub>

### --loop-fade-start[:n] **seconds**, /loop-fade-start[:n] **seconds**,
####   -lFs[:n] **seconds**, /lFs[:n] **seconds**:

When the loop fade starts (*default: 1*)

### --loop-fade-interpolation[:n] **type**, /loop-fade-interpolation[:n] **type**,
####   -lFi[:n] **type**, /lFi[:n] **type**:

How much the loop fade should last (*default: 4*)

### --sample-rate[:n] **samples**, /sample-rate[:n] **samples**,
####   -r[:n] **samples**, /r[:n] **samples**:

Sample rate to use (*default: 48000*)

   <sub>(It might be slow with bigger numbers for players like mpv)</sub>
   <sub>(Some players might downsize it to a smaller frequency)</sub>

### --format **format**, /format **format**,
####   -f **format**, /f **format**:

Format to use for stdout (*default: wav*)

Available formats:

- **wav**;
- **mp3**;
- **opus**;
- **flac**;
- **pcm (f32le)**;

### --max-threads **n**, /max-threads **n**, --threads **n**, /threads **n**,
####   -mt **n**, /mt **n**, -T **n**, /T **n**:

Sets the amount of threads to use when writing to files.

Useful when you don't have much RAM

### --show-usage, /show-usage,
####   -U, /U:

Shows RAM usage and CPU time. (Only works in file mode)

### --progress-delay **milliseconds**, /progress-delay **milliseconds**,
####   -d **milliseconds**, /d **milliseconds**:

Changes how fast it renders text. (*default: 500ms*)
(Only works in file mode)

NOTE: Going below the default will hurt performance

### --no-progress, /no-progress,
####   -np, /np:

Disables progress text rendering (Only works in file mode)

### --ask, /ask, --confirm, /confirm,
####   -a, /a, -c, /c:

Asks for confirmation before proceeding

### --no-table, /no-table,
####   -nt, /nt:

When asking for confirmation,
it'll show the information in a JSON-like format instead of a table

### --dry-run, /dry-run, --test, /test, --null, /null,
####   -dr, /dr, -t, /t, -0, /0:

Runs the program as normal
but it'll write to /dev/null on Unix and \\.\nul on windows.

Mainly used for testing purposes
but can be useful when trying to debug with log options

### --daemon, /daemon,
####   -D, /D:

Enables daemon mode (also known as a server)

### --verbose **n**, /verbose **n**,
####   -v **n**, /v **n**:

Sets the verbosity (*default: 2*)

### --enable-spessasynth[-warn\|-info]-logging:

Enables spessasynth's logging system,
basically only used for debugging.

It can be used in 2 ways:

- Info and warn enabled
- Only 1 of the two types enabled

### --log-file[=path], /log-file[=path],
####   -lf[=path], /lf[=path]:

Sets path to the log file (*default: ./spesso.log*)

   <sub>(Meanwhile it writes to file, it also prints to stderr)</sub>

### --help, /help,
####   -h, /h, /?:

Shows this help message

### --version, /version
####   -V, /V:

Shows the installed version

