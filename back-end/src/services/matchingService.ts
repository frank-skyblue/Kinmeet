import { Types } from 'mongoose';
import { ACTIVE_ACCOUNT_FILTER, User } from '../models/User';
import { Connection } from '../models/Connection';
import { ConnectionRequest } from '../models/ConnectionRequest';
import { Block, areUsersBlocked } from '../models/Block';
import { DiscoverPass } from '../models/DiscoverPass';
import { AppError } from '../middleware/errorHandler';

const otherUserId = (userId: string, a: Types.ObjectId, b: Types.ObjectId): string =>
    a.toString() === userId ? b.toString() : a.toString();

/** Users who have blocked this user, or whom this user blocked. */
const getBlockedUserIds = async (userId: string): Promise<string[]> => {
    const blocks = await Block.find({ $or: [{ blocker: userId }, { blocked: userId }] })
        .select('blocker blocked')
        .lean();
    return blocks.map((block) => otherUserId(userId, block.blocker, block.blocked));
};

/** Everyone Discover should not show this user: blocked, connected, requested, or passed. */
const getExcludedUserIds = async (userId: string): Promise<string[]> => {
    const [blockedUserIds, connections, requests, passes] = await Promise.all([
        getBlockedUserIds(userId),
        Connection.find({ $or: [{ user1: userId }, { user2: userId }] }).select('user1 user2').lean(),
        ConnectionRequest.find({ $or: [{ sender: userId }, { receiver: userId }] })
            .select('sender receiver')
            .lean(),
        DiscoverPass.find({ viewer: userId }).select({ viewed: 1, _id: 0 }).lean(),
    ]);

    return [
        ...blockedUserIds,
        ...connections.map((conn) => otherUserId(userId, conn.user1, conn.user2)),
        ...requests.map((r) => otherUserId(userId, r.sender, r.receiver)),
        ...passes.map((pass) => pass.viewed.toString()),
    ];
};

/** The people in the same Discover group: same home and current country, complete and active. */
const groupFilter = (user: { homeCountry: string; currentCountry: string }) => ({
    homeCountry: user.homeCountry,
    currentCountry: user.currentCountry,
    profileComplete: true,
    ...ACTIVE_ACCOUNT_FILTER,
});

export const getMatches = async (userId: string) => {
    const [currentUser, excludedUserIds] = await Promise.all([
        User.findById(userId).select('homeCountry currentCountry'),
        getExcludedUserIds(userId),
    ]);
    if (!currentUser) throw new AppError(404, 'User not found');

    const matches = await User.find({
        _id: { $ne: userId, $nin: excludedUserIds },
        ...groupFilter(currentUser),
    })
    .select('-password -lastName -email -blockedUsers')
    .limit(50)
    .sort({ createdAt: -1 });

    return matches;
};

export type DiscoverEmptyState = 'community_growing' | 'all_caught_up';

/**
 * Why Discover has nothing to show. Counted separately from the match list, so "nobody else is in
 * your group" is never confused with "you've seen everyone". People blocked either way count as
 * absent: this user can never see them.
 */
export const getDiscoverEmptyState = async (userId: string): Promise<DiscoverEmptyState> => {
    const [currentUser, blockedUserIds] = await Promise.all([
        User.findById(userId).select('homeCountry currentCountry'),
        getBlockedUserIds(userId),
    ]);
    if (!currentUser) throw new AppError(404, 'User not found');

    const othersInGroup = await User.countDocuments({
        _id: { $ne: userId, $nin: blockedUserIds },
        ...groupFilter(currentUser),
    });
    return othersInGroup === 0 ? 'community_growing' : 'all_caught_up';
};

export const passUser = async (userId: string, passedUserId: string) => {
    if (userId === passedUserId) throw new AppError(400, 'Cannot pass on yourself');

    await DiscoverPass.updateOne(
        { viewer: userId, viewed: passedUserId },
        { $setOnInsert: { viewer: userId, viewed: passedUserId } },
        { upsert: true },
    );
};

export const sendMeetRequest = async (userId: string, receiverId: string) => {
    if (!receiverId) throw new AppError(400, 'Receiver ID is required');
    if (userId === receiverId) throw new AppError(400, 'Cannot send request to yourself');

    const receiver = await User.findOne({ _id: receiverId, ...ACTIVE_ACCOUNT_FILTER });
    if (!receiver) throw new AppError(404, 'User not found');

    if (await areUsersBlocked(userId, receiverId)) throw new AppError(403, 'Cannot send request');

    const existingConnection = await Connection.findOne({
        $or: [
            { user1: userId, user2: receiverId },
            { user1: receiverId, user2: userId }
        ]
    });
    if (existingConnection) throw new AppError(400, 'Already connected');

    const existingRequest = await ConnectionRequest.findOne({
        $or: [
            { sender: userId, receiver: receiverId },
            { sender: receiverId, receiver: userId }
        ]
    });
    if (existingRequest) throw new AppError(400, 'Request already exists');

    const request = new ConnectionRequest({
        sender: userId,
        receiver: receiverId,
        status: 'pending'
    });
    await request.save();

    return request;
};
