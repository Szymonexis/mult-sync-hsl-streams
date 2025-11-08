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
			const hls = new Hls();
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
				setCurrentLevel(data.level);
			});

			hls.loadSource(MASTER_PLAYLIST_URL);
			hls.attachMedia(video);
		} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
			video.src = MASTER_PLAYLIST_URL;
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
		if (!hlsRef.current) return;
		hlsRef.current.currentLevel = index;
		setCurrentLevel(index);
	};

	return (
		<div className='min-h-screen bg-gray-900 text-white p-4 sm:p-8 flex flex-col items-center'>
			<h2 className='text-2xl sm:text-3xl font-bold mb-6'>🎥 HLS Player</h2>

			<div className='w-full max-w-4xl bg-black rounded-lg shadow-xl overflow-hidden mb-6'>
				<video
					ref={videoRef}
					controls={true}
					playsInline={true}
          loop={true}
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
