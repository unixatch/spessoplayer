echo off

:: only for assigning escape to a variable
for /f %%a in ('echo prompt $E^| cmd') do set "esc=%%a"
:: colors
set "normal=%esc%[0m"
set "gray=%esc%[38;2;124;124;124m"
:: control escape sequences
set "clearLine=%esc%[K"

:: ping limitation, can't be < that 500 ms
set "DELAY=0.500"
set "counter=1"
:loop
    if %counter% GTR 3 (
        (set/p __=%clearLine%) <nul >&2
        set "counter=1"
        set "dots="
    )

    set "dots=%dots%."
    :: janky way to strip out CR/LF
    (set/p __=%gray%Loading%dots%%normal%) <nul >&2

    set /a "counter+=1"
    ping 192.0.2.0 -n 1 -w %DELAY% >nul
goto :loop

