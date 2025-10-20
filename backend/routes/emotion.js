import express from 'express';
import multer from 'multer';
// Enhanced emotion analysis with better Google Vision integration
import axios from 'axios';

async function analyzeEmotionWithGoogleVision(imageBuffer) {
    // Check if API key is available
    if (!process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_VISION_API_KEY === 'your_actual_google_vision_api_key_here') {
        throw new Error('Google Vision API key not configured');
    }

    try {
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

        console.log('Google Vision API response:', response.data);

        const faces = response.data.responses[0]?.faceAnnotations;
        
        if (!faces || faces.length === 0) {
            return { 
                emotion: 'neutral', 
                confidence: 0, 
                details: 'No face detected',
                isRealAnalysis: true
            };
        }

        // Process the first detected face
        const face = faces[0];
        
        // Convert Google's likelihood to numerical scores
        const emotionScores = {
            joy: likelihoodToScore(face.joyLikelihood),
            sorrow: likelihoodToScore(face.sorrowLikelihood),
            anger: likelihoodToScore(face.angerLikelihood),
            surprise: likelihoodToScore(face.surpriseLikelihood),
            underExposed: likelihoodToScore(face.underExposedLikelihood),
            blurred: likelihoodToScore(face.blurredLikelihood),
            headwear: likelihoodToScore(face.headwearLikelihood)
        };

        // Find dominant emotion (excluding technical factors)
        const emotionalEmotions = ['joy', 'sorrow', 'anger', 'surprise'];
        const dominantEmotion = emotionalEmotions.reduce((a, b) => 
            emotionScores[a] > emotionScores[b] ? a : b
        );

        return {
            emotion: dominantEmotion,
            confidence: emotionScores[dominantEmotion],
            allEmotions: emotionScores,
            details: {
                detectionConfidence: face.detectionConfidence,
                boundingPoly: face.boundingPoly,
                landmarks: face.landmarks ? face.landmarks.length + ' detected' : 'none'
            },
            isRealAnalysis: true
        };

    } catch (error) {
        console.error('Google Vision API error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });

        if (error.response?.status === 400) {
            throw new Error('Invalid image format for Google Vision API');
        } else if (error.response?.status === 403) {
            throw new Error('Google Vision API access denied. Check API key and billing.');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('Google Vision API request timeout');
        } else {
            throw new Error(`Google Vision API error: ${error.message}`);
        }
    }
}

// Helper function to convert Google's likelihood to numerical score
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

// Updated main analysis function
async function analyzeEmotion(imageBuffer) {
    try {
        // Try Google Vision first
        return await analyzeEmotionWithGoogleVision(imageBuffer);
    } catch (error) {
        console.log('Falling back to mock analysis:', error.message);
        // Fallback to mock analysis
        return performMockEmotionAnalysis();
    }
}
