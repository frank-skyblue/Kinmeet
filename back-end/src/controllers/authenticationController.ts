import { Request, Response } from 'express';
import { authenticationService } from '../services/authenticationService';
import { AppError, asyncHandler } from '../middleware/errorHandler';

export const login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authenticationService.login(req.body);
    return res.status(200).json(result);
});

export const register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authenticationService.register(req.body);
    return res.status(201).json(result);
});

export const checkEmail = asyncHandler(async (req: Request, res: Response) => {
    const result = await authenticationService.checkEmailAvailability(req.body.email);
    return res.status(200).json(result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new AppError(400, 'Token is required');

    const result = await authenticationService.logout();
    return res.status(200).json(result);
});
