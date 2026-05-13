import { Block } from '../models/Block';
import { AppError } from '../middleware/errorHandler';
import { deleteConnectionAndRequestsBetweenUsers } from './connectionService';

export const blockService = {
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

    reportUser: async (userId: string, reportedUserId: string, reason: string) => {
        if (!reportedUserId || !reason) {
            throw new AppError(400, 'User ID and reason are required');
        }
        if (userId === reportedUserId) {
            throw new AppError(400, 'Cannot report yourself');
        }

        const block = new Block({
            blocker: userId,
            blocked: reportedUserId,
            reason: `REPORT: ${reason}`,
        });
        await block.save();

        await deleteConnectionAndRequestsBetweenUsers(userId, reportedUserId);
    },
};
