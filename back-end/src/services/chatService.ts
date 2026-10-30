import { Types } from 'mongoose';
import { Message, type IMessage, type IMessageAttachment, type MessageType } from '../models/Message';
import { Connection } from '../models/Connection';
import { User, isAccountDeactivated } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { assertCanMessage } from './chatAccess';
import { attachmentService, type AttachmentReceipt } from './attachmentService';
import { buildChatMediaUrls, type ChatMediaUrls } from './cloudinaryService';
export interface SendMessageOptions {
    attachment?: AttachmentReceipt;
    clientMessageId?: string;
}
export const MESSAGE_PER_PAGINATION = 36;
const isDuplicateKeyError = (error: unknown): boolean =>
    typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

export type ChatAttachmentView = Omit<IMessageAttachment, 'publicId' | 'resourceType' | 'version'> & {
    /** Absent when the media was removed. */
    urls?: ChatMediaUrls;
};

/** A message as clients see it, with participants populated. */
export interface ChatMessageView {
    _id: Types.ObjectId;
    sender: unknown;
    receiver: unknown;
    type: MessageType;
    content?: string;
    attachment?: ChatAttachmentView;
    clientMessageId?: string;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Shown in place of a deactivated account's name. Conversation history (including photos and
// voice messages) stays visible, but the other participant isn't told who the account was or why
// it's unavailable.
const UNAVAILABLE_USER_NAME = { firstName: 'Unavailable', lastName: '' };

type ChatParticipant = { _id: { toString(): string }; firstName?: string; lastName?: string };

/**
 * The message as clients see it: attachments carry freshly signed viewing URLs instead of the
 * stored Cloudinary identifiers, and a deactivated participant's name is replaced.
 */
const toChatMessage = (message: IMessage, unavailableUserId?: string): ChatMessageView => {
    const { attachment, ...rest } = message.toObject() as Omit<ChatMessageView, 'attachment'> & {
        attachment?: IMessageAttachment;
    };

    if (unavailableUserId) {
        for (const key of ['sender', 'receiver'] as const) {
            const participant = rest[key] as ChatParticipant | undefined;
            if (participant?._id.toString() === unavailableUserId) {
                rest[key] = { _id: participant._id, ...UNAVAILABLE_USER_NAME };
            }
        }
    }

    if (!attachment) return rest;

    const { publicId, resourceType, version, ...details } = attachment;
    const urls = attachment.removed ? undefined : buildChatMediaUrls({ publicId, resourceType, version });
    return { ...rest, attachment: { ...details, urls } };
};

const populateParticipants = (message: IMessage) =>
    message.populate('sender receiver', 'firstName lastName');

export const chatService = {
    sendMessage: async (
        senderId: string,
        receiverId: string,
        content: string | undefined,
        { attachment, clientMessageId }: SendMessageOptions = {},
    ) => {
        const text = content?.trim() ?? '';
        if (!receiverId || (!text && !attachment)) {
            throw new AppError(400, 'Receiver ID and content are required');
        }

        await assertCanMessage(senderId, receiverId);

        // A retried send (e.g. after a lost acknowledgement) returns the original message.
        if (clientMessageId) {
            const existing = await Message.findOne({ sender: senderId, clientMessageId });
            if (existing) return toChatMessage(await populateParticipants(existing));
        }

        const messageId = new Types.ObjectId();
        let fields: Pick<IMessage, 'type' | 'content' | 'attachment'> = { type: 'text', content: text };
        if (attachment) {
            const claimed = await attachmentService.claimForMessage(senderId, receiverId, attachment, messageId);
            if (claimed.type === 'voice' && text) {
                await attachmentService.releaseClaim(attachment.id, messageId);
                throw new AppError(400, 'Voice messages cannot have a caption');
            }
            fields = { type: claimed.type, content: text || undefined, attachment: claimed.attachment };
        }

        const message = new Message({
            _id: messageId,
            sender: senderId,
            receiver: receiverId,
            ...fields,
            clientMessageId,
            read: false,
        });
        try {
            await message.save();
        } catch (error) {
            if (attachment) await attachmentService.releaseClaim(attachment.id, messageId);
            if (clientMessageId && isDuplicateKeyError(error)) {
                const existing = await Message.findOne({ sender: senderId, clientMessageId });
                if (existing) return toChatMessage(await populateParticipants(existing));
            }
            throw error;
        }

        return toChatMessage(await populateParticipants(message));
    },

    /** One batch of a conversation, oldest first. `cursor` is the `nextCursor` of the previous batch. */
    getConversation: async (userId: string, otherUserId: string, cursor?: string) => {
        const connection = await Connection.findOne({
            $or: [
                { user1: userId, user2: otherUserId },
                { user1: otherUserId, user2: userId },
            ],
        });
        if (!connection) {
            throw new AppError(403, 'Can only view conversations with connected users');
        }
        // Newest first so the limit keeps the latest messages; a cursor (the oldest message the
        // client has) asks for the batch just before it. Sorted by _id, the field the cursor
        // compares, so no message is skipped or repeated between batches.
        const page = await Message.find({
            ...(cursor ? { _id: { $lt: cursor } } : {}),
            $or: [
                { sender: userId, receiver: otherUserId },
                { sender: otherUserId, receiver: userId },
            ],
        })
            .sort({ _id: -1 })
            .limit(MESSAGE_PER_PAGINATION)
            .populate('sender', 'firstName lastName')
            .populate('receiver', 'firstName lastName');
        const messages = page.reverse();
        // A full batch may have older messages before it; a shorter one reached the start of the
        // conversation, so there is nothing more to load.
        const nextCursor = messages.length === MESSAGE_PER_PAGINATION ? messages[0]!._id.toString() : null;

        await Message.updateMany(
            { sender: otherUserId, receiver: userId, read: false },
            { read: true },
        );

        const unavailableUserId = (await isAccountDeactivated(otherUserId)) ? otherUserId : undefined;
        return {
            messages: messages.map((message) => toChatMessage(message, unavailableUserId)),
            nextCursor,
        };
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
                        'firstName lastName photo currentProvince currentCountry accountStatus',
                    ),
                ]);

                if (user?.accountStatus === 'deactivated') {
                    const unavailableUserId = user._id.toString();
                    return {
                        user: { _id: user._id, ...UNAVAILABLE_USER_NAME, unavailable: true },
                        lastMessage: lastMessage && toChatMessage(lastMessage, unavailableUserId),
                        unreadCount,
                    };
                }

                return { user, lastMessage: lastMessage && toChatMessage(lastMessage), unreadCount };
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
