import { Request, Response } from 'express';
import { User } from '../models/User';
import { Connection } from '../models/Connection';
import { ConnectionRequest } from '../models/ConnectionRequest';
import { Block } from '../models/Block';

export const getMatches = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        
        // Get current user's data
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Find users who have blocked the current user or users blocked by current user
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
        
        // Find existing connections
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
        
        // Find sent/received connection requests
        const requests = await ConnectionRequest.find({
            $or: [
                { sender: userId },
                { receiver: userId }
            ]
        });
        
        const requestedUserIds = requests.map(req => 
            req.sender.toString() === userId.toString() 
                ? req.receiver.toString() 
                : req.sender.toString()
        );
        
        // Find matches: same home country, same current country, not connected, not requested, not blocked
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
        
        return res.status(200).json({
            success: true,
            matches
        });
    } catch (error) {
        console.error('Get matches error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const sendMeetRequest = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { receiverId } = req.body;
        
        if (!receiverId) {
            return res.status(400).json({
                success: false,
                message: 'Receiver ID is required'
            });
        }
        
        if (userId === receiverId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send request to yourself'
            });
        }
        
        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if users are blocked
        const blocked = await Block.findOne({
            $or: [
                { blocker: userId, blocked: receiverId },
                { blocker: receiverId, blocked: userId }
            ]
        });
        
        if (blocked) {
            return res.status(403).json({
                success: false,
                message: 'Cannot send request'
            });
        }
        
        // Check if already connected
        const existingConnection = await Connection.findOne({
            $or: [
                { user1: userId, user2: receiverId },
                { user1: receiverId, user2: userId }
            ]
        });
        
        if (existingConnection) {
            return res.status(400).json({
                success: false,
                message: 'Already connected'
            });
        }
        
        // Check if request already exists
        const existingRequest = await ConnectionRequest.findOne({
            $or: [
                { sender: userId, receiver: receiverId },
                { sender: receiverId, receiver: userId }
            ]
        });
        
        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'Request already exists'
            });
        }
        
        // Create connection request
        const request = new ConnectionRequest({
            sender: userId,
            receiver: receiverId,
            status: 'pending'
        });
        
        await request.save();
        
        return res.status(201).json({
            success: true,
            message: 'Meet request sent successfully',
            request
        });
    } catch (error) {
        console.error('Send meet request error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const passUser = async (req: Request, res: Response) => {
    try {
        // For MVP, passing just means not sending a request
        // In the future, we could track passed users to not show them again
        
        return res.status(200).json({
            success: true,
            message: 'User passed'
        });
    } catch (error) {
        console.error('Pass user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

