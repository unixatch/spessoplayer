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
    param($wordToComplete)

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
            CompletionText = "--threads", "-T"
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
            CompletionText = "--confirmation", "-c"
            ToolTip = "Asks for confirmation before proceeding"
        },
        @{
            CompletionText = "--no-table", "-nt"
            ToolTip = "When asking for confirmation, it'll show the information in a JSON-like format instead of a table"
        },
        @{
            CompletionText = "--dry-run", "-dr"
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

