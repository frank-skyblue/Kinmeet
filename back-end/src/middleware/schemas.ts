import { z } from 'zod';
import { normalizeEmail } from '../utils/email';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');
const requiredString = (field: string, maxLength: number) =>
    z.string().trim().min(1, `${field} is required`).max(maxLength, `${field} is too long`);

const dateOfBirthString = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD').refine((value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
    ) {
        return false;
    }
    const today = new Date();
    const todayUtcStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
    if (value > todayUtcStr) return false;
    const maxDob = new Date(Date.UTC(
        today.getUTCFullYear() - 120,
        today.getUTCMonth(),
        today.getUTCDate(),
        12, 0, 0, 0,
    ));
    return parsed >= maxDob;
}, 'Invalid date of birth');

const genderSchema = z.enum(['female', 'male', 'other']);
const lookingForSchema = z.enum(['Friendship', 'Networking', 'Support']);

export const objectIdParam = (name: string) =>
    z.object({ [name]: objectId });

export const sendMessageSchema = z.object({
    receiverId: objectId,
    content: z.string().trim().min(1, 'Message cannot be empty').max(5000, 'Message is too long'),
});

export const markAsReadSchema = z.object({
    senderId: objectId,
});

export const blockUserSchema = z.object({
    userId: objectId,
    reason: z.string().optional(),
});

export const reportUserSchema = z.object({
    userId: objectId,
    reason: z.string().min(1, 'Reason is required'),
});

export const sendMeetRequestSchema = z.object({
    receiverId: objectId,
});

export const registerSchema = z.object({
    email: z
        .string()
        .transform((value) => normalizeEmail(value))
        .pipe(
            z
                .string()
                .min(1, 'Email is required')
                .max(254, 'Email is too long')
                .email('Invalid email address'),
        ),
    username: z.string().trim().toLowerCase().min(3, 'Username must be 3-30 characters using lowercase letters, numbers, or underscores').max(30, 'Username must be 3-30 characters using lowercase letters, numbers, or underscores').regex(/^[a-z0-9_]+$/, 'Username must be 3-30 characters using lowercase letters, numbers, or underscores').optional(),
    password: z.string(),
    firstName: requiredString('First name', 50),
    lastName: requiredString('Last name', 50),
    about: z.string().trim().max(500, 'About section must be 500 characters or fewer').optional(),
    jobTitle: z.string().trim().max(100, 'Job title is too long').optional(),
    company: z.string().trim().max(100, 'Company is too long').optional(),
    institution: z.string().trim().max(100, 'Institution is too long').optional(),
    graduationYear: z.number().int().min(1950).max(2100).optional(),
    homeCountry: requiredString('Home country', 100),
    currentLocation: z.object({
        province: requiredString('Province/state', 100),
        country: requiredString('Current country', 100),
        city: requiredString('Current city', 100),
    }),
    languages: z.array(requiredString('Language', 100)).min(1, 'At least one language is required'),
    interests: z.array(requiredString('Interest', 100)).optional(),
    lookingFor: z.array(lookingForSchema).min(1, "Please select what you're looking for"),
    profilePhoto: z.string().trim().optional(),
    dateOfBirth: dateOfBirthString,
    gender: genderSchema,
});

export const userIdParams = objectIdParam('userId');
export const requestIdParams = objectIdParam('requestId');

const notificationDeviceChannel = z.enum(['web_push']);

export const registerNotificationDeviceSchema = z.object({
    channel: notificationDeviceChannel,
    token: z.string().trim().min(1, 'Token is required'),
});

export const unregisterNotificationDeviceSchema = registerNotificationDeviceSchema;
