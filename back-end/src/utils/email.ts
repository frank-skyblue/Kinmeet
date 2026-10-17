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

export const findUserByEmail = async (email: string, select?: string): Promise<IUser | null> => {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    const findOne = (filter: Record<string, unknown>) =>
        select ? User.findOne(filter).select(select) : User.findOne(filter);

    const exact = await findOne({ email: normalized });
    if (exact) return exact;

    return findOne({
        email: { $regex: new RegExp(`^${escapeRegExp(normalized)}$`, 'i') },
    });
};
