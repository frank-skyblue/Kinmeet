import mongoose from 'mongoose';
import multer, { FileFilterCallback } from 'multer';
import { User } from '../models/User';
import { Connection } from '../models/Connection';
import { ConnectionRequest } from '../models/ConnectionRequest';
import { Message } from '../models/Message';
import { AuthRequest } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';
import { uploadImage, destroyImage } from './cloudinaryService';

const AVATARS_SUBFOLDER = 'avatars';

const fileFilter = (_req: AuthRequest, file: Express.Multer.File, cb: FileFilterCallback) => {
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

export const getProfile = async (userId: string) => {
    const user = await User.findById(userId).select('-password');
    if (!user) throw new AppError(404, 'User not found');
    return user;
};

export const getUserProfile = async (requesterId: string, targetUserId: string) => {
    const connection = await Connection.findOne({
        $or: [
            { user1: requesterId, user2: targetUserId },
            { user1: targetUserId, user2: requesterId }
        ]
    });

    const selectFields = connection
        ? '-password -blockedUsers'
        : '-password -lastName -blockedUsers';

    const user = await User.findById(targetUserId).select(selectFields);
    if (!user) throw new AppError(404, 'User not found');

    return { user, isConnected: !!connection };
};

export const updateProfile = async (userId: string, updates: Record<string, unknown>) => {
    delete updates.email;
    delete updates.password;
    delete updates._id;
    delete updates.blockedUsers;

    const user = await User.findByIdAndUpdate(
        userId,
        { ...updates, profileComplete: true },
        { new: true, runValidators: true }
    ).select('-password');

    if (!user) throw new AppError(404, 'User not found');
    return user;
};

export const deleteProfile = async (userId: string) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const userToDelete = await User.findById(userId);
    if (userToDelete?.photo) {
        await destroyImage(userToDelete.photo, AVATARS_SUBFOLDER);
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
    if (!user) throw new AppError(404, 'User not found');
};

export const uploadPhoto = async (userId: string, fileBuffer: Buffer) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError(404, 'User not found');

    if (user.photo) {
        await destroyImage(user.photo, AVATARS_SUBFOLDER);
    }

    const url = await uploadImage(fileBuffer, {
        subfolder: AVATARS_SUBFOLDER,
        publicId: `${userId}-${Date.now()}`,
        transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
        ],
    });

    user.photo = url;
    await user.save();

    return url;
};

export const deletePhoto = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError(404, 'User not found');

    if (user.photo) {
        await destroyImage(user.photo, AVATARS_SUBFOLDER);
    }

    user.photo = undefined;
    await user.save();
};
