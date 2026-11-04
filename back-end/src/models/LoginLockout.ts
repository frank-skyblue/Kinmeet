import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginLockout extends Document {
    email: string;
    failedAt: Date[];
    lockedUntil: Date | null;
    justLocked: boolean;
    expiresAt: Date;
}

const LoginLockoutSchema = new Schema<ILoginLockout>({
    email: { type: String, required: true, unique: true },
    failedAt: { type: [Date], required: true, default: [] },
    lockedUntil: { type: Date, default: null },
    justLocked: { type: Boolean, required: true, default: false },
    expiresAt: { type: Date, required: true },
}, {
    timestamps: false,
});

// Same TTL style as PasswordResetToken. Decisions use failedAt and lockedUntil.
LoginLockoutSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const LoginLockout = mongoose.model<ILoginLockout>('LoginLockout', LoginLockoutSchema);
