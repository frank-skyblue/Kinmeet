import { AppError } from '../middleware/errorHandler';
import { DeviceSubscription, WEB_PUSH_CHANNEL } from '../models/DeviceSubscription';
import { User, type ChannelPreferences } from '../models/User';

export const NO_PUSH_DEVICE_MESSAGE = 'Turn on notifications on this device first.';

export interface NotificationPreferencesView {
    newPeopleNearby: ChannelPreferences;
}

type ChannelChanges = Partial<ChannelPreferences>;

const toView = (prefs: Partial<ChannelPreferences> | undefined): NotificationPreferencesView => ({
    newPeopleNearby: { email: Boolean(prefs?.email), push: Boolean(prefs?.push) },
});

const loadNewPeopleNearby = async (userId: string) => {
    const user = await User.findById(userId).select('notificationPreferences');
    if (!user) throw new AppError(404, 'User not found');
    return user.notificationPreferences?.newPeopleNearby;
};

export const notificationPreferencesService = {
    get: async (userId: string): Promise<NotificationPreferencesView> =>
        toView(await loadNewPeopleNearby(userId)),

    /**
     * Saves only the channels named in `changes`, so two places editing at once (Discover and
     * Settings, or two tabs) never overwrite each other's choice.
     */
    updateNewPeopleNearby: async (
        userId: string,
        changes: ChannelChanges,
    ): Promise<NotificationPreferencesView> => {
        // Push is only "on" when something can receive it: the browser registers a device first.
        if (changes.push === true) {
            const hasDevice = await DeviceSubscription.exists({ userId, channel: WEB_PUSH_CHANNEL });
            if (!hasDevice) throw new AppError(409, NO_PUSH_DEVICE_MESSAGE);
        }

        const current = await loadNewPeopleNearby(userId);
        const wasOff = !current?.email && !current?.push;
        const turnsOn = changes.email === true || changes.push === true;

        const $set: Record<string, unknown> = {};
        for (const channel of ['email', 'push'] as const) {
            if (changes[channel] !== undefined) {
                $set[`notificationPreferences.newPeopleNearby.${channel}`] = changes[channel];
            }
        }
        // People who joined before alerts were turned on are not "new" to this user.
        if (wasOff && turnsOn) {
            $set['notificationPreferences.newPeopleNearby.since'] = new Date();
        }

        const updated = await User.findByIdAndUpdate(userId, { $set }, { new: true })
            .select('notificationPreferences');
        if (!updated) throw new AppError(404, 'User not found');
        return toView(updated.notificationPreferences?.newPeopleNearby);
    },
};
