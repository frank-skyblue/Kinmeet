import { io, type Socket } from 'socket.io-client';
import { API_ORIGIN } from './api';

/** Opens the chat socket. The server reads the session token from the handshake. */
export const createChatSocket = (token: string): Socket => {
  const socket = io(API_ORIGIN, {
    auth: { token },
    // React Native has no long-polling fallback worth using; go straight to WebSocket.
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  if (__DEV__) {
    // Usually a phone that can't reach EXPO_PUBLIC_API_URL (localhost means the phone itself).
    socket.on('connect_error', (error: Error) => {
      console.warn('Chat socket connection error:', error.message);
    });
  }

  return socket;
};
