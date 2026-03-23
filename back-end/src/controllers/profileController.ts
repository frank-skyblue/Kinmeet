import { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { User } from '../models/User';
import { Connection } from '../models/Connection';
import { ConnectionRequest } from '../models/ConnectionRequest';
import { Message } from '../models/Message';

const UPLOADS_DIR = path.join(__dirname, '../../uploads/avatars');

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const userId = (req as any).user.id;
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `${userId}-${Date.now()}${ext}`);
    },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
};

export const avatarUpload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

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

export const deleteProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const userToDelete = await User.findById(userId);
        if (userToDelete?.photo) {
            removeOldAvatar(userToDelete.photo);
        }

        await Promise.all([
            Connection.deleteMany({
                $or: [{ user1: userObjectId }, { user2: userObjectId }]
            }),
            ConnectionRequest.deleteMany({
                $or: [{ sender: userObjectId }, { receiver: userObjectId }]
            }),
            Message.deleteMany({
                $or: [{ sender: userObjectId }, { receiver: userObjectId }]
            }),
            User.updateMany(
                { blockedUsers: userObjectId },
                { $pull: { blockedUsers: userObjectId } }
            )
        ]);

        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Delete profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const removeOldAvatar = (photoPath: string) => {
    try {
        const filename = path.basename(photoPath);
        const filePath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch {
        // non-critical — old file may already be gone
    }
};

export const uploadPhoto = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided',
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.photo) {
            removeOldAvatar(user.photo);
        }

        const photoUrl = `/uploads/avatars/${req.file.filename}`;

        user.photo = photoUrl;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Photo uploaded successfully',
            photo: photoUrl,
        });
    } catch (error) {
        console.error('Upload photo error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

export const deletePhoto = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.photo) {
            removeOldAvatar(user.photo);
        }

        user.photo = undefined;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Photo removed successfully',
        });
    } catch (error) {
        console.error('Delete photo error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};
