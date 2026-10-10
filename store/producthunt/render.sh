#!/usr/bin/env bash
# Renders the Product Hunt posters from src/*.html with headless Chrome (2x, retina).
# Usage: ./render.sh            all pages
#        ./render.sh 03-court   one page
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

# name  width height  output
PAGES="
01-hero        1270 760  gallery
02-join        1270 760  gallery
03-live        1270 760  gallery
04-watch       1270 760  gallery
05-agent       1270 760  gallery
06-fair        1270 760  gallery
07-formats     1270 760  gallery
08-free        1270 760  gallery
thumbnail      240  240  .
launch-x       1200 675  social
launch-square  1080 1080 social
video-title    1920 1080 video
video-stage    1920 1080 video
video-frame    1920 1080 video
video-end      1920 1080 video
"

render() { # name w h dir
  local scale=2 bg=(); [[ $1 == video-* ]] && scale=1
  [[ $1 == video-frame ]] && bg=(--default-background-color=00000000)
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=$scale \
    --allow-file-access-from-files ${bg[@]+"${bg[@]}"} --virtual-time-budget=3000 --window-size="$2,$3" \
    --screenshot="$PWD/$4/$1.png" "file://$PWD/src/$1.html?w=$2&h=$3" >/dev/null 2>&1
  echo "$4/$1.png"
}

echo "$PAGES" | while read -r name w h dir; do
  [[ -z $name ]] && continue
  [[ $# -gt 0 && $1 != "$name" ]] && continue
  [[ -f src/$name.html ]] || continue
  render "$name" "$w" "$h" "$dir"
done
