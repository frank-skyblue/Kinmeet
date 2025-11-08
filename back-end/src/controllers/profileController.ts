import { Request, Response } from 'express';
import { User } from '../models/User';
import { Connection } from '../models/Connection';

export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { userId: targetUserId } = req.params;
        
        // Check if users are connected
        const connection = await Connection.findOne({
            $or: [
                { user1: userId, user2: targetUserId },
                { user1: targetUserId, user2: userId }
            ]
        });
        
        // Select fields based on connection status
        const selectFields = connection 
            ? '-password -blockedUsers'  // Show full name if connected
            : '-password -lastName -blockedUsers';  // Hide last name if not connected
        
        const user = await User.findById(targetUserId).select(selectFields);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            user,
            isConnected: !!connection
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const updates = req.body;
        
        // Prevent updating sensitive fields
        delete updates.email;
        delete updates.password;
        delete updates._id;
        delete updates.blockedUsers;
        
        const user = await User.findByIdAndUpdate(
            userId,
            { ...updates, profileComplete: true },
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

