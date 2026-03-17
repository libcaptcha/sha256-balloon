import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { powMiddleware } from '../src/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const pow = powMiddleware({
    secret: process.env.POW_SECRET,
    difficulty: parseInt(process.env.POW_DIFFICULTY || '10', 10),
    spaceCost: parseInt(process.env.POW_SPACE_COST || '512', 10),
    timeCost: parseInt(process.env.POW_TIME_COST || '1', 10),
});

app.use(express.json({ limit: '4kb' }));
app.use('/src', express.static(join(__dirname, '..', 'src')));
app.use(express.static(join(__dirname, 'public')));

pow.mountRoutes(app);

app.get('/protected', pow.requireToken, (_req, res) => {
    res.json({
        message: 'Access granted',
        timestamp: new Date().toISOString(),
    });
});

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});
