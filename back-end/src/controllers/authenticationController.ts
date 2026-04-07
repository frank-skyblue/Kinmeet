import { Request, Response } from "express";
import { authenticationService } from "../services/authenticationService";
import { asyncHandler } from "../middleware/errorHandler";

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required"
        });
    }

    const result = await authenticationService.login({ email, password });

    if (result.success) {
        return res.status(200).json(result);
    } else {
        return res.status(401).json(result);
    }
});

export const register = asyncHandler(async (req: Request, res: Response) => {
    const registerData = req.body;
    const result = await authenticationService.register(registerData);

    if (result.success) {
        return res.status(201).json(result);
    } else {
        return res.status(400).json(result);
    }
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
        return res.status(400).json({
            success: false,
            message: "Token is required"
        });
    }

    const result = await authenticationService.logout(token);

    if (result.success) {
        return res.status(200).json(result);
    } else {
        return res.status(400).json(result);
    }
});
