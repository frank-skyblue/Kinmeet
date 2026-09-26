import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBlock extends Document {
    blocker: Types.ObjectId;
    blocked: Types.ObjectId;
    reason?: string;
    createdAt: Date;
    _id: Types.ObjectId;
}

const BlockSchema: Schema<IBlock> = new Schema({
    blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true },
}, {
    timestamps: true
});

// Ensure unique blocks
BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export const Block = mongoose.model<IBlock>('Block', BlockSchema);

export const areUsersBlocked = async (userA: string, userB: string): Promise<boolean> => {
    const block = await Block.findOne({
        $or: [
            { blocker: userA, blocked: userB },
            { blocker: userB, blocked: userA },
        ],
    });
    return Boolean(block);
};

