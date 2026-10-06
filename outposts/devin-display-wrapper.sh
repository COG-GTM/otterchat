#!/bin/sh
# Starts Xvfb + openbox before `devin worker start` so computer use gets a DISPLAY.

# The worker execs this with a minimal env; make sure the tools below resolve.
PATH="/usr/local/bin:/usr/bin:/bin${PATH:+:$PATH}"
export PATH

REAL="$0.real"
[ -x "$REAL" ] || REAL=/root/.local/bin/devin.real

if [ "$1" = "worker" ] && [ "$2" = "start" ]; then
  case " $* " in
    # keep the build's `worker start --help` contract check a pass-through
    *" --help "*) exec "$REAL" "$@" ;;
  esac
  if ! xdpyinfo -display :0 >/dev/null 2>&1; then
    # snapshot-resumed sandboxes can carry a stale X lock
    rm -f /tmp/.X0-lock /tmp/.X11-unix/X0
    Xvfb :0 -screen 0 1024x768x24 >/tmp/xvfb.log 2>&1 &
    i=0
    while [ $i -lt 20 ] && ! xdpyinfo -display :0 >/dev/null 2>&1; do
      i=$((i + 1))
      sleep 0.5
    done
  fi
  if xdpyinfo -display :0 >/dev/null 2>&1; then
    export DISPLAY=:0
    openbox >/tmp/openbox.log 2>&1 &
  else
    echo "devin-display-wrapper: no X server on :0; worker runs headless (see /tmp/xvfb.log)" >&2
  fi
fi

exec "$REAL" "$@"
