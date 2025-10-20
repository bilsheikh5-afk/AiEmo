import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Name, email, and password are required',
                code: 'MISSING_FIELDS'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                error: 'User already exists with this email',
                code: 'USER_EXISTS'
            });
        }

        // Create user
        const user = new User({
            name,
            email,
            password
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profile: user.profile
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            code: 'REGISTRATION_ERROR',
            message: error.message
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }

        // Find user and include password for comparison
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(400).json({
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Update last active
        user.stats.lastActive = new Date();
        await user.save();

        // Generate token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profile: user.profile,
                stats: user.stats
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            code: 'LOGIN_ERROR',
            message: error.message
        });
    }
});

export default router;
