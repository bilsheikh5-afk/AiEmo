import express from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get community users
router.get('/community', auth, async (req, res) => {
    try {
        // For now, return mock data. In production, query real users.
        const mockUsers = [
            { name: 'Jane Smith', status: 'Feeling Calm', activity: 'Meditating', avatar: 'JS', stats: { totalMeditationMinutes: 1240 } },
            { name: 'Mike Davis', status: 'Focused', activity: 'Working', avatar: 'MD', stats: { totalMeditationMinutes: 890 } },
            { name: 'Sarah Park', status: 'Meditating', activity: 'Online', avatar: 'SP', stats: { totalMeditationMinutes: 1560 } },
            { name: 'Alex Rivera', status: 'Need Support', activity: 'Available', avatar: 'AR', stats: { totalMeditationMinutes: 670 } }
        ];
        
        res.json({
            success: true,
            users: mockUsers
        });

    } catch (error) {
        console.error('Community users error:', error);
        res.status(500).json({
            error: 'Failed to fetch community users',
            code: 'COMMUNITY_ERROR'
        });
    }
});

// Save user metrics
router.post('/metrics', auth, async (req, res) => {
    try {
        // Update user's last active
        await User.findByIdAndUpdate(req.user.id, {
            $set: {
                'stats.lastActive': new Date()
            }
        });

        res.json({
            success: true,
            message: 'Metrics saved successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Save metrics error:', error);
        res.status(500).json({
            error: 'Failed to save metrics',
            code: 'METRICS_SAVE_ERROR'
        });
    }
});

export default router;
