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
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection with fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mindsync';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
    console.log('❌ MongoDB connection error:', err.message);
    console.log('🔄 Running in demo mode without database');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emotion', emotionRoutes);
app.use('/api/meditation', meditationRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint (required for Render)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'MindSync Backend is running',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'MindSync API Server', 
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            emotion: '/api/emotion',
            meditation: '/api/meditation',
            users: '/api/users',
            health: '/health'
        }
    });
});

// Socket.io for real-time features (optional)
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl 
    });
});

const PORT = process.env.PORT || 10000;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
