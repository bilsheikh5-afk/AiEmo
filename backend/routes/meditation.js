import express from 'express';
import Meditation from '../models/Meditation.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get personalized meditation recommendations
router.get('/recommendations', auth, async (req, res) => {
    try {
        // Get user's recent emotions for personalization
        const recentEmotions = await Emotion.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(5);

        const baseSessions = [
            {
                id: 1,
                title: "Quick Calm",
                duration: 300,
                type: "stress-relief",
                description: "Brief breathing exercise for immediate stress relief",
                intensity: "light",
                recommendedFor: ["stressed", "angry", "tired"]
            },
            {
                id: 2,
                title: "Deep Focus",
                duration: 900,
                type: "focus",
                description: "Enhance concentration and mental clarity",
                intensity: "medium",
                recommendedFor: ["focused", "neutral"]
            },
            {
                id: 3,
                title: "Sleep Preparation",
                duration: 1200,
                type: "sleep",
                description: "Wind down and prepare for restful sleep",
                intensity: "light",
                recommendedFor: ["tired", "calm"]
            },
            {
                id: 4,
                title: "Anxiety Relief",
                duration: 600,
                type: "anxiety-relief",
                description: "Calm your nervous system and reduce anxiety",
                intensity: "medium",
                recommendedFor: ["stressed", "angry", "sad"]
            },
            {
                id: 5,
                title: "Energy Boost",
                duration: 480,
                type: "energy",
                description: "Gentle awakening for mental and physical energy",
                intensity: "light",
                recommendedFor: ["tired", "neutral"]
            }
        ];

        // Personalize based on recent emotional state
        let personalizedSessions = [...baseSessions];
        
        if (recentEmotions.length > 0) {
            const dominantEmotion = recentEmotions[0].emotion;
            
            // Move recommended sessions to the top
            personalizedSessions.sort((a, b) => {
                const aMatch = a.recommendedFor.includes(dominantEmotion);
                const bMatch = b.recommendedFor.includes(dominantEmotion);
                return bMatch - aMatch;
            });
        }

        res.json({
            success: true,
            sessions: personalizedSessions,
            personalization: recentEmotions.length > 0 ? 'personalized' : 'default'
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
        const { sessionType, duration } = req.body;

        const session = new Meditation({
            userId: req.user.id,
            sessionType,
            duration,
            startTime: new Date(),
            moodBefore: req.body.moodBefore || 'neutral'
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

        session.endTime = new Date();
        session.completed = true;
        session.moodAfter = req.body.moodAfter;
        session.notes = req.body.notes;

        await session.save();

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
                completed: session.completed,
                moodImprovement: session.moodAfter !== session.moodBefore ? 'improved' : 'same'
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

        const stats = {
            totalSessions: sessions.length,
            totalMinutes: sessions.reduce((sum, session) => sum + Math.round(session.duration / 60), 0),
            averageDuration: sessions.length > 0 ? 
                Math.round(sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length / 60) : 0
        };

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
