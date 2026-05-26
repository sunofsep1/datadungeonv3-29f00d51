#!/usr/bin/env bash
# Strip export mattes → transparent WebM (VP9 + alpha)
set -euo pipefail
DIR="$(cd "$(dirname "$0")/../public/drako/videos" && pwd)"

# OpenArt export matte is off-white/grey-blue (~#ECF0F4), not pure #FFFFFF
process_white() {
  local name="$1"
  ffmpeg -y -hide_banner -loglevel error -i "$DIR/${name}.mp4" \
    -vf "colorkey=0xECF0F4:0.42:0.06,format=rgba" \
    -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 30 -an \
    "$DIR/${name}.webm"
  echo "ok white $name"
}

process_green() {
  local name="$1"
  ffmpeg -y -hide_banner -loglevel error -i "$DIR/${name}.mp4" \
    -vf "colorkey=0x208245:0.35:0.08,format=rgba" \
    -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 30 -an \
    "$DIR/${name}.webm"
  echo "ok green $name"
}

process_white drako-celebrate
process_white drako-sleeping
process_green drako-fire-breath
process_green drako-coffee-break
cp "$DIR/drako-coffee-break.webm" "$DIR/drako-idle.webm"
echo "done"
