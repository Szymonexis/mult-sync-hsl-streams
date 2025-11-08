#!/usr/bin/env bash
set -e

STREAM_DIR="streams/stream1"
BASE_AUDIO_FILE="audio-base/base1.mp3"
DURATION=60

echo "Cleaning and creating stream directory: $STREAM_DIR"
rm -rf "$STREAM_DIR"
mkdir -p "$STREAM_DIR"

# --- Generate Video Streams (A, B, C, D) ---
for i in A B C D; do
  dir="$STREAM_DIR/video$i"
  echo "Generating video stream $i in $dir..."
  mkdir -p "$dir"
  ffmpeg -y -f lavfi -i "testsrc=size=1280x720:rate=30" \
    -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf: \
         text='Stream $i':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2" \
    -t $DURATION -c:v libx264 -preset ultrafast -g 48 -sc_threshold 0 -b:v 1500k \
    -f hls -hls_time 5 -hls_list_size 0 -hls_segment_filename "$dir/seg_%03d.ts" \
    "$dir/playlist.m3u8"
done

# --- Generate Audio Stream ---
dir="$STREAM_DIR/audio"
echo "Generating audio stream in $dir..."
mkdir -p "$dir"
ffmpeg -y -i "$BASE_AUDIO_FILE" -t $DURATION -c:a aac -ar 48000 -ac 2 -vn \
  -hls_time 5 -hls_list_size 0 -hls_segment_filename "$dir/seg_%03d.aac" \
  -f hls "$dir/index.m3u8"

# --- Generate Master Playlist ---
MASTER_PLAYLIST="$STREAM_DIR/master.m3u8"
echo "Generating master playlist: $MASTER_PLAYLIST"

cat << EOF > "$MASTER_PLAYLIST"
#EXTM3U
#EXT-X-VERSION:3

# --- Audio Track Definition ---
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Main Audio",DEFAULT=YES,AUTOSELECT=YES,URI="audio/index.m3u8"

# --- Video Variant 1 (Stream A - DEFAULT) ---
#EXT-X-STREAM-INF:BANDWIDTH=2000001,RESOLUTION=1280x720,CODECS="avc1.42e01e",AUDIO="audio",NAME="Stream A"
videoA/playlist.m3u8

# --- Video Variant 2 (Stream B) ---
#EXT-X-STREAM-INF:BANDWIDTH=2000002,RESOLUTION=1280x720,CODECS="avc1.42e01e",AUDIO="audio",NAME="Stream B"
videoB/playlist.m3u8

# --- Video Variant 3 (Stream C) ---
#EXT-X-STREAM-INF:BANDWIDTH=2000003,RESOLUTION=1280x720,CODECS="avc1.42e01e",AUDIO="audio",NAME="Stream C"
videoC/playlist.m3u8

# --- Video Variant 4 (Stream D) ---
#EXT-X-STREAM-INF:BANDWIDTH=2000004,RESOLUTION=1280x720,CODECS="avc1.42e01e",AUDIO="audio",NAME="Stream D"
videoD/playlist.m3u8
EOF

echo "✅ 4 synced HLS streams created under ./$STREAM_DIR/"
