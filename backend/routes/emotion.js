import express from 'express';
import multer from 'multer';
import axios from 'axios';
import Emotion from '../models/Emotion.js';
import auth from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Convert Google's likelihood to numerical score
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

// Real Google Vision emotion analysis
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
            suggestions: ['Ensure your face is clearly visible in good lighting']
        };
    }

    // Process the first detected face
    const face = faces[0];
    
    const emotionScores = {
        joy: likelihoodToScore(face.joyLikelihood),
        sorrow: likelihoodToScore(face.sorrowLikelihood),
        anger: likelihoodToScore(face.angerLikelihood),
        surprise: likelihoodToScore(face.surpriseLikelihood)
    };

    // Find dominant emotion
    const dominantEmotion = Object.keys(emotionScores).reduce((a, b) => 
        emotionScores[a] > emotionScores[b] ? a : b
    );

    return {
        emotion: dominantEmotion,
        confidence: emotionScores[dominantEmotion],
        allEmotions: emotionScores,
        details: {
            detectionConfidence: face.detectionConfidence,
            boundingPoly: face.boundingPoly,
            landmarks: face.landmarks ? `${face.landmarks.length} landmarks detected` : 'none'
        },
        isRealAnalysis: true
    };
}

// Emotion analysis endpoint
router.post('/analyze', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No image provided',
                code: 'NO_IMAGE'
            });
        }

        console.log('Processing emotion analysis for user:', req.user.id);

        const analysis = await analyzeEmotionWithGoogleVision(req.file.buffer);

        // Save to database
        const emotionRecord = new Emotion({
            userId: req.user.id,
            emotion: analysis.emotion,
            confidence: analysis.confidence,
            imageData: req.file.buffer, // Store the actual image
            analysisDetails: analysis.details
        });

        await emotionRecord.save();

        console.log('Emotion analysis saved:', analysis.emotion);

        res.json({
            success: true,
            emotion: analysis.emotion,
            confidence: analysis.confidence,
            allEmotions: analysis.allEmotions,
            timestamp: new Date().toISOString(),
            isRealAnalysis: true,
            recordId: emotionRecord._id
        });

    } catch (error) {
        console.error('Emotion analysis error:', error);
        
        if (error.response?.status === 403) {
            return res.status(500).json({
                error: 'Google Vision API access denied',
                code: 'VISION_API_DENIED',
                message: 'Check API key and billing setup'
            });
        } else if (error.response?.status === 400) {
            return res.status(400).json({
                error: 'Invalid image format',
                code: 'INVALID_IMAGE'
            });
        }

        res.status(500).json({
            error: 'Emotion analysis failed',
            code: 'ANALYSIS_ERROR',
            message: error.message
        });
    }
});

// Get emotion history
router.get('/history', auth, async (req, res) => {
    try {
        const emotions = await Emotion.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .select('-imageData'); // Exclude image data for performance

        res.json({
            success: true,
            emotions,
            count: emotions.length
        });
    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch emotion history',
            code: 'HISTORY_ERROR'
        });
    }
});

export default router;
