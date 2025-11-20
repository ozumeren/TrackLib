// backend/middleware/errorHandler.js
const logger = require('../utils/logger');

/**
 * Centralized error handler middleware
 * Catches all errors and returns consistent error responses
 */
function errorHandler(err, req, res, next) {
    // Log the error
    logger.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userId: req.user?.userId,
        customerId: req.customer?.id
    });

    // Default error status
    const statusCode = err.statusCode || err.status || 500;

    // Prisma database errors
    if (err.code && err.code.startsWith('P')) {
        return res.status(400).json({
            error: 'Database operation failed',
            code: err.code,
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation failed',
            details: err.message
        });
    }

    // Generic error response
    res.status(statusCode).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

/**
 * 404 Not Found handler
 * Must be added after all routes
 */
function notFoundHandler(req, res) {
    logger.warn('Route not found:', {
        method: req.method,
        url: req.url,
        ip: req.ip
    });

    res.status(404).json({
        error: 'Route not found',
        path: req.url
    });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler
};
