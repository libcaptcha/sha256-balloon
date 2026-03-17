import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { balloon, balloonHex, balloonRaw } from '../src/balloon.js';

describe('balloon', () => {
    describe('output format', () => {
        it('returns Uint8Array of 32 bytes', () => {
            const result = balloon('test', 4, 1, 3);
            assert.ok(result instanceof Uint8Array);
            assert.equal(result.length, 32);
        });

        it('returns 64-char hex string', () => {
            const hex = balloonHex('test', 4, 1, 3);
            assert.equal(hex.length, 64);
            assert.match(hex, /^[0-9a-f]{64}$/);
        });

        it('hex and bytes are consistent', () => {
            const hex = balloonHex('test', 4, 1);
            const bytes = balloon('test', 4, 1);
            let fromBytes = '';
            for (const byte of bytes) {
                fromBytes += byte.toString(16).padStart(2, '0');
            }
            assert.equal(hex, fromBytes);
        });
    });

    describe('determinism', () => {
        it('produces identical output on repeated calls', () => {
            const a = balloonHex('input', 8, 1, 3);
            const b = balloonHex('input', 8, 1, 3);
            assert.equal(a, b);
        });

        it('is stable across 10 iterations', () => {
            const expected = balloonHex('stable', 4, 1, 3);
            for (let i = 0; i < 10; i++) {
                assert.equal(balloonHex('stable', 4, 1, 3), expected);
            }
        });
    });

    describe('sensitivity', () => {
        it('differs with different input', () => {
            const a = balloonHex('input1', 8, 1, 3);
            const b = balloonHex('input2', 8, 1, 3);
            assert.notEqual(a, b);
        });

        it('differs with different spaceCost', () => {
            const a = balloonHex('test', 4, 1, 3);
            const b = balloonHex('test', 8, 1, 3);
            assert.notEqual(a, b);
        });

        it('differs with different timeCost', () => {
            const a = balloonHex('test', 4, 1, 3);
            const b = balloonHex('test', 4, 2, 3);
            assert.notEqual(a, b);
        });

        it('differs with different delta', () => {
            const a = balloonHex('test', 4, 1, 2);
            const b = balloonHex('test', 4, 1, 3);
            assert.notEqual(a, b);
        });

        it('single bit change flips ~50% of bits', () => {
            const a = balloon('test0', 8, 1, 3);
            const b = balloon('test1', 8, 1, 3);
            let diffBits = 0;
            for (let i = 0; i < 32; i++) {
                let xor = a[i] ^ b[i];
                while (xor) {
                    diffBits += xor & 1;
                    xor >>= 1;
                }
            }
            assert.ok(
                diffBits > 80 && diffBits < 176,
                `Expected ~128 bits to differ, got ${diffBits}`
            );
        });
    });

    describe('parameters', () => {
        it('default delta is 3', () => {
            const withDefault = balloonHex('test', 4, 1);
            const withExplicit = balloonHex('test', 4, 1, 3);
            assert.equal(withDefault, withExplicit);
        });

        it('works with spaceCost=1', () => {
            const hex = balloonHex('test', 1, 1, 3);
            assert.equal(hex.length, 64);
        });

        it('works with spaceCost=2', () => {
            const hex = balloonHex('test', 2, 1, 3);
            assert.equal(hex.length, 64);
        });

        it('works with timeCost=0 (no mixing)', () => {
            const hex = balloonHex('test', 4, 0, 3);
            assert.equal(hex.length, 64);
        });

        it('works with timeCost=3', () => {
            const hex = balloonHex('test', 4, 3, 3);
            assert.equal(hex.length, 64);
        });

        it('works with delta=0', () => {
            const hex = balloonHex('test', 4, 1, 0);
            assert.equal(hex.length, 64);
        });

        it('works with delta=1', () => {
            const hex = balloonHex('test', 4, 1, 1);
            assert.equal(hex.length, 64);
        });

        it('works with larger spaceCost=64', () => {
            const hex = balloonHex('test', 64, 1, 3);
            assert.equal(hex.length, 64);
        });
    });

    describe('input types', () => {
        it('accepts string input', () => {
            const hex = balloonHex('hello', 4, 1, 3);
            assert.equal(hex.length, 64);
        });

        it('accepts Uint8Array input', () => {
            const input = new TextEncoder().encode('hello');
            const a = balloonHex('hello', 4, 1, 3);
            const b = balloonHex(input, 4, 1, 3);
            assert.equal(a, b);
        });

        it('handles empty string', () => {
            const hex = balloonHex('', 4, 1, 3);
            assert.equal(hex.length, 64);
        });

        it('handles long input', () => {
            const hex = balloonHex('x'.repeat(500), 4, 1, 3);
            assert.equal(hex.length, 64);
        });
    });

    describe('balloonRaw', () => {
        it('returns Uint32Array state', () => {
            const state = balloonRaw(new TextEncoder().encode('test'), 4, 4, 1, 3, null, 0);
            assert.ok(state instanceof Uint32Array);
            assert.equal(state.length, 8);
        });

        it('writes to output buffer', () => {
            const output = new Uint8Array(32);
            balloonRaw(new TextEncoder().encode('test'), 4, 4, 1, 3, output, 0);
            const hasNonZero = output.some((b) => b !== 0);
            assert.ok(hasNonZero);
        });

        it('raw and high-level match', () => {
            const input = 'test';
            const encoded = new TextEncoder().encode(input);
            const expected = balloon(input, 4, 1, 3);
            const output = new Uint8Array(32);
            balloonRaw(encoded, encoded.length, 4, 1, 3, output, 0);
            assert.deepEqual(output, expected);
        });
    });

    describe('memory hardness property', () => {
        it('larger spaceCost takes longer', () => {
            const start1 = performance.now();
            balloonHex('bench', 16, 1, 3);
            const time1 = performance.now() - start1;

            const start2 = performance.now();
            balloonHex('bench', 128, 1, 3);
            const time2 = performance.now() - start2;

            assert.ok(
                time2 > time1,
                `spaceCost=128 (${time2}ms) should be slower` + ` than spaceCost=16 (${time1}ms)`
            );
        });
    });
});
