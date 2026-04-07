import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import * as profileService from '../services/profileService';

export { avatarUpload } from '../services/profileService';

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await profileService.getProfile(req.user!.id);
    return res.status(200).json({ success: true, user });
});

export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId: targetUserId } = req.params;
    const result = await profileService.getUserProfile(req.user!.id, targetUserId);
    return res.status(200).json({ success: true, ...result });
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await profileService.updateProfile(req.user!.id, req.body);
    return res.status(200).json({ success: true, message: 'Profile updated successfully', user });
});

export const deleteProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    await profileService.deleteProfile(req.user!.id);
    return res.status(200).json({ success: true, message: 'Account deleted successfully' });
});

export const uploadPhoto = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) throw new AppError(400, 'No image file provided');
    const photo = await profileService.uploadPhoto(req.user!.id, req.file.buffer);
    return res.status(200).json({ success: true, message: 'Photo uploaded successfully', photo });
});

export const deletePhoto = asyncHandler(async (req: AuthRequest, res: Response) => {
    await profileService.deletePhoto(req.user!.id);
    return res.status(200).json({ success: true, message: 'Photo removed successfully' });
});
