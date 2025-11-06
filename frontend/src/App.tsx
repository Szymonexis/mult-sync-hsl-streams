// App.tsx
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface Stream {
	url: string;
	ref: React.RefObject<HTMLVideoElement>;
}

const App: React.FC = () => {
	const [streams, setStreams] = useState<Stream[]>([]);
	const [syncDrift, setSyncDrift] = useState(0);
	const masterRef = useRef<HTMLVideoElement | null>(null);

	// --- Enforce mute ---
	useEffect(() => {
		// For extra safety: override HTMLMediaElement setters
		try {
			Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
				configurable: true,
				enumerable: true,
				get() {
					return true;
				},
				set() {
					return;
				},
			});
			Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
				configurable: true,
				enumerable: true,
				get() {
					return 0;
				},
				set() {
					return;
				},
			});
		} catch {
			// TODO
		}
	}, []);

	useEffect(() => {
		fetch('/api/streams')
			.then((r) => r.json())
			.then((urls: string[]) => {
				setStreams(
					urls.map((url) => ({
						url,
						ref: React.createRef<HTMLVideoElement>(),
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
					})) as any
				);
			});
	}, []);

	useEffect(() => {
		streams.forEach(({ url, ref }) => {
			const video = ref.current;
			if (!video) return;
			video.muted = true;
			video.volume = 0;
			// video.controls = false;

			if (video.canPlayType('application/vnd.apple.mpegurl')) {
				video.src = url;
			} else if (Hls.isSupported()) {
				const hls = new Hls();
				hls.loadSource(url);
				hls.attachMedia(video);
			} else {
				video.src = url;
			}
		});
	}, [streams]);

	// --- Sync playback ---
	useEffect(() => {
		if (!streams.length) return;
		const videos = streams.map((s) => s.ref.current!).filter(Boolean);
		const master = masterRef.current ?? videos[0];
		masterRef.current = master;

		const sync = () => {
			const masterTime = master.currentTime || 0;
			let maxDiff = 0;

			for (const v of videos) {
				const diff = Math.abs((v.currentTime || 0) - masterTime);
				maxDiff = Math.max(maxDiff, diff);
				if (diff > 0.15) {
					v.currentTime = masterTime;
				} else if (diff > 0.05) {
					v.playbackRate = v.currentTime < masterTime ? 1.05 : 0.95;
				} else {
					v.playbackRate = 1.0;
				}
				v.muted = true;
				v.volume = 0;
			}
			setSyncDrift(maxDiff);
			requestAnimationFrame(sync);
		};
		requestAnimationFrame(sync);

		return () => {
			videos.forEach((v) => (v.playbackRate = 1));
		};
	}, [streams]);

	const playAll = async () => {
		for (const s of streams) {
			const v = s.ref.current;
			if (v) {
				try {
					await v.play();
				} catch {
					// TODO
				}
			}
		}
	};

	const pauseAll = () => {
		streams.forEach((s) => s.ref.current?.pause());
	};

	const seek = (delta: number) => {
		const master = masterRef.current;
		if (!master) return;
		const newTime = Math.max(0, master.currentTime + delta);
		streams.forEach((s) => {
			const v = s.ref.current;
			if (v) v.currentTime = newTime;
		});
	};

	return (
		<div>
			<h2>🎥 Synchronized HLS Streams</h2>

			<div className='grid'>
				{streams.map((s, i) => (
					<div className='card' key={i}>
						<div>Stream {i + 1}</div>
						<video ref={s.ref} playsInline muted controls={i === 0} />
					</div>
				))}
			</div>

			<div className='controls'>
				<button onClick={playAll}>Play</button>
				<button onClick={pauseAll}>Pause</button>
				<button onClick={() => seek(-5)}>⏪ -5s</button>
				<button onClick={() => seek(5)}>⏩ +5s</button>
				<span style={{ marginLeft: '10px' }}>
					Max drift: {syncDrift.toFixed(3)}s
				</span>
			</div>
		</div>
	);
};

export default App;
