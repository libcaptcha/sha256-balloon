export function solveChallenge({ baseUrl = '', workerUrl = './worker.js', onProgress } = {}) {
    return requestAndSolve(baseUrl, workerUrl, onProgress);
}

async function requestAndSolve(baseUrl, workerUrl, onProgress) {
    const response = await fetch(`${baseUrl}/challenge`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to get challenge');

    const challenge = await response.json();
    const workerCount = navigator.hardwareConcurrency || 4;

    const result = await mineWithWorkers(challenge, workerCount, workerUrl, onProgress);

    const solveResponse = await fetch(`${baseUrl}/challenge/${challenge.challengeId}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce: result.nonce }),
    });

    if (!solveResponse.ok) {
        const error = await solveResponse.json();
        throw new Error(error.error || 'Verification failed');
    }

    const verification = await solveResponse.json();
    return { ...verification, ...result, workerCount };
}

function mineWithWorkers(challenge, workerCount, workerUrl, onProgress) {
    return new Promise((resolve, reject) => {
        const workers = [];
        let totalHashes = 0;
        let resolved = false;
        const startTime = performance.now();

        function cleanup() {
            workers.forEach((worker) => worker.terminate());
        }

        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker(workerUrl, { type: 'module' });
            workers.push(worker);

            worker.onmessage = ({ data }) => {
                if (resolved) return;

                if (data.type === 'solution') {
                    resolved = true;
                    cleanup();
                    totalHashes += data.hashes;
                    const elapsed = performance.now() - startTime;
                    resolve({
                        nonce: data.nonce,
                        totalHashes,
                        elapsed: Math.round(elapsed),
                        hashRate: Math.round(totalHashes / (elapsed / 1000)),
                    });
                    return;
                }

                totalHashes += data.hashes;
                if (!onProgress) return;
                const elapsed = performance.now() - startTime;
                onProgress({
                    hashes: totalHashes,
                    hashRate: Math.round(totalHashes / (elapsed / 1000)),
                    workers: workerCount,
                });
            };

            worker.onerror = (error) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                reject(new Error(error.message));
            };

            worker.postMessage({
                prefix: challenge.prefix,
                difficulty: challenge.difficulty,
                spaceCost: challenge.spaceCost,
                timeCost: challenge.timeCost,
                delta: challenge.delta,
                workerId: i,
                workerCount,
            });
        }
    });
}
