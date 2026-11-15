import mongoose, { Types } from 'mongoose';
import { Attachment, type IAttachment } from '../models/Attachment';
import { Message, type IMessageAttachment, type MessageType } from '../models/Message';
import { AppError } from '../middleware/errorHandler';
import { CLOUDINARY_NOTIFICATION_URL } from '../config/env';
import {
    CHAT_MEDIA_LIMITS,
    CHAT_ORPHAN_UPLOAD_TTL_MS,
    CHAT_UPLOAD_PASS_TTL_MS,
    type ChatMediaKind,
} from '../config/chatMedia';
import { assertCanMessage } from './chatAccess';
import {
    chatMediaPublicId,
    chatResourceType,
    createSignedChatUpload,
    destroyChatMedia,
    verifyChatUploadReceipt,
    verifyCloudinaryNotification,
    type SignedChatUpload,
} from './cloudinaryService';

/** What the browser forwards after uploading: Cloudinary's receipt plus display details. */
export interface AttachmentReceipt {
    id: string;
    version: number;
    signature: string;
    width?: number;
    height?: number;
    thumbnail?: string;
    durationMs?: number;
    waveform?: number[];
}

export interface UploadPass extends SignedChatUpload {
    attachmentId: string;
    kind: ChatMediaKind;
    /** After this, a completed upload can no longer be attached to a message. */
    expiresAt: Date;
}

interface CloudinaryUploadNotification {
    notification_type?: string;
    public_id?: string;
    bytes?: number;
    format?: string;
    width?: number;
    height?: number;
    duration?: number;
}

const MESSAGE_TYPE_BY_KIND: Record<ChatMediaKind, MessageType> = { image: 'image', voice: 'voice' };

/** Why Cloudinary's report breaks the limits, or null if it doesn't. */
const limitViolation = (
    kind: ChatMediaKind,
    { bytes, format, durationMs }: { bytes: number; format: string; durationMs?: number },
): string | null => {
    const limits = CHAT_MEDIA_LIMITS[kind];
    if (bytes > limits.maxBytes) return 'File is too large';
    if (!(limits.formats as readonly string[]).includes(format)) return 'File type is not allowed';
    if (kind === 'voice' && durationMs !== undefined
        && durationMs > CHAT_MEDIA_LIMITS.voice.maxDurationMs + CHAT_MEDIA_LIMITS.voice.durationToleranceMs) {
        return 'Voice message is too long';
    }
    return null;
};

const destroyQuietly = async (attachment: Pick<IAttachment, 'publicId' | 'kind'>): Promise<void> => {
    try {
        await destroyChatMedia(attachment.publicId, chatResourceType(attachment.kind));
    } catch (err) {
        console.error(`[attachmentService] failed to delete ${attachment.publicId}:`, err);
    }
};

export const attachmentService = {
    /** Step ①–②: checks the sender may message the receiver, then signs a one-file upload pass. */
    createUploadPass: async (
        ownerId: string,
        receiverId: string,
        kind: ChatMediaKind,
    ): Promise<UploadPass> => {
        await assertCanMessage(ownerId, receiverId);

        const attachmentId = new Types.ObjectId();
        const publicId = chatMediaPublicId(attachmentId.toString());
        const attachment = await Attachment.create({
            _id: attachmentId,
            owner: ownerId,
            receiver: receiverId,
            kind,
            publicId,
        });

        return {
            attachmentId: attachmentId.toString(),
            kind,
            expiresAt: new Date(attachment.createdAt.getTime() + CHAT_UPLOAD_PASS_TTL_MS),
            ...createSignedChatUpload(publicId, kind, CLOUDINARY_NOTIFICATION_URL),
        };
    },

    /**
     * Step ⑤: verifies the receipt and atomically marks the attachment as used by `messageId`, so
     * it can't be attached twice. Returns what the message stores. Call `releaseClaim` if the
     * message then fails to save.
     */
    claimForMessage: async (
        senderId: string,
        receiverId: string,
        receipt: AttachmentReceipt,
        messageId: Types.ObjectId,
    ): Promise<{ type: MessageType; attachment: IMessageAttachment }> => {
        const attachment = await Attachment.findById(receipt.id);
        if (!attachment
            || attachment.owner.toString() !== senderId
            || attachment.receiver.toString() !== receiverId) {
            throw new AppError(404, 'Attachment not found');
        }
        if (attachment.status === 'rejected') {
            throw new AppError(422, 'This file breaks the upload limits');
        }
        if (attachment.status !== 'pending') {
            throw new AppError(409, 'Attachment was already sent');
        }
        if (Date.now() - attachment.createdAt.getTime() > CHAT_UPLOAD_PASS_TTL_MS) {
            throw new AppError(410, 'Upload expired, please try again');
        }
        if (!verifyChatUploadReceipt(attachment.publicId, receipt.version, receipt.signature)) {
            throw new AppError(400, 'Invalid upload receipt');
        }

        const claimed = await Attachment.findOneAndUpdate(
            { _id: attachment._id, status: 'pending' },
            { $set: { status: 'sent', message: messageId } },
        );
        if (!claimed) throw new AppError(409, 'Attachment was already sent');

        // Prefer Cloudinary's verified values when its notification already arrived; the
        // client's are display hints only.
        const verified = claimed.verified;
        const common = {
            publicId: claimed.publicId,
            resourceType: chatResourceType(claimed.kind),
            version: receipt.version,
            ...(verified ? { format: verified.format, bytes: verified.bytes } : {}),
        };
        const media: IMessageAttachment = claimed.kind === 'image'
            ? {
                ...common,
                width: verified?.width ?? receipt.width,
                height: verified?.height ?? receipt.height,
                thumbnail: receipt.thumbnail,
            }
            : {
                ...common,
                durationMs: verified?.durationMs ?? receipt.durationMs,
                waveform: receipt.waveform,
            };

        return { type: MESSAGE_TYPE_BY_KIND[claimed.kind], attachment: media };
    },

    /** Undoes `claimForMessage` when the message couldn't be saved, so the user can retry. */
    releaseClaim: async (attachmentId: string, messageId: Types.ObjectId): Promise<void> => {
        await Attachment.updateOne(
            { _id: attachmentId, status: 'sent', message: messageId },
            { $set: { status: 'pending' }, $unset: { message: 1 } },
        );
    },

    /**
     * Cloudinary's upload notification: its own report of the file, signed over the raw body.
     * Records the real size and duration, and removes media that breaks the limits even if the
     * message was already sent.
     */
    handleUploadNotification: async (
        rawBody: string,
        timestamp: number,
        signature: string,
    ): Promise<void> => {
        if (!verifyCloudinaryNotification(rawBody, timestamp, signature)) {
            throw new AppError(401, 'Invalid notification signature');
        }

        const notification = JSON.parse(rawBody) as CloudinaryUploadNotification;
        if (notification.notification_type !== 'upload' || !notification.public_id) return;

        const attachment = await Attachment.findOne({ publicId: notification.public_id });
        if (!attachment || attachment.status === 'rejected') return;

        const verified = {
            bytes: notification.bytes ?? 0,
            format: (notification.format ?? '').toLowerCase(),
            width: notification.width,
            height: notification.height,
            durationMs: notification.duration !== undefined
                ? Math.round(notification.duration * 1000)
                : undefined,
        };

        const violation = limitViolation(attachment.kind, verified);
        if (violation) {
            console.warn(`[attachmentService] removing ${attachment.publicId}: ${violation}`);
            await destroyQuietly(attachment);
            attachment.status = 'rejected';
            attachment.verified = verified;
            await attachment.save();
            if (attachment.message) {
                await Message.updateOne(
                    { _id: attachment.message },
                    { $set: { 'attachment.removed': true } },
                );
            }
            return;
        }

        attachment.verified = verified;
        await attachment.save();
        if (attachment.message) {
            await Message.updateOne(
                { _id: attachment.message },
                {
                    $set: {
                        'attachment.bytes': verified.bytes,
                        'attachment.format': verified.format,
                        ...(attachment.kind === 'image'
                            ? { 'attachment.width': verified.width, 'attachment.height': verified.height }
                            : { 'attachment.durationMs': verified.durationMs }),
                    },
                },
            );
        }
    },

    /** Deletes uploads that were never attached to a message (abandoned or failed sends). */
    cleanupOrphans: async (now = Date.now()): Promise<number> => {
        const orphans = await Attachment.find({
            status: { $in: ['pending', 'rejected'] },
            message: { $exists: false },
            createdAt: { $lt: new Date(now - CHAT_ORPHAN_UPLOAD_TTL_MS) },
        }).limit(200);

        for (const orphan of orphans) {
            // Rejected media was already deleted from Cloudinary.
            if (orphan.status === 'pending') await destroyQuietly(orphan);
        }
        await Attachment.deleteMany({ _id: { $in: orphans.map((o) => o._id) } });
        return orphans.length;
    },

    /** Account deletion: media the user sent or received, since both directions of messages go. */
    deleteMediaForUser: async (userId: string): Promise<void> => {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const attachments = await Attachment.find({
            $or: [{ owner: userObjectId }, { receiver: userObjectId }],
        });

        for (const attachment of attachments) {
            if (attachment.status !== 'rejected') await destroyQuietly(attachment);
        }
        await Attachment.deleteMany({ _id: { $in: attachments.map((a) => a._id) } });
    },
};
