#!/bin/zsh
# Headless Blender for 3D inserts with ONE GPU slot on this Mac (a 16 GB M2 Pro thrashes with two GPU renders at once).
#   tools/blender/run.sh tools/blender/shot.py -- tools/blender/examples/coin.json [--scale 50] [--frames 1,12]
# Runs Blender with --factory-startup (no user prefs / add-ons leak into the render) from the short/ folder, so relative
# paths in the call and in the spec resolve against short/.
#   BLENDER_LOCK=<file>   lock file (default /tmp/shorts_blender_gpu.lock = shared by every project of this user, unlike the
#                         per-project out/.blender_lock of the older kits). A kernel flock (zsh/system): it is released when
#                         this script ends, even after kill -9, so there are no stale locks to clean up.
#   BLENDER_LOCK_WAIT=<s> give up after s seconds of waiting (default: wait for ever), exit 75
#   NOLOCK=1              skip the lock (--probe runs, tiny tests at --scale 25)
#   BLENDER=<binary>      default /Applications/Blender.app/Contents/MacOS/Blender, else `blender` on PATH
cd "$(dirname $0)/../.." || exit 1
BIN=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
[ -x "$BIN" ] || BIN=$(command -v blender) || { echo "run.sh: Blender not found (set BLENDER=…)"; exit 127; }
LOCK=${BLENDER_LOCK:-/tmp/shorts_blender_gpu.lock}
if [ -z "$NOLOCK" ]; then
  zmodload zsh/system || { echo "run.sh: zsh/system module missing"; exit 1; }
  : >> $LOCK 2>/dev/null || { echo "run.sh: cannot create lock $LOCK"; exit 1; }
  if ! zsystem flock -t 0 -f LOCKFD $LOCK 2>/dev/null; then
    echo "run.sh: GPU slot busy — $(cat $LOCK.owner 2>/dev/null || echo 'owner unknown'); waiting …"
    if [ -n "$BLENDER_LOCK_WAIT" ]; then
      zsystem flock -t $BLENDER_LOCK_WAIT -i 2 -f LOCKFD $LOCK 2>/dev/null || { echo "run.sh: still busy after ${BLENDER_LOCK_WAIT}s"; exit 75; }
    else
      zsystem flock -i 2 -f LOCKFD $LOCK 2>/dev/null || { echo "run.sh: lock failed"; exit 1; }
    fi
  fi
  SPEC=(${(M)@:#*.json}); print -r -- "pid $$ · since $(date '+%H:%M:%S') · $PWD · ${SPEC[1]:t}" > $LOCK.owner
fi
"$BIN" -b --factory-startup -noaudio --python-exit-code 1 -P "$@" &
BPID=$!
trap 'kill $BPID 2>/dev/null; wait $BPID 2>/dev/null; exit 130' INT TERM HUP
wait $BPID
RC=$?
[ -z "$NOLOCK" ] && { : > $LOCK.owner; zsystem flock -u $LOCKFD; }
exit $RC
