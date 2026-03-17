import { createChallenge, verifyChallenge, signToken, verifyToken } from './pow.js';

export function powMiddleware(options = {}) {
    const secret = options.secret || randomSecret();
    const challenges = new Map();

    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [id, record] of challenges) {
            if (now > record.expiresAt) challenges.delete(id);
        }
    }, 60_000);
    cleanupInterval.unref?.();

    function handleChallenge(_request, response) {
        const { id, challenge, record } = createChallenge(secret, options);
        challenges.set(id, record);
        response.json(challenge);
    }

    function handleSolve(request, response) {
        const { id } = request.params;
        const record = challenges.get(id);

        if (!record) {
            return response.status(400).json({ error: 'Unknown challenge' });
        }

        const { nonce } = request.body;
        const result = verifyChallenge(record, nonce);

        if (!result.valid) {
            if (result.error === 'Challenge expired') {
                challenges.delete(id);
            }
            return response.status(400).json({ error: result.error });
        }

        challenges.delete(id);

        const proof = result.hash;
        const token = signToken({ sub: id, proof, iat: Date.now() }, secret);

        response.json({
            token,
            expiresAt: Date.now() + 3_600_000,
        });
    }

    function requireToken(request, response, next) {
        const header = request.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            return response.status(401).json({ error: 'No token' });
        }

        const payload = verifyToken(header.slice(7), secret);
        if (!payload) {
            return response.status(401).json({ error: 'Invalid token' });
        }

        request.powPayload = payload;
        next();
    }

    function mountRoutes(router) {
        router.post('/challenge', handleChallenge);
        router.post('/challenge/:id/solve', handleSolve);
        return router;
    }

    return {
        handleChallenge,
        handleSolve,
        requireToken,
        mountRoutes,
    };
}

function randomSecret() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}
