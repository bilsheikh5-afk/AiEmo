import mongoose from 'mongoose';

const emotionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emotion: {
    type: String,
    required: true,
    enum: ['happy', 'calm', 'focused', 'tired', 'stressed', 'angry', 'sad', 'neutral']
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  imageData: Buffer,
  analysisDetails: mongoose.Schema.Types.Mixed,
  context: {
    location: String,
    activity: String,
    timeOfDay: String
  }
}, {
  timestamps: true
});

export default mongoose.model('Emotion', emotionSchema);
