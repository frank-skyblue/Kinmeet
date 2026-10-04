import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import type { JwtPayload } from '../middleware/authMiddleware';
import { isAccountDeactivated } from '../models/User';

export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }

  try {
    if (await isAccountDeactivated(decoded.id)) {
      return next(new Error('Authentication error: Account deactivated'));
    }
  } catch (err) {
    return next(new Error('Authentication error'));
  }

  socket.data.userId = decoded.id;
  socket.data.email = decoded.email;
  next();
};
