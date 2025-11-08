import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage extends Document {
    sender: Types.ObjectId;
    receiver: Types.ObjectId;
    content: string;
    read: boolean;
    createdAt: Date;
    _id: Types.ObjectId;
}

const MessageSchema: Schema<IMessage> = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
}, {
    timestamps: true
});

// Index for efficient querying of conversations
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, read: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

