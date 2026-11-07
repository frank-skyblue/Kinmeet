import mongoose, { Document, Schema, Types } from 'mongoose';
import { CHAT_MEDIA_KINDS, type ChatMediaKind } from '../config/chatMedia';

export const ATTACHMENT_STATUSES = ['pending', 'sent', 'rejected'] as const;

export type AttachmentStatus = typeof ATTACHMENT_STATUSES[number];

/**
 * One chat upload, from the moment its upload pass is issued. `pending` until a message uses it,
 * then `sent`; `rejected` when Cloudinary reports it breaks the limits. Kept after sending so a
 * user's media can be found and deleted with their account.
 */
export interface IAttachment extends Document {
    owner: Types.ObjectId;
    receiver: Types.ObjectId;
    kind: ChatMediaKind;
    publicId: string;
    status: AttachmentStatus;
    message?: Types.ObjectId;
    // Reported by Cloudinary's upload notification, so trustworthy (unlike client-reported values).
    verified?: {
        bytes: number;
        format: string;
        width?: number;
        height?: number;
        durationMs?: number;
    };
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const AttachmentSchema: Schema<IAttachment> = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: CHAT_MEDIA_KINDS, required: true },
    publicId: { type: String, required: true, unique: true },
    status: { type: String, enum: ATTACHMENT_STATUSES, default: 'pending' },
    message: { type: Schema.Types.ObjectId, ref: 'Message' },
    verified: {
        type: {
            bytes: Number,
            format: String,
            width: Number,
            height: Number,
            durationMs: Number,
        },
        _id: false,
    },
}, {
    timestamps: true,
});

// Cleanup job: oldest pending uploads first. Account deletion: everything a user sent or received.
AttachmentSchema.index({ status: 1, createdAt: 1 });
AttachmentSchema.index({ owner: 1 });
AttachmentSchema.index({ receiver: 1 });

export const Attachment = mongoose.model<IAttachment>('Attachment', AttachmentSchema);
