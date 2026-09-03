import mongoose, { Document, Schema, Types } from 'mongoose';

export const SUPPORT_ISSUE_TYPES = [
    'Account issue',
    'Login/password issue',
    'Profile issue',
    'Technical problem',
    'Safety concern',
    'Other',
] as const;

export type SupportIssueType = typeof SUPPORT_ISSUE_TYPES[number];

export interface ISupportRequestScreenshot {
    url: string;
    publicId: string;
}

export interface ISupportRequest extends Document {
    userId: Types.ObjectId;
    email: string;
    issueType: SupportIssueType;
    subject?: string;
    message: string;
    screenshots: ISupportRequestScreenshot[];
    followUp: boolean;
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SupportRequestScreenshotSchema = new Schema<ISupportRequestScreenshot>({
    url: { type: String, required: true },
    publicId: { type: String, required: true },
}, { _id: false });

const SupportRequestSchema: Schema<ISupportRequest> = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    issueType: { type: String, enum: SUPPORT_ISSUE_TYPES, required: true },
    subject: { type: String, trim: true, maxlength: 100 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    screenshots: [SupportRequestScreenshotSchema],
    followUp: { type: Boolean, default: false },
}, {
    timestamps: true,
});

SupportRequestSchema.index({ userId: 1, createdAt: -1 });

export const SupportRequest = mongoose.model<ISupportRequest>('SupportRequest', SupportRequestSchema);
