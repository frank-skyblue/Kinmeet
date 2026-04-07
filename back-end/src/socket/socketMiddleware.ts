import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import type { JwtPayload } from '../middleware/authMiddleware';

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    socket.data.userId = decoded.id;
    socket.data.email = decoded.email;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
};

