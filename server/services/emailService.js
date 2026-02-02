/**
 * @fileoverview Email Service
 *
 * Handles sending emails using Nodemailer
 */

import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create reusable transporter
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    // Configure based on environment
    const config = process.env.EMAIL_SERVICE === 'gmail' ? {
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    } : {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    };

    transporter = nodemailer.createTransporter(config);
    return transporter;
}

/**
 * Load and compile email template
 */
function loadTemplate(templateName) {
    try {
        const templatePath = join(__dirname, '../templates/emails', `${templateName}.html`);
        const templateSource = readFileSync(templatePath, 'utf-8');
        return handlebars.compile(templateSource);
    } catch (error) {
        console.error(`Failed to load template ${templateName}:`, error);
        // Return basic template if file not found
        return handlebars.compile(`
            <html>
                <body>
                    <h2>{{subject}}</h2>
                    <p>{{message}}</p>
                </body>
            </html>
        `);
    }
}

/**
 * Send email
 */
export async function sendEmail({ to, subject, html, text, attachments = [] }) {
    try {
        if (!process.env.EMAIL_USER) {
            console.warn('Email service not configured');
            return { success: false, error: 'Email service not configured' };
        }

        const transporter = getTransporter();

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'POS System'}" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            text: text || subject,
            attachments
        };

        const info = await transporter.sendMail(mailOptions);

        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Email send error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send receipt email
 */
export async function sendReceiptEmail(to, saleData) {
    const template = loadTemplate('receipt');
    const html = template(saleData);

    return sendEmail({
        to,
        subject: `Receipt #${saleData.orderId || saleData._id}`,
        html
    });
}

/**
 * Send low stock alert email
 */
export async function sendLowStockAlert(to, products) {
    const template = loadTemplate('low-stock-alert');
    const html = template({ products });

    return sendEmail({
        to,
        subject: `Low Stock Alert - ${products.length} Products`,
        html
    });
}

/**
 * Send daily sales report
 */
export async function sendDailySalesReport(to, reportData) {
    const template = loadTemplate('daily-report');
    const html = template(reportData);

    return sendEmail({
        to,
        subject: `Daily Sales Report - ${reportData.date}`,
        html
    });
}

/**
 * Send loyalty reward notification
 */
export async function sendLoyaltyReward(to, customerData) {
    const template = loadTemplate('loyalty-reward');
    const html = template(customerData);

    return sendEmail({
        to,
        subject: `You've Earned Loyalty Points!`,
        html
    });
}

/**
 * Send marketing campaign email
 */
export async function sendMarketingEmail(to, campaignData) {
    const template = loadTemplate('marketing');
    const html = template(campaignData);

    return sendEmail({
        to,
        subject: campaignData.subject,
        html
    });
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(to, resetData) {
    const template = loadTemplate('password-reset');
    const html = template(resetData);

    return sendEmail({
        to,
        subject: 'Password Reset Request',
        html
    });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(to, userData) {
    const template = loadTemplate('welcome');
    const html = template(userData);

    return sendEmail({
        to,
        subject: 'Welcome to Our POS System!',
        html
    });
}
