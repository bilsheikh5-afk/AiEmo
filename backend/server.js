import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth.js';
import emotionRoutes from './routes/emotion.js';
import meditationRoutes from './routes/meditation.js';
import userRoutes from './routes/users.js';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mindsync';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emotion', emotionRoutes);
app.use('/api/meditation', meditationRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({ 
        status: 'OK', 
        message: 'MindSync Backend is running',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'MindSync API Server', 
        version: '1.0.0',
        status: 'running',
        endpoints: {
            auth: '/api/auth',
            emotion: '/api/emotion', 
            meditation: '/api/meditation',
            users: '/api/users',
            health: '/health'
        }
    });
});

// Socket.io for real-time features
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined their room`);
    });
    
    socket.on('user-status-update', (data) => {
        socket.broadcast.emit('friend-status-update', data);
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl,
        code: 'ROUTE_NOT_FOUND'
    });
});

const PORT = process.env.PORT || 10000;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🎯 API ready: http://localhost:${PORT}/api`);
});
