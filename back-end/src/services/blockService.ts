import { Block, areUsersBlocked } from '../models/Block';
import { AppError } from '../middleware/errorHandler';
import { deleteConnectionAndRequestsBetweenUsers } from './connectionService';

export const blockService = {
    areUsersBlocked,
    blockUser: async (userId: string, blockedUserId: string, reason?: string) => {
        if (!blockedUserId) throw new AppError(400, 'User ID is required');
        if (userId === blockedUserId) throw new AppError(400, 'Cannot block yourself');

        const existingBlock = await Block.findOne({
            blocker: userId,
            blocked: blockedUserId,
        });
        if (existingBlock) throw new AppError(400, 'User already blocked');

        const block = new Block({
            blocker: userId,
            blocked: blockedUserId,
            reason: reason || '',
        });
        await block.save();

        await deleteConnectionAndRequestsBetweenUsers(userId, blockedUserId);
    },

    unblockUser: async (userId: string, blockedUserId: string) => {
        const result = await Block.findOneAndDelete({
            blocker: userId,
            blocked: blockedUserId,
        });
        if (!result) throw new AppError(404, 'Block not found');
    },

    getBlockedUsers: async (userId: string) => {
        return Block.find({ blocker: userId })
            .populate('blocked', 'firstName currentProvince currentCountry')
            .sort({ createdAt: -1 });
    },
};
