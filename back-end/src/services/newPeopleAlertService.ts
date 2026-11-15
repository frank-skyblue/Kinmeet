import type { Types } from 'mongoose';
import { WEB_APP_URL } from '../config/env';
import { ACTIVE_ACCOUNT_FILTER, User } from '../models/User';
import { Block } from '../models/Block';
import { Connection } from '../models/Connection';
import { ConnectionRequest } from '../models/ConnectionRequest';
import { DiscoverPass } from '../models/DiscoverPass';
import { EMAIL_BATCH_LIMIT, describeNewPeople, emailService } from './emailService';
import { webPushChannel } from './notifications/webPushChannel';

/**
 * "New people nearby" alerts.
 *
 * When someone joins a group (same home and current country), subscribers in that group are
 * alerted at once by email and push, whichever they turned on. Each subscriber then has one
 * cooldown shared by both channels: people who join during it are held and sent together as one
 * "N new people" alert by the sweep once it ends.
 *
 * Who counts as new is worked out from the database each time (groupJoinedAt after the
 * subscriber's last alert), not from an in-memory queue, so a restart or failed send loses nothing.
 */

export const NEW_PEOPLE_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const NEW_PEOPLE_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
export const NEW_PEOPLE_PUSH_TAG = 'kinmeet-new-people';
const DISCOVER_PATH = '/discover';

// Anyone held back by a cooldown joined less than one cooldown ago. The extra hour covers sweeps
// that were missed while the server was down.
const SWEEP_LOOKBACK_MS = NEW_PEOPLE_ALERT_COOLDOWN_MS + 60 * 60 * 1000;
const PUSH_CONCURRENCY = 20;
const CLAIM_CONCURRENCY = 50;

interface Group {
    homeCountry: string;
    currentCountry: string;
}

interface Subscriber {
    _id: Types.ObjectId;
    email: string;
    firstName: string;
    homeCountry: string;
    notificationPreferences?: { newPeopleNearby?: { email?: boolean; push?: boolean; since?: Date } };
    lastNewPeopleAlertAt?: Date | null;
}

interface DueAlert {
    subscriber: Subscriber;
    count: number;
    /** Claim value to restore if nothing could be delivered. */
    previousAlertAt: Date | null;
    delivered: boolean;
}

const SUBSCRIBED = {
    $or: [
        { 'notificationPreferences.newPeopleNearby.email': true },
        { 'notificationPreferences.newPeopleNearby.push': true },
    ],
};

const pairKey = (subscriberId: string, arrivalId: string) => `${subscriberId}:${arrivalId}`;

/**
 * Pairs (subscriber, arrival) where the subscriber already knows the arrival: passed, blocked
 * either way, connected, or a request either way. Those arrivals are not "new" to them.
 */
const loadSeenPairs = async (
    subscriberIds: Types.ObjectId[],
    arrivalIds: Types.ObjectId[],
): Promise<Set<string>> => {
    const between = <A extends string, B extends string>(a: A, b: B) => ({
        $or: [
            { [a]: { $in: subscriberIds }, [b]: { $in: arrivalIds } },
            { [a]: { $in: arrivalIds }, [b]: { $in: subscriberIds } },
        ],
    });

    const [passes, blocks, connections, requests] = await Promise.all([
        DiscoverPass.find({ viewer: { $in: subscriberIds }, viewed: { $in: arrivalIds } })
            .select('viewer viewed').lean(),
        Block.find(between('blocker', 'blocked')).select('blocker blocked').lean(),
        Connection.find(between('user1', 'user2')).select('user1 user2').lean(),
        ConnectionRequest.find(between('sender', 'receiver')).select('sender receiver').lean(),
    ]);

    const seen = new Set<string>();
    const add = (a: Types.ObjectId, b: Types.ObjectId) => {
        seen.add(pairKey(a.toString(), b.toString()));
        seen.add(pairKey(b.toString(), a.toString()));
    };
    passes.forEach((p) => add(p.viewer, p.viewed));
    blocks.forEach((b) => add(b.blocker, b.blocked));
    connections.forEach((c) => add(c.user1, c.user2));
    requests.forEach((r) => add(r.sender, r.receiver));
    return seen;
};

/**
 * Marks the alert as sent before sending, only if no one else did since we read the subscriber.
 * With several server instances (or the instant path racing the sweep) exactly one wins.
 */
const claim = async (subscriber: Subscriber, now: Date): Promise<boolean> => {
    const claimed = await User.findOneAndUpdate(
        { _id: subscriber._id, lastNewPeopleAlertAt: subscriber.lastNewPeopleAlertAt ?? null },
        { $set: { lastNewPeopleAlertAt: now } },
    ).select('_id');
    return Boolean(claimed);
};

export const sendEmails = async (alerts: DueAlert[]) => {
    const withEmail = alerts.filter((a) => a.subscriber.notificationPreferences?.newPeopleNearby?.email);
    for (let i = 0; i < withEmail.length; i += EMAIL_BATCH_LIMIT) {
        const chunk = withEmail.slice(i, i + EMAIL_BATCH_LIMIT);
        try {
            await emailService.sendBatch(chunk.map(({ subscriber, count }) =>
                emailService.newPeopleNearbyEmail({
                    to: subscriber.email,
                    firstName: subscriber.firstName,
                    count,
                    homeCountry: subscriber.homeCountry,
                    discoverLink: `${WEB_APP_URL}${DISCOVER_PATH}`,
                }),
            ));
            chunk.forEach((alert) => { alert.delivered = true; });
        } catch (err) {
            console.error('[newPeopleAlerts] email batch failed:', err);
        }
    }
};

const sendPushes = async (alerts: DueAlert[]) => {
    const withPush = alerts.filter((a) => a.subscriber.notificationPreferences?.newPeopleNearby?.push);
    for (let i = 0; i < withPush.length; i += PUSH_CONCURRENCY) {
        await Promise.all(withPush.slice(i, i + PUSH_CONCURRENCY).map(async (alert) => {
            const { subscriber, count } = alert;
            try {
                const reached = await webPushChannel.sendPush(subscriber._id.toString(), {
                    title: 'KinMeet',
                    body: describeNewPeople(count, subscriber.homeCountry),
                    clickPath: DISCOVER_PATH,
                    tag: NEW_PEOPLE_PUSH_TAG,
                    data: { type: 'new_people_nearby' },
                });
                // No device got it (e.g. logged out everywhere): not delivered, so it can be retried.
                if (reached > 0) alert.delivered = true;
            } catch (err) {
                console.error('[newPeopleAlerts] push failed:', err);
            }
        }));
    }
};

/** Alerts every subscriber in one group whose cooldown is over and who has someone new. */
const deliverForGroup = async (group: Group, now: Date): Promise<number> => {
    const cooldownCutoff = new Date(now.getTime() - NEW_PEOPLE_ALERT_COOLDOWN_MS);
    const subscribers = await User.find({
        homeCountry: group.homeCountry,
        currentCountry: group.currentCountry,
        ...ACTIVE_ACCOUNT_FILTER,
        $and: [
            SUBSCRIBED,
            { $or: [{ lastNewPeopleAlertAt: null }, { lastNewPeopleAlertAt: { $lte: cooldownCutoff } }] },
        ],
    })
        .select('email firstName homeCountry notificationPreferences lastNewPeopleAlertAt')
        .lean<Subscriber[]>();
    if (subscribers.length === 0) return 0;

    // Each subscriber counts people who joined after both their last alert and their opt-in.
    const windowStart = new Map<string, number>();
    for (const sub of subscribers) {
        const since = sub.notificationPreferences?.newPeopleNearby?.since?.getTime()
            ?? now.getTime() - SWEEP_LOOKBACK_MS;
        windowStart.set(sub._id.toString(), Math.max(sub.lastNewPeopleAlertAt?.getTime() ?? 0, since));
    }

    const arrivals = await User.find({
        homeCountry: group.homeCountry,
        currentCountry: group.currentCountry,
        profileComplete: true,
        ...ACTIVE_ACCOUNT_FILTER,
        groupJoinedAt: { $gt: new Date(Math.min(...windowStart.values())) },
    })
        .select('_id groupJoinedAt')
        .lean<{ _id: Types.ObjectId; groupJoinedAt: Date }[]>();
    if (arrivals.length === 0) return 0;

    const seen = await loadSeenPairs(subscribers.map((s) => s._id), arrivals.map((a) => a._id));

    const candidates = subscribers
        .map((subscriber) => {
            const id = subscriber._id.toString();
            const start = windowStart.get(id)!;
            const count = arrivals.filter((arrival) => {
                const arrivalId = arrival._id.toString();
                return arrivalId !== id
                    && arrival.groupJoinedAt.getTime() > start
                    && !seen.has(pairKey(id, arrivalId));
            }).length;
            return { subscriber, count };
        })
        .filter(({ count }) => count > 0);

    const due: DueAlert[] = [];
    for (let i = 0; i < candidates.length; i += CLAIM_CONCURRENCY) {
        const chunk = candidates.slice(i, i + CLAIM_CONCURRENCY);
        const won = await Promise.all(chunk.map(({ subscriber }) => claim(subscriber, now)));
        chunk.forEach(({ subscriber, count }, index) => {
            if (!won[index]) return;
            due.push({
                subscriber,
                count,
                previousAlertAt: subscriber.lastNewPeopleAlertAt ?? null,
                delivered: false,
            });
        });
    }
    if (due.length === 0) return 0;

    await Promise.all([sendEmails(due), sendPushes(due)]);

    // Nothing reached them: give the claim back so the next sweep retries.
    const failed = due.filter((alert) => !alert.delivered);
    await Promise.all(failed.map(({ subscriber, previousAlertAt }) =>
        User.updateOne(
            { _id: subscriber._id, lastNewPeopleAlertAt: now },
            previousAlertAt
                ? { $set: { lastNewPeopleAlertAt: previousAlertAt } }
                : { $unset: { lastNewPeopleAlertAt: 1 } },
        ),
    ));
    return due.length - failed.length;
};

export const newPeopleAlertService = {
    /** Called when someone joins a group. Alerts subscribers there whose cooldown is over. */
    notifyGroup: async (group: Group, now: Date = new Date()): Promise<number> =>
        deliverForGroup(group, now),

    /**
     * Runs every few minutes. Sends held alerts for subscribers whose cooldown has ended, in every
     * group someone joined recently.
     */
    sweep: async (now: Date = new Date()): Promise<number> => {
        const groups = await User.aggregate<{ _id: Group }>([
            {
                $match: {
                    groupJoinedAt: { $gt: new Date(now.getTime() - SWEEP_LOOKBACK_MS) },
                    profileComplete: true,
                    ...ACTIVE_ACCOUNT_FILTER,
                },
            },
            { $group: { _id: { homeCountry: '$homeCountry', currentCountry: '$currentCountry' } } },
        ]);

        let sent = 0;
        for (const { _id: group } of groups) {
            sent += await deliverForGroup(group, now);
        }
        return sent;
    },
};

/** Fire-and-forget trigger for signup and country changes; never slows down or fails the request. */
export const notifyGroupInBackground = (group: Group): void => {
    void newPeopleAlertService.notifyGroup(group).catch((err) => {
        console.error('[newPeopleAlerts] instant alert failed:', err);
    });
};
