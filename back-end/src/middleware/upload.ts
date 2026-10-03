import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
};

export const imageUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

export const handleImageUploadError = (err: unknown, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'Image must be under 5 MB' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ success: false, message: 'Up to 3 screenshots are allowed' });
        }
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err instanceof Error) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
};
