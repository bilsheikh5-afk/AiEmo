import express from 'express';

const router = express.Router();

// Simple demo login
router.post('/demo-login', (req, res) => {
  try {
    const { username } = req.body;
    
    const user = {
      id: `user-${Date.now()}`,
      username: username || 'Demo User',
      isDemo: true,
      createdAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      user: user,
      token: `demo-token-${Date.now()}`
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Verify token (for demo purposes)
router.get('/verify', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 'demo-user',
      username: 'Demo User',
      isDemo: true
    }
  });
});

export default router;
