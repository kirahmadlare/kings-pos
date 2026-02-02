/**
 * @fileoverview Customer Authentication Middleware
 *
 * Handles customer authentication for customer portal
 */

import jwt from 'jsonwebtoken';
import { Customer } from '../models/index.js';

/**
 * Generate OTP (6-digit code)
 */
export function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate customer JWT token
 */
export function generateCustomerToken(customer) {
    return jwt.sign(
        {
            customerId: customer._id.toString(),
            storeId: customer.storeId.toString(),
            type: 'customer'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

/**
 * Verify customer JWT token
 */
export function verifyCustomerToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Customer authentication middleware
 */
export async function authenticateCustomer(req, res, next) {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = verifyCustomerToken(token);

        if (!decoded || decoded.type !== 'customer') {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Get customer from database
        const customer = await Customer.findById(decoded.customerId);

        if (!customer) {
            return res.status(401).json({ error: 'Customer not found' });
        }

        // Attach customer info to request
        req.customerId = customer._id;
        req.customer = customer;
        req.storeId = customer.storeId;

        next();
    } catch (error) {
        console.error('Customer auth error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
}

/**
 * Store OTPs temporarily (in-memory store)
 * In production, use Redis or database
 */
const otpStore = new Map();

/**
 * Store OTP for customer
 */
export function storeOTP(identifier, otp) {
    otpStore.set(identifier, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Clean up expired OTPs
    setTimeout(() => {
        otpStore.delete(identifier);
    }, 10 * 60 * 1000);
}

/**
 * Verify OTP for customer
 */
export function verifyOTP(identifier, otp) {
    const stored = otpStore.get(identifier);

    if (!stored) {
        return false;
    }

    if (Date.now() > stored.expiresAt) {
        otpStore.delete(identifier);
        return false;
    }

    if (stored.otp !== otp) {
        return false;
    }

    // OTP is valid, remove it
    otpStore.delete(identifier);
    return true;
}

/**
 * Send OTP via email or SMS
 * In production, integrate with email/SMS service
 */
export async function sendOTP(identifier, otp, method = 'email') {
    // TODO: Integrate with actual email/SMS service
    // For now, just log it
    console.log(`[OTP] Sending OTP ${otp} to ${identifier} via ${method}`);

    // In development, you can return the OTP for testing
    if (process.env.NODE_ENV === 'development') {
        console.log(`[OTP] Development mode - OTP is: ${otp}`);
    }

    return true;
}
