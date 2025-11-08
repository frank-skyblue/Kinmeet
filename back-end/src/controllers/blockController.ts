import { Request, Response } from 'express';
import { Block } from '../models/Block';
import { Connection } from '../models/Connection';
import { ConnectionRequest } from '../models/ConnectionRequest';

export const blockUser = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { userId: blockedUserId, reason } = req.body;
        
        if (!blockedUserId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        if (userId === blockedUserId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot block yourself'
            });
        }
        
        // Check if already blocked
        const existingBlock = await Block.findOne({
            blocker: userId,
            blocked: blockedUserId
        });
        
        if (existingBlock) {
            return res.status(400).json({
                success: false,
                message: 'User already blocked'
            });
        }
        
        // Create block
        const block = new Block({
            blocker: userId,
            blocked: blockedUserId,
            reason: reason || ''
        });
        
        await block.save();
        
        // Remove any existing connection
        await Connection.deleteOne({
            $or: [
                { user1: userId, user2: blockedUserId },
                { user1: blockedUserId, user2: userId }
            ]
        });
        
        // Remove any pending connection requests
        await ConnectionRequest.deleteMany({
            $or: [
                { sender: userId, receiver: blockedUserId },
                { sender: blockedUserId, receiver: userId }
            ]
        });
        
        return res.status(201).json({
            success: true,
            message: 'User blocked successfully'
        });
    } catch (error) {
        console.error('Block user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const unblockUser = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { userId: blockedUserId } = req.params;
        
        const result = await Block.findOneAndDelete({
            blocker: userId,
            blocked: blockedUserId
        });
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Block not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'User unblocked successfully'
        });
    } catch (error) {
        console.error('Unblock user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getBlockedUsers = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        
        const blocks = await Block.find({ blocker: userId })
            .populate('blocked', 'firstName currentProvince currentCountry')
            .sort({ createdAt: -1 });
        
        return res.status(200).json({
            success: true,
            blockedUsers: blocks
        });
    } catch (error) {
        console.error('Get blocked users error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const reportUser = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { userId: reportedUserId, reason } = req.body;
        
        if (!reportedUserId || !reason) {
            return res.status(400).json({
                success: false,
                message: 'User ID and reason are required'
            });
        }
        
        // For MVP, reporting also blocks the user
        // In production, you'd want to store reports separately and review them
        const block = new Block({
            blocker: userId,
            blocked: reportedUserId,
            reason: `REPORT: ${reason}`
        });
        
        await block.save();
        
        // Remove connection and requests
        await Connection.deleteOne({
            $or: [
                { user1: userId, user2: reportedUserId },
                { user1: reportedUserId, user2: userId }
            ]
        });
        
        await ConnectionRequest.deleteMany({
            $or: [
                { sender: userId, receiver: reportedUserId },
                { sender: reportedUserId, receiver: userId }
            ]
        });
        
        return res.status(201).json({
            success: true,
            message: 'User reported and blocked successfully'
        });
    } catch (error) {
        console.error('Report user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

