/**
 * @fileoverview Authentication Routes
 * 
 * Handles user registration, login, and token refresh
 */

import express from 'express';
import { User, Store } from '../models/index.js';
import { authenticate, generateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /auth/register
 * Register a new user and create their store
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, storeName } = req.body;

        // Validate required fields
        if (!email || !password || !name || !storeName) {
            return res.status(400).json({
                error: 'All fields are required: email, password, name, storeName'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create user
        const user = new User({
            email,
            password,
            name,
            role: 'owner'
        });

        // Create store
        const store = new Store({
            name: storeName,
            ownerId: user._id
        });

        // Link store to user
        user.storeId = store._id;

        // Save both
        await user.save();
        await store.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: user.toJSON(),
            store
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /auth/login
 * Login user and return token
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if active
        if (!user.isActive) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }

        // Check if 2FA is enabled
        const userWith2FA = await User.findById(user._id).select('+twoFactorSecret');
        if (userWith2FA.twoFactorEnabled && userWith2FA.twoFactorSecret) {
            // Return response indicating 2FA is required
            return res.json({
                message: '2FA required',
                requires2FA: true,
                userId: user._id.toString(),
                email: user.email
            });
        }

        // Get store
        const store = await Store.findById(user.storeId);

        // Generate token
        const token = generateToken(user._id);

        res.json({
            message: 'Login successful',
            token,
            user: user.toJSON(),
            store
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /auth/login/2fa
 * Complete login after 2FA verification
 */
router.post('/login/2fa', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get store
        const store = await Store.findById(user.storeId);

        // Generate token
        const token = generateToken(user._id);

        res.json({
            message: 'Login successful',
            token,
            user: user.toJSON(),
            store
        });
    } catch (error) {
        console.error('2FA login completion error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const store = await Store.findById(req.user.storeId);
        res.json({
            user: req.user.toJSON(),
            store
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

/**
 * POST /auth/refresh
 * Refresh token
 */
router.post('/refresh', authenticate, async (req, res) => {
    try {
        const token = generateToken(req.user._id);
        res.json({ token });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

// ============================================
// Employee Login Endpoints (No Admin Auth Required)
// ============================================

/**
 * POST /auth/employee/store
 * Verify store by access code and return store info with employees
 */
router.post('/employee/store', async (req, res) => {
    try {
        const { accessCode } = req.body;

        if (!accessCode) {
            return res.status(400).json({ error: 'Access code is required' });
        }

        // Find store by access code
        const store = await Store.findOne({ accessCode, isActive: true });

        if (!store) {
            return res.status(401).json({ error: 'Invalid store access code' });
        }

        // Import Employee model dynamically to avoid circular deps
        const { Employee } = await import('../models/index.js');

        // Get active employees for this store (only basic info needed for login)
        const employees = await Employee.find(
            { storeId: store._id, isActive: { $ne: false } },
            { name: 1, _id: 1, role: 1, pin: 1 }
        );

        res.json({
            store: {
                id: store._id,
                name: store.name,
                currency: store.currency,
                taxRate: store.taxRate
            },
            employeeCount: employees.length
        });
    } catch (error) {
        console.error('Employee store login error:', error);
        res.status(500).json({ error: 'Store verification failed' });
    }
});

/**
 * POST /auth/employee/login
 * Verify employee PIN and return employee info
 */
router.post('/employee/login', async (req, res) => {
    try {
        const { accessCode, pin } = req.body;

        if (!accessCode || !pin) {
            return res.status(400).json({ error: 'Access code and PIN are required' });
        }

        // Find store by access code
        const store = await Store.findOne({ accessCode, isActive: true });

        if (!store) {
            return res.status(401).json({ error: 'Invalid store access code' });
        }

        // Import Employee model
        const { Employee } = await import('../models/index.js');

        // Find employee by PIN
        const employee = await Employee.findOne({
            storeId: store._id,
            pin: pin,
            isActive: { $ne: false }
        });

        if (!employee) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        res.json({
            employee: {
                id: employee._id,
                name: employee.name,
                role: employee.role,
                permissions: employee.permissions || null
            },
            store: {
                id: store._id,
                name: store.name,
                currency: store.currency,
                taxRate: store.taxRate
            }
        });
    } catch (error) {
        console.error('Employee login error:', error);
        res.status(500).json({ error: 'Employee login failed' });
    }
});

export default router;
