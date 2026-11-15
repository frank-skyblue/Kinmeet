import { afterEach, describe, expect, it } from 'vitest';
import {
    USER_RATE_LIMIT_CAPACITY,
    USER_RATE_LIMIT_REFILL_PER_SECOND,
    createUserRateLimiter,
    setUserRateLimiterForTests,
    type UserRateLimiter,
} from '../../middleware/rateLimitMiddleware';

const createLimiter = (
    now: () => number,
    overrides: { capacity?: number; refillPerSecond?: number; reclaimIntervalMs?: number } = {},
): UserRateLimiter =>
    createUserRateLimiter({
        capacity: overrides.capacity ?? 5,
        refillPerSecond: overrides.refillPerSecond ?? 1,
        now,
        reclaimIntervalMs: overrides.reclaimIntervalMs ?? Number.POSITIVE_INFINITY,
    });

describe('user token bucket', () => {
    it('uses a capacity of 60 and refills one token per second', () => {
        expect(USER_RATE_LIMIT_CAPACITY).toBe(60);
        expect(USER_RATE_LIMIT_REFILL_PER_SECOND).toBe(1);
    });

    it('allows requests inside the initial capacity and rejects the next one', () => {
        const limiter = createLimiter(() => 0, { capacity: 2 });

        expect(limiter.consume('user').allowed).toBe(true);
        expect(limiter.consume('user').allowed).toBe(true);

        const denied = limiter.consume('user');
        expect(denied.allowed).toBe(false);
        if (!denied.allowed) {
            expect(denied.retryAfterSeconds).toBe(1);
        }
    });

    it('rejects a partial token and allows the request once a full token has refilled', () => {
        let now = 0;
        const limiter = createLimiter(() => now, { capacity: 1 });
        expect(limiter.consume('user').allowed).toBe(true);

        now = 500;
        expect(limiter.consume('user').allowed).toBe(false);

        now = 1000;
        expect(limiter.consume('user').allowed).toBe(true);
    });

    it('allows the request at 1000ms after 100ms retries that undershoot 1', () => {
        let nowMs = 0;
        const limiter = createLimiter(() => nowMs, { capacity: 60, refillPerSecond: 1 });

        for (let spent = 0; spent < 60; spent += 1) {
            expect(limiter.consume('user').allowed).toBe(true);
        }

        for (let step = 1; step <= 9; step += 1) {
            nowMs = step * 100;
            expect(limiter.consume('user').allowed).toBe(false);
        }

        nowMs = 1000;
        expect(limiter.consume('user').allowed).toBe(true);
        expect(limiter.consume('user').allowed).toBe(false);
    });

    it('still rejects a real balance of 0.999 tokens', () => {
        let nowMs = 0;
        const limiter = createLimiter(() => nowMs, { capacity: 1, refillPerSecond: 1 });
        expect(limiter.consume('user').allowed).toBe(true);

        nowMs = 999;
        const denied = limiter.consume('user');
        expect(denied.allowed).toBe(false);
        if (!denied.allowed) {
            expect(denied.retryAfterSeconds).toBe(1);
        }
    });

    it('keeps fractional refill across several short intervals', () => {
        let now = 0;
        const limiter = createLimiter(() => now, { capacity: 3 });
        expect(limiter.consume('user').allowed).toBe(true);
        expect(limiter.consume('user').allowed).toBe(true);
        expect(limiter.consume('user').allowed).toBe(true);

        now = 400;
        expect(limiter.consume('user').allowed).toBe(false);
        now = 800;
        expect(limiter.consume('user').allowed).toBe(false);
        now = 1200;
        expect(limiter.consume('user').allowed).toBe(true);
    });

    it('does not refill above capacity after a long idle period', () => {
        let now = 0;
        const limiter = createLimiter(() => now, { capacity: 3 });
        expect(limiter.consume('user').allowed).toBe(true);
        expect(limiter.consume('user').allowed).toBe(true);
        expect(limiter.consume('user').allowed).toBe(true);

        now = 10_000_000;
        expect(limiter.consume('user').allowed).toBe(true);
        expect(limiter.consume('user').allowed).toBe(true);
        expect(limiter.consume('user').allowed).toBe(true);
        expect(limiter.consume('user').allowed).toBe(false);
    });

    it('continues refilling while denied requests are in flight', () => {
        let now = 0;
        const limiter = createLimiter(() => now, { capacity: 1 });
        expect(limiter.consume('user').allowed).toBe(true);

        for (let step = 1; step <= 4; step += 1) {
            now = step * 200;
            expect(limiter.consume('user').allowed).toBe(false);
        }

        now = 1000;
        expect(limiter.consume('user').allowed).toBe(true);
        expect(limiter.consume('user').allowed).toBe(false);
    });

    it('does not drive the balance negative when retries happen before any time passes', () => {
        let now = 0;
        const limiter = createLimiter(() => now, { capacity: 1 });
        expect(limiter.consume('user').allowed).toBe(true);

        for (let attempt = 0; attempt < 10; attempt += 1) {
            expect(limiter.consume('user').allowed).toBe(false);
        }

        now = 1000;
        expect(limiter.consume('user').allowed).toBe(true);
        expect(limiter.consume('user').allowed).toBe(false);
    });

    it('keeps a separate bucket for each user', () => {
        const limiter = createLimiter(() => 0, { capacity: 1 });

        expect(limiter.consume('user-a').allowed).toBe(true);
        expect(limiter.consume('user-a').allowed).toBe(false);
        expect(limiter.consume('user-b').allowed).toBe(true);
    });

    it('does not allow a synchronous burst to spend more tokens than the capacity', () => {
        const limiter = createLimiter(() => 0, { capacity: 8 });
        const allowed = Array.from({ length: 20 }, () => limiter.consume('user').allowed);

        expect(allowed.filter(Boolean)).toHaveLength(8);
    });

    it('calculates Retry-After from the deficit and refill rate', () => {
        let now = 0;
        const limiter = createLimiter(() => now, { capacity: 1, refillPerSecond: 0.5 });
        expect(limiter.consume('user').allowed).toBe(true);

        const empty = limiter.consume('user');
        expect(empty.allowed).toBe(false);
        if (!empty.allowed) {
            expect(empty.retryAfterSeconds).toBe(2);
        }

        now = 500;
        const partial = limiter.consume('user');
        expect(partial.allowed).toBe(false);
        if (!partial.allowed) {
            expect(partial.retryAfterSeconds).toBe(2);
        }
    });

    it('does not sweep a full bucket before the reclaim interval', () => {
        let now = 0;
        const limiter = createLimiter(() => now, { capacity: 1, reclaimIntervalMs: 10_000 });
        expect(limiter.consume('idle').allowed).toBe(true);

        now = 5_000;
        expect(limiter.consume('other').allowed).toBe(true);
        expect(limiter.bucketCount()).toBe(2);
    });

    it('keeps a bucket that has not refilled to capacity', () => {
        let now = 0;
        const limiter = createLimiter(() => now, { capacity: 5, reclaimIntervalMs: 1_000 });
        for (let attempt = 0; attempt < 5; attempt += 1) {
            expect(limiter.consume('idle').allowed).toBe(true);
        }

        now = 2_000;
        expect(limiter.consume('other').allowed).toBe(true);
        expect(limiter.bucketCount()).toBe(2);

        expect(limiter.consume('idle').allowed).toBe(true);
        expect(limiter.consume('idle').allowed).toBe(true);
        expect(limiter.consume('idle').allowed).toBe(false);
    });

    it('removes a bucket only after it has refilled to capacity', () => {
        let now = 0;
        const limiter = createLimiter(() => now, { capacity: 5, reclaimIntervalMs: 1_000 });
        for (let attempt = 0; attempt < 5; attempt += 1) {
            expect(limiter.consume('idle').allowed).toBe(true);
        }
        expect(limiter.bucketCount()).toBe(1);

        now = 5_000;
        expect(limiter.consume('other').allowed).toBe(true);
        expect(limiter.bucketCount()).toBe(1);

        const allowed = Array.from({ length: 6 }, () => limiter.consume('idle').allowed);
        expect(allowed.filter(Boolean)).toHaveLength(5);
    });
});

describe('setUserRateLimiterForTests', () => {
    afterEach(() => {
        setUserRateLimiterForTests(null);
    });

    it('clears the test limiter when the shared limiter is restored', () => {
        const first = createLimiter(() => 0, { capacity: 1 });
        setUserRateLimiterForTests(first);
        expect(first.consume('user').allowed).toBe(true);
        expect(first.bucketCount()).toBe(1);

        setUserRateLimiterForTests(null);
        expect(first.bucketCount()).toBe(0);

        const second = createLimiter(() => 0, { capacity: 1 });
        setUserRateLimiterForTests(second);
        expect(second.bucketCount()).toBe(0);
        expect(second.consume('user').allowed).toBe(true);
    });
});
