import { AppError } from '../middleware/errorHandler';
import { DeviceSubscription, type DeviceChannel } from '../models/DeviceSubscription';

export const deviceSubscriptionService = {
    register: async (userId: string, channel: DeviceChannel, token: string) => {
        const trimmed = token.trim();
        if (!trimmed) throw new AppError(400, 'Token is required');

        await DeviceSubscription.findOneAndUpdate(
            { channel, token: trimmed },
            { userId, channel, token: trimmed },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
    },

    unregister: async (userId: string, channel: DeviceChannel, token: string) => {
        const trimmed = token.trim();
        if (!trimmed) throw new AppError(400, 'Token is required');

        await DeviceSubscription.deleteOne({ userId, channel, token: trimmed });
    },
};
