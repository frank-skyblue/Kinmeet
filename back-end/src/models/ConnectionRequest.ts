import mongoose, { Document, Schema, Types } from 'mongoose';

type RequestStatus = 'pending' | 'accepted' | 'ignored';

export interface IConnectionRequest extends Document {
    sender: Types.ObjectId;
    receiver: Types.ObjectId;
    status: RequestStatus;
    createdAt: Date;
    updatedAt: Date;
    _id: Types.ObjectId;
}

const ConnectionRequestSchema: Schema<IConnectionRequest> = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'ignored'], 
        default: 'pending' 
    },
}, {
    timestamps: true
});

// Ensure one request per sender-receiver pair
ConnectionRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
// Incoming requests; the compound index above only serves lookups by sender.
ConnectionRequestSchema.index({ receiver: 1 });

export const ConnectionRequest = mongoose.model<IConnectionRequest>('ConnectionRequest', ConnectionRequestSchema);

