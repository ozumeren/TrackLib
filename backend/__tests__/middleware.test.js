// __tests__/middleware.test.js
const { describe, it, expect, jest, beforeEach } = require('@jest/globals');
const { validate, validateBody, validateQuery, validateParams } = require('../middleware/validate');
const Joi = require('joi');

describe('Validation Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            query: {},
            params: {},
            url: '/test',
            method: 'POST',
            ip: '127.0.0.1'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
    });

    describe('validateBody', () => {
        const schema = Joi.object({
            email: Joi.string().email().required(),
            age: Joi.number().min(18).required()
        });

        it('should pass validation with valid data', () => {
            req.body = {
                email: 'test@example.com',
                age: 25
            };

            const middleware = validateBody(schema);
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should reject invalid email', () => {
            req.body = {
                email: 'invalid-email',
                age: 25
            };

            const middleware = validateBody(schema);
            middleware(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Validation failed',
                    details: expect.arrayContaining([
                        expect.objectContaining({
                            field: 'body.email'
                        })
                    ])
                })
            );
        });

        it('should reject missing required field', () => {
            req.body = {
                email: 'test@example.com'
                // age missing
            };

            const middleware = validateBody(schema);
            middleware(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should reject age less than minimum', () => {
            req.body = {
                email: 'test@example.com',
                age: 15
            };

            const middleware = validateBody(schema);
            middleware(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should strip unknown fields', () => {
            req.body = {
                email: 'test@example.com',
                age: 25,
                unknownField: 'should be removed'
            };

            const middleware = validateBody(schema);
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.body).not.toHaveProperty('unknownField');
        });

        it('should sanitize data', () => {
            const trimSchema = Joi.object({
                name: Joi.string().trim().required()
            });

            req.body = {
                name: '  John Doe  '
            };

            const middleware = validateBody(trimSchema);
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.body.name).toBe('John Doe');
        });

        it('should return all errors when abortEarly is false', () => {
            req.body = {
                email: 'invalid',
                age: 15
            };

            const middleware = validateBody(schema);
            middleware(req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    details: expect.arrayContaining([
                        expect.objectContaining({ field: 'body.email' }),
                        expect.objectContaining({ field: 'body.age' })
                    ])
                })
            );
        });
    });

    describe('validateQuery', () => {
        const schema = Joi.object({
            page: Joi.number().integer().min(1),
            limit: Joi.number().integer().min(1).max(100)
        });

        it('should validate query parameters', () => {
            req.query = {
                page: '5',
                limit: '20'
            };

            const middleware = validateQuery(schema);
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.query.page).toBe(5); // String coerced to number
            expect(req.query.limit).toBe(20);
        });

        it('should reject invalid query parameters', () => {
            req.query = {
                page: '0',
                limit: '150'
            };

            const middleware = validateQuery(schema);
            middleware(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('validateParams', () => {
        const schema = Joi.object({
            id: Joi.string().uuid().required()
        });

        it('should validate URL parameters', () => {
            req.params = {
                id: '123e4567-e89b-12d3-a456-426614174000'
            };

            const middleware = validateParams(schema);
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject invalid UUID', () => {
            req.params = {
                id: 'not-a-uuid'
            };

            const middleware = validateParams(schema);
            middleware(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('validate (combined)', () => {
        const combinedSchema = {
            body: Joi.object({
                email: Joi.string().email().required()
            }),
            query: Joi.object({
                page: Joi.number().integer().default(1)
            }),
            params: Joi.object({
                id: Joi.string().required()
            })
        };

        it('should validate all parts together', () => {
            req.body = { email: 'test@example.com' };
            req.query = { page: '2' };
            req.params = { id: 'abc123' };

            const middleware = validate(combinedSchema);
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject if any part fails validation', () => {
            req.body = { email: 'invalid' };
            req.query = { page: '2' };
            req.params = { id: 'abc123' };

            const middleware = validate(combinedSchema);
            middleware(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Error response format', () => {
        it('should include field path in error details', () => {
            const schema = Joi.object({
                user: Joi.object({
                    email: Joi.string().email().required()
                })
            });

            req.body = {
                user: {
                    email: 'invalid'
                }
            };

            const middleware = validateBody(schema);
            middleware(req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    details: expect.arrayContaining([
                        expect.objectContaining({
                            field: 'body.user.email'
                        })
                    ])
                })
            );
        });

        it('should include error message', () => {
            const schema = Joi.object({
                age: Joi.number().min(18).required()
            });

            req.body = { age: 15 };

            const middleware = validateBody(schema);
            middleware(req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    details: expect.arrayContaining([
                        expect.objectContaining({
                            message: expect.stringContaining('18')
                        })
                    ])
                })
            );
        });

        it('should include error type', () => {
            const schema = Joi.object({
                email: Joi.string().email().required()
            });

            req.body = { email: 'invalid' };

            const middleware = validateBody(schema);
            middleware(req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    details: expect.arrayContaining([
                        expect.objectContaining({
                            type: expect.any(String)
                        })
                    ])
                })
            );
        });
    });
});
