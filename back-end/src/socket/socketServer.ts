import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { socketAuthMiddleware } from './socketMiddleware';
import { registerChatHandlers } from './socketHandlers';

const corsOrigins: string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
];

// Add production URLs if available
if (process.env.VERCEL_URL) {
  const vercelUrl = process.env.VERCEL_URL.startsWith('http')
    ? process.env.VERCEL_URL
    : `https://${process.env.VERCEL_URL}`;
  corsOrigins.push(vercelUrl);
}

// Add custom frontend URL (for Vercel or other deployments)
if (process.env.REACT_FRONTEND_URL) {
  corsOrigins.push(process.env.REACT_FRONTEND_URL);
}

if (process.env.FRONTEND_URL) {
  corsOrigins.push(process.env.FRONTEND_URL);
}

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
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

