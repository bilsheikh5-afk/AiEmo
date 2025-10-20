import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [50, 'Name cannot be longer than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: {
            validator: function(email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Please provide a valid email'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    profile: {
        bio: {
            type: String,
            maxlength: [500, 'Bio cannot be longer than 500 characters']
        },
        goals: [{
            type: String,
            maxlength: [100, 'Goal cannot be longer than 100 characters']
        }],
        preferences: {
            meditationStyle: { 
                type: String, 
                enum: ['guided', 'unguided', 'music', 'nature'],
                default: 'guided'
            },
            notificationEnabled: { type: Boolean, default: true }
        }
    },
    stats: {
        totalMeditationMinutes: { type: Number, default: 0 },
        completedSessions: { type: Number, default: 0 },
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 },
        lastActive: { type: Date, default: Date.now }
    },
    status: {
        current: { 
            type: String, 
            enum: ['online', 'offline', 'busy'],
            default: 'online'
        },
        currentActivity: { type: String, default: 'Exploring' }
    }
}, {
    timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ 'stats.lastActive': -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        this.password = await bcrypt.hash(this.password, 12);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update last active method
userSchema.methods.updateLastActive = async function() {
    this.stats.lastActive = new Date();
    return await this.save();
};

export default mongoose.model('User', userSchema);
