import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());

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

// ========================
// ALL ROUTES IN ONE FILE
// ========================

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
        status: 'running'
    });
});

// ========================
// AUTH ROUTES
// ========================

app.post('/api/auth/login', (req, res) => {
    res.json({
        token: 'demo-token-' + Date.now(),
        user: {
            id: 'demo-user',
            name: 'Demo User',
            email: 'demo@mindsync.com'
        }
    });
});

app.post('/api/auth/register', (req, res) => {
    res.json({
        token: 'demo-token-' + Date.now(),
        user: {
            id: 'demo-user',
            name: 'Demo User',
            email: 'demo@mindsync.com'
        }
    });
});

// ========================
// EMOTION ROUTES
// ========================

app.post('/api/emotion/analyze', upload.single('image'), (req, res) => {
    const emotions = ['happy', 'calm', 'focused', 'tired', 'stressed'];
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    
    res.json({
        success: true,
        emotion: randomEmotion,
        confidence: Math.random() * 0.5 + 0.5,
        timestamp: new Date().toISOString(),
        isMock: true
    });
});

app.get('/api/emotion/history', (req, res) => {
    res.json([]);
});

// ========================
// MEDITATION ROUTES
// ========================

app.get('/api/meditation/recommendations', (req, res) => {
    const recommendations = [
        {
            id: 1,
            title: "Quick Calm",
            duration: 5,
            type: "stress-relief",
            description: "Brief breathing exercise for immediate stress relief",
            intensity: "light"
        },
        {
            id: 2,
            title: "Deep Focus",
            duration: 15,
            type: "focus",
            description: "Enhance concentration and mental clarity",
            intensity: "medium"
        },
        {
            id: 3,
            title: "Sleep Preparation",
            duration: 20,
            type: "sleep",
            description: "Wind down and prepare for restful sleep",
            intensity: "light"
        }
    ];
    res.json(recommendations);
});

app.post('/api/meditation/sessions/start', (req, res) => {
    res.json({ sessionId: 'demo-session-' + Date.now(), success: true });
});

app.post('/api/meditation/sessions/:id/complete', (req, res) => {
    res.json({ success: true });
});

// ========================
// USER ROUTES
// ========================

app.get('/api/users/community', (req, res) => {
    const mockUsers = [
        { name: 'Jane Smith', status: 'Feeling Calm', activity: 'Meditating', avatar: 'JS' },
        { name: 'Mike Davis', status: 'Focused', activity: 'Working', avatar: 'MD' },
        { name: 'Sarah Park', status: 'Meditating', activity: 'Online', avatar: 'SP' },
        { name: 'Alex Rivera', status: 'Need Support', activity: 'Available', avatar: 'AR' }
    ];
    res.json(mockUsers);
});

app.post('/api/users/metrics', (req, res) => {
    res.json({ success: true, message: 'Metrics saved (demo)' });
});

// ========================
// SOCKET.IO (Optional)
// ========================

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

// ========================
// ERROR HANDLING
// ========================

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl,
        availableEndpoints: [
            'GET  /health',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'POST /api/emotion/analyze',
            'GET  /api/emotion/history',
            'GET  /api/meditation/recommendations',
            'POST /api/meditation/sessions/start',
            'GET  /api/users/community'
        ]
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

// ========================
// START SERVER
// ========================

const PORT = process.env.PORT || 10000;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🎯 API ready: http://localhost:${PORT}/api`);
});
