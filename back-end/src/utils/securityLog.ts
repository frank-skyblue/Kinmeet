import crypto from 'crypto';

export const hashEmail = (email: string): string =>
    crypto.createHash('sha256').update(email).digest('hex');

// Stdout is the only log sink. A failure here must not change the auth result.
export const logSecurityEvent = (
    event: { type: string; emailHash: string; userId?: string },
): void => {
    try {
        console.info(JSON.stringify(event));
    } catch {
        try {
            console.error('[security] log failed');
        } catch {
            // The caller still returns its authentication result.
        }
    }
};

// Step and error name only. Provider messages can contain an address, token, or body.
export const logRedactedFailure = (type: string, step: string, error: unknown): void => {
    const name = error instanceof Error ? error.name : 'Error';
    try {
        console.error(JSON.stringify({ type, step, name }));
    } catch {
        try {
            console.error('[security] log failed');
        } catch {
            // Ignore.
        }
    }
};
