/**
 * @fileoverview Socket.io Authentication Middleware
 *
 * Authenticates socket connections using JWT tokens
 */

import jwt from 'jsonwebtoken';
import User from '../../models/User.js';

/**
 * Socket authentication middleware
 *
 * Verifies JWT token from handshake auth and attaches user/store to socket
 */
export const socketAuth = async (socket, next) => {
    try {
        // Get token from handshake auth
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const user = await User.findById(decoded.userId)
            .select('-password')
            .populate('storeId');

        if (!user) {
            return next(new Error('User not found'));
        }

        // Attach user and store info to socket
        socket.userId = user._id;
        socket.storeId = user.storeId._id;
        socket.user = user;

        next();
    } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
    }
};
