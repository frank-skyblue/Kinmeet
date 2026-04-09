import { Message } from '../models/Message';
import { Connection } from '../models/Connection';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';

export const chatService = {
    sendMessage: async (senderId: string, receiverId: string, content: string) => {
        if (!receiverId || !content?.trim()) {
            throw new AppError(400, 'Receiver ID and content are required');
        }

        const connection = await Connection.findOne({
            $or: [
                { user1: senderId, user2: receiverId },
                { user1: receiverId, user2: senderId },
            ],
        });
        if (!connection) throw new AppError(403, 'Can only message connected users');

        const message = new Message({
            sender: senderId,
            receiver: receiverId,
            content: content.trim(),
            read: false,
        });
        await message.save();
        await message.populate('sender receiver', 'firstName lastName');

        return message;
    },

    getConversation: async (userId: string, otherUserId: string) => {
        const connection = await Connection.findOne({
            $or: [
                { user1: userId, user2: otherUserId },
                { user1: otherUserId, user2: userId },
            ],
        });
        if (!connection) {
            throw new AppError(403, 'Can only view conversations with connected users');
        }

        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: otherUserId },
                { sender: otherUserId, receiver: userId },
            ],
        })
            .sort({ createdAt: 1 })
            .populate('sender', 'firstName lastName')
            .populate('receiver', 'firstName lastName');

        await Message.updateMany(
            { sender: otherUserId, receiver: userId, read: false },
            { read: true },
        );

        return messages;
    },

    getConversations: async (userId: string) => {
        const connections = await Connection.find({
            $or: [{ user1: userId }, { user2: userId }],
        });

        const connectedUserIds = connections.map((conn) =>
            conn.user1.toString() === userId.toString()
                ? conn.user2
                : conn.user1,
        );

        const conversations = await Promise.all(
            connectedUserIds.map(async (connectedUserId) => {
                const [lastMessage, unreadCount, user] = await Promise.all([
                    Message.findOne({
                        $or: [
                            { sender: userId, receiver: connectedUserId },
                            { sender: connectedUserId, receiver: userId },
                        ],
                    })
                        .sort({ createdAt: -1 })
                        .populate('sender', 'firstName lastName')
                        .populate('receiver', 'firstName lastName'),

                    Message.countDocuments({
                        sender: connectedUserId,
                        receiver: userId,
                        read: false,
                    }),

                    User.findById(connectedUserId).select(
                        'firstName lastName photo currentProvince currentCountry',
                    ),
                ]);

                return { user, lastMessage, unreadCount };
            }),
        );

        const unreadConversationCount = conversations.filter((c) => c.unreadCount > 0).length;

        const lastMessageTime = (createdAt: Date | string | undefined): number => {
            if (!createdAt) return 0;
            return new Date(createdAt).getTime();
        };

        conversations.sort((a, b) => {
            const unreadA = a.unreadCount > 0 ? 1 : 0;
            const unreadB = b.unreadCount > 0 ? 1 : 0;
            if (unreadB !== unreadA) {
                return unreadB - unreadA;
            }
            const timeA = lastMessageTime(a.lastMessage?.createdAt);
            const timeB = lastMessageTime(b.lastMessage?.createdAt);
            return timeB - timeA;
        });

        return { conversations, unreadConversationCount };
    },

    markAsRead: async (userId: string, senderId: string) => {
        if (!senderId) throw new AppError(400, 'Sender ID is required');

        const result = await Message.updateMany(
            { sender: senderId, receiver: userId, read: false },
            { read: true },
        );

        return result.modifiedCount;
    },
};
