#!/bin/zsh
# Run a Blender shot script with a global 1-slot lock (one GPU render at a time on this Mac; tests at --scale 50 may skip
# the lock with NOLOCK=1). Usage: tools/blender/run.sh tools/blender/<shot>.py -- [args]
cd "$(dirname $0)/../.."
LOCK=out/.blender_lock
if [ -z "$NOLOCK" ]; then
  until mkdir $LOCK 2>/dev/null; do
    # stale lock (> 40 min untouched) → take it over
    if [ -n "$(find $LOCK -maxdepth 0 -mmin +40 2>/dev/null)" ]; then rm -rf $LOCK; fi
    sleep 3
  done
  trap 'rm -rf $LOCK' EXIT INT TERM
  ( while true; do touch $LOCK; sleep 60; done ) &
  KEEP=$!
fi
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P "$@"
RC=$?
[ -n "$KEEP" ] && kill $KEEP 2>/dev/null
exit $RC
