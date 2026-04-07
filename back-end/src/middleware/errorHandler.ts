import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    constructor(
        public statusCode: number,
        message: string,
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    // Handle MongoDB duplicate key errors
    if ((err as any).code === 11000) {
        return res.status(409).json({
            success: false,
            message: 'Duplicate entry — this resource already exists',
        });
    }

    console.error('Unhandled error:', err);
    return res.status(500).json({
        success: false,
        message: 'Internal server error',
    });
};

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncHandler) =>
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
