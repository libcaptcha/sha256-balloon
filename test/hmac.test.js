import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { hmacSha256, hmacSha256Hex } from '../src/hmac.js';

describe('hmac-sha256', () => {
    describe('RFC 4231 test vectors', () => {
        it('test case 1: short key', () => {
            assert.equal(
                hmacSha256Hex('key', 'The quick brown fox jumps over the lazy dog'),
                'f7bc83f430538424b13298e6aa6fb143' + 'ef4d59a14946175997479dbc2d1a3cd8'
            );
        });

        it('test case 2: empty message', () => {
            assert.equal(
                hmacSha256Hex('key', ''),
                '5d5d139563c95b5967b9bd9a8c9b233a' + '9dedb45072794cd232dc1b74832607d0'
            );
        });

        it('test case 3: Jefe key', () => {
            assert.equal(
                hmacSha256Hex('Jefe', 'what do ya want for nothing?'),
                '5bdcc146bf60754e6a042426089575c7' + '5a003f089d2739839dec58b964ec3843'
            );
        });
    });

    describe('key length handling', () => {
        it('handles key shorter than block size', () => {
            const result = hmacSha256Hex('short', 'message');
            assert.equal(result.length, 64);
            assert.match(result, /^[0-9a-f]{64}$/);
        });

        it('handles key exactly 64 bytes', () => {
            const key = 'a'.repeat(64);
            const result = hmacSha256Hex(key, 'test');
            assert.equal(result.length, 64);
        });

        it('handles key longer than 64 bytes', () => {
            const key = 'k'.repeat(100);
            const result = hmacSha256Hex(key, 'test');
            assert.equal(result.length, 64);
        });

        it('handles single-byte key', () => {
            const result = hmacSha256Hex('x', 'data');
            assert.equal(result.length, 64);
        });

        it('handles empty key', () => {
            const result = hmacSha256Hex('', 'data');
            assert.equal(result.length, 64);
        });
    });

    describe('output formats', () => {
        it('hmacSha256 returns Uint8Array(32)', () => {
            const result = hmacSha256('key', 'msg');
            assert.ok(result instanceof Uint8Array);
            assert.equal(result.length, 32);
        });

        it('hex and bytes match', () => {
            const hex = hmacSha256Hex('key', 'msg');
            const bytes = hmacSha256('key', 'msg');
            let fromBytes = '';
            for (const byte of bytes) {
                fromBytes += byte.toString(16).padStart(2, '0');
            }
            assert.equal(hex, fromBytes);
        });
    });

    describe('input types', () => {
        it('accepts Uint8Array key', () => {
            const key = new Uint8Array([0x6b, 0x65, 0x79]);
            assert.equal(hmacSha256Hex(key, 'msg'), hmacSha256Hex('key', 'msg'));
        });

        it('accepts Uint8Array message', () => {
            const msg = new Uint8Array([0x6d, 0x73, 0x67]);
            assert.equal(hmacSha256Hex('key', msg), hmacSha256Hex('key', 'msg'));
        });
    });

    describe('correctness', () => {
        it('is deterministic', () => {
            const a = hmacSha256Hex('k', 'm');
            const b = hmacSha256Hex('k', 'm');
            assert.equal(a, b);
        });

        it('differs with different keys', () => {
            const a = hmacSha256Hex('key1', 'msg');
            const b = hmacSha256Hex('key2', 'msg');
            assert.notEqual(a, b);
        });

        it('differs with different messages', () => {
            const a = hmacSha256Hex('key', 'msg1');
            const b = hmacSha256Hex('key', 'msg2');
            assert.notEqual(a, b);
        });
    });

    describe('matches node:crypto', () => {
        const cases = [
            ['key', 'message'],
            ['secret', ''],
            ['k'.repeat(100), 'data'],
            ['', 'empty key'],
            ['key', 'a'.repeat(200)],
        ];
        for (const [key, msg] of cases) {
            const label = `key=${key.slice(0, 10)}` + ` msg=${msg.slice(0, 10)}`;
            it(`matches for ${label}`, () => {
                const expected = crypto.createHmac('sha256', key).update(msg).digest('hex');
                assert.equal(hmacSha256Hex(key, msg), expected);
            });
        }
    });
});
