import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
    sha256,
    sha256Hex,
    sha256Bytes,
    sha256Raw,
    digestToBytes,
    countLeadingZeroBits,
    countLeadingZeroBitsBytes,
    writeLE32,
    toBytes,
} from '../src/sha256.js';

describe('sha256', () => {
    describe('NIST test vectors', () => {
        it('hashes empty string', () => {
            assert.equal(
                sha256Hex(''),
                'e3b0c44298fc1c149afbf4c8996fb924' + '27ae41e4649b934ca495991b7852b855'
            );
        });

        it("hashes 'abc'", () => {
            assert.equal(
                sha256Hex('abc'),
                'ba7816bf8f01cfea414140de5dae2223' + 'b00361a396177a9cb410ff61f20015ad'
            );
        });

        it('hashes 448-bit message', () => {
            const msg = 'abcdbcdecdefdefgefghfghighij' + 'hijkijkljklmklmnlmnomnopnopq';
            assert.equal(
                sha256Hex(msg),
                '248d6a61d20638b8e5c026930c3e6039' + 'a33ce45964ff2167f6ecedd419db06c1'
            );
        });

        it('hashes 896-bit message', () => {
            const msg =
                'abcdefghbcdefghicdefghijdefghijk' +
                'efghijklfghijklmghijklmnhijklmno' +
                'ijklmnopjklmnopqklmnopqrlmnopqrs' +
                'mnopqrstnopqrstu';
            assert.equal(
                sha256Hex(msg),
                'cf5b16a778af8380036ce59e7b049237' + '0b249b11e8f07a51afac45037afee9d1'
            );
        });
    });

    describe('output formats', () => {
        it('sha256 returns Uint32Array of length 8', () => {
            const state = sha256('test');
            assert.ok(state instanceof Uint32Array);
            assert.equal(state.length, 8);
        });

        it('sha256Hex returns 64-char lowercase hex', () => {
            const hex = sha256Hex('test');
            assert.equal(hex.length, 64);
            assert.match(hex, /^[0-9a-f]{64}$/);
        });

        it('sha256Bytes returns Uint8Array(32)', () => {
            const bytes = sha256Bytes('test');
            assert.ok(bytes instanceof Uint8Array);
            assert.equal(bytes.length, 32);
        });

        it('hex and bytes are consistent', () => {
            const hex = sha256Hex('consistency');
            const bytes = sha256Bytes('consistency');
            let fromBytes = '';
            for (const byte of bytes) {
                fromBytes += byte.toString(16).padStart(2, '0');
            }
            assert.equal(hex, fromBytes);
        });
    });

    describe('input types', () => {
        it('accepts string', () => {
            const hex = sha256Hex('abc');
            assert.match(hex, /^[0-9a-f]{64}$/);
        });

        it('accepts Uint8Array', () => {
            const input = new Uint8Array([0x61, 0x62, 0x63]);
            assert.equal(sha256Hex(input), sha256Hex('abc'));
        });

        it('accepts other typed arrays via toBytes', () => {
            const buf = new Uint16Array([0x6261, 0x0063]);
            const bytes = toBytes(buf);
            assert.ok(bytes instanceof Uint8Array);
        });

        it('throws on number input', () => {
            assert.throws(() => sha256Hex(42), TypeError);
        });

        it('throws on null input', () => {
            assert.throws(() => sha256Hex(null), TypeError);
        });

        it('throws on undefined input', () => {
            assert.throws(() => sha256Hex(undefined), TypeError);
        });
    });

    describe('padding boundaries', () => {
        it('55 bytes (fits in 1 block)', () => {
            const hex = sha256Hex('a'.repeat(55));
            assert.equal(hex.length, 64);
        });

        it('56 bytes (needs 2 blocks)', () => {
            const hex = sha256Hex('a'.repeat(56));
            assert.equal(hex.length, 64);
        });

        it('63 bytes', () => {
            const hex = sha256Hex('a'.repeat(63));
            assert.equal(hex.length, 64);
        });

        it('64 bytes (exactly 1 block + padding)', () => {
            const hex = sha256Hex('a'.repeat(64));
            assert.equal(hex.length, 64);
        });

        it('119 bytes (fits in 2 blocks)', () => {
            const hex = sha256Hex('a'.repeat(119));
            assert.equal(hex.length, 64);
        });

        it('120 bytes (needs 3 blocks)', () => {
            const hex = sha256Hex('a'.repeat(120));
            assert.equal(hex.length, 64);
        });

        it('single zero byte', () => {
            assert.equal(
                sha256Hex(new Uint8Array([0x00])),
                '6e340b9cffb37a989ca544e6bb780a2c' + '78901d3fb33738768511a30617afa01d'
            );
        });

        it("1000 bytes of 'a'", () => {
            assert.equal(
                sha256Hex('a'.repeat(1000)),
                '41edece42d63e8d9bf515a9ba6932e1c' + '20cbc9f5a5d134645adb5db1b9737ea3'
            );
        });
    });

    describe('matches node:crypto', () => {
        const vectors = [
            '',
            'a',
            'abc',
            'hello world',
            'The quick brown fox jumps over the lazy dog',
            'x'.repeat(100),
            'z'.repeat(200),
            '\x00\x01\x02\x03',
            '\xff\xfe\xfd',
        ];
        for (const input of vectors) {
            const label =
                input.length > 20 ? `${input.slice(0, 20)}... (${input.length}b)` : `"${input}"`;
            it(`matches for ${label}`, () => {
                const expected = crypto.createHash('sha256').update(input).digest('hex');
                assert.equal(sha256Hex(input), expected);
            });
        }
    });

    describe('binary inputs match node:crypto', () => {
        it('random 128-byte buffer', () => {
            const buf = crypto.randomBytes(128);
            const expected = crypto.createHash('sha256').update(buf).digest('hex');
            assert.equal(sha256Hex(new Uint8Array(buf)), expected);
        });

        it('all 0xff bytes', () => {
            const buf = new Uint8Array(64).fill(0xff);
            const expected = crypto.createHash('sha256').update(buf).digest('hex');
            assert.equal(sha256Hex(buf), expected);
        });
    });

    describe('sha256Raw', () => {
        it('hashes raw buffer with explicit length', () => {
            const data = new Uint8Array([0x61, 0x62, 0x63, 0x00, 0x00]);
            const state = sha256Raw(data, 3);
            assert.equal(stateToHex(state), sha256Hex('abc'));
        });

        it('ignores bytes past length', () => {
            const data = new Uint8Array(10).fill(0x61);
            const a = sha256Raw(data, 5);
            const b = sha256Hex('aaaaa');
            assert.equal(stateToHex(a), b);
        });
    });

    describe('digestToBytes', () => {
        it('writes state into target at offset', () => {
            const state = sha256('abc');
            const target = new Uint8Array(64);
            digestToBytes(state, target, 16);
            const bytes = sha256Bytes('abc');
            assert.deepEqual(target.subarray(16, 48), bytes);
        });

        it('writes at offset 0', () => {
            const state = sha256('test');
            const target = new Uint8Array(32);
            digestToBytes(state, target, 0);
            assert.deepEqual(target, sha256Bytes('test'));
        });
    });

    describe('countLeadingZeroBits', () => {
        it('returns 256 for all-zero state', () => {
            assert.equal(countLeadingZeroBits(new Uint32Array(8)), 256);
        });

        it('returns 0 for MSB set', () => {
            const state = new Uint32Array(8);
            state[0] = 0x80000000;
            assert.equal(countLeadingZeroBits(state), 0);
        });

        it('counts 8 leading zeros', () => {
            const state = new Uint32Array(8);
            state[0] = 0x00ff0000;
            assert.equal(countLeadingZeroBits(state), 8);
        });

        it('skips zero words', () => {
            const state = new Uint32Array(8);
            state[0] = 0;
            state[1] = 0x0000ff00;
            assert.equal(countLeadingZeroBits(state), 48);
        });

        it('handles last word only', () => {
            const state = new Uint32Array(8);
            state[7] = 1;
            assert.equal(countLeadingZeroBits(state), 255);
        });
    });

    describe('countLeadingZeroBitsBytes', () => {
        it('returns n*8 for all zeros', () => {
            assert.equal(countLeadingZeroBitsBytes(new Uint8Array(32)), 256);
        });

        it('counts byte-level zeros + bit offset', () => {
            const bytes = new Uint8Array(32);
            bytes[0] = 0x0f;
            assert.equal(countLeadingZeroBitsBytes(bytes), 4);
        });

        it('handles leading zero bytes then bit', () => {
            const bytes = new Uint8Array(32);
            bytes[2] = 0x01;
            assert.equal(countLeadingZeroBitsBytes(bytes), 23);
        });

        it('returns 0 for 0x80 first byte', () => {
            const bytes = new Uint8Array(32);
            bytes[0] = 0x80;
            assert.equal(countLeadingZeroBitsBytes(bytes), 0);
        });
    });

    describe('writeLE32', () => {
        it('writes little-endian uint32', () => {
            const buf = new Uint8Array(4);
            writeLE32(buf, 0, 0x04030201);
            assert.deepEqual(buf, new Uint8Array([1, 2, 3, 4]));
        });

        it('writes at offset', () => {
            const buf = new Uint8Array(8);
            writeLE32(buf, 4, 0xdeadbeef);
            assert.equal(buf[4], 0xef);
            assert.equal(buf[5], 0xbe);
            assert.equal(buf[6], 0xad);
            assert.equal(buf[7], 0xde);
        });

        it('handles zero', () => {
            const buf = new Uint8Array(4).fill(0xff);
            writeLE32(buf, 0, 0);
            assert.deepEqual(buf, new Uint8Array(4));
        });
    });

    describe('toBytes', () => {
        it('returns Uint8Array as-is', () => {
            const arr = new Uint8Array([1, 2, 3]);
            assert.strictEqual(toBytes(arr), arr);
        });

        it('encodes string to utf-8', () => {
            const bytes = toBytes('abc');
            assert.deepEqual(bytes, new Uint8Array([0x61, 0x62, 0x63]));
        });

        it('encodes unicode correctly', () => {
            const bytes = toBytes('ü');
            assert.equal(bytes.length, 2);
        });
    });
});

function stateToHex(state) {
    let hex = '';
    for (let i = 0; i < 8; i++) {
        hex += (state[i] >>> 0).toString(16).padStart(8, '0');
    }
    return hex;
}
