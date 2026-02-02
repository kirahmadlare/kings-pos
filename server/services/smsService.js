/**
 * @fileoverview SMS Service
 *
 * Handles sending SMS messages using Twilio
 */

import twilio from 'twilio';

let twilioClient = null;

function getTwilioClient() {
    if (twilioClient) return twilioClient;

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        return null;
    }

    twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );

    return twilioClient;
}

/**
 * Send SMS message
 */
export async function sendSMS(to, message) {
    try {
        const client = getTwilioClient();

        if (!client) {
            console.warn('SMS service not configured');
            return { success: false, error: 'SMS service not configured' };
        }

        if (!process.env.TWILIO_PHONE_NUMBER) {
            console.warn('Twilio phone number not configured');
            return { success: false, error: 'SMS phone number not configured' };
        }

        const result = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to
        });

        return {
            success: true,
            messageId: result.sid,
            status: result.status
        };
    } catch (error) {
        console.error('SMS send error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send OTP code
 */
export async function sendOTP(to, code) {
    const message = `Your verification code is: ${code}. This code will expire in 10 minutes.`;
    return sendSMS(to, message);
}

/**
 * Send order confirmation
 */
export async function sendOrderConfirmation(to, orderNumber, total) {
    const message = `Your order #${orderNumber} has been confirmed. Total: $${total.toFixed(2)}. Thank you for your purchase!`;
    return sendSMS(to, message);
}

/**
 * Send credit payment reminder
 */
export async function sendPaymentReminder(to, customerName, amount, dueDate) {
    const message = `Hi ${customerName}, this is a reminder that your payment of $${amount.toFixed(2)} is due on ${dueDate}. Thank you!`;
    return sendSMS(to, message);
}

/**
 * Send promotional offer
 */
export async function sendPromotion(to, offer) {
    const message = `Special Offer: ${offer.title}. ${offer.description}. Valid until ${offer.expiryDate}. Show this message at checkout!`;
    return sendSMS(to, message);
}

/**
 * Send loyalty reward notification
 */
export async function sendLoyaltyNotification(to, points, message) {
    const smsMessage = `You've earned ${points} loyalty points! ${message}`;
    return sendSMS(to, smsMessage);
}

/**
 * Send low balance alert
 */
export async function sendLowBalanceAlert(to, productName, currentStock) {
    const message = `Low Stock Alert: ${productName} is running low (${currentStock} units remaining). Please restock soon.`;
    return sendSMS(to, message);
}

/**
 * Send shift reminder
 */
export async function sendShiftReminder(to, employeeName, shiftTime) {
    const message = `Hi ${employeeName}, reminder that your shift starts at ${shiftTime}. See you soon!`;
    return sendSMS(to, message);
}

/**
 * Bulk SMS sending
 */
export async function sendBulkSMS(recipients, message) {
    const results = [];

    for (const to of recipients) {
        const result = await sendSMS(to, message);
        results.push({ to, ...result });

        // Rate limiting - wait 1 second between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
        total: recipients.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
    };
}
