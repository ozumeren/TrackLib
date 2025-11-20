// __tests__/validators.test.js
const { describe, it, expect } = require('@jest/globals');
const schemas = require('../validators/schemas');

describe('Validation Schemas', () => {
    // ============================================
    // AUTHENTICATION SCHEMAS
    // ============================================
    describe('registerSchema', () => {
        it('should validate correct registration data', () => {
            const validData = {
                customerName: 'Test Company',
                scriptId: 'tracklib_test123',
                userName: 'John Doe',
                email: 'john@example.com',
                password: 'SecurePass123'
            };

            const { error } = schemas.registerSchema.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should reject registration with short customer name', () => {
            const invalidData = {
                customerName: 'A',
                scriptId: 'tracklib_test123',
                userName: 'John Doe',
                email: 'john@example.com',
                password: 'SecurePass123'
            };

            const { error } = schemas.registerSchema.validate(invalidData);
            expect(error).toBeDefined();
            expect(error.details[0].path).toContain('customerName');
        });

        it('should reject invalid script ID format', () => {
            const invalidData = {
                customerName: 'Test Company',
                scriptId: 'invalid_format',
                userName: 'John Doe',
                email: 'john@example.com',
                password: 'SecurePass123'
            };

            const { error } = schemas.registerSchema.validate(invalidData);
            expect(error).toBeDefined();
            expect(error.details[0].path).toContain('scriptId');
        });

        it('should reject weak password', () => {
            const invalidData = {
                customerName: 'Test Company',
                scriptId: 'tracklib_test123',
                userName: 'John Doe',
                email: 'john@example.com',
                password: 'weak'
            };

            const { error } = schemas.registerSchema.validate(invalidData);
            expect(error).toBeDefined();
            expect(error.details[0].path).toContain('password');
        });

        it('should reject password without uppercase', () => {
            const invalidData = {
                customerName: 'Test Company',
                scriptId: 'tracklib_test123',
                userName: 'John Doe',
                email: 'john@example.com',
                password: 'weakpass123'
            };

            const { error } = schemas.registerSchema.validate(invalidData);
            expect(error).toBeDefined();
        });

        it('should reject password without number', () => {
            const invalidData = {
                customerName: 'Test Company',
                scriptId: 'tracklib_test123',
                userName: 'John Doe',
                email: 'john@example.com',
                password: 'WeakPassword'
            };

            const { error } = schemas.registerSchema.validate(invalidData);
            expect(error).toBeDefined();
        });

        it('should normalize email to lowercase', () => {
            const data = {
                customerName: 'Test Company',
                scriptId: 'tracklib_test123',
                userName: 'John Doe',
                email: 'JOHN@EXAMPLE.COM',
                password: 'SecurePass123'
            };

            const { value } = schemas.registerSchema.validate(data);
            expect(value.email).toBe('john@example.com');
        });
    });

    describe('loginSchema', () => {
        it('should validate correct login data', () => {
            const validData = {
                email: 'user@example.com',
                password: 'AnyPassword123'
            };

            const { error } = schemas.loginSchema.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should reject invalid email format', () => {
            const invalidData = {
                email: 'not-an-email',
                password: 'password'
            };

            const { error } = schemas.loginSchema.validate(invalidData);
            expect(error).toBeDefined();
            expect(error.details[0].path).toContain('email');
        });

        it('should reject missing password', () => {
            const invalidData = {
                email: 'user@example.com'
            };

            const { error } = schemas.loginSchema.validate(invalidData);
            expect(error).toBeDefined();
            expect(error.details[0].path).toContain('password');
        });
    });

    // ============================================
    // EVENT TRACKING SCHEMAS
    // ============================================
    describe('eventSchema', () => {
        it('should validate correct event data', () => {
            const validData = {
                api_key: 'trk_1a2b3c4d5e6f7890abcdef1234567890',
                session_id: 'session_123456',
                player_id: 'player_456',
                event_name: 'deposit_successful',
                parameters: { amount: 100 },
                url: 'https://example.com/deposit',
                timestamp_utc: '2024-11-20T10:30:00.000Z'
            };

            const { error } = schemas.eventSchema.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should reject invalid API key format', () => {
            const invalidData = {
                api_key: 'invalid_key',
                session_id: 'session_123456',
                event_name: 'test_event'
            };

            const { error } = schemas.eventSchema.validate(invalidData);
            expect(error).toBeDefined();
            expect(error.details[0].path).toContain('api_key');
        });

        it('should allow null player_id', () => {
            const validData = {
                api_key: 'trk_1a2b3c4d5e6f7890abcdef1234567890',
                session_id: 'session_123456',
                player_id: null,
                event_name: 'page_view'
            };

            const { error } = schemas.eventSchema.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should reject empty event name', () => {
            const invalidData = {
                api_key: 'trk_1a2b3c4d5e6f7890abcdef1234567890',
                session_id: 'session_123456',
                event_name: ''
            };

            const { error } = schemas.eventSchema.validate(invalidData);
            expect(error).toBeDefined();
        });

        it('should default parameters to empty object', () => {
            const data = {
                api_key: 'trk_1a2b3c4d5e6f7890abcdef1234567890',
                session_id: 'session_123456',
                event_name: 'test_event'
            };

            const { value } = schemas.eventSchema.validate(data);
            expect(value.parameters).toEqual({});
        });
    });

    // ============================================
    // SEGMENT SCHEMAS
    // ============================================
    describe('segmentSchema', () => {
        it('should validate correct segment data', () => {
            const validData = {
                name: 'Active Players',
                description: 'Players who logged in recently',
                criteria: {
                    rules: [
                        {
                            fact: 'loginCount',
                            operator: 'greaterThan',
                            value: 5,
                            periodInDays: 7
                        }
                    ]
                }
            };

            const { error } = schemas.segmentSchema.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should reject segment with short name', () => {
            const invalidData = {
                name: 'AB',
                criteria: {
                    rules: [
                        {
                            fact: 'loginCount',
                            operator: 'greaterThan',
                            value: 5
                        }
                    ]
                }
            };

            const { error } = schemas.segmentSchema.validate(invalidData);
            expect(error).toBeDefined();
        });

        it('should reject segment without criteria rules', () => {
            const invalidData = {
                name: 'Test Segment',
                criteria: {
                    rules: []
                }
            };

            const { error } = schemas.segmentSchema.validate(invalidData);
            expect(error).toBeDefined();
        });

        it('should reject invalid operator', () => {
            const invalidData = {
                name: 'Test Segment',
                criteria: {
                    rules: [
                        {
                            fact: 'loginCount',
                            operator: 'invalidOperator',
                            value: 5
                        }
                    ]
                }
            };

            const { error } = schemas.segmentSchema.validate(invalidData);
            expect(error).toBeDefined();
        });
    });

    // ============================================
    // DOMAIN SCHEMAS
    // ============================================
    describe('domainsSchema', () => {
        it('should validate correct domain list', () => {
            const validData = {
                domains: ['example.com', '*.example.com', 'sub.example.co.uk']
            };

            const { error } = schemas.domainsSchema.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should reject invalid domain format', () => {
            const invalidData = {
                domains: ['.example.com', 'example', 'http://example.com']
            };

            const { error } = schemas.domainsSchema.validate(invalidData);
            expect(error).toBeDefined();
        });

        it('should reject non-array domains', () => {
            const invalidData = {
                domains: 'example.com'
            };

            const { error } = schemas.domainsSchema.validate(invalidData);
            expect(error).toBeDefined();
        });
    });

    // ============================================
    // TELEGRAM WEBHOOK SCHEMA
    // ============================================
    describe('telegramWebhookSchema', () => {
        it('should validate correct webhook data', () => {
            const validData = {
                chatId: '123456789',
                apiKey: 'trk_1a2b3c4d5e6f7890abcdef1234567890'
            };

            const { error } = schemas.telegramWebhookSchema.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should accept negative chat IDs', () => {
            const validData = {
                chatId: '-100123456789',
                apiKey: 'trk_1a2b3c4d5e6f7890abcdef1234567890'
            };

            const { error } = schemas.telegramWebhookSchema.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should reject invalid chat ID format', () => {
            const invalidData = {
                chatId: 'not-a-number',
                apiKey: 'trk_1a2b3c4d5e6f7890abcdef1234567890'
            };

            const { error } = schemas.telegramWebhookSchema.validate(invalidData);
            expect(error).toBeDefined();
        });
    });

    // ============================================
    // PAGINATION SCHEMA
    // ============================================
    describe('paginationSchema', () => {
        it('should use default values when not provided', () => {
            const data = {};

            const { value } = schemas.paginationSchema.validate(data);
            expect(value.page).toBe(1);
            expect(value.limit).toBe(20);
            expect(value.sortOrder).toBe('desc');
        });

        it('should validate custom pagination values', () => {
            const data = {
                page: 5,
                limit: 50,
                sortBy: 'createdAt',
                sortOrder: 'asc'
            };

            const { error, value } = schemas.paginationSchema.validate(data);
            expect(error).toBeUndefined();
            expect(value.page).toBe(5);
            expect(value.limit).toBe(50);
        });

        it('should reject page less than 1', () => {
            const data = { page: 0 };

            const { error } = schemas.paginationSchema.validate(data);
            expect(error).toBeDefined();
        });

        it('should reject limit greater than 100', () => {
            const data = { limit: 150 };

            const { error } = schemas.paginationSchema.validate(data);
            expect(error).toBeDefined();
        });
    });
});
