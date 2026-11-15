import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { createTestUser } from '../helpers';
import { User, type IUser } from '../../models/User';
import { Block } from '../../models/Block';
import { DiscoverPass } from '../../models/DiscoverPass';
import { emailService, type EmailPayload } from '../../services/emailService';
import { webPushChannel, type WebPushMessage } from '../../services/notifications/webPushChannel';
import {
    NEW_PEOPLE_ALERT_COOLDOWN_MS,
    NEW_PEOPLE_PUSH_TAG,
    newPeopleAlertService,
} from '../../services/newPeopleAlertService';

const GROUP = { homeCountry: 'France', currentCountry: 'Canada' };
const T0 = new Date('2026-03-01T12:00:00Z');
const minutes = (n: number) => n * 60 * 1000;
const at = (offsetMs: number) => new Date(T0.getTime() + offsetMs);

let sendBatch: MockInstance<typeof emailService.sendBatch>;
let sendPush: MockInstance<typeof webPushChannel.sendPush>;

const emailsSent = (): EmailPayload[] => sendBatch.mock.calls.flatMap(([emails]) => emails);
const pushesSent = (): { userId: string; message: WebPushMessage }[] =>
    sendPush.mock.calls.map(([userId, message]) => ({ userId, message }));

/** An opted-in user. Alerts started an hour before T0 unless `since` is given. */
const createSubscriber = async (
    email: string,
    channels: { email?: boolean; push?: boolean },
    overrides: Parameters<typeof createTestUser>[0] = {},
    since = at(-minutes(60)),
): Promise<IUser> => {
    const user = await createTestUser({ email, ...overrides });
    await User.updateOne({ _id: user._id }, {
        $set: {
            'notificationPreferences.newPeopleNearby': {
                email: Boolean(channels.email),
                push: Boolean(channels.push),
                since,
            },
        },
    });
    return user;
};

/** Someone who joined the group at `joinedAt`. */
const createArrival = async (
    email: string,
    joinedAt: Date,
    overrides: Parameters<typeof createTestUser>[0] = {},
): Promise<IUser> => {
    const user = await createTestUser({ email, firstName: 'Zelda', lastName: 'Moreau', ...overrides });
    await User.updateOne({ _id: user._id }, { $set: { groupJoinedAt: joinedAt } });
    return user;
};

const lastAlertAt = async (user: IUser) =>
    (await User.findById(user._id).select('lastNewPeopleAlertAt').lean())!.lastNewPeopleAlertAt;

describe('newPeopleAlertService', () => {
    beforeEach(() => {
        sendBatch = vi.spyOn(emailService, 'sendBatch').mockResolvedValue();
        sendPush = vi.spyOn(webPushChannel, 'sendPush').mockResolvedValue(1);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('instant alert when someone joins', () => {
        it('emails an opted-in subscriber right away', async () => {
            const subscriber = await createSubscriber('sub@test.com', { email: true });
            await createArrival('new@test.com', T0);

            const sent = await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)));

            expect(sent).toBe(1);
            const [email] = emailsSent();
            expect(email!.to).toBe('sub@test.com');
            expect(email!.subject).toBe('1 new person from France joined near you on KinMeet');
            expect(email!.html).toContain('http://localhost:5173/discover');
            expect(sendPush).not.toHaveBeenCalled();
            expect((await lastAlertAt(subscriber))!.getTime()).toBe(at(minutes(1)).getTime());
        });

        it('pushes to a push-only subscriber, opening Discover, and sends no email', async () => {
            const subscriber = await createSubscriber('sub@test.com', { push: true });
            await createArrival('new@test.com', T0);

            await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)));

            expect(sendBatch).not.toHaveBeenCalled();
            const [push] = pushesSent();
            expect(push!.userId).toBe(subscriber._id.toString());
            expect(push!.message).toMatchObject({
                body: '1 new person from France joined near you',
                clickPath: '/discover',
                tag: NEW_PEOPLE_PUSH_TAG,
            });
        });

        it('uses both channels when both are on', async () => {
            await createSubscriber('sub@test.com', { email: true, push: true });
            await createArrival('new@test.com', T0);

            await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)));

            expect(emailsSent()).toHaveLength(1);
            expect(pushesSent()).toHaveLength(1);
        });

        it('never reveals who joined or where exactly', async () => {
            await createSubscriber('sub@test.com', { email: true, push: true });
            await createArrival('new@test.com', T0, { currentProvince: 'Quebec' });

            await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)));

            const content = JSON.stringify([emailsSent(), pushesSent()]);
            for (const detail of ['Zelda', 'Moreau', 'new@test.com', 'Quebec']) {
                expect(content).not.toContain(detail);
            }
        });

        it('does not alert subscribers who turned both channels off', async () => {
            await createSubscriber('sub@test.com', {});
            await createArrival('new@test.com', T0);

            expect(await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)))).toBe(0);
            expect(sendBatch).not.toHaveBeenCalled();
            expect(sendPush).not.toHaveBeenCalled();
        });
    });

    describe('cooldown and grouping', () => {
        it('holds later arrivals during the cooldown, then sends them as one alert', async () => {
            const subscriber = await createSubscriber('sub@test.com', { email: true, push: true });

            await createArrival('first@test.com', T0);
            await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)));

            await createArrival('second@test.com', at(minutes(10)));
            expect(await newPeopleAlertService.notifyGroup(GROUP, at(minutes(10)))).toBe(0);
            await createArrival('third@test.com', at(minutes(20)));
            expect(await newPeopleAlertService.notifyGroup(GROUP, at(minutes(20)))).toBe(0);
            // Still cooling down.
            expect(await newPeopleAlertService.sweep(at(minutes(60)))).toBe(0);

            const afterCooldown = at(minutes(1) + NEW_PEOPLE_ALERT_COOLDOWN_MS + minutes(5));
            expect(await newPeopleAlertService.sweep(afterCooldown)).toBe(1);

            const emails = emailsSent();
            expect(emails).toHaveLength(2);
            expect(emails[1]!.subject).toBe('2 new people from France joined near you on KinMeet');
            expect(pushesSent()[1]!.message.body).toBe('2 new people from France joined near you');
            expect((await lastAlertAt(subscriber))!.getTime()).toBe(afterCooldown.getTime());
        });

        it('sends nothing after the cooldown when no one new joined', async () => {
            await createSubscriber('sub@test.com', { email: true });
            await createArrival('first@test.com', T0);
            await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)));

            const sent = await newPeopleAlertService.sweep(at(NEW_PEOPLE_ALERT_COOLDOWN_MS + minutes(10)));

            expect(sent).toBe(0);
            expect(emailsSent()).toHaveLength(1);
        });

        it('sends one alert when the instant path and the sweep run at the same time', async () => {
            await createSubscriber('sub@test.com', { email: true });
            await createArrival('new@test.com', T0);

            const results = await Promise.all([
                newPeopleAlertService.notifyGroup(GROUP, at(minutes(1))),
                newPeopleAlertService.sweep(at(minutes(1))),
                newPeopleAlertService.notifyGroup(GROUP, at(minutes(1))),
            ]);

            expect(results.reduce((a, b) => a + b, 0)).toBe(1);
            expect(emailsSent()).toHaveLength(1);
        });
    });

    describe('who counts as new', () => {
        it('ignores people the subscriber already knows, other groups, and inactive profiles', async () => {
            const subscriber = await createSubscriber('sub@test.com', { email: true });
            const passed = await createArrival('passed@test.com', T0);
            const blocked = await createArrival('blocked@test.com', T0);
            const deactivated = await createArrival('deactivated@test.com', T0);
            await createArrival('elsewhere@test.com', T0, { currentCountry: 'USA' });
            await createArrival('otherhome@test.com', T0, { homeCountry: 'Italy' });
            await createArrival('incomplete@test.com', T0, { profileComplete: false });
            await createArrival('beforeoptin@test.com', at(-minutes(120)));
            await DiscoverPass.create({ viewer: subscriber._id, viewed: passed._id });
            await Block.create({ blocker: blocked._id, blocked: subscriber._id });
            await User.updateOne({ _id: deactivated._id }, { accountStatus: 'deactivated' });

            expect(await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)))).toBe(0);
            expect(sendBatch).not.toHaveBeenCalled();
        });

        it('does not count the subscriber themself', async () => {
            const subscriber = await createSubscriber('sub@test.com', { email: true });
            await User.updateOne({ _id: subscriber._id }, { $set: { groupJoinedAt: T0 } });

            expect(await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)))).toBe(0);
        });

        it('does not alert deactivated subscribers', async () => {
            const subscriber = await createSubscriber('sub@test.com', { email: true });
            await User.updateOne({ _id: subscriber._id }, { accountStatus: 'deactivated' });
            await createArrival('new@test.com', T0);

            expect(await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)))).toBe(0);
        });

        it('counts each subscriber against their own last alert', async () => {
            await createSubscriber('early@test.com', { email: true });
            await createSubscriber('late@test.com', { email: true }, {}, at(minutes(5)));
            await createArrival('first@test.com', T0);
            await createArrival('second@test.com', at(minutes(10)));

            await newPeopleAlertService.notifyGroup(GROUP, at(minutes(11)));

            const byRecipient = Object.fromEntries(emailsSent().map((e) => [e.to, e.subject]));
            expect(byRecipient['early@test.com']).toMatch(/^2 new people/);
            expect(byRecipient['late@test.com']).toMatch(/^1 new person/);
        });
    });

    describe('delivery failures', () => {
        it('releases the claim when nothing could be delivered, so the next sweep retries', async () => {
            const subscriber = await createSubscriber('sub@test.com', { email: true });
            await createArrival('new@test.com', T0);
            sendBatch.mockRejectedValueOnce(new Error('Resend down'));
            vi.spyOn(console, 'error').mockImplementation(() => {});

            expect(await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)))).toBe(0);
            expect(await lastAlertAt(subscriber)).toBeUndefined();

            expect(await newPeopleAlertService.sweep(at(minutes(6)))).toBe(1);
            expect(sendBatch).toHaveBeenCalledTimes(2);
        });

        it('keeps the cooldown when at least one channel got through', async () => {
            const subscriber = await createSubscriber('sub@test.com', { email: true, push: true });
            await createArrival('new@test.com', T0);
            sendBatch.mockRejectedValueOnce(new Error('Resend down'));
            vi.spyOn(console, 'error').mockImplementation(() => {});

            expect(await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)))).toBe(1);
            expect(await lastAlertAt(subscriber)).toBeDefined();
        });

        it('does not count a push that reached no device (e.g. logged out everywhere)', async () => {
            const subscriber = await createSubscriber('sub@test.com', { push: true });
            await createArrival('new@test.com', T0);
            sendPush.mockResolvedValueOnce(0);

            expect(await newPeopleAlertService.notifyGroup(GROUP, at(minutes(1)))).toBe(0);
            expect(await lastAlertAt(subscriber)).toBeUndefined();
        });
    });
});
