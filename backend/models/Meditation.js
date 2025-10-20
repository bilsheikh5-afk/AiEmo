import mongoose from 'mongoose';

const meditationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    sessionType: {
        type: String,
        required: [true, 'Session type is required'],
        trim: true,
        enum: {
            values: ['quick-calm', 'deep-focus', 'sleep-preparation', 'anxiety-relief', 'energy-boost', 'mindful-breathing'],
            message: 'Invalid session type'
        }
    },
    title: {
        type: String,
        required: [true, 'Session title is required'],
        trim: true,
        maxlength: [100, 'Title cannot be longer than 100 characters']
    },
    duration: {
        type: Number, // in seconds
        required: [true, 'Duration is required'],
        min: [60, 'Duration must be at least 60 seconds'],
        max: [7200, 'Duration cannot exceed 2 hours']
    },
    startTime: {
        type: Date,
        required: [true, 'Start time is required'],
        default: Date.now
    },
    endTime: {
        type: Date,
        validate: {
            validator: function(date) {
                if (!date) return true;
                return date >= this.startTime;
            },
            message: 'End time must be after start time'
        }
    },
    completed: {
        type: Boolean,
        default: false
    },
    moodBefore: {
        type: String,
        enum: {
            values: ['excited', 'happy', 'calm', 'neutral', 'tired', 'stressed', 'anxious', 'sad', 'angry'],
            message: 'Invalid mood value'
        },
        default: 'neutral'
    },
    moodAfter: {
        type: String,
        enum: {
            values: ['excited', 'happy', 'calm', 'neutral', 'tired', 'stressed', 'anxious', 'sad', 'angry'],
            message: 'Invalid mood value'
        }
    },
    notes: {
        type: String,
        maxlength: [1000, 'Notes cannot be longer than 1000 characters'],
        trim: true
    },
    intensity: {
        type: String,
        enum: ['light', 'medium', 'intense'],
        default: 'medium'
    }
}, {
    timestamps: true
});

// Virtual for duration in minutes
meditationSchema.virtual('durationMinutes').get(function() {
    return Math.round(this.duration / 60);
});

// Indexes for better query performance
meditationSchema.index({ userId: 1, startTime: -1 });
meditationSchema.index({ userId: 1, completed: 1 });

// Static method to get user's meditation statistics
meditationSchema.statics.getUserStats = async function(userId) {
    const stats = await this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), completed: true } },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                totalMinutes: { $sum: { $divide: ['$duration', 60] } },
                avgDuration: { $avg: { $divide: ['$duration', 60] } },
                completedSessions: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                totalSessions: 1,
                totalMinutes: { $round: ['$totalMinutes', 1] },
                avgDuration: { $round: ['$avgDuration', 1] },
                completedSessions: 1
            }
        }
    ]);

    return stats[0] || { 
        totalSessions: 0, 
        totalMinutes: 0, 
        avgDuration: 0, 
        completedSessions: 0 
    };
};

// Instance method to mark as completed
meditationSchema.methods.markCompleted = async function(moodAfter, notes) {
    this.endTime = new Date();
    this.completed = true;
    this.moodAfter = moodAfter;
    
    if (notes !== undefined) {
        this.notes = notes;
    }

    return await this.save();
};

export default mongoose.model('Meditation', meditationSchema);
