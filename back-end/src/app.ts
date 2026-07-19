import 'dotenv/config';
import { NODE_ENV, PORT } from './config/env';
import express, { Express } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { connectToDatabase } from './services/mongooseService';
import { initializeSocket } from './socket/socketServer';
import { errorHandler } from './middleware/errorHandler';
import { corsConfig } from './config/cors';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import matchingRoutes from './routes/matchingRoutes';
import connectionsRoutes from './routes/connectionsRoutes';
import chatRoutes from './routes/chatRoutes';
import blockRoutes from './routes/blockRoutes';
import notificationsRoutes from './routes/notificationsRoutes';
import settingsRoutes from './routes/settingsRoutes';
import feedbackRoutes from './routes/feedbackRoutes';

const app: Express = express()
const httpServer = createServer(app) // Wrap Express with HTTP server for Socket.io
const router = express.Router()
app.use(cors(corsConfig))
app.use(express.json())

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();
    const path = req.originalUrl.split('?')[0];
    const requestLine = `${req.method} ${path}`;

    console.log(`[${timestamp}] → ${requestLine}`);

    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? '\x1b[31m' : res.statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
        const resetColor = '\x1b[0m';
        console.log(`${statusColor}[${timestamp}] ← ${requestLine} ${res.statusCode}${resetColor} (${duration}ms)`);
    });

    next();
});

// Health check endpoints for Render
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'KinMeet API is running',
        timestamp: new Date().toISOString()
    });
});

app.head('/', (req, res) => {
    res.status(200).end();
});

// Routes
app.use('/api', router)
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/block', blockRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/feedback', feedbackRoutes);

app.use(errorHandler);

const start = async () => {
    try {
        // Log environment info for debugging
        console.log('🔍 Environment Check:');
        console.log(`   - NODE_ENV: ${NODE_ENV}`);
        console.log(`   - PORT: ${PORT}`);

        await connectToDatabase();

        // Initialize Socket.io
        initializeSocket(httpServer);
        console.log('✅ Socket.io server initialized');

        // Listen with HTTP server instead of Express app
        // Render requires binding to 0.0.0.0 (all interfaces), not localhost
        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server started on port ${PORT}`);
            console.log(`📡 WebSocket server ready`);
            console.log(`🌐 Server is listening on 0.0.0.0:${PORT}`);
        });
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

start();