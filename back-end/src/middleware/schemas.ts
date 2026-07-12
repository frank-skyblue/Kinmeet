import { z } from 'zod';
import { normalizeEmail } from '../utils/email';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');
const requiredString = (field: string, maxLength: number) =>
    z.string().trim().min(1, `${field} is required`).max(maxLength, `${field} is too long`);

export const dateOfBirthString = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD').refine((value) => {
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
const educationLevelSchema = z.enum([
    'High School',
    'Some College/University',
    'College Diploma',
    "Bachelor's Degree",
    "Master's Degree",
    'Doctorate / PhD',
    'Trade School',
    'Other',
]);

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

const emailField = z
    .string()
    .transform((value) => normalizeEmail(value))
    .pipe(
        z
            .string()
            .min(1, 'Email is required')
            .max(254, 'Email is too long')
            .email('Invalid email address'),
    );

export const checkEmailSchema = z.object({
    email: emailField,
});

export const loginSchema = z.object({
    email: emailField,
    password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
    email: checkEmailSchema.shape.email,
    username: z.string().trim().toLowerCase().min(3, 'Username must be 3-30 characters using lowercase letters, numbers, or underscores').max(30, 'Username must be 3-30 characters using lowercase letters, numbers, or underscores').regex(/^[a-z0-9_]+$/, 'Username must be 3-30 characters using lowercase letters, numbers, or underscores').optional(),
    password: z.string(),
    firstName: requiredString('First name', 50),
    lastName: requiredString('Last name', 50),
    about: z.string().trim().max(500, 'About section must be 500 characters or fewer').optional(),
    jobTitle: z.string().trim().max(100, 'Job title is too long').optional(),
    company: z.string().trim().max(100, 'Company is too long').optional(),
    industry: z.string().trim().max(100, 'Industry is too long').optional(),
    educationLevel: educationLevelSchema.optional(),
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

export const updateProfileSchema = z.object({
    firstName: requiredString('First name', 50).optional(),
    lastName: requiredString('Last name', 50).optional(),
    about: z.string().trim().max(500, 'About section must be 500 characters or fewer').optional(),
    jobTitle: z.string().trim().max(100, 'Job title is too long').optional(),
    company: z.string().trim().max(100, 'Company is too long').optional(),
    industry: z.string().trim().max(100, 'Industry is too long').optional(),
    educationLevel: educationLevelSchema.optional(),
    institution: z.string().trim().max(100, 'Institution is too long').optional(),
    graduationYear: z.number().int().min(1950).max(2100).optional(),
    homeCountry: requiredString('Home country', 100).optional(),
    currentProvince: requiredString('Province/state', 100).optional(),
    currentCountry: requiredString('Current country', 100).optional(),
    currentCity: z.string().trim().max(100, 'Current city is too long').optional(),
    languages: z.array(requiredString('Language', 100)).min(1, 'At least one language is required').optional(),
    interests: z.array(requiredString('Interest', 100)).optional(),
    lookingFor: z.array(lookingForSchema).min(1, "Please select what you're looking for").optional(),
    dateOfBirth: dateOfBirthString.optional(),
    gender: genderSchema.optional(),
});

export const forgotPasswordSchema = z.object({
    email: checkEmailSchema.shape.email,
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    newPassword: z.string().min(1, 'New password is required'),
});

export const userIdParams = objectIdParam('userId');
export const requestIdParams = objectIdParam('requestId');

const notificationDeviceChannel = z.enum(['web_push']);

export const registerNotificationDeviceSchema = z.object({
    channel: notificationDeviceChannel,
    token: z.string().trim().min(1, 'Token is required'),
});

export const unregisterNotificationDeviceSchema = registerNotificationDeviceSchema;

export const changeEmailSchema = z.object({
    newEmail: z
        .string()
        .transform((value) => normalizeEmail(value))
        .pipe(
            z
                .string()
                .min(1, 'Email is required')
                .max(254, 'Email is too long')
                .email('Invalid email address'),
        ),
    currentPassword: z.string().min(1, 'Current password is required'),
});

export const changeUsernameSchema = z.object({
    newUsername: z
        .string()
        .trim()
        .toLowerCase()
        .min(3, 'Username must be 3-30 characters using lowercase letters, numbers, or underscores')
        .max(30, 'Username must be 3-30 characters using lowercase letters, numbers, or underscores')
        .regex(
            /^[a-z0-9_]+$/,
            'Username must be 3-30 characters using lowercase letters, numbers, or underscores',
        ),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(1, 'New password is required'),
});
