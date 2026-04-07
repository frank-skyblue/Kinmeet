import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { socketAuthMiddleware } from './socketMiddleware';
import { registerChatHandlers } from './socketHandlers';
import { corsConfig } from '../config/cors';

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new Server(httpServer, {
    cors: {
      ...corsConfig,
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware for all socket connections
  io.use(socketAuthMiddleware);

  // Connection handler
  io.on('connection', (socket: Socket) => {
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

