// backend/validators/schemas.js
const Joi = require('joi');

// ============================================
// AUTHENTICATION SCHEMAS
// ============================================

const registerSchema = Joi.object({
    customerName: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Customer name must be at least 2 characters',
            'string.max': 'Customer name must not exceed 100 characters',
            'any.required': 'Customer name is required'
        }),

    scriptId: Joi.string()
        .trim()
        .pattern(/^strastix_[a-z0-9_]+$/)
        .min(10)
        .max(50)
        .required()
        .messages({
            'string.pattern.base': 'Script ID must start with "strastix_" and contain only lowercase letters, numbers, and underscores',
            'any.required': 'Script ID is required'
        }),

    userName: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'User name must be at least 2 characters',
            'any.required': 'User name is required'
        }),

    email: Joi.string()
        .trim()
        .email()
        .lowercase()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    password: Joi.string()
        .min(8)
        .max(100)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
            'any.required': 'Password is required'
        })
});

const loginSchema = Joi.object({
    email: Joi.string()
        .trim()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required'
        })
});

// ============================================
// EVENT TRACKING SCHEMAS
// ============================================

const eventSchema = Joi.object({
    script_id: Joi.string()
        .trim()
        .valid('ebetlab', 'truva')
        .required()
        .messages({
            'any.only': 'Script ID must be either "ebetlab" or "truva"',
            'any.required': 'Script ID is required'
        }),

    session_id: Joi.string()
        .trim()
        .min(10)
        .max(100)
        .required()
        .messages({
            'any.required': 'Session ID is required'
        }),

    player_id: Joi.string()
        .trim()
        .max(255)
        .allow(null, '')
        .optional(),

    event_name: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .required()
        .messages({
            'any.required': 'Event name is required',
            'string.empty': 'Event name cannot be empty'
        }),

    parameters: Joi.object()
        .optional()
        .default({}),

    url: Joi.string()
        .uri({ allowRelative: true })
        .max(2048)
        .optional()
        .allow(''),

    timestamp_utc: Joi.string()
        .isoDate()
        .optional()
});

// ============================================
// SEGMENT SCHEMAS
// ============================================

const segmentSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.min': 'Segment name must be at least 3 characters',
            'any.required': 'Segment name is required'
        }),

    description: Joi.string()
        .trim()
        .max(500)
        .allow('')
        .optional(),

    criteria: Joi.object({
        rules: Joi.array()
            .items(
                Joi.object({
                    fact: Joi.string()
                        .valid('loginCount', 'totalDeposit', 'depositCount', 'lastLoginDays', 'totalWithdrawal', 'withdrawalCount')
                        .required(),
                    operator: Joi.string()
                        .valid('greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'equals')
                        .required(),
                    value: Joi.number()
                        .required(),
                    periodInDays: Joi.number()
                        .integer()
                        .min(1)
                        .max(365)
                        .optional()
                })
            )
            .min(1)
            .required()
    }).required()
});

// ============================================
// RULE SCHEMAS
// ============================================

const ruleSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(3)
        .max(200)
        .required()
        .messages({
            'string.min': 'Rule name must be at least 3 characters',
            'any.required': 'Rule name is required'
        }),

    triggerType: Joi.string()
        .valid(
            'INACTIVITY', 'EVENT', 'SEGMENT_ENTRY', 'SEGMENT_EXIT',
            'DEPOSIT_THRESHOLD', 'WITHDRAWAL_THRESHOLD', 'LOGIN_STREAK',
            'LOSS_STREAK', 'WIN_STREAK', 'FIRST_DEPOSIT', 'BIRTHDAY',
            'ACCOUNT_ANNIVERSARY', 'LOW_BALANCE', 'HIGH_BALANCE',
            'GAME_SPECIFIC', 'BET_SIZE', 'SESSION_DURATION',
            'MULTIPLE_FAILED_DEPOSITS', 'RTP_THRESHOLD', 'BONUS_EXPIRY'
        )
        .required()
        .messages({
            'any.required': 'Trigger type is required',
            'any.only': 'Invalid trigger type'
        }),

    isActive: Joi.boolean()
        .optional()
        .default(true),

    config: Joi.object()
        .optional()
        .default({}),

    conversionGoalEvent: Joi.string()
        .trim()
        .max(100)
        .optional()
        .allow('', null)
});

// ============================================
// USER/CUSTOMER SCHEMAS
// ============================================

const updateUserSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .optional(),

    email: Joi.string()
        .trim()
        .email()
        .lowercase()
        .optional(),

    password: Joi.string()
        .min(8)
        .max(100)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .optional()
        .messages({
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        })
}).min(1); // At least one field must be provided

const domainsSchema = Joi.object({
    domains: Joi.array()
        .items(
            Joi.string()
                .trim()
                .pattern(/^(\*\.)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i)
                .messages({
                    'string.pattern.base': 'Invalid domain format. Use: example.com or *.example.com'
                })
        )
        .required()
        .messages({
            'any.required': 'Domains array is required'
        })
});

// ============================================
// TELEGRAM WEBHOOK SCHEMA
// ============================================

const telegramWebhookSchema = Joi.object({
    chatId: Joi.string()
        .trim()
        .pattern(/^-?\d+$/)
        .required()
        .messages({
            'string.pattern.base': 'Chat ID must be a numeric string',
            'any.required': 'Chat ID is required'
        }),

    apiKey: Joi.string()
        .pattern(/^trk_[a-f0-9]{32}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid API key format',
            'any.required': 'API key is required'
        })
});

// ============================================
// QUERY PARAMETER SCHEMAS
// ============================================

const paginationSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20),

    sortBy: Joi.string()
        .trim()
        .optional(),

    sortOrder: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
});

const dateRangeSchema = Joi.object({
    startDate: Joi.date()
        .iso()
        .optional(),

    endDate: Joi.date()
        .iso()
        .min(Joi.ref('startDate'))
        .optional()
        .messages({
            'date.min': 'End date must be after start date'
        })
});

// ============================================
// ID PARAMETER SCHEMAS
// ============================================

const scriptIdSchema = Joi.object({
    scriptId: Joi.string()
        .pattern(/^[a-zA-Z0-9_-]+$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid script ID format',
            'any.required': 'Script ID is required'
        })
});

const apiKeySchema = Joi.object({
    apiKey: Joi.string()
        .pattern(/^trk_[a-f0-9]{32}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid API key format',
            'any.required': 'API key is required'
        })
});

const uuidSchema = Joi.object({
    id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'Invalid ID format',
            'any.required': 'ID is required'
        })
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Authentication
    registerSchema,
    loginSchema,

    // Events
    eventSchema,

    // Segments
    segmentSchema,

    // Rules
    ruleSchema,

    // Users/Customers
    updateUserSchema,
    domainsSchema,

    // Integrations
    telegramWebhookSchema,

    // Query params
    paginationSchema,
    dateRangeSchema,

    // Path params
    scriptIdSchema,
    apiKeySchema,
    uuidSchema
};
