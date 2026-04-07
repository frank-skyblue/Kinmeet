import { User } from '../models/User';
import { Connection } from '../models/Connection';
import { ConnectionRequest } from '../models/ConnectionRequest';
import { Block } from '../models/Block';
import { AppError } from '../middleware/errorHandler';

export const getMatches = async (userId: string) => {
    const currentUser = await User.findById(userId);
    if (!currentUser) throw new AppError(404, 'User not found');

    const blocks = await Block.find({
        $or: [
            { blocker: userId },
            { blocked: userId }
        ]
    });

    const blockedUserIds = blocks.map(block =>
        block.blocker.toString() === userId.toString()
            ? block.blocked.toString()
            : block.blocker.toString()
    );

    const connections = await Connection.find({
        $or: [
            { user1: userId },
            { user2: userId }
        ]
    });

    const connectedUserIds = connections.map(conn =>
        conn.user1.toString() === userId.toString()
            ? conn.user2.toString()
            : conn.user1.toString()
    );

    const requests = await ConnectionRequest.find({
        $or: [
            { sender: userId },
            { receiver: userId }
        ]
    });

    const requestedUserIds = requests.map(r =>
        r.sender.toString() === userId.toString()
            ? r.receiver.toString()
            : r.sender.toString()
    );

    const matches = await User.find({
        _id: {
            $ne: userId,
            $nin: [...connectedUserIds, ...requestedUserIds, ...blockedUserIds]
        },
        homeCountry: currentUser.homeCountry,
        currentCountry: currentUser.currentCountry,
        profileComplete: true
    })
    .select('-password -lastName -email -blockedUsers')
    .limit(50)
    .sort({ createdAt: -1 });

    return matches;
};

export const sendMeetRequest = async (userId: string, receiverId: string) => {
    if (!receiverId) throw new AppError(400, 'Receiver ID is required');
    if (userId === receiverId) throw new AppError(400, 'Cannot send request to yourself');

    const receiver = await User.findById(receiverId);
    if (!receiver) throw new AppError(404, 'User not found');

    const blocked = await Block.findOne({
        $or: [
            { blocker: userId, blocked: receiverId },
            { blocker: receiverId, blocked: userId }
        ]
    });
    if (blocked) throw new AppError(403, 'Cannot send request');

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
