import { Socket } from 'socket.io';
import { verifyAuthToken, type AuthTokenCheck } from '../middleware/authMiddleware';

export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  let verified: AuthTokenCheck;
  try {
    verified = await verifyAuthToken(token);
  } catch (err) {
    return next(new Error('Authentication error'));
  }

  const accountStatus = verified.valid ? verified.accountStatus : verified.revokedAccountStatus;
  if (accountStatus === 'deactivated') {
    return next(new Error('Authentication error: Account deactivated'));
  }

  if (!verified.valid) {
    return next(new Error('Authentication error: Invalid token'));
  }

  socket.data.userId = verified.payload.id;
  socket.data.email = verified.payload.email;
  next();
};
