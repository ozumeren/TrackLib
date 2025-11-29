// backend/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('../utils/logger');

// Create Redis client for rate limiting
let redis;
try {
    redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        // Use a separate database for rate limiting
        db: 1,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true // Don't connect immediately
    });

    redis.on('error', (err) => {
        console.error('Rate limiter Redis error:', err.message);
        if (logger && logger.error) {
            logger.error('Rate limiter Redis error:', { error: err.message });
        }
    });

    redis.on('connect', () => {
        console.log('Rate limiter Redis connected successfully');
    });
} catch (err) {
    console.error('Failed to initialize Redis client:', err);
    // Create a dummy redis object to prevent crashes
    redis = {
        call: () => Promise.resolve(),
        on: () => {},
        quit: () => Promise.resolve()
    };
}

// Custom handler for rate limit exceeded
const rateLimitHandler = (req, res) => {
    logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
        customerId: req.customer?.id
    });

    res.status(429).json({
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: res.getHeader('Retry-After')
    });
};

// Custom key generator based on user or IP
const generateKey = (req) => {
    // If authenticated, use user ID
    if (req.user?.userId) {
        return `user:${req.user.userId}`;
    }
    // If API key present, use customer ID
    if (req.customer?.id) {
        return `customer:${req.customer.id}`;
    }
    // Otherwise use IP address
    return `ip:${req.ip}`;
};

// Skip rate limiting for certain conditions
const skipRateLimiting = (req) => {
    // Skip for health checks
    if (req.path === '/health' || req.path === '/ready') {
        return true;
    }
    // Skip in test environment
    if (process.env.NODE_ENV === 'test') {
        return true;
    }
    return false;
};

// ============================================
// GENERAL API RATE LIMITER
// ============================================

/**
 * General rate limiter for all API endpoints
 * 100 requests per 15 minutes per user/IP
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per window
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:general:'
    }),
    keyGenerator: generateKey,
    handler: rateLimitHandler,
    skip: skipRateLimiting,
    message: 'Too many requests from this IP, please try again later.'
});

// ============================================
// STRICT RATE LIMITER (Authentication)
// ============================================

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 login attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:auth:'
    }),
    keyGenerator: (req) => `ip:${req.ip}`, // Always use IP for auth
    handler: (req, res) => {
        logger.warn('Authentication rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            email: req.body.email
        });

        res.status(429).json({
            error: 'Too many login attempts',
            message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
            retryAfter: res.getHeader('Retry-After')
        });
    },
    skip: skipRateLimiting
});

// ============================================
// EVENT TRACKING RATE LIMITER
// ============================================

/**
 * Rate limiter for event tracking endpoint
 * 1000 requests per minute per customer
 */
const eventTrackingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // Max 1000 events per minute
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:events:'
    }),
    keyGenerator: (req) => {
        // Use customer ID if available
        if (req.customer?.id) {
            return `customer:${req.customer.id}`;
        }
        // Fallback to API key
        if (req.body?.api_key) {
            return `apikey:${req.body.api_key}`;
        }
        // Fallback to IP
        return `ip:${req.ip}`;
    },
    handler: (req, res) => {
        logger.warn('Event tracking rate limit exceeded', {
            ip: req.ip,
            customerId: req.customer?.id,
            apiKey: req.body?.api_key
        });

        res.status(429).json({
            error: 'Event rate limit exceeded',
            message: 'Too many events sent. Maximum 1000 events per minute.',
            retryAfter: res.getHeader('Retry-After')
        });
    },
    skip: skipRateLimiting
});

// ============================================
// REGISTRATION RATE LIMITER
// ============================================

/**
 * Rate limiter for registration endpoint
 * 3 registrations per hour per IP
 */
const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Max 3 registrations per hour
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:registration:'
    }),
    keyGenerator: (req) => `ip:${req.ip}`,
    handler: (req, res) => {
        logger.warn('Registration rate limit exceeded', {
            ip: req.ip,
            email: req.body.email
        });

        res.status(429).json({
            error: 'Registration rate limit exceeded',
            message: 'Too many registration attempts. Please try again after 1 hour.',
            retryAfter: res.getHeader('Retry-After')
        });
    },
    skip: skipRateLimiting
});

// ============================================
// ANALYTICS RATE LIMITER
// ============================================

/**
 * Rate limiter for analytics/reporting endpoints
 * 30 requests per minute per user
 */
const analyticsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Max 30 analytics requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:analytics:'
    }),
    keyGenerator: generateKey,
    handler: rateLimitHandler,
    skip: skipRateLimiting
});

// ============================================
// ADMIN RATE LIMITER
// ============================================

/**
 * Rate limiter for admin endpoints
 * 60 requests per minute per user
 */
const adminLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // Max 60 admin requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:admin:'
    }),
    keyGenerator: generateKey,
    handler: rateLimitHandler,
    skip: skipRateLimiting
});

// ============================================
// SCRIPT SERVING RATE LIMITER
// ============================================

/**
 * Rate limiter for script serving endpoints
 * 100 requests per minute per script ID
 */
const scriptServingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Max 100 script loads per minute
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:scripts:'
    }),
    keyGenerator: (req) => {
        // Use script ID if available
        if (req.params.scriptId) {
            return `script:${req.params.scriptId}`;
        }
        return `ip:${req.ip}`;
    },
    handler: rateLimitHandler,
    skip: skipRateLimiting
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
    generalLimiter,
    authLimiter,
    eventTrackingLimiter,
    registrationLimiter,
    analyticsLimiter,
    adminLimiter,
    scriptServingLimiter,
    redis // Export for cleanup
};
