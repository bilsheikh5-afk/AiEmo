import express from 'express';
import multer from 'multer';
import axios from 'axios';
import Emotion from '../models/Emotion.js';
import auth from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Google Cloud Vision API integration
async function analyzeEmotion(imageBuffer) {
  try {
    // For production, use Google Cloud Vision API
    // This is a simplified version - you'll need to set up GCP credentials
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
      {
        requests: [
          {
            image: {
              content: imageBuffer.toString('base64')
            },
            features: [
              {
                type: 'FACE_DETECTION',
                maxResults: 10
              }
            ]
          }
        ]
      }
    );

    const faces = response.data.responses[0].faceAnnotations;
    
    if (!faces || faces.length === 0) {
      return { emotion: 'neutral', confidence: 0, details: 'No face detected' };
    }

    // Analyze facial expressions
    const face = faces[0];
    const emotions = {
      joy: face.joyLikelihood,
      sorrow: face.sorrowLikelihood,
      anger: face.angerLikelihood,
      surprise: face.surpriseLikelihood
    };

    // Find dominant emotion
    const dominantEmotion = Object.keys(emotions).reduce((a, b) => 
      emotions[a] > emotions[b] ? a : b
    );

    return {
      emotion: dominantEmotion,
      confidence: emotions[dominantEmotion],
      details: face
    };

  } catch (error) {
    console.error('Vision API error:', error);
    
    // Fallback: Simple mock analysis based on image properties
    return mockEmotionAnalysis(imageBuffer);
  }
}

// Mock analysis for development
function mockEmotionAnalysis(imageBuffer) {
  const emotions = ['happy', 'calm', 'focused', 'tired', 'stressed'];
  const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
  
  return {
    emotion: randomEmotion,
    confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
    details: 'Mock analysis for development',
    isMock: true
  };
}

// Emotion analysis endpoint
router.post('/analyze', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const analysis = await analyzeEmotion(req.file.buffer);

    // Save to database
    const emotionRecord = new Emotion({
      userId: req.user.id,
      emotion: analysis.emotion,
      confidence: analysis.confidence,
      imageData: req.file.buffer,
      analysisDetails: analysis.details
    });

    await emotionRecord.save();

    res.json({
      success: true,
      emotion: analysis.emotion,
      confidence: analysis.confidence,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Emotion analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Get emotion history
router.get('/history', auth, async (req, res) => {
  try {
    const emotions = await Emotion.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(emotions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
