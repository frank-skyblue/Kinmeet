import { Request, Response } from 'express';
import { Message } from '../models/Message';
import { Connection } from '../models/Connection';
import { User } from '../models/User';

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { receiverId, content } = req.body;
        
        if (!receiverId || !content) {
            return res.status(400).json({
                success: false,
                message: 'Receiver ID and content are required'
            });
        }
        
        if (!content.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }
        
        // Check if users are connected
        const connection = await Connection.findOne({
            $or: [
                { user1: userId, user2: receiverId },
                { user1: receiverId, user2: userId }
            ]
        });
        
        if (!connection) {
            return res.status(403).json({
                success: false,
                message: 'Can only message connected users'
            });
        }
        
        // Create message
        const message = new Message({
            sender: userId,
            receiver: receiverId,
            content: content.trim(),
            read: false
        });
        
        await message.save();
        
        return res.status(201).json({
            success: true,
            message
        });
    } catch (error) {
        console.error('Send message error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getConversation = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { userId: otherUserId } = req.params;
        
        // Check if users are connected
        const connection = await Connection.findOne({
            $or: [
                { user1: userId, user2: otherUserId },
                { user1: otherUserId, user2: userId }
            ]
        });
        
        if (!connection) {
            return res.status(403).json({
                success: false,
                message: 'Can only view conversations with connected users'
            });
        }
        
        // Get all messages between the two users
        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: otherUserId },
                { sender: otherUserId, receiver: userId }
            ]
        })
        .sort({ createdAt: 1 })
        .populate('sender', 'firstName lastName')
        .populate('receiver', 'firstName lastName');
        
        // Mark messages as read
        await Message.updateMany(
            {
                sender: otherUserId,
                receiver: userId,
                read: false
            },
            {
                read: true
            }
        );
        
        return res.status(200).json({
            success: true,
            messages
        });
    } catch (error) {
        console.error('Get conversation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getConversations = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        
        // Get all connections
        const connections = await Connection.find({
            $or: [
                { user1: userId },
                { user2: userId }
            ]
        });
        
        const connectedUserIds = connections.map(conn => 
            conn.user1.toString() === userId.toString() 
                ? conn.user2 
                : conn.user1
        );
        
        // Get last message with each connected user
        const conversations = await Promise.all(
            connectedUserIds.map(async (connectedUserId) => {
                const lastMessage = await Message.findOne({
                    $or: [
                        { sender: userId, receiver: connectedUserId },
                        { sender: connectedUserId, receiver: userId }
                    ]
                })
                .sort({ createdAt: -1 })
                .populate('sender', 'firstName lastName')
                .populate('receiver', 'firstName lastName');
                
                const unreadCount = await Message.countDocuments({
                    sender: connectedUserId,
                    receiver: userId,
                    read: false
                });
                
                const user = await User.findById(connectedUserId)
                    .select('firstName lastName photo currentProvince currentCountry');
                
                return {
                    user,
                    lastMessage,
                    unreadCount
                };
            })
        );
        
        // Sort by last message time
        conversations.sort((a, b) => {
            const timeA = a.lastMessage?.createdAt || 0;
            const timeB = b.lastMessage?.createdAt || 0;
            return new Date(timeB).getTime() - new Date(timeA).getTime();
        });
        
        return res.status(200).json({
            success: true,
            conversations
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { senderId } = req.body;
        
        await Message.updateMany(
            {
                sender: senderId,
                receiver: userId,
                read: false
            },
            {
                read: true
            }
        );
        
        return res.status(200).json({
            success: true,
            message: 'Messages marked as read'
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

