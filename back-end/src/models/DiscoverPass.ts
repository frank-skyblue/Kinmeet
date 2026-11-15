import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * A profile the viewer passed on in Discover. Passed profiles are not shown again and are not
 * counted as new arrivals in "new people nearby" alerts.
 */
export interface IDiscoverPass extends Document {
    viewer: Types.ObjectId;
    viewed: Types.ObjectId;
    createdAt: Date;
}

const DiscoverPassSchema = new Schema<IDiscoverPass>(
    {
        viewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        viewed: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

// Also serves "everyone this viewer passed" from the index alone.
DiscoverPassSchema.index({ viewer: 1, viewed: 1 }, { unique: true });
DiscoverPassSchema.index({ viewed: 1 });

export const DiscoverPass = mongoose.model<IDiscoverPass>('DiscoverPass', DiscoverPassSchema);
