import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    profile: {
        bio: String,
        goals: [String],
        preferences: {
            meditationStyle: String,
            notificationEnabled: Boolean
        }
    },
    stats: {
        totalMeditationMinutes: { type: Number, default: 0 },
        completedSessions: { type: Number, default: 0 },
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

export default mongoose.model('User', userSchema);
