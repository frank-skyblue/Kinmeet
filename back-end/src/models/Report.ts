import mongoose, { Document, Schema, Types } from 'mongoose';

export const REPORT_REASONS = [
    'Harassment or bullying',
    'Fake profile or impersonation',
    'Spam or scam',
    'Inappropriate content',
    'Hate speech or discrimination',
    'Safety concern',
    'Other',
] as const;

export type ReportReason = typeof REPORT_REASONS[number];

export const REPORT_STATUSES = ['new', 'reviewing', 'resolved'] as const;

export type ReportStatus = typeof REPORT_STATUSES[number];

export interface IReport extends Document {
    reporter: Types.ObjectId;
    reported: Types.ObjectId;
    reason: ReportReason;
    details?: string;
    status: ReportStatus;
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ReportSchema: Schema<IReport> = new Schema({
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reported: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: REPORT_STATUSES, default: 'new' },
}, {
    timestamps: true,
});

// Moderation queue: newest unreviewed first, and every report about one user.
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reported: 1, createdAt: -1 });

// Deliberately NOT unique on (reporter, reported): the same person may be
// reported more than once for separate incidents.

export const Report = mongoose.model<IReport>('Report', ReportSchema);
