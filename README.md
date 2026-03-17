# sha256-balloon

SHA-256, Balloon Hashing, and HMAC-signed Proof-of-Work challenges. Zero dependencies for core modules. Pure JavaScript implementation.

## Install

```bash
npm install sha256-balloon
```

## Usage

### SHA-256

```js
import { sha256Hex, sha256Bytes } from 'sha256-balloon/sha256';

sha256Hex('hello world');
// "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"

sha256Bytes('hello world');
// Uint8Array(32)
```

### HMAC-SHA256

```js
import { hmacSha256Hex } from 'sha256-balloon/hmac';

hmacSha256Hex('secret-key', 'message');
// "287a3bd8a4fc7731a94c722079055323644d8798bd291bf9878abc9b8fd4b1d0"
```

### Balloon Hashing

Memory-hard hash function (Boneh, Corrigan-Gibbs, Schechter 2016).

```js
import { balloonHex } from 'sha256-balloon/balloon';

balloonHex('password', 512, 1, 3);
// spaceCost=512, timeCost=1, delta=3
// Memory per hash: spaceCost × 32 bytes
```

### PoW Server (Express)

```js
import express from 'express';
import { powMiddleware } from 'sha256-balloon/server';

const app = express();
const pow = powMiddleware({
    secret: process.env.POW_SECRET,
    difficulty: 10, // leading zero bits
    spaceCost: 512, // memory blocks
    timeCost: 1, // mixing rounds
});

app.use(express.json());
pow.mountRoutes(app);

app.get('/protected', pow.requireToken, (req, res) => {
    res.json({ ok: true });
});
```

### PoW Client (Browser)

```js
import { solveChallenge } from 'sha256-balloon/client';

const result = await solveChallenge({
    workerUrl: '/path/to/worker.js',
    onProgress({ hashes, hashRate, workers }) {
        console.log(`${hashes} hashes @ ${hashRate}H/s`);
    },
});
// result.token — use in Authorization header
```

## Protocol

```
Client                              Server
  │  POST /challenge                  │
  │──────────────────────────────────►│
  │  { challengeId, prefix,           │
  │    difficulty, spaceCost,         │
  │    timeCost, delta }              │
  │◄──────────────────────────────────│
  │                                   │
  │  Workers mine nonce where         │
  │  Balloon(prefix+nonce) has        │
  │  ≥ difficulty leading zero bits   │
  │                                   │
  │  POST /challenge/:id/solve        │
  │  { nonce }                        │
  │──────────────────────────────────►│
  │  { token, expiresAt }             │
  │◄──────────────────────────────────│
```

## Configuration

| Option       | Default | Description                       |
| ------------ | ------- | --------------------------------- |
| `secret`     | random  | HMAC signing key                  |
| `difficulty` | 10      | Leading zero bits required        |
| `spaceCost`  | 512     | Memory blocks (N×32 bytes)        |
| `timeCost`   | 1       | Mixing rounds                     |
| `delta`      | 3       | Random block lookups per mix step |

Each +1 difficulty doubles expected solve time. Higher `spaceCost` increases memory per attempt.

## Modules

| Module    | Description               | Environment |
| --------- | ------------------------- | ----------- |
| `sha256`  | Pure SHA-256              | Universal   |
| `hmac`    | HMAC-SHA256               | Universal   |
| `balloon` | Balloon hashing           | Universal   |
| `pow`     | Challenge/token utilities | Universal   |
| `server`  | Express middleware        | Node.js     |
| `client`  | Multi-worker solver       | Browser     |
| `worker`  | Mining Web Worker         | Browser     |

## Example

```bash
npm install
npm start
# Open http://localhost:3000
```

## Test

```bash
npm test
```

## Formatting

```bash
npx prtfm
```

## License

[MIT](LICENSE)
