/**
 * @fileoverview Two-Factor Authentication Routes
 *
 * Endpoints for setting up, verifying, and disabling 2FA
 */

import express from 'express';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import {
    generateTwoFactorSecret,
    generateQRCode,
    verifyTwoFactorToken,
    generateBackupCodes
} from '../services/twoFactorAuth.js';

const router = express.Router();

/**
 * Setup 2FA - Generate secret and QR code
 * POST /api/auth/2fa/setup
 */
router.post('/setup', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+twoFactorSecret');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.twoFactorEnabled) {
            return res.status(400).json({ error: '2FA is already enabled' });
        }

        // Generate 2FA secret
        const { secret, otpauthUrl } = generateTwoFactorSecret(
            user.email,
            process.env.APP_NAME || 'POS System'
        );

        // Generate QR code
        const qrCode = await generateQRCode(otpauthUrl);

        // Save secret temporarily (not enabled yet)
        user.twoFactorSecret = secret;
        await user.save();

        res.json({
            message: '2FA setup initiated',
            qrCode,
            secret,  // Also return secret for manual entry
            otpauthUrl
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ error: 'Failed to setup 2FA' });
    }
});

/**
 * Verify and enable 2FA
 * POST /api/auth/2fa/verify
 * Body: { token }
 */
router.post('/verify', authenticate, async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const user = await User.findById(req.user.id).select('+twoFactorSecret');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.twoFactorSecret) {
            return res.status(400).json({ error: '2FA setup not initiated' });
        }

        // Verify the token
        const isValid = verifyTwoFactorToken(token, user.twoFactorSecret);

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid token' });
        }

        // Generate backup codes
        const backupCodes = generateBackupCodes(10);

        // Enable 2FA and save backup codes
        user.twoFactorEnabled = true;
        user.twoFactorBackupCodes = backupCodes;
        await user.save();

        res.json({
            message: '2FA enabled successfully',
            backupCodes,
            warning: 'Save these backup codes in a safe place. They can only be used once each.'
        });
    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({ error: 'Failed to verify 2FA' });
    }
});

/**
 * Disable 2FA
 * POST /api/auth/2fa/disable
 * Body: { password, token }
 */
router.post('/disable', authenticate, async (req, res) => {
    try {
        const { password, token } = req.body;

        if (!password || !token) {
            return res.status(400).json({ error: 'Password and token are required' });
        }

        const user = await User.findById(req.user.id).select('+password +twoFactorSecret');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.twoFactorEnabled) {
            return res.status(400).json({ error: '2FA is not enabled' });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Verify token
        const isTokenValid = verifyTwoFactorToken(token, user.twoFactorSecret);
        if (!isTokenValid) {
            return res.status(400).json({ error: 'Invalid token' });
        }

        // Disable 2FA
        user.twoFactorEnabled = false;
        user.twoFactorSecret = null;
        user.twoFactorBackupCodes = [];
        await user.save();

        res.json({ message: '2FA disabled successfully' });
    } catch (error) {
        console.error('2FA disable error:', error);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

/**
 * Verify 2FA token during login
 * POST /api/auth/2fa/verify-login
 * Body: { userId, token }
 */
router.post('/verify-login', async (req, res) => {
    try {
        const { userId, token } = req.body;

        if (!userId || !token) {
            return res.status(400).json({ error: 'User ID and token are required' });
        }

        const user = await User.findById(userId).select('+twoFactorSecret +twoFactorBackupCodes');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.twoFactorEnabled) {
            return res.status(400).json({ error: '2FA is not enabled for this user' });
        }

        // Try to verify as TOTP token
        let isValid = verifyTwoFactorToken(token, user.twoFactorSecret);

        // If not valid, try as backup code
        if (!isValid && user.twoFactorBackupCodes.includes(token.toUpperCase())) {
            isValid = true;

            // Remove used backup code
            user.twoFactorBackupCodes = user.twoFactorBackupCodes.filter(
                code => code !== token.toUpperCase()
            );
            await user.save();
        }

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid token or backup code' });
        }

        res.json({
            message: '2FA verification successful',
            verified: true
        });
    } catch (error) {
        console.error('2FA login verification error:', error);
        res.status(500).json({ error: 'Failed to verify 2FA' });
    }
});

/**
 * Get 2FA status
 * GET /api/auth/2fa/status
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            twoFactorEnabled: user.twoFactorEnabled || false,
            backupCodesRemaining: user.twoFactorBackupCodes?.length || 0
        });
    } catch (error) {
        console.error('2FA status error:', error);
        res.status(500).json({ error: 'Failed to get 2FA status' });
    }
});

/**
 * Regenerate backup codes
 * POST /api/auth/2fa/regenerate-backup-codes
 * Body: { password, token }
 */
router.post('/regenerate-backup-codes', authenticate, async (req, res) => {
    try {
        const { password, token } = req.body;

        if (!password || !token) {
            return res.status(400).json({ error: 'Password and token are required' });
        }

        const user = await User.findById(req.user.id).select('+password +twoFactorSecret +twoFactorBackupCodes');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.twoFactorEnabled) {
            return res.status(400).json({ error: '2FA is not enabled' });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Verify token
        const isTokenValid = verifyTwoFactorToken(token, user.twoFactorSecret);
        if (!isTokenValid) {
            return res.status(400).json({ error: 'Invalid token' });
        }

        // Generate new backup codes
        const backupCodes = generateBackupCodes(10);
        user.twoFactorBackupCodes = backupCodes;
        await user.save();

        res.json({
            message: 'Backup codes regenerated successfully',
            backupCodes,
            warning: 'Old backup codes are no longer valid. Save these new codes in a safe place.'
        });
    } catch (error) {
        console.error('Backup codes regeneration error:', error);
        res.status(500).json({ error: 'Failed to regenerate backup codes' });
    }
});

export default router;
