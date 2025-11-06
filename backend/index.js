import cors from 'cors';
import express from 'express';
import { join } from 'path';

import { dirname } from 'path';
import { fileURLToPath } from 'url';

// --- recreate __dirname and __filename for ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// -------------------------------------------------

const app = express();
const port = 3000;

app.use(cors());
app.use('/streams', express.static(join(__dirname, 'streams')));

app.get('/api/streams', (req, res) => {
	const count = 4;
	const urls = [];
	for (let i = 1; i <= count; i++) {
		urls.push(
			`${req.protocol}://${req.get('host')}/streams/stream${i}/playlist.m3u8`
		);
	}
	res.json(urls);
});

app.listen(port, () => {
	console.log(`✅ Backend running on http://localhost:${port}`);
});
