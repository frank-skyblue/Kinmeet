import { z } from 'zod';
import { normalizeEmail } from '../utils/email';
import { FEEDBACK_CATEGORIES } from '../models/Feedback';
import { REPORT_REASONS, REPORT_STATUSES } from '../models/Report';
import { SUPPORT_ISSUE_TYPES } from '../models/SupportRequest';
import {
    CHAT_MEDIA_KINDS,
    CHAT_MEDIA_LIMITS,
    CHAT_THUMBNAIL_MAX_LENGTH,
    CHAT_WAVEFORM_MAX_BARS,
} from '../config/chatMedia';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');
const requiredString = (field: string, maxLength: number) =>
    z.string().trim().min(1, `${field} is required`).max(maxLength, `${field} is too long`);

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
export const passwordField = z
    .string()
    .regex(
        PASSWORD_REGEX,
        'Password must be at least 8 characters long and include uppercase, lowercase, and a number.',
    );

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
const feedbackCategorySchema = z.enum(FEEDBACK_CATEGORIES);
const followUpField = z.preprocess((value) => {
    if (value === undefined || value === '') return false;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
}, z.boolean());
const feedbackMessageField = z.preprocess(
    (value) => value === undefined ? '' : value,
    z.string().trim().min(1, 'Message is required').max(2000, 'Message is too long'),
);

export const objectIdParam = (name: string) =>
    z.object({ [name]: objectId });

// Cloudinary's receipt (signature verified by the service) plus display details the client
// measured. Those details aren't signed, so they're only range-checked here.
const attachmentReceiptSchema = z.object({
    id: objectId,
    version: z.number().int().positive(),
    signature: z.string().regex(/^[0-9a-f]{40,64}$/i, 'Invalid upload receipt'),
    width: z.number().int().positive().max(CHAT_MEDIA_LIMITS.image.maxDimension).optional(),
    height: z.number().int().positive().max(CHAT_MEDIA_LIMITS.image.maxDimension).optional(),
    thumbnail: z
        .string()
        .max(CHAT_THUMBNAIL_MAX_LENGTH)
        .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'Invalid thumbnail')
        .optional(),
    durationMs: z
        .number()
        .int()
        .positive()
        .max(CHAT_MEDIA_LIMITS.voice.maxDurationMs + CHAT_MEDIA_LIMITS.voice.durationToleranceMs)
        .optional(),
    waveform: z.array(z.number().int().min(0).max(255)).max(CHAT_WAVEFORM_MAX_BARS).optional(),
});

export const sendMessageSchema = z
    .object({
        receiverId: objectId,
        // Required for text; an optional caption for an image.
        content: z.string().trim().max(5000, 'Message is too long').optional(),
        attachment: attachmentReceiptSchema.optional(),
        clientMessageId: z.string().trim().min(1).max(100).optional(),
    })
    .refine((data) => Boolean(data.content) || Boolean(data.attachment), {
        message: 'Message cannot be empty',
        path: ['content'],
    });

export const signAttachmentSchema = z.object({
    receiverId: objectId,
    kind: z.enum(CHAT_MEDIA_KINDS),
});

export const markAsReadSchema = z.object({
    senderId: objectId,
});

export const blockUserSchema = z.object({
    userId: objectId,
    reason: z.string().optional(),
});

export const reportUserSchema = z
    .object({
        userId: objectId,
        reason: z.enum(REPORT_REASONS, { message: 'Please choose a valid reason' }),
        details: z
            .string()
            .trim()
            .max(2000, 'Details must be 2000 characters or fewer')
            .optional(),
    })
    .refine((data) => data.reason !== 'Other' || Boolean(data.details?.trim()), {
        message: 'Please describe the issue when choosing Other',
        path: ['details'],
    });

export const submitFeedbackSchema = z.object({
    category: feedbackCategorySchema,
    message: feedbackMessageField,
    followUp: followUpField,
});

const supportIssueTypeSchema = z.enum(SUPPORT_ISSUE_TYPES);
const supportSubjectField = z.preprocess((value) => {
    if (value === undefined || value === '') return undefined;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
}, z.string().max(100, 'Subject is too long').optional());
const supportMessageField = z.preprocess(
    (value) => value === undefined ? '' : value,
    z.string().trim().min(1, 'Message is required').max(2000, 'Message is too long'),
);

export const submitSupportRequestSchema = z.object({
    issueType: supportIssueTypeSchema,
    subject: supportSubjectField,
    message: supportMessageField,
    followUp: followUpField,
});

export const sendMeetRequestSchema = z.object({
    receiverId: objectId,
});

export const passUserSchema = z.object({
    userId: objectId,
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

// Usernames are case-insensitive and stored lowercase. Each rule has its own message, checked in
// this order; the frontend (front-end/src/utils/username.ts) uses the same wording.
export const usernameField = z
    .string()
    .transform((value) => normalizeEmail(value))
    .pipe(
        z
            .string()
            .min(3, 'Username must be at least 3 characters.')
            .max(30, 'Username must be at most 30 characters.')
            .regex(/^[a-z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
    );

export const checkEmailSchema = z.object({
    email: emailField,
});

export const checkUsernameSchema = z.object({
    username: usernameField,
});

export const loginSchema = z.object({
    email: emailField,
    password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
    email: checkEmailSchema.shape.email,
    // Optional: an empty value means "generate one for me", not a validation error.
    username: z.preprocess(
        (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
        usernameField.optional(),
    ),
    password: passwordField,
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
    newPassword: passwordField,
});

export const userIdParams = objectIdParam('userId');
export const requestIdParams = objectIdParam('requestId');

const notificationDeviceChannel = z.enum(['web_push']);

export const registerNotificationDeviceSchema = z.object({
    channel: notificationDeviceChannel,
    token: z.string().trim().min(1, 'Token is required'),
});

export const unregisterNotificationDeviceSchema = registerNotificationDeviceSchema;

export const updateNotificationPreferencesSchema = z.object({
    newPeopleNearby: z
        .object({ email: z.boolean().optional(), push: z.boolean().optional() })
        .strict()
        .refine((value) => value.email !== undefined || value.push !== undefined, {
            message: 'Choose email or push to update',
        }),
}).strict();

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
    newUsername: usernameField,
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
});

export const deactivateAccountSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
});

export const adminLoginSchema = z.object({
    password: z.string().refine((value) => value.trim().length > 0, 'Password is required').max(256, 'Password is too long'),
});

const adminPageQuerySchema = z.object({
    page: z.preprocess((value) => {
        if (value === undefined || value === '') return 1;
        return value;
    }, z.union([z.string(), z.number()]).refine(
        (value) => typeof value === 'number' ? Number.isInteger(value) : /^\d+$/.test(value),
        'Page must be an integer',
    ).transform((value) => typeof value === 'number' ? value : Number(value)).pipe(
        z.number().int().min(1, 'Page must be at least 1').max(100000, 'Page is too large'),
    )),
});

export const listAdminFeedbackQuerySchema = adminPageQuerySchema;
export const listAdminReportsQuerySchema = adminPageQuerySchema;

export const adminReportIdParams = objectIdParam('reportId');

export const updateAdminReportStatusSchema = z.object({
    status: z.enum(REPORT_STATUSES, { message: 'Invalid report status' }),
});
