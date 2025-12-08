import express, { Express } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { connectToDatabase } from './services/mongooseService';
import { initializeSocket } from './socket/socketServer';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import matchingRoutes from './routes/matchingRoutes';
import connectionsRoutes from './routes/connectionsRoutes';
import chatRoutes from './routes/chatRoutes';
import blockRoutes from './routes/blockRoutes';

// Build CORS origins array
const corsOrigins: string[] = [
    'http://localhost:3000', // React development server
    'http://localhost:3001', // Alternative React port
    'http://localhost:5173', // Vite default port
    'http://localhost:5174', // Vite alternative port
];

// Add Vercel frontend URL
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

const corsConfig = {
    origin: corsOrigins,
    credentials: true
}

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

const start = async () => {
    try {
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