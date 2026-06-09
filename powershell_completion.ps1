# Copyright (C) 2026  unixatch
#
#   it under the terms of the GNU General Public License as published by
#   This program is free software: you can redistribute it and/or modify
#   the Free Software Foundation, either version 3 of the License, or
#   (at your option) any later version.
#
#   This program is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#   GNU General Public License for more details.
#
#   You should have received a copy of the GNU General Public License
#   along with spessoplayer.  If not, see <https://www.gnu.org/licenses/>.
#

[scriptblock] $ScriptBlock = {
    param( $wordToComplete, $commandAst )

    function getCustomValue($type) {
        # The argument that comes right after the parameter
        # like -vol <tab>

        switch ($type) {
            "verbose"    { return 0..3      }
            "volume"     { return 0..100    }
            "seconds"    { return 0..10     }
            "threads"    { return 1..16     }
            "sampleRate" { return 0..96000  }
            "textDelay"  { return 50..10000 }
            "sampleRate" { return 0..96000  }
            "format" {
                return @(
                    "wav",
                    "flac", "mp3",
                    "pcm",  "f32le"
                )
            }
            "effects" {
                return @(
                    "firfit",      "flanger",    "bass",
                    "loudness",    "lowpass",    "compand",
                    "mcompand",    "noiseprof",  "dither",
                    "allpass",     "band",       "echos",
                    "bandpass",    "bandreject", "fir",
                    "bend",        "biquad",     "ladspa",
                    "chorus",      "channels",   "overdrive",
                    "contrast",    "dcshift",    "remix",
                    "deemph",      "delay",      "sinc",
                    "divide",      "downsample", "stats",
                    "earwax",      "echo",       "treble",
                    "equalizer",   "fade",       "vol",
                    "gain",        "highpass",   "repeat",
                    "hilbert",     "input",
                    "noisered",    "norm",
                    "oops",        "output",
                    "pad",         "phaser",
                    "pitch",       "rate",
                    "reverb",      "reverse",
                    "riaa",        "silence",
                    "spectrogram", "speed",
                    "splice",      "stat",
                    "stretch",     "swap",
                    "synth",       "tempo",
                    "tremolo",     "trim",
                    "upsample",    "vad"
                )
            }
        }
    }
    function createCompletion($list, $lastValue, $toolTip) {
        if ($list -isnot [array]) {throw "No valid array was provided"}

        $list.Where({
            $_ -like "$($lastValue ? $lastValue : $_)*"
        }) | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new(
                $_, $_, "ParameterValue",
                $ToolTip
            )
        }
    }

    [array]  $parameters = $commandAst -split " "
    [int32]  $paramCount = $parameters.Count
    [string] $lastParameter = $parameters[$paramCount-1]
    [string] $lastValue = $lastParameter
    <#
      It might see it as a value
      when in reality it's the parameter,
        so if necessary use nothing instead
    #>
    [string] $actualLastValue = ( `
        $lastValue -like "-*" `
            ? "" : $lastValue `
    )
    # Might be the same value but not yet complete
    # so use the one before it
    if ($lastParameter -notlike "-*") {
        $lastParameter = $parameters[$paramCount-2]
    }

    $listToPass = $null
    $toolTipToPass = $null
    switch -Regex ($lastParameter) {
        '^(--verbose[0-9]*|-v[0-9]*)$' {
            [array] $listToPass = getCustomValue verbose
            [string] $toolTipToPass = "Verbosity levels"
            break
        }
        '^(--loop[0-9]*|-l[0-9]*|--loop-start[0-9]*|-ls[0-9]*|--loop-end[0-9]*|-le[0-9]*|--loop-fade-start[0-9]*|-lFs[0-9]*|--loop-fade-duration[0-9]*|-lFd[0-9]*)$'
        {
            [array] $listToPass = getCustomValue seconds
            [string] $toolTipToPass = "Seconds"
            break
        }
        '^(--threads[0-9]*|-T[0-9]*|--max-threads[0-9]*|-mt[0-9]*)$' {
            [array] $listToPass = getCustomValue threads
            [string] $toolTipToPass = "Thread"
            break
        }
        '^(--sample-rate[0-9]*|-r[0-9]*)$' {
            [array] $listToPass = getCustomValue sampleRate
            [string] $toolTipToPass = "Sample rate"
            break
        }
        '^(--text-delay[0-9]*|-d[0-9]*)$' {
            [array] $listToPass = getCustomValue textDelay
            [string] $toolTipToPass = "Milliseconds"
            break
        }
        '^(--volume[0-9]*|-vol[0-9]*|--reverb-volume[0-9]*|-rvb[0-9]*)$'
        {
            [array] $listToPass = getCustomValue volume
            [string] $toolTipToPass = "Volume number"
            break
        }
        '^(--format[0-9]*|-f[0-9]*)$' {
            [array] $listToPass = getCustomValue format
            [string] $toolTipToPass = "Format"
            break
        }
        '^(--effects[0-9]*|-e[0-9]*)$' {
            [array] $listToPass = getCustomValue effects
            [string] $toolTipToPass = "SoX effect"
            break
        }
    }
    if ($listToPass) {
        createCompletion `
            -list $listToPass `
            -lastValue $actualLastValue `
            -toolTip $toolTipToPass
        return
    }

    $Options = @(
        @{
            CompletionText = "--input", "-i"
            ToolTip = "Takes the following file and puts it in the list by n"
        },
        @{
            CompletionText = "--volume", "-vol"
            ToolTip = "Volume to set (default: 100%) (formats: dB, percentages, decimals)"
        },
        @{
            CompletionText = "--reverb-volume", "-rvb"
            ToolTip = "Volume to set for reverb (default: none)"
        },
        @{
            CompletionText = "--effects", "-e"
            ToolTip = "Adds any effects that SoX provides (e.g 'reverb,fade 1')"
        },
        @{
            CompletionText = "--loop", "-l"
            ToolTip = "Loop x amount of times (default: 0)"
        },
        @{
            CompletionText = "--loop-start", "-ls"
            ToolTip = "The loop will start after seconds"
        },
        @{
            CompletionText = "--loop-end", "-le"
            ToolTip = "The loop will restart at [-]seconds from the end"
        },
        @{
            CompletionText = "--loop-fade", "-lF"
            ToolTip = "It does 1 more loop on top of yours and then it fades away slowly based on loop-fade-start (Doesn""""t work without the loop parameter turned on)"
        },
        @{
            CompletionText = "--loop-fade-start", "-lFs"
            ToolTip = "When the loop fade starts (default: 1)"
        },
        @{
            CompletionText = "--loop-fade-duration", "-lFd"
            ToolTip = "How much the loop fade should last (default: 4)"
        },
        @{
            CompletionText = "--sample-rate", "-r"
            ToolTip = "Sample rate to use (default: 48000)"
        },
        @{
            CompletionText = "--format", "-f"
            ToolTip = "Format to use for stdout (default: wav) (formats: wav, mp3, flac, pcm, f32le)"
        },
        @{
            CompletionText = "--threads", "-T", "--max-threads", "-mt"
            ToolTip = "Sets the amount of threads to use when writing to files."
        },
        @{
            CompletionText = "--show-usage", "-U"
            ToolTip = "Shows RAM usage and CPU time. (Only works in file mode)"
        },
        @{
            CompletionText = "--text-delay", "-d"
            ToolTip = "Changes how fast it renders text (default: 500) (Only works in file mode)"
        },
        @{
            CompletionText = "--no-progress", "-np"
            ToolTip = "Disables progress text rendering (Only works in file mode)"
        },
        @{
            CompletionText = "--confirmation", "-c", "--ask", "-a"
            ToolTip = "Asks for confirmation before proceeding"
        },
        @{
            CompletionText = "--no-table", "-nt"
            ToolTip = "When asking for confirmation, it'll show the information in a JSON-like format instead of a table"
        },
        @{
            CompletionText = "--dry-run", "-dr", "--null", "-0", "--test", "-t"
            ToolTip = "Runs the program as normal but it'll write to /dev/null on unix and \\.\nul on windows."
        },
        @{
            CompletionText = "--verbose", "-v"
            ToolTip = "Sets the verbosity (default: 2)"
        },
        @{
            CompletionText = "--enable-spessasynth-logging"
            ToolTip = "Enables spessasynth's logging system, basically only used for debugging."
        },
        @{
            CompletionText = "--enable-spessasynth-warn-logging"
            ToolTip = "Enables spessasynth's logging system, basically only used for debugging."
        },
        @{
            CompletionText = "--enable-spessasynth-info-logging"
            ToolTip = "Enables spessasynth's logging system, basically only used for debugging."
        },
        @{
            CompletionText = "--log-file", "-lf"
            ToolTip = "Sets path to the log file (default: ./spesso.log)"
        },
        @{
            CompletionText = "--uninstall", "-u"
            ToolTip = "Uninstalls dependencies with confirmation and the entire program"
        },
        @{
            CompletionText = "--help", "-h"
            ToolTip = "Shows the help message"
        },
        @{
            CompletionText = "--version", "-V"
            ToolTip = "Show the installed version"
        },
        @{ CompletionText = " " }
    )

    foreach ($object in $Options) {
        $matchingText = $object.CompletionText -like "$wordToComplete*"
        if (!$matchingText) { continue }

        [System.Management.Automation.CompletionResult]::new(
            $matchingText, $matchingText,
            "ParameterValue",
            $object.ToolTip
        )
    }
}

Register-ArgumentCompleter `
    -CommandName spessoplayer -Native `
    -ScriptBlock $ScriptBlock

