import express from 'express';
import multer from 'multer';
import axios from 'axios';
import Emotion from '../models/Emotion.js';
import auth from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// REAL Google Vision Emotion Analysis
async function analyzeEmotionWithGoogleVision(imageBuffer) {
    if (!process.env.GOOGLE_VISION_API_KEY) {
        throw new Error('Google Vision API key not configured');
    }

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
                            maxResults: 5
                        }
                    ]
                }
            ]
        },
        {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );

    const faces = response.data.responses[0]?.faceAnnotations;
    
    if (!faces || faces.length === 0) {
        return { 
            emotion: 'neutral', 
            confidence: 0, 
            details: 'No face detected',
            isRealAnalysis: true
        };
    }

    const face = faces[0];
    const emotions = {
        joy: likelihoodToScore(face.joyLikelihood),
        sorrow: likelihoodToScore(face.sorrowLikelihood),
        anger: likelihoodToScore(face.angerLikelihood),
        surprise: likelihoodToScore(face.surpriseLikelihood)
    };

    const dominantEmotion = Object.keys(emotions).reduce((a, b) => 
        emotions[a] > emotions[b] ? a : b
    );

    return {
        emotion: dominantEmotion,
        confidence: emotions[dominantEmotion],
        allEmotions: emotions,
        details: {
            detectionConfidence: face.detectionConfidence,
            boundingPoly: face.boundingPoly
        },
        isRealAnalysis: true
    };
}

function likelihoodToScore(likelihood) {
    const scores = {
        'VERY_UNLIKELY': 0.1,
        'UNLIKELY': 0.3,
        'POSSIBLE': 0.5,
        'LIKELY': 0.7,
        'VERY_LIKELY': 0.9
    };
    return scores[likelihood] || 0;
}

// Real emotion analysis endpoint
router.post('/analyze', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const analysis = await analyzeEmotionWithGoogleVision(req.file.buffer);

        // Save to real database
        const emotionRecord = new Emotion({
            userId: req.user.id,
            emotion: analysis.emotion,
            confidence: analysis.confidence,
            analysisDetails: analysis.details
        });

        await emotionRecord.save();

        res.json({
            success: true,
            emotion: analysis.emotion,
            confidence: analysis.confidence,
            allEmotions: analysis.allEmotions,
            timestamp: new Date().toISOString(),
            isRealAnalysis: true
        });

    } catch (error) {
        console.error('Real emotion analysis failed:', error);
        res.status(500).json({ 
            error: 'Real analysis failed', 
            message: error.message,
            suggestion: 'Check Google Vision API configuration'
        });
    }
});

export default router;
