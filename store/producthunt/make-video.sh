#!/usr/bin/env bash
# Builds video/americanoo-promo.mp4 (1920x1080, ~42 s, no audio) from the rendered cards and the
# iPhone walkthrough (store/ios/app-flow.mp4). Run ./render.sh first.
set -euo pipefail
cd "$(dirname "$0")"
FLOW=../ios/app-flow.mp4
ffmpeg -loglevel error -y \
  -loop 1 -t 3 -framerate 30 -i video/video-title.png \
  -loop 1 -framerate 30 -i video/video-stage.png \
  -i "$FLOW" \
  -loop 1 -framerate 30 -i video/video-frame.png \
  -loop 1 -t 4 -framerate 30 -i video/video-end.png \
  -filter_complex "
    [0]format=yuv420p,fade=t=out:st=2.5:d=0.5[title];
    [2]fps=30,scale=440:956,setsar=1[flow];
    [1][flow]overlay=1260:62:shortest=1[s1];
    [s1][3]overlay=0:0:shortest=1,format=yuv420p,fade=t=in:d=0.5[stage];
    [4]format=yuv420p,fade=t=in:d=0.5[end];
    [title][stage][end]concat=n=3:v=1:a=0[v]" \
  -map "[v]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart video/americanoo-promo.mp4
echo video/americanoo-promo.mp4
