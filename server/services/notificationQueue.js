/**
 * @fileoverview Notification Queue Service
 *
 * Handles async notification processing using Bull (Redis queue)
 */

import Bull from 'bull';
import { sendEmail } from './emailService.js';
import { sendSMS } from './smsService.js';
import { sendPushNotification } from './pushService.js';

// Create queue instances
const emailQueue = new Bull('email-notifications', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});

const smsQueue = new Bull('sms-notifications', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});

const pushQueue = new Bull('push-notifications', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
    },
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 1000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});

// Process email queue
emailQueue.process(async (job) => {
    const { to, subject, html, text, attachments } = job.data;

    console.log(`Processing email job ${job.id}: ${subject} to ${to}`);

    const result = await sendEmail({ to, subject, html, text, attachments });

    if (!result.success) {
        throw new Error(result.error);
    }

    return result;
});

// Process SMS queue
smsQueue.process(async (job) => {
    const { to, message } = job.data;

    console.log(`Processing SMS job ${job.id} to ${to}`);

    const result = await sendSMS(to, message);

    if (!result.success) {
        throw new Error(result.error);
    }

    return result;
});

// Process push notification queue
pushQueue.process(async (job) => {
    const { userId, payload } = job.data;

    console.log(`Processing push notification job ${job.id} for user ${userId}`);

    const result = await sendPushNotification(userId, payload);

    if (!result.success) {
        throw new Error(result.error);
    }

    return result;
});

// Event listeners for monitoring
[emailQueue, smsQueue, pushQueue].forEach(queue => {
    queue.on('completed', (job, result) => {
        console.log(`Job ${job.id} completed successfully`);
    });

    queue.on('failed', (job, err) => {
        console.error(`Job ${job.id} failed:`, err.message);
    });

    queue.on('stalled', (job) => {
        console.warn(`Job ${job.id} stalled`);
    });
});

/**
 * Add email to queue
 */
export async function queueEmail(to, subject, html, options = {}) {
    const job = await emailQueue.add({
        to,
        subject,
        html,
        text: options.text,
        attachments: options.attachments
    }, {
        priority: options.priority || 5,
        delay: options.delay || 0
    });

    return {
        jobId: job.id,
        queue: 'email'
    };
}

/**
 * Add SMS to queue
 */
export async function queueSMS(to, message, options = {}) {
    const job = await smsQueue.add({
        to,
        message
    }, {
        priority: options.priority || 5,
        delay: options.delay || 0
    });

    return {
        jobId: job.id,
        queue: 'sms'
    };
}

/**
 * Add push notification to queue
 */
export async function queuePushNotification(userId, payload, options = {}) {
    const job = await pushQueue.add({
        userId,
        payload
    }, {
        priority: options.priority || 5,
        delay: options.delay || 0
    });

    return {
        jobId: job.id,
        queue: 'push'
    };
}

/**
 * Add scheduled notification (all channels)
 */
export async function scheduleNotification(notification, scheduledTime) {
    const delay = new Date(scheduledTime) - new Date();

    if (delay < 0) {
        throw new Error('Scheduled time must be in the future');
    }

    const jobs = [];

    if (notification.email) {
        const job = await queueEmail(
            notification.email.to,
            notification.email.subject,
            notification.email.html,
            { delay, priority: notification.priority || 5 }
        );
        jobs.push(job);
    }

    if (notification.sms) {
        const job = await queueSMS(
            notification.sms.to,
            notification.sms.message,
            { delay, priority: notification.priority || 5 }
        );
        jobs.push(job);
    }

    if (notification.push) {
        const job = await queuePushNotification(
            notification.push.userId,
            notification.push.payload,
            { delay, priority: notification.priority || 5 }
        );
        jobs.push(job);
    }

    return {
        scheduledFor: scheduledTime,
        jobs
    };
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
    const [emailStats, smsStats, pushStats] = await Promise.all([
        emailQueue.getJobCounts(),
        smsQueue.getJobCounts(),
        pushQueue.getJobCounts()
    ]);

    return {
        email: emailStats,
        sms: smsStats,
        push: pushStats,
        total: {
            waiting: emailStats.waiting + smsStats.waiting + pushStats.waiting,
            active: emailStats.active + smsStats.active + pushStats.active,
            completed: emailStats.completed + smsStats.completed + pushStats.completed,
            failed: emailStats.failed + smsStats.failed + pushStats.failed
        }
    };
}

/**
 * Get failed jobs for retry
 */
export async function getFailedJobs(queueName = 'all') {
    const queues = queueName === 'all'
        ? { email: emailQueue, sms: smsQueue, push: pushQueue }
        : { [queueName]: queueName === 'email' ? emailQueue : queueName === 'sms' ? smsQueue : pushQueue };

    const failedJobs = {};

    for (const [name, queue] of Object.entries(queues)) {
        failedJobs[name] = await queue.getFailed();
    }

    return failedJobs;
}

/**
 * Retry failed jobs
 */
export async function retryFailedJobs(queueName = 'all') {
    const failedJobs = await getFailedJobs(queueName);
    const results = {};

    for (const [name, jobs] of Object.entries(failedJobs)) {
        results[name] = {
            total: jobs.length,
            retried: 0
        };

        for (const job of jobs) {
            await job.retry();
            results[name].retried++;
        }
    }

    return results;
}

/**
 * Clear all queues
 */
export async function clearQueues() {
    await Promise.all([
        emailQueue.empty(),
        smsQueue.empty(),
        pushQueue.empty()
    ]);

    return { success: true };
}

/**
 * Close all queues (for graceful shutdown)
 */
export async function closeQueues() {
    await Promise.all([
        emailQueue.close(),
        smsQueue.close(),
        pushQueue.close()
    ]);

    return { success: true };
}

// Export queue instances for direct access if needed
export { emailQueue, smsQueue, pushQueue };
