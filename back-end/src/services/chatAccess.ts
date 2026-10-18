import { areUsersBlocked } from '../models/Block';
import { Connection } from '../models/Connection';
import { AppError } from '../middleware/errorHandler';
import { isAccountDeactivated } from '../models/User';

/** Messages, and the uploads attached to them, are only allowed between connected, unblocked users. */
export const assertCanMessage = async (senderId: string, receiverId: string): Promise<void> => {
    if (await areUsersBlocked(senderId, receiverId)) {
        throw new AppError(403, 'Can only message connected users');
    }

    const connection = await Connection.findOne({
        $or: [
            { user1: senderId, user2: receiverId },
            { user1: receiverId, user2: senderId },
        ],
    });
    if (!connection) throw new AppError(403, 'Can only message connected users');

    // After the connection check, so only a kin learns the account is unavailable (not why).
    // Covers sending any message and issuing upload passes for photos and voice messages.
    if (await isAccountDeactivated(receiverId)) {
        throw new AppError(403, 'This account is unavailable');
    }
};
