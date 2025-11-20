// backend/middleware/validate.js
const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validation middleware factory
 * Creates middleware that validates request data against a Joi schema
 *
 * @param {Object} schema - Joi schema object with body, query, params keys
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware
 */
function validate(schema, options = {}) {
    const defaultOptions = {
        abortEarly: false,      // Return all errors, not just the first
        stripUnknown: true,     // Remove unknown fields
        ...options
    };

    return (req, res, next) => {
        const toValidate = {};

        // Collect data to validate
        if (schema.body) toValidate.body = req.body;
        if (schema.query) toValidate.query = req.query;
        if (schema.params) toValidate.params = req.params;

        // Build combined schema
        const combinedSchema = Joi.object(toValidate).keys({
            body: schema.body || Joi.any(),
            query: schema.query || Joi.any(),
            params: schema.params || Joi.any()
        });

        // Validate
        const { error, value } = combinedSchema.validate(toValidate, defaultOptions);

        if (error) {
            // Extract error details
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            }));

            // Log validation failure
            logger.warn('Validation failed', {
                url: req.url,
                method: req.method,
                errors: errors,
                ip: req.ip
            });

            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }

        // Replace request data with validated and sanitized data
        if (schema.body) req.body = value.body;
        if (schema.query) req.query = value.query;
        if (schema.params) req.params = value.params;

        next();
    };
}

/**
 * Quick validation for body only
 */
function validateBody(schema, options) {
    return validate({ body: schema }, options);
}

/**
 * Quick validation for query only
 */
function validateQuery(schema, options) {
    return validate({ query: schema }, options);
}

/**
 * Quick validation for params only
 */
function validateParams(schema, options) {
    return validate({ params: schema }, options);
}

module.exports = {
    validate,
    validateBody,
    validateQuery,
    validateParams
};
