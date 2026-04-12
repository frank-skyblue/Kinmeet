import 'dotenv/config';
import './config/env';
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

const app: Express = express()
const httpServer = createServer(app) // Wrap Express with HTTP server for Socket.io
const router = express.Router()
const port = Number(process.env.PORT) || 8080

app.use(cors(corsConfig))
app.use(express.json())

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();
    
    // Log request
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? '\x1b[31m' : res.statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
        const resetColor = '\x1b[0m';
        console.log(`${statusColor}[${timestamp}] ${req.method} ${req.path} - ${res.statusCode}${resetColor} (${duration}ms)`);
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

router.get('/hello', (req, res) => {
    res.send('Hello from KinMeet backend!')
})

// Routes
app.use('/api', router)
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/block', blockRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use(errorHandler);

const start = async () => {
    try {
        // Log environment info for debugging
        console.log('🔍 Environment Check:');
        console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
        console.log(`   - PORT (raw): ${process.env.PORT}`);
        console.log(`   - PORT (parsed): ${port}`);
        
        await connectToDatabase();
        
        // Initialize Socket.io
        const io = initializeSocket(httpServer);
        console.log('✅ Socket.io server initialized');
        
        // Listen with HTTP server instead of Express app
        // Render requires binding to 0.0.0.0 (all interfaces), not localhost
        httpServer.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Server started on port ${port}`);
            console.log(`📡 WebSocket server ready`);
            console.log(`🌐 Server is listening on 0.0.0.0:${port}`);
        });
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

start();