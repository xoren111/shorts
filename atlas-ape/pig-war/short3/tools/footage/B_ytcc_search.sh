#!/bin/bash
# Group B: YouTube search restricted to Creative-Commons videos (sp=EgIwAQ==). Usage: B_ytcc_search.sh "query" [n=25]
q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote_plus(sys.argv[1]))" "$1")
yt-dlp --flat-playlist --playlist-end ${2:-25} --print "%(id)s | %(title)s | %(duration)s | %(channel)s" \
  "https://www.youtube.com/results?search_query=$q&sp=EgIwAQ%253D%253D" 2>/dev/null
