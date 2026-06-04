#!/usr/bin/env bash
# OpenArt MP4 → WebM VP9 with true alpha (yuva420p)
set -euo pipefail
DIR="$(cd "$(dirname "$0")/../public/drako/videos" && pwd)"

process_white() {
  local name="$1"
  local input="$DIR/${name}.mp4"
  if [[ ! -f "$input" ]]; then
    echo "skip $name (no ${name}.mp4)"
    return 0
  fi
  ffmpeg -y -hide_banner -loglevel error -i "$input" \
    -vf "colorkey=0xFCFCFC:0.38:0.06,format=rgba" \
    -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 30 -an \
    "$DIR/${name}.webm"
  echo "ok white $name"
}

process_green() {
  local name="$1"
  local input="$DIR/${name}.mp4"
  if [[ ! -f "$input" ]]; then
    echo "skip $name (no ${name}.mp4)"
    return 0
  fi
  ffmpeg -y -hide_banner -loglevel error -i "$input" \
    -vf "colorkey=0x208245:0.35:0.08,format=rgba" \
    -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 30 -an \
    "$DIR/${name}.webm"
  echo "ok green $name"
}

# Off-white matte (OpenArt default for new batches)
for clip in drako-celebrate drako-sleeping drako-play drako-eat drako-fly drako-bounce drako-working drako-sad; do
  process_white "$clip"
done

# Legacy green-screen exports
for clip in drako-fire-breath drako-coffee-break; do
  process_green "$clip"
done

echo "done"
