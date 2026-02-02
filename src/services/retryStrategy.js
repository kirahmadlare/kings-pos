/**
 * @fileoverview Retry Strategy with Exponential Backoff
 *
 * Implements retry logic for failed API calls with exponential backoff
 */

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if error is retryable
 */
function isRetryableError(error) {
    // Network errors are always retryable
    if (error.message.includes('fetch') || error.message.includes('Network')) {
        return true;
    }

    // Server errors (5xx) are retryable
    if (error.status >= 500) {
        return true;
    }

    // Timeout errors are retryable
    if (error.message.includes('timeout')) {
        return true;
    }

    // Connection errors are retryable
    if (error.message.includes('Unable to connect')) {
        return true;
    }

    // Rate limit errors are retryable (after wait)
    if (error.status === 429) {
        return true;
    }

    // Client errors (4xx except 429) are NOT retryable
    if (error.status >= 400 && error.status < 500) {
        return false;
    }

    // Default: retry unknown errors
    return true;
}

/**
 * Calculate delay for retry attempt
 * Uses exponential backoff: 1s, 2s, 4s, 8s...
 *
 * @param {number} attemptNumber - Current attempt (0-based)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function calculateDelay(attemptNumber, baseDelay = 1000, maxDelay = 10000) {
    // Exponential: 2^attempt * baseDelay
    const delay = Math.pow(2, attemptNumber) * baseDelay;

    // Add random jitter (±25%) to prevent thundering herd
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);

    // Cap at maxDelay
    return Math.min(delay + jitter, maxDelay);
}

/**
 * Retry a function with exponential backoff
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.onRetry - Callback called before each retry
 * @returns {Promise} Result of function or final error
 */
export async function withRetry(fn, options = {}) {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        maxDelay = 10000,
        onRetry = null
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Attempt the function
            return await fn();
        } catch (error) {
            lastError = error;

            // If this was the last attempt, throw the error
            if (attempt === maxRetries) {
                break;
            }

            // Check if error is retryable
            if (!isRetryableError(error)) {
                throw error;
            }

            // Calculate delay for next retry
            const delay = calculateDelay(attempt, baseDelay, maxDelay);

            // Call onRetry callback if provided
            if (onRetry) {
                onRetry(attempt + 1, maxRetries, delay, error);
            }

            console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, error.message);

            // Wait before retrying
            await sleep(delay);
        }
    }

    // All retries exhausted, throw the last error
    throw lastError;
}

/**
 * Retry with linear backoff (simpler, constant delay between retries)
 *
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise} Result of function or final error
 */
export async function withLinearRetry(fn, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries || !isRetryableError(error)) {
                throw error;
            }

            console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Retry with custom retry condition
 *
 * @param {Function} fn - Async function to retry
 * @param {Function} shouldRetry - Function that returns true if should retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise} Result of function or final error
 */
export async function withCustomRetry(fn, shouldRetry, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries || !shouldRetry(error, attempt)) {
                throw error;
            }

            await sleep(delay);
        }
    }

    throw lastError;
}

export default {
    withRetry,
    withLinearRetry,
    withCustomRetry,
    isRetryableError,
    calculateDelay
};
