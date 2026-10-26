#!/bin/bash
# Group B: download a URL into raw/B/<item>/ with retries (handles Commons 429). Usage: B_dl.sh <item> <url> [filename]
UA_C="AtlasApeShortB/1.0 (https://www.youtube.com/@ATLASAPE-S; educational short) curl"
UA_B="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
item=$1; url=$2; name=${3:-$(basename "${url%%\?*}")}
d=/Users/khorengrigoryan/shorts/atlas-ape/pig-war/short3/assets/raw/B/$item; mkdir -p "$d"
case "$url" in *wikimedia.org*) UA=$UA_C;; *) UA=$UA_B;; esac
for i in 1 2 3 4 5 6; do
  code=$(curl -sL -A "$UA" -o "$d/$name" -w '%{http_code}' "$url")
  [ "$code" = "200" ] && { echo "OK $d/$name $(du -h "$d/$name" | cut -f1)"; exit 0; }
  echo "HTTP $code, retry $i" >&2; sleep $((i*15))
done
exit 1
