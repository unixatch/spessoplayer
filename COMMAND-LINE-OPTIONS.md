## spessoplayer

### spessoplayer [options] \<midi\> \<soundfont\> [outFile]

### --volume, /volume, -v, /v:
  Volume to set (*default: 100%*)

  Available formats:
  - **dB** (*example -10dB*);
  - **percentages** (*example 70%*);
  - **decimals** (*example 0.9*);

### --reverb-volume, /reverb-volume, -rvb, /rvb:
  Volume to set for reverb (*default: none*)
  
  Same formats as volume

### --effects, /effects, -e, /e: 
Adds any effects that SoX provides (*e.g "reverb,fade 1"*)

### --loop, /loop, -l, /l:
  Loop x amount of times (*default: 0*)

&nbsp;&nbsp;&nbsp;<sub>(It might be slow with bigger numbers)</sub>

### --loop-start, /loop-start, -ls, /ls:
When the loop starts

### --loop-end, /loop-end, -le, /le:
When the loop ends

### --sample-rate, /sample-rate, -r, /r:
Sample rate to use (*default: 48000*)

&nbsp;&nbsp;&nbsp;<sub>(It might be slow with bigger numbers for players like mpv)</sub>

&nbsp;&nbsp;&nbsp;<sub>(Some players might downsize it to a smaller frequency)</sub>

### --format, /format, -f, /f:
Format to use for stdout (*default: wav*)

Available formats:
- **wav**;
- **mp3**;
- **flac**;
- **pcm (s32le)**;

### --verbose, /verbose, -v, /v:
Sets the verbosity (*default: 2*)

### --log-file, /log-file, -lf, /lf:
Sets path to the log file (*default: ./spesso.log*)
&nbsp;&nbsp;&nbsp;<sub>(Meanwhile it writes to file, it also prints to stderr)</sub>

### --help, /help, -h, /h, /?:
Shows this help message

### --version, /version:
Shows the installed version