#!/usr/bin/env bash
# shellcheck disable=2059

(( $# == 0 )) && {
    printf '\e[31m%s\e[0m\n' "parameter name required"
    exit 1
}

foundFormat="\e[32mFound reference inside %s\e[0m\n"
notFoundFormat="\e[33mReference not found inside %s\e[0m\n"
declare -A CONSTANTS=(
    ['HELP_REGEX']='=\ `\$\{underline\}spessoplayer'
    ['MARKDOWN']="COMMAND-LINE-OPTIONS"
    ['HELP']="help documentation"
    ['MAN']="man page"

    ['POWERSHELL']="powershell completion"
    ['BASH']="bash completion"
    ['ZSH']="zsh completion"
)
paths=(
    # documentation with descriptions
    "./cli.mjs" "./spessoplayer.1" "./COMMAND-LINE-OPTIONS.md"

    # completions
    "./powershell_completion.ps1"
    "./bash_completion" "./zsh_completion"
)

for file in "${paths[@]}" ;{
    FOUND="false"
    case "$file" in
        *spessoplayer*) currentConstant="MAN"        ;;
        *powershell*)   currentConstant="POWERSHELL" ;;
        *COMMAND*)      currentConstant="MARKDOWN"   ;;
        *bash*)         currentConstant="BASH"       ;;
        *zsh*)          currentConstant="ZSH"        ;;
        *cli*)          currentConstant="HELP"       ;;
    esac

    [[ "$currentConstant" != "HELP" ]] && reachedPart="true"

    # read the file
    while read -r line ;do
        # cli.mjs is a bigger file
        # so skip to the help function
        if [[ -z $reachedPart && ! "$line" =~ ${CONSTANTS[HELP_REGEX]} ]]
        then
            continue
        else
            : "${reachedPart:='true'}"
        fi

        for parameter in "$@" ;{
            [[ "$line" =~ $parameter ]] && {
                FOUND="true"
                break 2 # closes the while read
            }
        }
    done < "$file"

    if $FOUND ;then
        printf "$foundFormat" "${CONSTANTS[$currentConstant]}"
    else
        printf "$notFoundFormat" "${CONSTANTS[$currentConstant]}"
    fi
}

