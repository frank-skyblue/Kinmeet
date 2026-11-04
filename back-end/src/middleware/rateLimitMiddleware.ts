import { Response } from 'express';

export const USER_RATE_LIMIT_CAPACITY = 60;
export const USER_RATE_LIMIT_REFILL_PER_SECOND = 1;

const USER_RATE_LIMIT_RECLAIM_INTERVAL_MS = 60_000;
const TOO_MANY_REQUESTS_MESSAGE = 'Too many requests. Please try again later.';
// Repeated additions can land just below 1 because binary floats cannot represent
// every decimal. This only closes that rounding gap; it is not extra quota.
const TOKEN_ROUNDING_EPSILON = 1e-9;

export type RateLimitDecision =
    | { allowed: true }
    | { allowed: false; retryAfterSeconds: number };

export interface UserRateLimiter {
    consume(userId: string): RateLimitDecision;
    reset(): void;
    bucketCount(): number;
}

interface TokenBucket {
    tokens: number;
    updatedAtMs: number;
}

interface UserRateLimiterOptions {
    capacity: number;
    refillPerSecond: number;
    now?: () => number;
    reclaimIntervalMs?: number;
}

const monotonicNow = (): number => performance.now();

// Quota lives only in this Node process and resets on restart.
// Use a shared store when multiple processes or instances must enforce one
// combined quota, or when quota must survive a restart.
export const createUserRateLimiter = (options: UserRateLimiterOptions): UserRateLimiter => {
    const { capacity, refillPerSecond } = options;
    if (!Number.isFinite(capacity) || capacity < 1) {
        throw new Error('Token bucket capacity must be a finite number greater than or equal to 1');
    }
    if (!Number.isFinite(refillPerSecond) || refillPerSecond <= 0) {
        throw new Error('Token bucket refill rate must be a finite number greater than 0');
    }

    const reclaimIntervalMs = options.reclaimIntervalMs ?? USER_RATE_LIMIT_RECLAIM_INTERVAL_MS;
    if (!(reclaimIntervalMs >= 0)) {
        throw new Error('Token bucket reclaim interval must be greater than or equal to 0');
    }

    const readNowMs = options.now ?? monotonicNow;
    const buckets = new Map<string, TokenBucket>();
    let lastReclaimAtMs = readNowMs();

    const projectedTokens = (bucket: TokenBucket, nowMs: number): number => {
        const elapsedSeconds = Math.max(0, (nowMs - bucket.updatedAtMs) / 1000);
        return bucket.tokens + elapsedSeconds * refillPerSecond;
    };

    // Idle buckets are removed only when a later consume runs after the interval.
    // A quiet process does not sweep on its own. Only buckets that have already
    // refilled to capacity are removed, so a partial bucket is not replaced by a full one.
    const reclaimIdle = (nowMs: number): void => {
        if (nowMs - lastReclaimAtMs < reclaimIntervalMs) {
            return;
        }
        lastReclaimAtMs = nowMs;
        for (const [userId, bucket] of buckets) {
            if (projectedTokens(bucket, nowMs) >= capacity) {
                buckets.delete(userId);
            }
        }
    };

    const consume = (userId: string): RateLimitDecision => {
        const nowMs = readNowMs();
        reclaimIdle(nowMs);

        let bucket = buckets.get(userId);
        if (!bucket) {
            bucket = { tokens: capacity, updatedAtMs: nowMs };
            buckets.set(userId, bucket);
        }

        const availableTokens = Math.min(capacity, projectedTokens(bucket, nowMs));
        bucket.updatedAtMs = nowMs;

        if (availableTokens + TOKEN_ROUNDING_EPSILON < 1) {
            bucket.tokens = availableTokens;
            const missingTokens = 1 - availableTokens;
            const retryAfterSeconds = Math.max(1, Math.ceil(missingTokens / refillPerSecond));
            return { allowed: false, retryAfterSeconds };
        }

        const tokensRemaining = availableTokens - 1;
        if (tokensRemaining > 0) {
            bucket.tokens = tokensRemaining;
        } else {
            bucket.tokens = 0;
        }
        return { allowed: true };
    };

    return {
        consume,
        reset: () => {
            buckets.clear();
            lastReclaimAtMs = readNowMs();
        },
        bucketCount: () => buckets.size,
    };
};

const productionLimiter = createUserRateLimiter({
    capacity: USER_RATE_LIMIT_CAPACITY,
    refillPerSecond: USER_RATE_LIMIT_REFILL_PER_SECOND,
});

let activeLimiter: UserRateLimiter = productionLimiter;

// Test-only hook. Production code keeps the single shared limiter.
export const setUserRateLimiterForTests = (limiter: UserRateLimiter | null): void => {
    activeLimiter.reset();
    if (limiter === null) {
        productionLimiter.reset();
        activeLimiter = productionLimiter;
        return;
    }
    activeLimiter = limiter;
};

export const applyUserRateLimit = (res: Response, userId: string): boolean => {
    const decision = activeLimiter.consume(userId);
    if (decision.allowed) {
        return true;
    }

    res.setHeader('Retry-After', String(decision.retryAfterSeconds));
    res.status(429).json({
        success: false,
        message: TOO_MANY_REQUESTS_MESSAGE,
    });
    return false;
};
