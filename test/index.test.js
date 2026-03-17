import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('index exports', () => {
    it('exports all public API', async () => {
        const mod = await import('../src/index.js');
        const expected = [
            'sha256',
            'sha256Hex',
            'sha256Bytes',
            'hmacSha256',
            'hmacSha256Hex',
            'balloon',
            'balloonHex',
            'createChallenge',
            'verifyChallenge',
            'signToken',
            'verifyToken',
            'powMiddleware',
            'solveChallenge',
        ];
        for (const name of expected) {
            assert.equal(
                typeof mod[name],
                'function',
                `Expected ${name} to be exported as function`
            );
        }
    });

    it('subpath exports work', async () => {
        const sha = await import('../src/sha256.js');
        assert.equal(typeof sha.sha256Hex, 'function');

        const hmac = await import('../src/hmac.js');
        assert.equal(typeof hmac.hmacSha256Hex, 'function');

        const bal = await import('../src/balloon.js');
        assert.equal(typeof bal.balloonHex, 'function');

        const pow = await import('../src/pow.js');
        assert.equal(typeof pow.createChallenge, 'function');

        const srv = await import('../src/server.js');
        assert.equal(typeof srv.powMiddleware, 'function');

        const client = await import('../src/client.js');
        assert.equal(typeof client.solveChallenge, 'function');
    });
});
