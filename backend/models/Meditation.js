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
            values: ['quick-calm', 'deep-focus', 'sleep-preparation', 'anxiety-relief', 'energy-boost', 'mindful-breathing', 'body-scan', 'loving-kindness'],
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
        validate: {
            validator: function(date) {
                return date <= new Date();
            },
            message: 'Start time cannot be in the future'
        }
    },
    endTime: {
        type: Date,
        validate: {
            validator: function(date) {
                if (!date) return true; // Optional for ongoing sessions
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
    moodImprovement: {
        type: Number, // -1 (worse), 0 (same), 1 (better), 2 (much better)
        min: -1,
        max: 2,
        default: 0
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
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'Tag cannot be longer than 30 characters']
    }],
    interruptions: {
        type: Number,
        min: 0,
        default: 0
    },
    focusScore: {
        type: Number,
        min: 1,
        max: 10,
        validate: {
            validator: function(score) {
                return Number.isInteger(score);
            },
            message: 'Focus score must be an integer'
        }
    },
    environment: {
        location: {
            type: String,
            enum: ['home', 'office', 'nature', 'commute', 'other'],
            default: 'home'
        },
        noiseLevel: {
            type: String,
            enum: ['silent', 'quiet', 'moderate', 'noisy'],
            default: 'quiet'
        },
        lighting: {
            type: String,
            enum: ['dark', 'dim', 'normal', 'bright'],
            default: 'dim'
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for duration in minutes
meditationSchema.virtual('durationMinutes').get(function() {
    return Math.round(this.duration / 60);
});

// Virtual for session status
meditationSchema.virtual('status').get(function() {
    if (this.completed) return 'completed';
    if (this.endTime && this.endTime > new Date()) return 'in-progress';
    return 'scheduled';
});

// Indexes for better query performance
meditationSchema.index({ userId: 1, startTime: -1 });
meditationSchema.index({ userId: 1, completed: 1 });
meditationSchema.index({ sessionType: 1 });
meditationSchema.index({ startTime: -1 });
meditationSchema.index({ 'environment.location': 1 });

// Pre-save middleware to calculate mood improvement
meditationSchema.pre('save', function(next) {
    if (this.moodBefore && this.moodAfter) {
        const moodScale = {
            'angry': 1, 'sad': 2, 'anxious': 3, 'stressed': 4, 'tired': 5,
            'neutral': 6, 'calm': 7, 'happy': 8, 'excited': 9
        };
        
        const beforeScore = moodScale[this.moodBefore];
        const afterScore = moodScale[this.moodAfter];
        
        if (afterScore > beforeScore + 2) {
            this.moodImprovement = 2; // Much better
        } else if (afterScore > beforeScore) {
            this.moodImprovement = 1; // Better
        } else if (afterScore < beforeScore) {
            this.moodImprovement = -1; // Worse
        } else {
            this.moodImprovement = 0; // Same
        }
    }
    next();
});

// Static method to get user's meditation statistics
meditationSchema.statics.getUserStats = async function(userId) {
    const stats = await this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId), completed: true } },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                totalMinutes: { $sum: { $divide: ['$duration', 60] } },
                avgDuration: { $avg: { $divide: ['$duration', 60] } },
                avgFocusScore: { $avg: '$focusScore' },
                completedSessions: { $sum: 1 },
                favoriteType: { $push: '$sessionType' }
            }
        },
        {
            $project: {
                _id: 0,
                totalSessions: 1,
                totalMinutes: { $round: ['$totalMinutes', 1] },
                avgDuration: { $round: ['$avgDuration', 1] },
                avgFocusScore: { $round: ['$avgFocusScore', 1] },
                completedSessions: 1
            }
        }
    ]);

    // Get session type distribution
    const typeStats = await this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId), completed: true } },
        {
            $group: {
                _id: '$sessionType',
                count: { $sum: 1 },
                totalMinutes: { $sum: { $divide: ['$duration', 60] } }
            }
        },
        { $sort: { count: -1 } }
    ]);

    // Get weekly streak
    const streak = await this.getCurrentStreak(userId);

    return {
        ...(stats[0] || { 
            totalSessions: 0, 
            totalMinutes: 0, 
            avgDuration: 0, 
            avgFocusScore: 0, 
            completedSessions: 0 
        }),
        typeDistribution: typeStats,
        currentStreak: streak,
        favoriteSession: typeStats[0]?._id || 'quick-calm'
    };
};

// Static method to calculate current streak
meditationSchema.statics.getCurrentStreak = async function(userId) {
    const sessions = await this.find({ 
        userId, 
        completed: true 
    })
    .sort({ startTime: -1 })
    .limit(30)
    .select('startTime')
    .lean();

    if (sessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Check if user meditated today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const meditatedToday = sessions.some(session => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
    });

    if (!meditatedToday) {
        // If no meditation today, streak is broken
        return 0;
    }

    streak = 1; // Today counts
    currentDate.setDate(currentDate.getDate() - 1);

    // Check previous days
    for (let i = 1; i <= 30; i++) {
        const hasMeditated = sessions.some(session => {
            const sessionDate = new Date(session.startTime);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === currentDate.getTime();
        });

        if (hasMeditated) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
};

// Static method to get recent sessions with pagination
meditationSchema.statics.getRecentSessions = async function(userId, limit = 10, page = 1) {
    const skip = (page - 1) * limit;

    const sessions = await this.find({ userId })
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean();

    const total = await this.countDocuments({ userId });

    return {
        sessions,
        pagination: {
            current: page,
            total: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
        }
    };
};

// Instance method to calculate session effectiveness
meditationSchema.methods.calculateEffectiveness = function() {
    if (!this.completed) return null;

    let score = 50; // Base score

    // Duration factor (optimal 15-30 minutes)
    const optimalMin = this.durationMinutes >= 15 && this.durationMinutes <= 30;
    if (optimalMin) score += 20;

    // Focus score factor
    if (this.focusScore >= 7) score += 15;
    else if (this.focusScore >= 5) score += 10;

    // Mood improvement factor
    if (this.moodImprovement === 2) score += 15;
    else if (this.moodImprovement === 1) score += 10;

    // Environment factor
    if (this.environment.noiseLevel === 'quiet' || this.environment.noiseLevel === 'silent') {
        score += 10;
    }

    // Interruptions penalty
    if (this.interruptions > 0) {
        score -= this.interruptions * 5;
    }

    return Math.max(0, Math.min(100, score));
};

// Instance method to mark as completed
meditationSchema.methods.markCompleted = async function(moodAfter, focusScore, notes) {
    this.endTime = new Date();
    this.completed = true;
    this.moodAfter = moodAfter;
    
    if (focusScore !== undefined) {
        this.focusScore = focusScore;
    }
    
    if (notes !== undefined) {
        this.notes = notes;
    }

    return await this.save();
};

// Export the model
export default mongoose.model('Meditation', meditationSchema);
