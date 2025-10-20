import express from 'express';
import Meditation from '../models/Meditation.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get personalized meditation recommendations
router.get('/recommendations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const recentEmotions = await Emotion.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5);

    // AI-powered recommendations based on emotional state
    const recommendations = generateRecommendations(user, recentEmotions);

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

function generateRecommendations(user, recentEmotions) {
  const baseSessions = [
    {
      id: 1,
      title: "Quick Calm",
      duration: 5,
      type: "stress-relief",
      description: "Brief breathing exercise for immediate stress relief",
      audioUrl: "/meditation/quick-calm.mp3",
      intensity: "light"
    },
    {
      id: 2,
      title: "Deep Focus",
      duration: 15,
      type: "focus",
      description: "Enhance concentration and mental clarity",
      audioUrl: "/meditation/deep-focus.mp3",
      intensity: "medium"
    },
    {
      id: 3,
      title: "Sleep Preparation",
      duration: 20,
      type: "sleep",
      description: "Wind down and prepare for restful sleep",
      audioUrl: "/meditation/sleep-prep.mp3",
      intensity: "light"
    }
  ];

  // Personalize based on emotional state
  const dominantEmotion = getDominantEmotion(recentEmotions);
  
  let personalized = [...baseSessions];

  if (dominantEmotion === 'stressed' || dominantEmotion === 'anger') {
    personalized.unshift({
      id: 4,
      title: "Anxiety Relief",
      duration: 10,
      type: "anxiety-relief",
      description: "Calm your nervous system and reduce anxiety",
      audioUrl: "/meditation/anxiety-relief.mp3",
      intensity: "medium"
    });
  }

  if (dominantEmotion === 'tired') {
    personalized.unshift({
      id: 5,
      title: "Energy Boost",
      duration: 8,
      type: "energy",
      description: "Gentle awakening for mental and physical energy",
      audioUrl: "/meditation/energy-boost.mp3",
      intensity: "light"
    });
  }

  return personalized;
}

function getDominantEmotion(emotions) {
  if (!emotions.length) return 'neutral';
  
  const emotionCount = {};
  emotions.forEach(e => {
    emotionCount[e.emotion] = (emotionCount[e.emotion] || 0) + 1;
  });
  
  return Object.keys(emotionCount).reduce((a, b) => 
    emotionCount[a] > emotionCount[b] ? a : b
  );
}

// Start meditation session
router.post('/sessions/start', auth, async (req, res) => {
  try {
    const session = new Meditation({
      userId: req.user.id,
      sessionType: req.body.sessionType,
      duration: req.body.duration,
      startTime: new Date()
    });

    await session.save();
    res.json({ sessionId: session._id, success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start session' });
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
      return res.status(404).json({ error: 'Session not found' });
    }

    session.endTime = new Date();
    session.completed = true;
    session.moodBefore = req.body.moodBefore;
    session.moodAfter = req.body.moodAfter;

    await session.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        totalMeditationMinutes: Math.round(session.duration / 60),
        completedSessions: 1
      }
    });

    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

export default router;
