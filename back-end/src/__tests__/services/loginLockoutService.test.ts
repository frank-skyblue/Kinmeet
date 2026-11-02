import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getLoginIpLimitConfig, getLoginLockoutConfig } from '../../config/env';
import { LoginLockout } from '../../models/LoginLockout';
import { loginLockoutService } from '../../services/loginLockoutService';

const EMAIL = 'lockout@example.com';

const at = (iso: string) => new Date(iso);

const withThreshold = async (maxAttempts: string, run: () => Promise<void>) => {
    process.env.LOGIN_LOCKOUT_MAX_ATTEMPTS = maxAttempts;
    try {
        await run();
    } finally {
        delete process.env.LOGIN_LOCKOUT_MAX_ATTEMPTS;
    }
};

describe('loginLockoutService', () => {
    beforeAll(async () => {
        await LoginLockout.createIndexes();
    });

    afterEach(() => {
        delete process.env.LOGIN_LOCKOUT_MAX_ATTEMPTS;
    });

    it('locks on the fifth failure inside the window and ignores a later failure', async () => {
        const start = at('2026-01-01T00:00:00.000Z');
        const { durationMs } = getLoginLockoutConfig();
        let lastJustLocked = false;
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const outcome = await loginLockoutService.recordFailure(
                EMAIL,
                new Date(start.getTime() + attempt * 1000),
            );
            lastJustLocked = outcome.justLocked;
        }
        expect(lastJustLocked).toBe(true);

        const locked = await LoginLockout.findOne({ email: EMAIL });
        const fifthAt = new Date(start.getTime() + 4000);
        expect(locked?.failedAt).toHaveLength(5);
        expect(locked?.lockedUntil).toEqual(new Date(fifthAt.getTime() + durationMs));

        const duringLock = await loginLockoutService.recordFailure(
            EMAIL,
            new Date(fifthAt.getTime() + 1000),
        );
        expect(duringLock.justLocked).toBe(false);
        expect(duringLock.failedAt.map((stamp) => stamp.getTime())).toEqual(
            locked?.failedAt.map((stamp) => stamp.getTime()),
        );
        expect(duringLock.lockedUntil).toEqual(locked?.lockedUntil);
        expect(duringLock.expiresAt).toEqual(locked?.expiresAt);
    });

    it('drops a timestamp that is exactly one window old', async () => {
        const { windowMs } = getLoginLockoutConfig();
        const now = at('2026-02-01T00:15:00.000Z');
        await loginLockoutService.recordFailure(EMAIL, new Date(now.getTime() - windowMs));

        const outcome = await loginLockoutService.recordFailure(EMAIL, now);

        expect(outcome.failedAt).toHaveLength(1);
        expect(outcome.failedAt[0]).toEqual(now);
        expect(outcome.locked).toBe(false);
    });

    it('keeps a timestamp one millisecond inside the window', async () => {
        const { windowMs } = getLoginLockoutConfig();
        const now = at('2026-02-01T00:15:00.000Z');
        const kept = new Date(now.getTime() - windowMs + 1);
        await loginLockoutService.recordFailure(EMAIL, kept);

        const outcome = await loginLockoutService.recordFailure(EMAIL, now);

        expect(outcome.failedAt.map((stamp) => stamp.getTime())).toEqual([
            kept.getTime(),
            now.getTime(),
        ]);
    });

    it('sets expiresAt from the newest timestamp, not the last array slot', async () => {
        const { windowMs } = getLoginLockoutConfig();
        const later = at('2026-04-01T00:10:00.000Z');
        const earlier = at('2026-04-01T00:05:00.000Z');
        await loginLockoutService.recordFailure(EMAIL, later);
        const outcome = await loginLockoutService.recordFailure(EMAIL, earlier);

        expect(outcome.failedAt.map((stamp) => stamp.getTime())).toEqual([
            later.getTime(),
            earlier.getTime(),
        ]);
        expect(outcome.expiresAt).toEqual(new Date(later.getTime() + windowMs));
    });

    it('locks on the first failure when the threshold is 1, including after a lock expires', async () => {
        await withThreshold('1', async () => {
            const { durationMs } = getLoginLockoutConfig();
            const firstAt = at('2026-03-01T00:00:00.000Z');
            const first = await loginLockoutService.recordFailure(EMAIL, firstAt);
            expect(first.justLocked).toBe(true);
            expect(first.failedAt).toHaveLength(1);
            expect(first.lockedUntil).toEqual(new Date(firstAt.getTime() + durationMs));

            const atExpiry = new Date(firstAt.getTime() + durationMs);
            const second = await loginLockoutService.recordFailure(EMAIL, atExpiry);
            expect(second.justLocked).toBe(true);
            expect(second.failedAt).toEqual([atExpiry]);
            expect(second.lockedUntil).toEqual(new Date(atExpiry.getTime() + durationMs));
        });
    });

    it('uses the configured cap instead of a fixed five', async () => {
        await withThreshold('8', async () => {
            const start = at('2026-05-01T00:00:00.000Z');
            for (let attempt = 0; attempt < 7; attempt += 1) {
                const outcome = await loginLockoutService.recordFailure(
                    EMAIL,
                    new Date(start.getTime() + attempt * 1000),
                );
                expect(outcome.locked).toBe(false);
                expect(outcome.failedAt).toHaveLength(attempt + 1);
            }
            const eighth = await loginLockoutService.recordFailure(
                EMAIL,
                new Date(start.getTime() + 7000),
            );
            expect(eighth.justLocked).toBe(true);
            expect(eighth.failedAt).toHaveLength(8);
        });
    });

    it('clears failure state and gives the empty document a TTL, then the next failure starts over', async () => {
        const first = at('2026-06-01T00:00:00.000Z');
        const second = at('2026-06-01T00:01:00.000Z');
        const clearedAt = at('2026-06-01T00:02:00.000Z');
        await loginLockoutService.recordFailure(EMAIL, first);
        await loginLockoutService.recordFailure(EMAIL, second);

        const decision = await loginLockoutService.clearIfUnlocked(EMAIL, clearedAt);
        expect(decision).toBe('cleared');

        const emptied = await LoginLockout.findOne({ email: EMAIL });
        expect(emptied?.failedAt).toEqual([]);
        expect(emptied?.lockedUntil).toBeNull();
        expect(emptied?.justLocked).toBe(false);
        expect(emptied?.expiresAt).toEqual(clearedAt);

        const next = await loginLockoutService.recordFailure(EMAIL, at('2026-06-01T00:03:00.000Z'));
        expect(next.failedAt).toHaveLength(1);
        expect(next.locked).toBe(false);
    });

    it('does not clear an active lock, and a failure after a clear is kept', async () => {
        const start = at('2026-07-01T00:00:00.000Z');
        for (let attempt = 0; attempt < 5; attempt += 1) {
            await loginLockoutService.recordFailure(EMAIL, new Date(start.getTime() + attempt * 1000));
        }
        const locked = await LoginLockout.findOne({ email: EMAIL });
        const decision = await loginLockoutService.clearIfUnlocked(
            EMAIL,
            new Date(start.getTime() + 10_000),
        );
        expect(decision).toBe('locked');
        const stillLocked = await LoginLockout.findOne({ email: EMAIL });
        expect(stillLocked?.failedAt.map((stamp) => stamp.getTime())).toEqual(
            locked?.failedAt.map((stamp) => stamp.getTime()),
        );
        expect(stillLocked?.lockedUntil).toEqual(locked?.lockedUntil);

        await LoginLockout.deleteMany({});
        await loginLockoutService.recordFailure(EMAIL, start);
        const cleared = await loginLockoutService.clearIfUnlocked(EMAIL, new Date(start.getTime() + 1000));
        expect(cleared).toBe('cleared');
        const kept = await loginLockoutService.recordFailure(EMAIL, new Date(start.getTime() + 2000));
        expect(kept.failedAt).toHaveLength(1);
    });

    it('clearIfUnlocked reports a missing document without creating one', async () => {
        const decision = await loginLockoutService.clearIfUnlocked(EMAIL, at('2026-08-01T00:00:00.000Z'));
        expect(decision).toBe('absent');
        expect(await LoginLockout.countDocuments({ email: EMAIL })).toBe(0);
    });

    it('release removes a lock, and a later failure does not inherit it', async () => {
        const start = at('2026-09-01T00:00:00.000Z');
        for (let attempt = 0; attempt < 5; attempt += 1) {
            await loginLockoutService.recordFailure(EMAIL, new Date(start.getTime() + attempt * 1000));
        }
        const released = await loginLockoutService.releaseForPasswordReset(
            EMAIL,
            new Date(start.getTime() + 10_000),
        );
        expect(released).toBe(true);
        expect(await LoginLockout.findOne({ email: EMAIL })).toBeNull();

        const fresh = await loginLockoutService.recordFailure(EMAIL, new Date(start.getTime() + 20_000));
        expect(fresh.failedAt).toHaveLength(1);
        expect(fresh.locked).toBe(false);
    });

    it('keeps every successful concurrent failure up to the configured cap', async () => {
        const now = at('2026-10-01T00:00:00.000Z');
        await Promise.all(
            Array.from({ length: 8 }, () => loginLockoutService.recordFailure(EMAIL, now)),
        );
        const doc = await LoginLockout.findOne({ email: EMAIL });
        expect(doc?.failedAt).toHaveLength(getLoginLockoutConfig().maxAttempts);
        expect(doc?.lockedUntil).toEqual(new Date(now.getTime() + getLoginLockoutConfig().durationMs));
        expect(await LoginLockout.countDocuments({ email: EMAIL })).toBe(1);
        const stored = await LoginLockout.collection.findOne({ email: EMAIL });
        expect(stored).not.toHaveProperty('activeLock');
        expect(stored).not.toHaveProperty('retained');
        expect(stored).not.toHaveProperty('nextFailedAt');
        expect(stored).not.toHaveProperty('reached');
        expect(stored).not.toHaveProperty('newestFailure');
    });

    it('retries a duplicate-key insert and does not retry other write errors', async () => {
        const duplicate = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
        const storedAt = at('2026-11-01T00:00:00.000Z');
        const stored = {
            failedAt: [storedAt],
            lockedUntil: null,
            justLocked: false,
            expiresAt: at('2026-11-01T00:15:00.000Z'),
        };
        const update = vi.spyOn(LoginLockout, 'findOneAndUpdate')
            .mockRejectedValueOnce(duplicate)
            .mockResolvedValueOnce(stored as never);

        const outcome = await loginLockoutService.recordFailure(EMAIL, storedAt);
        expect(update).toHaveBeenCalledTimes(2);
        expect(outcome.failedAt).toEqual([storedAt]);
        expect(outcome.locked).toBe(false);
        update.mockRestore();

        const network = vi.spyOn(LoginLockout, 'findOneAndUpdate')
            .mockRejectedValueOnce(new Error('network'));
        await expect(loginLockoutService.recordFailure(EMAIL, storedAt)).rejects.toThrow('network');
        expect(network).toHaveBeenCalledTimes(1);
        network.mockRestore();
    });

    it('rejects a non-positive lockout threshold', () => {
        process.env.LOGIN_LOCKOUT_MAX_ATTEMPTS = '0';
        expect(() => getLoginLockoutConfig()).toThrow(/LOGIN_LOCKOUT_MAX_ATTEMPTS/);
        delete process.env.LOGIN_LOCKOUT_MAX_ATTEMPTS;
    });

    it('rejects lockout numbers JavaScript cannot represent exactly', () => {
        process.env.LOGIN_LOCKOUT_MAX_ATTEMPTS = '9'.repeat(20);
        expect(() => getLoginLockoutConfig()).toThrow(/LOGIN_LOCKOUT_MAX_ATTEMPTS/);
        delete process.env.LOGIN_LOCKOUT_MAX_ATTEMPTS;
        process.env.LOGIN_LOCKOUT_WINDOW_MS = '9007199254740993';
        expect(() => getLoginLockoutConfig()).toThrow(/LOGIN_LOCKOUT_WINDOW_MS/);
        delete process.env.LOGIN_LOCKOUT_WINDOW_MS;
    });

    it('accepts the largest $slice count and rejects one past it', () => {
        process.env.LOGIN_LOCKOUT_MAX_ATTEMPTS = String(2 ** 31);
        expect(getLoginLockoutConfig().maxAttempts).toBe(2 ** 31);
        process.env.LOGIN_LOCKOUT_MAX_ATTEMPTS = String(2 ** 31 + 1);
        expect(() => getLoginLockoutConfig()).toThrow(/LOGIN_LOCKOUT_MAX_ATTEMPTS must be at most 2147483648/);
        delete process.env.LOGIN_LOCKOUT_MAX_ATTEMPTS;
    });

    it('accepts a lockout duration at the Date limit and rejects one millisecond past it', () => {
        const now = 1_700_000_000_000;
        const maxDistance = 8_640_000_000_000_000 - now;
        vi.spyOn(Date, 'now').mockReturnValue(now);
        try {
            process.env.LOGIN_LOCKOUT_DURATION_MS = String(maxDistance);
            expect(getLoginLockoutConfig().durationMs).toBe(maxDistance);
            process.env.LOGIN_LOCKOUT_WINDOW_MS = String(maxDistance + 1);
            expect(() => getLoginLockoutConfig()).toThrow(
                new RegExp(`LOGIN_LOCKOUT_WINDOW_MS must be at most ${maxDistance}`),
            );
        } finally {
            vi.restoreAllMocks();
            delete process.env.LOGIN_LOCKOUT_DURATION_MS;
            delete process.env.LOGIN_LOCKOUT_WINDOW_MS;
        }
    });

    it('accepts the largest IP window Node can time and rejects one millisecond past it', () => {
        try {
            process.env.LOGIN_IP_WINDOW_MS = String(2 ** 31 - 1);
            expect(getLoginIpLimitConfig().windowMs).toBe(2 ** 31 - 1);
            process.env.LOGIN_IP_WINDOW_MS = String(2 ** 31);
            expect(() => getLoginIpLimitConfig()).toThrow(/LOGIN_IP_WINDOW_MS must be at most 2147483647/);
            delete process.env.LOGIN_IP_WINDOW_MS;
            process.env.LOGIN_IP_MAX_ATTEMPTS = String(Number.MAX_SAFE_INTEGER);
            expect(getLoginIpLimitConfig().maxAttempts).toBe(Number.MAX_SAFE_INTEGER);
        } finally {
            delete process.env.LOGIN_IP_WINDOW_MS;
            delete process.env.LOGIN_IP_MAX_ATTEMPTS;
        }
    });

    it('uses 20 failed attempts per 15 minutes as the default IP limit', () => {
        delete process.env.LOGIN_IP_MAX_ATTEMPTS;
        delete process.env.LOGIN_IP_WINDOW_MS;
        expect(getLoginIpLimitConfig()).toEqual({
            maxAttempts: 20,
            windowMs: 15 * 60 * 1000,
        });
    });
});
