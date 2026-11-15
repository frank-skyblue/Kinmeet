import { getLoginLockoutConfig } from '../config/env';
import { LoginLockout, type ILoginLockout } from '../models/LoginLockout';
import { normalizeEmail } from '../utils/email';

export type LockoutClearResult = 'absent' | 'locked' | 'cleared';

export interface FailureRecord {
    failedAt: Date[];
    lockedUntil: Date | null;
    justLocked: boolean;
    expiresAt: Date;
    locked: boolean;
}

const DUPLICATE_KEY_RETRIES = 2;

const isDuplicateKeyError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { code?: unknown; cause?: { code?: unknown } };
    return candidate.code === 11000 || candidate.cause?.code === 11000;
};

const isActiveLock = (lockedUntil: Date | null | undefined, now: Date): boolean =>
    lockedUntil instanceof Date && lockedUntil.getTime() > now.getTime();

const toFailureRecord = (doc: ILoginLockout, now: Date): FailureRecord => {
    const lockedUntil = doc.lockedUntil ?? null;
    return {
        failedAt: doc.failedAt ?? [],
        lockedUntil,
        justLocked: doc.justLocked === true,
        expiresAt: doc.expiresAt,
        locked: isActiveLock(lockedUntil, now),
    };
};

// One atomic update. Each stage reads the document from the previous stage,
// so the names below are this update's working values, not a second write.
// An active lock keeps its timestamps, expiry, and deadline; justLocked is only
// true for the update that crosses the threshold. After a past deadline, retained
// is empty, so the next failure starts again at the configured threshold.
// expiresAt uses the latest retained timestamp, not the last array slot.
const failurePipeline = (
    email: string,
    now: Date,
    maxAttempts: number,
    windowMs: number,
    durationMs: number,
) => {
    const windowStart = new Date(now.getTime() - windowMs);
    const lockUntil = new Date(now.getTime() + durationMs);

    return [
        {
            $set: {
                activeLock: { $gt: ['$lockedUntil', now] },
                retained: {
                    $cond: [
                        { $ne: [{ $ifNull: ['$lockedUntil', null] }, null] },
                        [],
                        {
                            $filter: {
                                input: { $ifNull: ['$failedAt', []] },
                                as: 'at',
                                cond: { $gt: ['$$at', windowStart] },
                            },
                        },
                    ],
                },
            },
        },
        {
            $set: {
                nextFailedAt: {
                    $slice: [{ $concatArrays: ['$retained', [now]] }, -maxAttempts],
                },
            },
        },
        {
            $set: {
                reached: { $gte: [{ $size: '$nextFailedAt' }, maxAttempts] },
                newestFailure: { $max: '$nextFailedAt' },
            },
        },
        {
            $set: {
                email,
                failedAt: {
                    $cond: ['$activeLock', { $ifNull: ['$failedAt', []] }, '$nextFailedAt'],
                },
                lockedUntil: {
                    $cond: ['$activeLock', '$lockedUntil', { $cond: ['$reached', lockUntil, null] }],
                },
                justLocked: { $cond: ['$activeLock', false, '$reached'] },
                expiresAt: {
                    $cond: [
                        '$activeLock',
                        '$expiresAt',
                        {
                            $cond: [
                                '$reached',
                                { $max: [{ $add: ['$newestFailure', windowMs] }, lockUntil] },
                                { $add: ['$newestFailure', windowMs] },
                            ],
                        },
                    ],
                },
            },
        },
        { $unset: ['activeLock', 'retained', 'nextFailedAt', 'reached', 'newestFailure'] },
    ];
};

const clearPipeline = (now: Date) => [
    {
        $set: {
            failedAt: {
                $cond: [{ $gt: ['$lockedUntil', now] }, { $ifNull: ['$failedAt', []] }, []],
            },
            lockedUntil: {
                $cond: [{ $gt: ['$lockedUntil', now] }, '$lockedUntil', null],
            },
            justLocked: {
                $cond: [{ $gt: ['$lockedUntil', now] }, { $ifNull: ['$justLocked', false] }, false],
            },
            expiresAt: {
                $cond: [{ $gt: ['$lockedUntil', now] }, '$expiresAt', now],
            },
        },
    },
];

const requireEmail = (email: string): string => {
    const normalized = normalizeEmail(email);
    if (!normalized) {
        throw new Error('Login lockout requires an email');
    }
    return normalized;
};

export const loginLockoutService = {
    // Time is read here, not by the caller, so each check has its own instant.
    hasActiveLock: async (email: string): Promise<boolean> => {
        const normalized = normalizeEmail(email);
        if (!normalized) return false;
        const now = new Date();
        const doc = await LoginLockout.findOne({ email: normalized }).lean();
        return isActiveLock(doc?.lockedUntil, now);
    },

    recordFailure: async (email: string, now = new Date()): Promise<FailureRecord> => {
        const normalized = requireEmail(email);
        const { maxAttempts, windowMs, durationMs } = getLoginLockoutConfig();
        const pipeline = failurePipeline(normalized, now, maxAttempts, windowMs, durationMs);

        let lastError: unknown;
        for (let attempt = 0; attempt <= DUPLICATE_KEY_RETRIES; attempt += 1) {
            try {
                const updated = await LoginLockout.findOneAndUpdate(
                    { email: normalized },
                    pipeline,
                    { upsert: true, returnDocument: 'after', updatePipeline: true },
                );
                if (!updated) {
                    throw new Error('Login lockout update did not return a document');
                }
                return toFailureRecord(updated, now);
            } catch (error: unknown) {
                lastError = error;
                if (!isDuplicateKeyError(error) || attempt === DUPLICATE_KEY_RETRIES) {
                    throw error;
                }
            }
        }
        throw lastError;
    },

    // Null means there was no document. A returned active lock is left in place.
    clearIfUnlocked: async (email: string, now = new Date()): Promise<LockoutClearResult> => {
        const normalized = requireEmail(email);
        const updated = await LoginLockout.findOneAndUpdate(
            { email: normalized },
            clearPipeline(now),
            { returnDocument: 'after', updatePipeline: true },
        );
        if (!updated) return 'absent';
        if (isActiveLock(updated.lockedUntil, now)) return 'locked';
        return 'cleared';
    },

    // Unconditional. Returns true only when the removed document was still locked.
    releaseForPasswordReset: async (email: string, now = new Date()): Promise<boolean> => {
        const normalized = requireEmail(email);
        const removed = await LoginLockout.findOneAndDelete({ email: normalized });
        return isActiveLock(removed?.lockedUntil, now);
    },
};
