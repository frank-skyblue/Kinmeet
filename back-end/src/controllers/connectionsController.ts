import { Request, Response } from 'express';
import { Connection } from '../models/Connection';
import { ConnectionRequest } from '../models/ConnectionRequest';
import { User } from '../models/User';

export const getConnectionRequests = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        
        const requests = await ConnectionRequest.find({
            receiver: userId,
            status: 'pending'
        })
        .populate('sender', '-password -lastName -email -blockedUsers')
        .sort({ createdAt: -1 });
        
        return res.status(200).json({
            success: true,
            requests
        });
    } catch (error) {
        console.error('Get connection requests error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const acceptConnectionRequest = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { requestId } = req.params;
        
        // Find the request
        const request = await ConnectionRequest.findById(requestId);
        
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }
        
        // Verify the user is the receiver
        if (request.receiver.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        
        // Check if request is already processed
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Request already processed'
            });
        }
        
        // Update request status
        request.status = 'accepted';
        await request.save();
        
        // Create connection (ensure user1 < user2 for consistent ordering)
        const user1 = request.sender.toString() < request.receiver.toString() 
            ? request.sender 
            : request.receiver;
        const user2 = request.sender.toString() < request.receiver.toString() 
            ? request.receiver 
            : request.sender;
        
        const connection = new Connection({
            user1,
            user2
        });
        
        await connection.save();
        
        return res.status(200).json({
            success: true,
            message: 'Connection request accepted',
            connection
        });
    } catch (error) {
        console.error('Accept connection request error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const ignoreConnectionRequest = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { requestId } = req.params;
        
        // Find the request
        const request = await ConnectionRequest.findById(requestId);
        
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }
        
        // Verify the user is the receiver
        if (request.receiver.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        
        // Update request status
        request.status = 'ignored';
        await request.save();
        
        return res.status(200).json({
            success: true,
            message: 'Connection request ignored'
        });
    } catch (error) {
        console.error('Ignore connection request error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getConnections = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        
        // Find all connections
        const connections = await Connection.find({
            $or: [
                { user1: userId },
                { user2: userId }
            ]
        }).sort({ createdAt: -1 });
        
        // Get the connected user IDs
        const connectedUserIds = connections.map(conn => 
            conn.user1.toString() === userId.toString() 
                ? conn.user2 
                : conn.user1
        );
        
        // Fetch full user details (including last names for connections)
        const users = await User.find({
            _id: { $in: connectedUserIds }
        }).select('-password -email -blockedUsers');
        
        return res.status(200).json({
            success: true,
            connections: users
        });
    } catch (error) {
        console.error('Get connections error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

