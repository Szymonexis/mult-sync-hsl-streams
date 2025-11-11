import Hls from 'hls.js';
import React, { useEffect, useRef, useState } from 'react';

const MASTER_PLAYLIST_URL = 'http://localhost:3000/streams/stream1/master.m3u8';

type HlsLevel = {
	height: number;
	bitrate: number;
	name?: string;
	index: number;
};

const App: React.FC = () => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const hlsRef = useRef<Hls | null>(null);

	const [levels, setLevels] = useState<HlsLevel[]>([]);
	const [currentLevel, setCurrentLevel] = useState<number>(-1);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		if (Hls.isSupported()) {
			const hls = new Hls({
				debug: false,
				enableWorker: true,
				lowLatencyMode: false,
				backBufferLength: 90,
				maxBufferLength: 60,
				maxMaxBufferLength: 120,
				maxBufferSize: 60 * 1000 * 1000,
				maxBufferHole: 0.5,
				highBufferWatchdogPeriod: 2,
				nudgeOffset: 0.1,
				nudgeMaxRetry: 3,
				maxFragLookUpTolerance: 0.25,
				liveSyncDurationCount: 3,
				liveMaxLatencyDurationCount: Infinity,
				liveDurationInfinity: false,
				manifestLoadingTimeOut: 10000,
				manifestLoadingMaxRetry: 1,
				manifestLoadingRetryDelay: 1000,
				levelLoadingTimeOut: 10000,
				levelLoadingMaxRetry: 4,
			});
			hlsRef.current = hls;

			hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
				console.log('Parsed levels:', data.levels);

				const availableLevels = data.levels.map((level, index: number) => ({
					...level,
					index,
					name: level.name || `Stream ${String.fromCharCode(65 + index)}`,
				}));

				setLevels(availableLevels);
				setCurrentLevel(hls.currentLevel);
			});

			hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
				console.log('Level switched to:', data.level);
				setCurrentLevel(data.level);
			});

			// Handle errors
			hls.on(Hls.Events.ERROR, (_, data) => {
				// Ignore non-fatal fragParsingError for tiny fragments at the end
				if (!data.fatal && data.details === 'fragParsingError') {
					console.warn('Non-fatal fragment parsing error (likely empty end fragment), ignoring:', data);
					return;
				}
				
				console.error('HLS error:', data);
				if (data.fatal) {
					switch (data.type) {
						case Hls.ErrorTypes.NETWORK_ERROR:
							console.log('Network error, trying to recover...');
							hls.startLoad();
							break;
						case Hls.ErrorTypes.MEDIA_ERROR:
							console.log('Media error, trying to recover...');
							hls.recoverMediaError();
							break;
						default:
							console.log('Fatal error, destroying HLS instance');
							hls.destroy();
							break;
					}
				}
			});

			// Handle looping manually for VOD
			const handleEnded = () => {
				console.log('Video ended, looping...');
				if (video && hlsRef.current) {
					video.currentTime = 0;
					video.play().catch(err => console.error('Play error:', err));
				}
			};

			video.addEventListener('ended', handleEnded);

			hls.loadSource(MASTER_PLAYLIST_URL);
			hls.attachMedia(video);

			return () => {
				video.removeEventListener('ended', handleEnded);
			};
		} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
			video.src = MASTER_PLAYLIST_URL;
			video.loop = true;
			console.warn(
				'Using native HLS player — manual stream switching disabled.'
			);
		} else {
			console.error('This browser does not support HLS.');
		}

		return () => {
			if (hlsRef.current) {
				hlsRef.current.destroy();
				hlsRef.current = null;
			}
		};
	}, []);

	const selectLevel = (index: number) => {
		if (!hlsRef.current || !videoRef.current) return;
		
		const currentTime = videoRef.current.currentTime;
		const wasPlaying = !videoRef.current.paused;
		
		console.log(`Switching to level ${index} at time ${currentTime}`);
		
		hlsRef.current.currentLevel = index;
		
		// Wait a bit for the level switch to take effect
		setTimeout(() => {
			if (videoRef.current) {
				videoRef.current.currentTime = currentTime;
				if (wasPlaying) {
					videoRef.current.play().catch(err => console.error('Play error after switch:', err));
				}
			}
		}, 100);
	};

	return (
		<div className='min-h-screen bg-gray-900 text-white p-4 sm:p-8 flex flex-col items-center'>
			<h2 className='text-2xl sm:text-3xl font-bold mb-6'>🎥 HLS Player</h2>

			<div className='w-full max-w-4xl bg-black rounded-lg shadow-xl overflow-hidden mb-6'>
				<video
					ref={videoRef}
					controls={true}
					playsInline={true}
          autoPlay={true}
					className='w-full h-full aspect-video'
				/>
			</div>

			{levels.length > 0 && (
				<div className='w-full max-w-4xl bg-gray-800 p-4 rounded-lg shadow-xl'>
					<h3 className='text-lg font-semibold mb-3'>Select Stream</h3>
					<div className='flex flex-wrap gap-2'>
						{/* <button
							onClick={() => selectLevel(-1)}
							className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
								currentLevel === -1
									? 'bg-blue-600 text-white'
									: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
							}`}
						>
							Auto (ABR)
						</button> */}

						{levels.map((level) => (
							<button
								key={level.index}
								onClick={() => selectLevel(level.index)}
								className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
									currentLevel === level.index
										? 'bg-blue-600 text-white'
										: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
								}`}
							>
								{level.name}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default App;
