import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import { socketAuthMiddleware } from './socketMiddleware';
import { registerChatHandlers } from './socketHandlers';
import { corsConfig } from '../config/cors';

let activeServer: Server | null = null;

/**
 * Closes every open socket for a user. Sockets are authenticated only when they connect,
 * so revoking tokens alone would leave existing connections working. Clients disconnected
 * by the server don't reconnect on their own, and a reconnect with a revoked token fails.
 */
export const disconnectUserSockets = (userId: string): void => {
  activeServer?.in(`user:${userId}`).disconnectSockets(true);
};

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new Server(httpServer, {
    cors: {
      ...corsConfig,
      methods: ['GET', 'POST'],
    },
  });

  activeServer = io;

  // Authentication middleware for all socket connections
  io.use(socketAuthMiddleware);

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`✅ Socket connected: User ${userId} (${socket.id})`);

    // Join user to their personal room for targeted message delivery
    socket.join(`user:${userId}`);

    // Register all chat event handlers
    registerChatHandlers(io, socket);

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: User ${userId} (${socket.id})`);
    });
  });

  return io;
};

