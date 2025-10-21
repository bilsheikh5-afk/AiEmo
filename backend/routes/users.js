import express from 'express';

const router = express.Router();

// Get user profile
router.get('/profile/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const profile = {
      id: userId,
      username: 'Demo User',
      joinDate: new Date().toISOString(),
      preferences: {
        theme: 'light',
        notifications: true
      },
      stats: {
        totalSessions: 25,
        streak: 7,
        avgStress: 42
      }
    };
    
    res.json({
      success: true,
      data: profile
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// Update user preferences
router.put('/preferences/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { preferences } = req.body;
    
    res.json({
      success: true,
      data: {
        userId,
        preferences,
        updatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

export default router;
