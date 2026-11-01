import mongoose, { Document, Schema, Types } from 'mongoose';

export const ACCOUNT_EVENT_TYPES = ['deactivated', 'reactivated'] as const;

export type AccountEventType = typeof ACCOUNT_EVENT_TYPES[number];

// Audit trail for account status changes. Holds only who and what — never request
// bodies, so passwords entered to confirm a change are not recorded.
export interface IAccountEvent extends Document {
    user: Types.ObjectId;
    type: AccountEventType;
    _id: Types.ObjectId;
    createdAt: Date;
}

const AccountEventSchema: Schema<IAccountEvent> = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ACCOUNT_EVENT_TYPES, required: true },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});

AccountEventSchema.index({ user: 1, createdAt: -1 });

export const AccountEvent = mongoose.model<IAccountEvent>('AccountEvent', AccountEventSchema);
