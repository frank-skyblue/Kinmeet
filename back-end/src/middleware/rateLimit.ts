import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

interface RateLimitOptions {
    windowMs: number;
    max: number;
    message: string;
}

const SWEEP_THRESHOLD = 5_000;
// This approach has a tradeoff that the rate limiter might be different on different backend instances
// To over this, Redis should be used to have a shared storage.
/**
 * Sliding-window limit per signed-in user (falls back to IP). Kept in memory, so limits apply per
 * server process; a multi-instance deployment would need a shared store such as Redis.
 */
export const rateLimitPerUser = ({ windowMs, max, message }: RateLimitOptions) => {
    const hits = new Map<string, number[]>();

    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const now = Date.now();
        if (hits.size > SWEEP_THRESHOLD) {
            for (const [key, times] of hits) {
                if (times.every((t) => now - t >= windowMs)) hits.delete(key);
            }
        }

        const key = req.user?.id ?? req.ip ?? 'unknown';
        const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
        if (recent.length >= max) {
            return res.status(429).json({ success: false, message });
        }
        recent.push(now);
        hits.set(key, recent);
        next();
    };
};
