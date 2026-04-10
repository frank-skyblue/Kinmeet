import mongoose, { Document, Schema, Types } from 'mongoose';

export const WEB_PUSH_CHANNEL = 'web_push' as const;
export type WebPushChannel = typeof WEB_PUSH_CHANNEL;

export type DeviceChannel = WebPushChannel;

export interface IDeviceSubscription extends Document {
    userId: Types.ObjectId;
    channel: DeviceChannel;
    token: string;
    updatedAt: Date;
}

const DeviceSubscriptionSchema = new Schema<IDeviceSubscription>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        channel: { type: String, required: true, enum: [WEB_PUSH_CHANNEL] },
        token: { type: String, required: true },
    },
    { timestamps: true },
);

DeviceSubscriptionSchema.index({ channel: 1, token: 1 }, { unique: true });

export const DeviceSubscription = mongoose.model<IDeviceSubscription>(
    'DeviceSubscription',
    DeviceSubscriptionSchema,
);
