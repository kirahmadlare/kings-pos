/**
 * @fileoverview Two-Factor Authentication Service
 *
 * TOTP-based 2FA implementation using authenticator apps
 */

import { authenticator } from '@otplib/preset-default';
import QRCode from 'qrcode';

/**
 * Generate 2FA secret for a user
 * @param {string} userEmail - User's email address
 * @param {string} appName - Application name for authenticator app
 * @returns {Object} - Secret and otpauth URL
 */
export function generateTwoFactorSecret(userEmail, appName = 'POS System') {
    // Generate a base32 secret
    const secret = authenticator.generateSecret();

    // Generate otpauth URL for QR code
    const otpauthUrl = authenticator.keyuri(userEmail, appName, secret);

    return {
        secret,
        otpauthUrl
    };
}

/**
 * Generate QR code data URL for 2FA setup
 * @param {string} otpauthUrl - otpauth:// URL
 * @returns {Promise<string>} - QR code data URL
 */
export async function generateQRCode(otpauthUrl) {
    try {
        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        return qrCodeDataUrl;
    } catch (error) {
        throw new Error('Failed to generate QR code: ' + error.message);
    }
}

/**
 * Verify TOTP token
 * @param {string} token - 6-digit TOTP token from authenticator app
 * @param {string} secret - User's 2FA secret
 * @returns {boolean} - True if token is valid
 */
export function verifyTwoFactorToken(token, secret) {
    try {
        // Verify the token with a window of ±1 time step (30 seconds)
        return authenticator.verify({ token, secret });
    } catch (error) {
        console.error('2FA verification error:', error);
        return false;
    }
}

/**
 * Generate backup codes for 2FA recovery
 * @param {number} count - Number of backup codes to generate
 * @returns {string[]} - Array of backup codes
 */
export function generateBackupCodes(count = 10) {
    const codes = [];

    for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric code
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        codes.push(code);
    }

    return codes;
}

/**
 * Verify backup code
 * @param {string} code - Backup code to verify
 * @param {string[]} backupCodes - Array of hashed backup codes
 * @returns {boolean} - True if code is valid
 */
export function verifyBackupCode(code, backupCodes) {
    // In production, these should be hashed
    return backupCodes.includes(code.toUpperCase());
}

/**
 * Check if 2FA token is required based on settings
 * @param {Object} user - User object
 * @returns {boolean} - True if 2FA is enabled
 */
export function isTwoFactorEnabled(user) {
    return user.twoFactorEnabled === true && user.twoFactorSecret;
}

/**
 * Configure TOTP options
 */
authenticator.options = {
    step: 30,      // Time step in seconds (default: 30)
    window: 1,     // Allow tokens from ±1 time step
    digits: 6      // 6-digit tokens
};

export default {
    generateTwoFactorSecret,
    generateQRCode,
    verifyTwoFactorToken,
    generateBackupCodes,
    verifyBackupCode,
    isTwoFactorEnabled
};
