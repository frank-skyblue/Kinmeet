import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

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

export const userIdParams = objectIdParam('userId');
export const requestIdParams = objectIdParam('requestId');

const notificationDeviceChannel = z.enum(['web_push']);

export const registerNotificationDeviceSchema = z.object({
    channel: notificationDeviceChannel,
    token: z.string().trim().min(1, 'Token is required'),
});

export const unregisterNotificationDeviceSchema = registerNotificationDeviceSchema;
