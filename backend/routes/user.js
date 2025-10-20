import express from 'express';
const router = express.Router();

// Mock user routes for now
router.get('/community', (req, res) => {
    const mockUsers = [
        { name: 'Jane Smith', status: 'Feeling Calm', activity: 'Meditating', avatar: 'JS' },
        { name: 'Mike Davis', status: 'Focused', activity: 'Working', avatar: 'MD' },
        { name: 'Sarah Park', status: 'Meditating', activity: 'Online', avatar: 'SP' },
        { name: 'Alex Rivera', status: 'Need Support', activity: 'Available', avatar: 'AR' }
    ];
    res.json(mockUsers);
});

router.post('/metrics', (req, res) => {
    // Mock save metrics
    res.json({ success: true, message: 'Metrics saved (demo)' });
});

export default router;
