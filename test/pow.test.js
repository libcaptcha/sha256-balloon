import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    createChallenge,
    verifyChallenge,
    signToken,
    verifyToken,
    CHALLENGE_TTL_MS,
    TOKEN_TTL_MS,
    DEFAULT_SPACE_COST,
    DEFAULT_TIME_COST,
    DEFAULT_DIFFICULTY,
    DELTA,
} from '../src/pow.js';

const SECRET = 'test-secret-key-for-unit-testing';

describe('pow', () => {
    describe('createChallenge', () => {
        it('returns id, challenge, and record', () => {
            const result = createChallenge(SECRET);
            assert.ok(result.id);
            assert.ok(result.challenge);
            assert.ok(result.record);
        });

        it('challenge has all required fields', () => {
            const { challenge } = createChallenge(SECRET);
            assert.ok(challenge.challengeId);
            assert.ok(challenge.prefix);
            assert.equal(typeof challenge.difficulty, 'number');
            assert.equal(typeof challenge.spaceCost, 'number');
            assert.equal(typeof challenge.timeCost, 'number');
            assert.equal(typeof challenge.delta, 'number');
        });

        it('uses default config values', () => {
            const { challenge } = createChallenge(SECRET);
            assert.equal(challenge.difficulty, DEFAULT_DIFFICULTY);
            assert.equal(challenge.spaceCost, DEFAULT_SPACE_COST);
            assert.equal(challenge.timeCost, DEFAULT_TIME_COST);
            assert.equal(challenge.delta, DELTA);
        });

        it('respects custom options', () => {
            const { challenge } = createChallenge(SECRET, {
                difficulty: 5,
                spaceCost: 64,
                timeCost: 2,
                delta: 4,
            });
            assert.equal(challenge.difficulty, 5);
            assert.equal(challenge.spaceCost, 64);
            assert.equal(challenge.timeCost, 2);
            assert.equal(challenge.delta, 4);
        });

        it('record has expiry in the future', () => {
            const { record } = createChallenge(SECRET);
            assert.ok(record.expiresAt > Date.now());
            assert.ok(record.expiresAt <= Date.now() + CHALLENGE_TTL_MS);
        });

        it('record has createdAt near now', () => {
            const before = Date.now();
            const { record } = createChallenge(SECRET);
            const after = Date.now();
            assert.ok(record.createdAt >= before);
            assert.ok(record.createdAt <= after);
        });

        it('prefix is 64-char hex (sha256 hmac)', () => {
            const { challenge } = createChallenge(SECRET);
            assert.equal(challenge.prefix.length, 64);
            assert.match(challenge.prefix, /^[0-9a-f]{64}$/);
        });

        it('generates unique ids', () => {
            const ids = new Set();
            for (let i = 0; i < 50; i++) {
                ids.add(createChallenge(SECRET).id);
            }
            assert.equal(ids.size, 50);
        });

        it('generates unique prefixes', () => {
            const prefixes = new Set();
            for (let i = 0; i < 50; i++) {
                prefixes.add(createChallenge(SECRET).challenge.prefix);
            }
            assert.equal(prefixes.size, 50);
        });

        it('id matches challenge.challengeId', () => {
            const { id, challenge } = createChallenge(SECRET);
            assert.equal(id, challenge.challengeId);
        });

        it('different secrets produce different prefixes', () => {
            const a = createChallenge('secret-a');
            const b = createChallenge('secret-b');
            assert.notEqual(a.challenge.prefix, b.challenge.prefix);
        });
    });

    describe('verifyChallenge', () => {
        it('rejects expired challenge', () => {
            const { record } = createChallenge(SECRET);
            record.expiresAt = Date.now() - 1;
            const result = verifyChallenge(record, 0);
            assert.equal(result.valid, false);
            assert.equal(result.error, 'Challenge expired');
        });

        it('rejects too-fast solve', () => {
            const { record } = createChallenge(SECRET);
            const result = verifyChallenge(record, 0);
            assert.equal(result.valid, false);
            assert.equal(result.error, 'Too fast');
        });

        it('rejects negative nonce', () => {
            const { record } = createChallenge(SECRET);
            record.createdAt = Date.now() - 1000;
            assert.equal(verifyChallenge(record, -1).valid, false);
            assert.equal(verifyChallenge(record, -1).error, 'Invalid nonce');
        });

        it('rejects float nonce', () => {
            const { record } = createChallenge(SECRET);
            record.createdAt = Date.now() - 1000;
            assert.equal(verifyChallenge(record, 1.5).valid, false);
        });

        it('rejects string nonce', () => {
            const { record } = createChallenge(SECRET);
            record.createdAt = Date.now() - 1000;
            assert.equal(verifyChallenge(record, 'abc').valid, false);
        });

        it('rejects null nonce', () => {
            const { record } = createChallenge(SECRET);
            record.createdAt = Date.now() - 1000;
            assert.equal(verifyChallenge(record, null).valid, false);
        });

        it('rejects undefined nonce', () => {
            const { record } = createChallenge(SECRET);
            record.createdAt = Date.now() - 1000;
            assert.equal(verifyChallenge(record, undefined).valid, false);
        });

        it('rejects NaN nonce', () => {
            const { record } = createChallenge(SECRET);
            record.createdAt = Date.now() - 1000;
            assert.equal(verifyChallenge(record, NaN).valid, false);
        });

        it('rejects Infinity nonce', () => {
            const { record } = createChallenge(SECRET);
            record.createdAt = Date.now() - 1000;
            assert.equal(verifyChallenge(record, Infinity).valid, false);
        });

        it('valid nonce with low difficulty succeeds', () => {
            const { record } = createChallenge(SECRET, {
                difficulty: 1,
                spaceCost: 4,
                timeCost: 1,
            });
            record.createdAt = Date.now() - 1000;

            let found = false;
            for (let nonce = 0; nonce < 100; nonce++) {
                const result = verifyChallenge(record, nonce);
                if (result.valid) {
                    found = true;
                    assert.ok(result.hash);
                    assert.equal(result.hash.length, 64);
                    break;
                }
            }
            assert.ok(found, 'Should find valid nonce within 100');
        });
    });

    describe('signToken / verifyToken', () => {
        it('round-trips payload', () => {
            const payload = {
                sub: 'test-id',
                proof: 'abc123',
                iat: Date.now(),
            };
            const token = signToken(payload, SECRET);
            const result = verifyToken(token, SECRET);
            assert.deepEqual(result, payload);
        });

        it('returns string with dot separator', () => {
            const token = signToken({ iat: Date.now() }, SECRET);
            assert.equal(typeof token, 'string');
            assert.equal(token.split('.').length, 2);
        });

        it('rejects tampered payload', () => {
            const token = signToken({ sub: 'test', iat: Date.now() }, SECRET);
            const tampered = 'x' + token.slice(1);
            assert.equal(verifyToken(tampered, SECRET), null);
        });

        it('rejects tampered signature', () => {
            const token = signToken({ sub: 'test', iat: Date.now() }, SECRET);
            const parts = token.split('.');
            const tampered = parts[0] + '.x' + parts[1].slice(1);
            assert.equal(verifyToken(tampered, SECRET), null);
        });

        it('rejects wrong secret', () => {
            const token = signToken({ sub: 'test', iat: Date.now() }, SECRET);
            assert.equal(verifyToken(token, 'wrong'), null);
        });

        it('rejects empty string', () => {
            assert.equal(verifyToken('', SECRET), null);
        });

        it('rejects token with no dot', () => {
            assert.equal(verifyToken('nodot', SECRET), null);
        });

        it('rejects token with multiple dots', () => {
            assert.equal(verifyToken('a.b.c', SECRET), null);
        });

        it('rejects expired token', () => {
            const payload = {
                sub: 'test',
                iat: Date.now() - TOKEN_TTL_MS - 1000,
            };
            const token = signToken(payload, SECRET);
            assert.equal(verifyToken(token, SECRET), null);
        });

        it('accepts token within TTL', () => {
            const payload = { sub: 'test', iat: Date.now() };
            const token = signToken(payload, SECRET);
            assert.ok(verifyToken(token, SECRET));
        });

        it('handles complex payload', () => {
            const payload = {
                sub: 'id',
                roles: ['admin'],
                nested: { a: 1 },
                iat: Date.now(),
            };
            const token = signToken(payload, SECRET);
            assert.deepEqual(verifyToken(token, SECRET), payload);
        });

        it('handles unicode in payload', () => {
            const payload = {
                name: 'ünïcödé',
                iat: Date.now(),
            };
            const token = signToken(payload, SECRET);
            assert.deepEqual(verifyToken(token, SECRET), payload);
        });
    });

    describe('exported constants', () => {
        it('CHALLENGE_TTL_MS is 120 seconds', () => {
            assert.equal(CHALLENGE_TTL_MS, 120_000);
        });

        it('TOKEN_TTL_MS is 1 hour', () => {
            assert.equal(TOKEN_TTL_MS, 3_600_000);
        });

        it('DEFAULT_SPACE_COST is 512', () => {
            assert.equal(DEFAULT_SPACE_COST, 512);
        });

        it('DEFAULT_TIME_COST is 1', () => {
            assert.equal(DEFAULT_TIME_COST, 1);
        });

        it('DEFAULT_DIFFICULTY is 10', () => {
            assert.equal(DEFAULT_DIFFICULTY, 10);
        });

        it('DELTA is 3', () => {
            assert.equal(DELTA, 3);
        });
    });
});
