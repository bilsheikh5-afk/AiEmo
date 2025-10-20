import express from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get community users (for social features)
router.get('/community', auth, async (req, res) => {
    try {
        // Get random active users (excluding current user)
        const communityUsers = await User.aggregate([
            { $match: { _id: { $ne: req.user._id } } },
            { $sample: { size: 8 } },
            { $project: { 
                name: 1, 
                'profile.bio': 1,
                'stats.totalMeditationMinutes': 1,
                'stats.completedSessions': 1,
                'status.current': 1,
                'status.currentActivity': 1
            }}
        ]);

        // Add mock status for demo (in real app, this would be real data)
        const usersWithStatus = communityUsers.map(user => ({
            name: user.name,
            status: getRandomStatus(),
            activity: getRandomActivity(),
            avatar: user.name.split(' ').map(n => n[0]).join(''),
            stats: user.stats
        }));

        res.json({
            success: true,
            users: usersWithStatus
        });

    } catch (error) {
        console.error('Community users error:', error);
        // Fallback to mock data
        const mockUsers = [
            { name: 'Jane Smith', status: 'Feeling Calm', activity: 'Meditating', avatar: 'JS', stats: { totalMeditationMinutes: 1240 } },
            { name: 'Mike Davis', status: 'Focused', activity: 'Working', avatar: 'MD', stats: { totalMeditationMinutes: 890 } },
            { name: 'Sarah Park', status: 'Meditating', activity: 'Online', avatar: 'SP', stats: { totalMeditationMinutes: 1560 } },
            { name: 'Alex Rivera', status: 'Need Support', activity: 'Available', avatar: 'AR', stats: { totalMeditationMinutes: 670 } }
        ];
        
        res.json({
            success: true,
            users: mockUsers,
            isMock: true
        });
    }
});

// Save user metrics
router.post('/metrics', auth, async (req, res) => {
    try {
        const { stress, focus, energy, emotion } = req.body;

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

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate('stats');

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch profile',
            code: 'PROFILE_ERROR'
        });
    }
});

// Helper functions for demo data
function getRandomStatus() {
    const statuses = ['Feeling Calm', 'Focused', 'Meditating', 'Need Support', 'Happy', 'Relaxed'];
    return statuses[Math.floor(Math.random() * statuses.length)];
}

function getRandomActivity() {
    const activities = ['Meditating', 'Working', 'Online', 'Available', 'In Session', 'Taking Break'];
    return activities[Math.floor(Math.random() * activities.length)];
}

export default router;
