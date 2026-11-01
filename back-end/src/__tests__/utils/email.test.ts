import { describe, expect, it } from 'vitest';
import { findUserByEmail, normalizeEmail } from '../../utils/email';
import { createTestUser } from '../helpers';

describe('normalizeEmail', () => {
    it('lowercases and trims', () => {
        expect(normalizeEmail('  New@Example.com  ')).toBe('new@example.com');
    });

    it('removes zero-width spaces', () => {
        expect(normalizeEmail('new@example.com\u200B')).toBe('new@example.com');
        expect(normalizeEmail('\u200Bnew@example.com')).toBe('new@example.com');
    });

    it('canonicalizes unicode equivalent forms', () => {
        expect(normalizeEmail('caf\u00E9@example.com')).toBe('café@example.com');
        expect(normalizeEmail('cafe\u0301@example.com')).toBe('café@example.com');
    });
});

describe('findUserByEmail', () => {
    it('returns null when no user matches', async () => {
        expect(await findUserByEmail('missing@example.com')).toBeNull();
    });

    it('finds a user after normalizing the lookup email', async () => {
        const user = await createTestUser({ email: 'casey@example.com' });
        const found = await findUserByEmail('  Casey@Example.com  ');
        expect(found?._id.toString()).toBe(user._id.toString());
    });
});
