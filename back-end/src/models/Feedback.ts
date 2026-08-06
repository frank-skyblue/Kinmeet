import mongoose, { Document, Schema, Types } from 'mongoose';

export const FEEDBACK_CATEGORIES = [
    'Bug or Technical Issue',
    'Feature Suggestion',
    'Profile or Account Feedback',
    'Messaging Feedback',
    'Discovery / Matching Feedback',
    'Community or Safety Feedback',
    'General App Experience',
] as const;

export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number];

export type FeedbackStatus = 'new';

export interface IFeedbackScreenshot {
    url: string;
    publicId: string;
}

export interface IFeedback extends Document {
    userId: Types.ObjectId;
    category: FeedbackCategory;
    message: string;
    screenshots: IFeedbackScreenshot[];
    followUp: boolean;
    status: FeedbackStatus;
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FeedbackScreenshotSchema = new Schema<IFeedbackScreenshot>({
    url: { type: String, required: true },
    publicId: { type: String, required: true },
}, { _id: false });

const FeedbackSchema: Schema<IFeedback> = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: FEEDBACK_CATEGORIES, required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    screenshots: [FeedbackScreenshotSchema],
    followUp: { type: Boolean, default: false },
    status: { type: String, enum: ['new'], default: 'new' },
}, {
    timestamps: true,
});

FeedbackSchema.index({ userId: 1, createdAt: -1 });

export const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);
