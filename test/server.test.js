import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { powMiddleware } from '../src/server.js';

describe('server middleware', () => {
    let pow;

    beforeEach(() => {
        pow = powMiddleware({
            secret: 'test-server-secret',
            difficulty: 1,
            spaceCost: 4,
            timeCost: 1,
        });
    });

    describe('powMiddleware factory', () => {
        it('returns all handler functions', () => {
            assert.equal(typeof pow.handleChallenge, 'function');
            assert.equal(typeof pow.handleSolve, 'function');
            assert.equal(typeof pow.requireToken, 'function');
            assert.equal(typeof pow.mountRoutes, 'function');
        });

        it('works without options', () => {
            const defaultPow = powMiddleware();
            assert.equal(typeof defaultPow.handleChallenge, 'function');
        });
    });

    describe('handleChallenge', () => {
        it('responds with challenge JSON', () => {
            let sent = null;
            const response = {
                json(data) {
                    sent = data;
                },
            };
            pow.handleChallenge({}, response);
            assert.ok(sent);
            assert.ok(sent.challengeId);
            assert.ok(sent.prefix);
            assert.equal(sent.difficulty, 1);
            assert.equal(sent.spaceCost, 4);
            assert.equal(sent.timeCost, 1);
            assert.equal(sent.delta, 3);
        });
    });

    describe('handleSolve', () => {
        it('rejects unknown challenge ID', () => {
            let statusCode = null;
            let sent = null;
            const response = {
                status(code) {
                    statusCode = code;
                    return response;
                },
                json(data) {
                    sent = data;
                },
            };
            pow.handleSolve({ params: { id: 'nonexistent' }, body: {} }, response);
            assert.equal(statusCode, 400);
            assert.equal(sent.error, 'Unknown challenge');
        });
    });

    describe('requireToken', () => {
        it('rejects missing authorization header', () => {
            let statusCode = null;
            let sent = null;
            const response = {
                status(code) {
                    statusCode = code;
                    return response;
                },
                json(data) {
                    sent = data;
                },
            };
            pow.requireToken({ headers: {} }, response, () => {});
            assert.equal(statusCode, 401);
            assert.equal(sent.error, 'No token');
        });

        it('rejects non-Bearer authorization', () => {
            let statusCode = null;
            let sent = null;
            const response = {
                status(code) {
                    statusCode = code;
                    return response;
                },
                json(data) {
                    sent = data;
                },
            };
            pow.requireToken({ headers: { authorization: 'Basic abc' } }, response, () => {});
            assert.equal(statusCode, 401);
        });

        it('rejects invalid token', () => {
            let statusCode = null;
            let sent = null;
            const response = {
                status(code) {
                    statusCode = code;
                    return response;
                },
                json(data) {
                    sent = data;
                },
            };
            pow.requireToken({ headers: { authorization: 'Bearer invalid' } }, response, () => {});
            assert.equal(statusCode, 401);
            assert.equal(sent.error, 'Invalid token');
        });
    });

    describe('mountRoutes', () => {
        it('registers POST routes on router', () => {
            const routes = [];
            const router = {
                post(path, handler) {
                    routes.push({ path, handler });
                },
            };
            const result = pow.mountRoutes(router);
            assert.equal(result, router);
            assert.equal(routes.length, 2);
            assert.equal(routes[0].path, '/challenge');
            assert.equal(routes[1].path, '/challenge/:id/solve');
        });
    });
});
