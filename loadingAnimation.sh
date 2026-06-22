# colors
normal=$(printf '\033[0m')
gray8=$(printf '\033[90;1m')
gray256=$(printf '\033[38;5;238m')
gray24=$(printf '\033[38;2;124;124;124m')
# escape sequences
clearLine=$(printf '\033[K')
carraigeReturn=$(printf '\r')

# RGB color support detection
[ "$COLORTERM" = "truecolor" ] && gray=$gray24
[ "$COLORTERM" = "24bit" ] && gray=$gray24
case "$TERM" in
    truecolor)  gray=$gray24  ;;
    xterm-256*) gray=$gray256 ;;
esac
[ -z "$gray" ] && gray=$gray8

# checks float support
DELAY=0.350
sleep 0.01 2>/dev/null || DELAY=1

counter=1
while true ;do
    if [ $counter -gt 3 ] ;then
        printf '%s' "$clearLine" >&2
        counter=1
        dots=""
    fi

    dots="$dots."
    printf "%s" "$gray" \
        "Loading" \
        "$dots" \
        "$normal" "$carraigeReturn" >&2

    counter=$((counter + 1))
    sleep $DELAY
done

