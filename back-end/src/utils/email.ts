import { User, type IUser } from '../models/User';

const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF]/g;

export const normalizeEmail = (email: string): string =>
    email
        .normalize('NFKC')
        .replace(INVISIBLE_CHARS, '')
        .trim()
        .toLowerCase();

export const escapeRegExp = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const findUserByEmail = async (email: string): Promise<IUser | null> => {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    const exact = await User.findOne({ email: normalized });
    if (exact) return exact;

    return User.findOne({
        email: { $regex: new RegExp(`^${escapeRegExp(normalized)}$`, 'i') },
    });
};
