import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConnection extends Document {
    user1: Types.ObjectId;
    user2: Types.ObjectId;
    createdAt: Date;
    _id: Types.ObjectId;
}

const ConnectionSchema: Schema<IConnection> = new Schema({
    user1: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    user2: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
    timestamps: true
});

// Ensure unique connections (no duplicates)
ConnectionSchema.index({ user1: 1, user2: 1 }, { unique: true });
// Lookups by the second user; the compound index above only serves user1.
ConnectionSchema.index({ user2: 1 });

export const Connection = mongoose.model<IConnection>('Connection', ConnectionSchema);

