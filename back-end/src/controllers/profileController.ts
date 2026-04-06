import { Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { User } from '../models/User';
import { Connection } from '../models/Connection';
import { ConnectionRequest } from '../models/ConnectionRequest';
import { Message } from '../models/Message';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
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
    storage: multer.memoryStorage(),
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
            await destroyCloudinaryAvatar(userToDelete.photo);
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

const getCloudinaryPublicId = (url: string): string | null => {
    try {
        const match = url.match(/\/kinmeet\/avatars\/([^/.]+)/);
        return match ? `kinmeet/avatars/${match[1]}` : null;
    } catch {
        return null;
    }
};

const destroyCloudinaryAvatar = async (photoUrl: string) => {
    const publicId = getCloudinaryPublicId(photoUrl);
    if (publicId) {
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch {
            // non-critical — old image may already be gone
        }
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
            await destroyCloudinaryAvatar(user.photo);
        }

        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'kinmeet/avatars',
                    public_id: `${userId}-${Date.now()}`,
                    transformation: [
                        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                        { quality: 'auto', fetch_format: 'auto' },
                    ],
                },
                (error, result) => {
                    if (error || !result) return reject(error);
                    resolve(result);
                },
            );
            stream.end(req.file!.buffer);
        });

        user.photo = result.secure_url;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Photo uploaded successfully',
            photo: result.secure_url,
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
            await destroyCloudinaryAvatar(user.photo);
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
