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
				
				// Lock to the first level (Stream A) and disable auto level switching
				hls.currentLevel = 0;
				setCurrentLevel(0);
			});

			hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
				console.log('Level switched to:', data.level);
				setCurrentLevel(data.level);
			});

			// Handle errors
			hls.on(Hls.Events.ERROR, (_, data) => {
				// Ignore non-fatal fragParsingError for tiny fragments at the end
				if (!data.fatal && data.details === 'fragParsingError') {
					console.warn(
						'Non-fatal fragment parsing error (likely empty end fragment), ignoring:',
						data
					);
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
					video.play().catch((err) => console.error('Play error:', err));
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
					videoRef.current
						.play()
						.catch((err) => console.error('Play error after switch:', err));
				}
			}
		}, 100);
	};

	return (
		<div className='min-h-screen bg-linear-to-br from-pink-100 via-rose-50 to-purple-100 p-4 sm:p-8 flex flex-col items-center'>
			<div className='absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30'>
				<div className='absolute top-10 left-10 text-6xl sparkle-animation'>
					✨
				</div>
				<div
					className='absolute top-20 right-20 text-5xl sparkle-animation'
					style={{ animationDelay: '0.5s' }}
				>
					💅
				</div>
				<div
					className='absolute bottom-20 left-20 text-5xl sparkle-animation'
					style={{ animationDelay: '1s' }}
				>
					💖
				</div>
				<div
					className='absolute bottom-32 right-32 text-6xl sparkle-animation'
					style={{ animationDelay: '1.5s' }}
				>
					👗
				</div>
			</div>

			<div className='relative z-10 w-full max-w-5xl'>
				{/* Header */}
				<div className='text-center mb-8'>
					<h1 className='text-4xl sm:text-5xl font-bold mb-2 bg-linear-to-r from-pink-500 via-rose-400 to-purple-500 bg-clip-text text-transparent drop-shadow-sm'>
						HSL Stream Gallery
					</h1>
				</div>

				{/* Video Container */}
				<div className='w-full bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 border-4 border-pink-200 relative'>
					<video
						ref={videoRef}
						controls={true}
						playsInline={true}
						autoPlay={true}
						className='w-full h-full aspect-video relative z-10'
					/>
				</div>

				{/* Stream Selection */}
				{levels.length > 0 && (
					<div className='w-full bg-linear-to-br from-pink-50 to-rose-100 p-6 sm:p-8 rounded-3xl shadow-xl border-2 border-pink-200'>
						<div className='flex items-center justify-center mb-6'>
							<h3 className='text-xl sm:text-2xl font-bold text-pink-700 text-center'>
								Select Your View
							</h3>
						</div>
						<div className='flex flex-wrap justify-center gap-3 sm:gap-4'>
							{levels.map((level) => (
								<button
									key={level.index}
									onClick={() => selectLevel(level.index)}
									className={`px-6 py-3 rounded-full text-base font-bold transition-all duration-300 transform hover:scale-105 shadow-lg ${
										currentLevel === level.index
											? 'bg-linear-to-r from-pink-500 to-rose-500 text-white shadow-pink-300 scale-105 ring-4 ring-pink-300'
											: 'bg-white text-pink-600 hover:bg-pink-50 border-2 border-pink-300 hover:border-pink-400'
									}`}
								>
									<span className='mr-2'>✨</span>
									{level.name}
									<span className='ml-2'>✨</span>
								</button>
							))}
						</div>
					</div>
				)}

				{/* Decorative bottom text */}
				<div className='text-center mt-8'>
					<p className='text-pink-400 text-sm font-light italic'>
						~ Glamour in every frame ~
					</p>
				</div>
			</div>
		</div>
	);
};

export default App;
