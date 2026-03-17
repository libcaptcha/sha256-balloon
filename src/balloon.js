import { sha256Raw, digestToBytes, writeLE32, toBytes, countLeadingZeroBits } from './sha256.js';

const DELTA = 3;

function hashWithCounter(counter, scratch, scratchLength) {
    writeLE32(scratch, 0, counter);
    return sha256Raw(scratch, scratchLength);
}

function block(buffer, index) {
    return buffer.subarray(index * 32, (index + 1) * 32);
}

export function balloon(input, spaceCost, timeCost, delta = DELTA) {
    const inputBytes = toBytes(input);
    const buffer = new Uint8Array(spaceCost * 32);
    const scratch = new Uint8Array(Math.max(4 + inputBytes.length, 68));
    let counter = 0;

    scratch.set(inputBytes, 4);
    let state = hashWithCounter(counter++, scratch, 4 + inputBytes.length);
    digestToBytes(state, buffer, 0);

    for (let i = 1; i < spaceCost; i++) {
        scratch.set(block(buffer, i - 1), 4);
        state = hashWithCounter(counter++, scratch, 36);
        digestToBytes(state, buffer, i * 32);
    }

    const paramScratch = new Uint8Array(16);

    for (let t = 0; t < timeCost; t++) {
        for (let i = 0; i < spaceCost; i++) {
            const previous = (i || spaceCost) - 1;
            const current = i;

            scratch.set(block(buffer, previous), 4);
            scratch.set(block(buffer, current), 36);
            state = hashWithCounter(counter++, scratch, 68);
            digestToBytes(state, buffer, current * 32);

            for (let j = 0; j < delta; j++) {
                writeLE32(paramScratch, 0, counter++);
                writeLE32(paramScratch, 4, t);
                writeLE32(paramScratch, 8, i);
                writeLE32(paramScratch, 12, j);
                const indexState = sha256Raw(paramScratch, 16);
                const other = (indexState[0] >>> 0) % spaceCost;

                scratch.set(block(buffer, current), 4);
                scratch.set(block(buffer, other), 36);
                state = hashWithCounter(counter++, scratch, 68);
                digestToBytes(state, buffer, current * 32);
            }
        }
    }

    return block(buffer, spaceCost - 1).slice();
}

export function balloonHex(input, spaceCost, timeCost, delta = DELTA) {
    const bytes = balloon(input, spaceCost, timeCost, delta);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += (bytes[i] >>> 0).toString(16).padStart(2, '0');
    }
    return hex;
}

export function balloonRaw(
    inputBuffer,
    inputLength,
    spaceCost,
    timeCost,
    delta,
    outputBuffer,
    outputOffset
) {
    const buffer = new Uint8Array(spaceCost * 32);
    const scratch = new Uint8Array(Math.max(4 + inputLength, 68));
    let counter = 0;

    for (let i = 0; i < inputLength; i++) {
        scratch[4 + i] = inputBuffer[i];
    }
    let state = hashWithCounter(counter++, scratch, 4 + inputLength);
    digestToBytes(state, buffer, 0);

    for (let i = 1; i < spaceCost; i++) {
        scratch.set(block(buffer, i - 1), 4);
        state = hashWithCounter(counter++, scratch, 36);
        digestToBytes(state, buffer, i * 32);
    }

    const paramScratch = new Uint8Array(16);

    for (let t = 0; t < timeCost; t++) {
        for (let i = 0; i < spaceCost; i++) {
            const previous = (i || spaceCost) - 1;

            scratch.set(block(buffer, previous), 4);
            scratch.set(block(buffer, i), 36);
            state = hashWithCounter(counter++, scratch, 68);
            digestToBytes(state, buffer, i * 32);

            for (let j = 0; j < delta; j++) {
                writeLE32(paramScratch, 0, counter++);
                writeLE32(paramScratch, 4, t);
                writeLE32(paramScratch, 8, i);
                writeLE32(paramScratch, 12, j);
                const indexState = sha256Raw(paramScratch, 16);
                const other = (indexState[0] >>> 0) % spaceCost;

                scratch.set(block(buffer, i), 4);
                scratch.set(block(buffer, other), 36);
                state = hashWithCounter(counter++, scratch, 68);
                digestToBytes(state, buffer, i * 32);
            }
        }
    }

    const result = block(buffer, spaceCost - 1);
    if (outputBuffer) {
        outputBuffer.set(result, outputOffset || 0);
        return state;
    }
    return state;
}

export { DELTA, countLeadingZeroBits };
