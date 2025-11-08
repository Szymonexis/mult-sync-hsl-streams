Perfect 👌 — since you have **two MP4s (video-only)** and **one MP3 (audio)**, all the same length and perfectly compatible, you can easily create a **combined HLS setup (Option 2)** where both videos share the same audio track.

Let’s go through it **end-to-end**, including the exact commands and resulting files so your browser player (React / Angular / plain JS) can seamlessly switch video streams while keeping audio continuous.

---

## 🎬 Goal

We’ll generate this structure:

```
output/
├── master.m3u8
├── videoA/
│   ├── index.m3u8
│   ├── segment_0.ts
│   ├── segment_1.ts
│   └── ...
├── videoB/
│   ├── index.m3u8
│   ├── segment_0.ts
│   └── ...
└── audio/
    ├── index.m3u8
    ├── segment_0.ts
    └── ...
```

Then you’ll serve the `/output` directory (e.g., with Nginx or a Node static server) — and use **Hls.js** in your web app.

---

## 🧰 Step 1 — Generate the HLS segments

Use **FFmpeg**, the all-purpose media tool.

> Requirements:
>
> * ffmpeg ≥ 4.0
> * All 3 files: `videoA.mp4`, `videoB.mp4`, `audio.mp3`
> * All the same duration (no offset or silence difference)

### 🔹 1.1 Convert videoA → HLS

```bash
mkdir -p output/videoA
ffmpeg -i videoA.mp4 -c:v h264 -an -profile:v main \
  -start_number 0 -hls_time 4 -hls_list_size 0 -f hls \
  output/videoA/index.m3u8
```

### 🔹 1.2 Convert videoB → HLS

```bash
mkdir -p output/videoB
ffmpeg -i videoB.mp4 -c:v h264 -an -profile:v main \
  -start_number 0 -hls_time 4 -hls_list_size 0 -f hls \
  output/videoB/index.m3u8
```

### 🔹 1.3 Convert audio → HLS

```bash
mkdir -p output/audio
ffmpeg -i audio.mp3 -c:a aac -vn \
  -start_number 0 -hls_time 4 -hls_list_size 0 -f hls \
  output/audio/index.m3u8
```

---

## 📜 Step 2 — Create the master manifest

Now you’ll manually create one `output/master.m3u8` file that references both video variants and the shared audio:

```m3u8
#EXTM3U
#EXT-X-VERSION:3

# Audio track definition
# EXT-X-MEDIA:TYPE=AUDIO tells HLS.js there's a separate audio playlist.
# "GROUP-ID" links audio with specific video variants.
# "URI" points to the audio HLS playlist.
# "NAME" is what the player can display (optional).

# Shared audio stream
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Main Audio",DEFAULT=YES,AUTOSELECT=YES,URI="audio/index.m3u8"

# Video variant 1
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720,CODECS="avc1.42e01e",AUDIO="audio"
videoA/index.m3u8

# Video variant 2
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720,CODECS="avc1.42e01e",AUDIO="audio"
videoB/index.m3u8
```

> ✅ Both videos now share the same audio group `AUDIO="audio"`.
>
> ✅ Hls.js or Safari will automatically play the single audio stream regardless of video switches.

---

## ⚡ Step 3 — Test in Browser (React Example)

```tsx
import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function CombinedAVPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current!;
    const hls = new Hls();

    // Path to master manifest (can be hosted on localhost)
    hls.loadSource("/output/master.m3u8");
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play();
      console.log("Available quality levels:", hls.levels);
    });

    // Example: switch to another video stream after 5s
    setTimeout(() => {
      hls.currentLevel = 1; // switch to videoB
    }, 5000);

    return () => hls.destroy();
  }, []);

  return (
    <video
      ref={videoRef}
      controls
      muted={false}
      autoPlay
      className="w-[640px] h-[360px] bg-black"
    />
  );
}
```

### 💡 Notes

* You can dynamically switch video streams (videoA ⇄ videoB) while audio keeps playing **continuously**.
* The switch is **instant and gapless** because both variants are part of the same HLS master playlist.
* You can style this to fade during switches if desired.

---

## 🧱 Step 4 — Serve it

You can test locally using any static server:

```bash
npx serve output
# or
python3 -m http.server --directory output 8000
```

Then open:

```
http://localhost:8000/master.m3u8
```

in your HLS player or the React app above.

---

## ✅ Final Result

* Shared audio across both video streams (no drift, no delay)
* Smooth instant switching between two MP4 sources
* All browser-compatible via **Hls.js** (or Safari’s native HLS)
* Fully local or deployable to a CDN or Nginx server

---

Would you like me to show a small **Node/Express script** that automatically generates the master `.m3u8` for any given `videoA.mp4`, `videoB.mp4`, and `audio.mp3` — so you can reuse it for future pairs?
