#!/usr/bin/env bash
set -e
mkdir -p streams
DUR=30

for i in 1 2 3 4; do
  dir=streams/stream$i
  rm -rf "$dir"
  mkdir -p "$dir"
  ffmpeg -y -f lavfi -i "testsrc=size=1280x720:rate=30" \
    -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf: \
         text='Stream $i':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2" \
    -t $DUR -c:v libx264 -preset ultrafast -g 48 -sc_threshold 0 -b:v 1500k \
    -f hls -hls_time 6 -hls_list_size 0 -hls_segment_filename "$dir/seg_%03d.ts" \
    "$dir/playlist.m3u8"
done

echo "✅ 4 test HLS streams created under ./streams/"
