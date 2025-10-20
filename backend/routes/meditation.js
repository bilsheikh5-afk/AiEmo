import express from 'express';
import Meditation from '../models/Meditation.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get meditation recommendations
router.get('/recommendations', auth, async (req, res) => {
    try {
        const recommendations = [
            {
                id: 1,
                title: "Quick Calm",
                duration: 300,
                type: "quick-calm",
                description: "Brief breathing exercise for immediate stress relief",
                intensity: "light"
            },
            {
                id: 2,
                title: "Deep Focus",
                duration: 900,
                type: "deep-focus",
                description: "Enhance concentration and mental clarity",
                intensity: "medium"
            },
            {
                id: 3,
                title: "Sleep Preparation",
                duration: 1200,
                type: "sleep-preparation",
                description: "Wind down and prepare for restful sleep",
                intensity: "light"
            },
            {
                id: 4,
                title: "Anxiety Relief",
                duration: 600,
                type: "anxiety-relief",
                description: "Calm your nervous system and reduce anxiety",
                intensity: "medium"
            }
        ];

        res.json({
            success: true,
            sessions: recommendations
        });

    } catch (error) {
        console.error('Recommendations error:', error);
        res.status(500).json({
            error: 'Failed to get recommendations',
            code: 'RECOMMENDATIONS_ERROR'
        });
    }
});

// Start meditation session
router.post('/sessions/start', auth, async (req, res) => {
    try {
        const { sessionType, duration, title, moodBefore } = req.body;

        const session = new Meditation({
            userId: req.user.id,
            sessionType,
            duration,
            title,
            startTime: new Date(),
            moodBefore: moodBefore || 'neutral'
        });

        await session.save();

        res.json({
            success: true,
            sessionId: session._id,
            startTime: session.startTime
        });

    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({
            error: 'Failed to start session',
            code: 'SESSION_START_ERROR'
        });
    }
});

// Complete meditation session
router.post('/sessions/:id/complete', auth, async (req, res) => {
    try {
        const session = await Meditation.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!session) {
            return res.status(404).json({
                error: 'Session not found',
                code: 'SESSION_NOT_FOUND'
            });
        }

        await session.markCompleted(req.body.moodAfter, req.body.notes);

        // Update user stats
        const minutes = Math.round(session.duration / 60);
        await User.findByIdAndUpdate(req.user.id, {
            $inc: {
                'stats.totalMeditationMinutes': minutes,
                'stats.completedSessions': 1
            },
            $set: {
                'stats.lastActive': new Date()
            }
        });

        res.json({
            success: true,
            session: {
                id: session._id,
                duration: session.duration,
                completed: session.completed
            }
        });

    } catch (error) {
        console.error('Complete session error:', error);
        res.status(500).json({
            error: 'Failed to complete session',
            code: 'SESSION_COMPLETE_ERROR'
        });
    }
});

// Get session history
router.get('/sessions/history', auth, async (req, res) => {
    try {
        const sessions = await Meditation.find({ userId: req.user.id })
            .sort({ startTime: -1 })
            .limit(20);

        const stats = await Meditation.getUserStats(req.user.id);

        res.json({
            success: true,
            sessions,
            stats
        });

    } catch (error) {
        console.error('Session history error:', error);
        res.status(500).json({
            error: 'Failed to fetch session history',
            code: 'HISTORY_ERROR'
        });
    }
});

export default router;
