import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'params' | 'query';

export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') =>
    (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
            const message = result.error.issues.map((issue: { message: string }) => issue.message).join(', ');
            return res.status(400).json({ success: false, message });
        }
        req[target] = result.data;
        next();
    };
