import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPasswordResetToken extends Document {
    userId: Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
    used: boolean;
}

const PasswordResetTokenSchema: Schema<IPasswordResetToken> = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
});

// Let MongoDB auto-delete expired documents
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken = mongoose.model<IPasswordResetToken>(
    'PasswordResetToken',
    PasswordResetTokenSchema,
);
