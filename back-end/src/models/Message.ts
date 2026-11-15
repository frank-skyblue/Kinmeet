import mongoose, { Document, Schema, Types } from 'mongoose';
import { CHAT_THUMBNAIL_MAX_LENGTH } from '../config/chatMedia';

export const MESSAGE_TYPES = ['text', 'image', 'voice'] as const;

export type MessageType = typeof MESSAGE_TYPES[number];

/**
 * Media stored in Cloudinary. Only the file's identity is stored, never a URL: viewing links
 * are signed when messages are read, so sizes or delivery rules can change later.
 */
export interface IMessageAttachment {
    publicId: string;
    resourceType: 'image' | 'video';
    version: number;
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
    thumbnail?: string;
    durationMs?: number;
    waveform?: number[];
    /** Set when the file was deleted for breaking the limits; the message stays, the media doesn't. */
    removed?: boolean;
}

export interface IMessage extends Document {
    sender: Types.ObjectId;
    receiver: Types.ObjectId;
    type: MessageType;
    /** The text, or an optional caption for an image. */
    content?: string;
    attachment?: IMessageAttachment;
    /** Client-generated, so a retried send returns the original message instead of a duplicate. */
    clientMessageId?: string;
    read: boolean;
    createdAt: Date;
    _id: Types.ObjectId;
}

const MessageAttachmentSchema = new Schema<IMessageAttachment>({
    publicId: { type: String, required: true },
    resourceType: { type: String, enum: ['image', 'video'], required: true },
    version: { type: Number, required: true },
    format: { type: String },
    bytes: { type: Number },
    width: { type: Number },
    height: { type: Number },
    thumbnail: { type: String, maxlength: CHAT_THUMBNAIL_MAX_LENGTH },
    durationMs: { type: Number },
    waveform: { type: [Number], default: undefined },
    removed: { type: Boolean },
}, { _id: false });

const MessageSchema: Schema<IMessage> = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: MESSAGE_TYPES, default: 'text' },
    content: {
        type: String,
        trim: true,
        maxlength: 5000,
        required: function (this: IMessage) {
            return this.type === 'text';
        },
    },
    attachment: { type: MessageAttachmentSchema },
    clientMessageId: { type: String, maxlength: 100 },
    read: { type: Boolean, default: false },
}, {
    timestamps: true
});

// Index for efficient querying of conversations
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, read: 1 });
MessageSchema.index(
    { sender: 1, clientMessageId: 1 },
    { unique: true, partialFilterExpression: { clientMessageId: { $type: 'string' } } },
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
