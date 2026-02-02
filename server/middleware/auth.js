/**
 * @fileoverview JWT Authentication Middleware
 */

import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

/**
 * Authenticate JWT token from Authorization header
 */
export const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
            return res.status(401).json({
                error: 'Invalid token or user deactivated.'
            });
        }

        // Attach user to request
        req.user = user;
        req.userId = user._id;
        req.storeId = user.storeId;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired.' });
        }
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed.' });
    }
};

/**
 * Generate JWT token for user
 */
export const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (user && user.isActive) {
                req.user = user;
                req.userId = user._id;
                req.storeId = user.storeId;
            }
        }

        next();
    } catch (error) {
        // Continue without auth on error
        next();
    }
};
