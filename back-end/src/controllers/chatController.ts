import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import type { RawBodyRequest } from '../middleware/jsonBody';
import { chatService } from '../services/chatService';
import { attachmentService } from '../services/attachmentService';

export const sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { receiverId, content, attachment, clientMessageId } = req.body;

    const message = await chatService.sendMessage(userId, receiverId, content, { attachment, clientMessageId });

    return res.status(201).json({ success: true, message });
});

export const createUploadPass = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { receiverId, kind } = req.body;

    const pass = await attachmentService.createUploadPass(req.user!.id, receiverId, kind);

    return res.status(201).json({ success: true, pass });
});

/** Called by Cloudinary, not the app: authenticated by its signature instead of a JWT. */
export const handleUploadNotification = asyncHandler(async (req: Request, res: Response) => {
    const rawBody = (req as unknown as RawBodyRequest).rawBody;
    const timestamp = Number(req.header('X-Cld-Timestamp'));
    const signature = req.header('X-Cld-Signature');
    if (!rawBody || !signature || !Number.isFinite(timestamp)) {
        throw new AppError(401, 'Invalid notification signature');
    }

    await attachmentService.handleUploadNotification(rawBody, timestamp, signature);

    return res.status(200).json({ success: true });
});

export const getConversation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { userId: otherUserId } = req.params;
    const { cursor } = req.query as { cursor?: string };
    const { messages, nextCursor } = await chatService.getConversation(userId, otherUserId, cursor);

    return res.status(200).json({ success: true, messages, nextCursor });
});

export const getConversations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const { conversations, unreadConversationCount } = await chatService.getConversations(userId);

    return res.status(200).json({ success: true, conversations, unreadConversationCount });
});

export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { senderId } = req.body;

    await chatService.markAsRead(userId, senderId);

    return res.status(200).json({ success: true, message: 'Messages marked as read' });
});
