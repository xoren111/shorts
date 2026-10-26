#!/bin/bash
# Group B: print licence / best video height / fps / duration for YouTube ids. Usage: B_ytinfo.sh id1 id2 ...
for id in "$@"; do
  yt-dlp --skip-download --print "$id | %(license)s | %(height)sp%(fps)s | %(duration)ss | %(channel)s | %(upload_date)s | %(title)s" "https://www.youtube.com/watch?v=$id" 2>&1 | grep -v WARNING | head -2 &
done; wait
