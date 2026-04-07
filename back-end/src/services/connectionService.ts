import { Connection } from '../models/Connection';
import { ConnectionRequest } from '../models/ConnectionRequest';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';

export const getConnectionRequests = async (userId: string) => {
    const requests = await ConnectionRequest.find({
        receiver: userId,
        status: 'pending'
    })
    .populate('sender', '-password -lastName -email -blockedUsers')
    .sort({ createdAt: -1 });

    return requests;
};

export const acceptConnectionRequest = async (userId: string, requestId: string) => {
    const request = await ConnectionRequest.findById(requestId);
    if (!request) throw new AppError(404, 'Request not found');

    if (request.receiver.toString() !== userId) {
        throw new AppError(403, 'Not authorized');
    }

    if (request.status !== 'pending') {
        throw new AppError(400, 'Request already processed');
    }

    request.status = 'accepted';
    await request.save();

    const user1 = request.sender.toString() < request.receiver.toString()
        ? request.sender
        : request.receiver;
    const user2 = request.sender.toString() < request.receiver.toString()
        ? request.receiver
        : request.sender;

    const connection = new Connection({ user1, user2 });
    await connection.save();

    return connection;
};

export const ignoreConnectionRequest = async (userId: string, requestId: string) => {
    const request = await ConnectionRequest.findById(requestId);
    if (!request) throw new AppError(404, 'Request not found');

    if (request.receiver.toString() !== userId) {
        throw new AppError(403, 'Not authorized');
    }

    request.status = 'ignored';
    await request.save();
};

export const getConnections = async (userId: string) => {
    const connections = await Connection.find({
        $or: [
            { user1: userId },
            { user2: userId }
        ]
    }).sort({ createdAt: -1 });

    const connectedUserIds = connections.map(conn =>
        conn.user1.toString() === userId.toString()
            ? conn.user2
            : conn.user1
    );

    const users = await User.find({
        _id: { $in: connectedUserIds }
    }).select('-password -email -blockedUsers');

    return users;
};
