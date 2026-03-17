import { sha256Bytes, toBytes } from './sha256.js';

const BLOCK_SIZE = 64;

function deriveKey(key, padding) {
    const keyBytes = toBytes(key);
    const padded = new Uint8Array(BLOCK_SIZE);

    if (keyBytes.length > BLOCK_SIZE) {
        padded.set(sha256Bytes(keyBytes));
    } else {
        padded.set(keyBytes);
    }

    const result = new Uint8Array(BLOCK_SIZE);
    for (let i = 0; i < BLOCK_SIZE; i++) {
        result[i] = padded[i] ^ padding;
    }
    return result;
}

export function hmacSha256(key, message) {
    const innerKey = deriveKey(key, 0x36);
    const outerKey = deriveKey(key, 0x5c);
    const messageBytes = toBytes(message);

    const inner = new Uint8Array(BLOCK_SIZE + messageBytes.length);
    inner.set(innerKey);
    inner.set(messageBytes, BLOCK_SIZE);
    const innerHash = sha256Bytes(inner);

    const outer = new Uint8Array(BLOCK_SIZE + 32);
    outer.set(outerKey);
    outer.set(innerHash, BLOCK_SIZE);
    return sha256Bytes(outer);
}

export function hmacSha256Hex(key, message) {
    const bytes = hmacSha256(key, message);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += (bytes[i] >>> 0).toString(16).padStart(2, '0');
    }
    return hex;
}
