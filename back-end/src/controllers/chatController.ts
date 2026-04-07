import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { chatService } from '../services/chatService';

export const sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { receiverId, content } = req.body;

    const message = await chatService.sendMessage(userId, receiverId, content);

    return res.status(201).json({ success: true, message });
});

export const getConversation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { userId: otherUserId } = req.params;

    const messages = await chatService.getConversation(userId, otherUserId);

    return res.status(200).json({ success: true, messages });
});

export const getConversations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const conversations = await chatService.getConversations(userId);

    return res.status(200).json({ success: true, conversations });
});

export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { senderId } = req.body;

    await chatService.markAsRead(userId, senderId);

    return res.status(200).json({ success: true, message: 'Messages marked as read' });
});
