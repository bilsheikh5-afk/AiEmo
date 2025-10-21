import express from 'express';

const router = express.Router();

// Save meditation session
router.post('/sessions', async (req, res) => {
  try {
    const { userId, duration, type, timestamp } = req.body;
    
    // In a real app, you'd save to database
    const session = {
      id: `meditation-${Date.now()}`,
      userId,
      duration,
      type,
      timestamp: timestamp || new Date().toISOString(),
      completed: true
    };
    
    res.json({
      success: true,
      data: session
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to save session'
    });
  }
});

// Get meditation statistics
router.get('/stats/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Mock stats
    const stats = {
      totalSessions: 12,
      totalMinutes: 156,
      averageDuration: 13,
      favoriteType: 'Mindfulness'
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

export default router;
