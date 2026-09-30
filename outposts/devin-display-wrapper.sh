#!/bin/sh
# Devin computer use on Linux outposts needs DISPLAY in the worker's
# environment pointing at a running X server (Xvfb plus a window manager):
# https://docs.devin.ai/work-with-devin/computer-use
#
# modal-devin owns the session sandbox entrypoint (`sleep infinity`), so the
# only place a display can start is inside the `devin worker start` process it
# execs. The image swaps this wrapper in for the real devin CLI (installed as
# devin.real next to it): bring Xvfb and openbox up, then hand off.

# The worker execs this with a minimal env; make sure the tools below resolve.
PATH="/usr/local/bin:/usr/bin:/bin${PATH:+:$PATH}"
export PATH

REAL="$0.real"
[ -x "$REAL" ] || REAL=/root/.local/bin/devin.real

if [ "$1" = "worker" ] && [ "$2" = "start" ]; then
  case " $* " in
    # The image's CLI contract check runs `worker start --help` during the
    # build; keep it a pure pass-through.
    *" --help "*) exec "$REAL" "$@" ;;
  esac
  if ! xdpyinfo -display :0 >/dev/null 2>&1; then
    # A sandbox resumed from a filesystem snapshot can carry a stale X lock
    # file with no live server behind it.
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
