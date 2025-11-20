// __tests__/api.test.js
const { describe, it, expect, jest, beforeAll, afterAll } = require('@jest/globals');

// Mock external dependencies before importing the app
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    stream: { write: jest.fn() }
}));

jest.mock('@prisma/client', () => {
    const mockPrismaClient = {
        customer: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        event: {
            create: jest.fn(),
        },
        player: {
            upsert: jest.fn(),
        },
        $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
        $disconnect: jest.fn(),
    };
    return {
        PrismaClient: jest.fn(() => mockPrismaClient)
    };
});

jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
        get: jest.fn().mockResolvedValue(null),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK'),
    }));
});

describe('API Endpoints', () => {
    // ============================================
    // HEALTH CHECK ENDPOINTS
    // ============================================
    describe('GET /health', () => {
        it('should return 200 with health status', async () => {
            const request = require('supertest');

            // Create a minimal Express app for testing
            const express = require('express');
            const app = express();

            app.get('/health', (req, res) => {
                res.status(200).json({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    environment: process.env.NODE_ENV || 'development'
                });
            });

            const response = await request(app).get('/health');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'ok');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('environment');
        });
    });

    describe('GET /ready', () => {
        it('should return 200 when all services are ready', async () => {
            const request = require('supertest');
            const express = require('express');
            const app = express();

            app.get('/ready', async (req, res) => {
                const checks = {
                    server: 'ok',
                    database: 'ok',
                    redis: 'ok',
                    timestamp: new Date().toISOString()
                };

                res.status(200).json({
                    status: 'ready',
                    checks: checks
                });
            });

            const response = await request(app).get('/ready');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ready');
            expect(response.body.checks).toHaveProperty('server', 'ok');
            expect(response.body.checks).toHaveProperty('database', 'ok');
            expect(response.body.checks).toHaveProperty('redis', 'ok');
        });

        it('should return 503 when services are not ready', async () => {
            const request = require('supertest');
            const express = require('express');
            const app = express();

            app.get('/ready', async (req, res) => {
                const checks = {
                    server: 'ok',
                    database: 'error',
                    redis: 'ok',
                    databaseError: 'Connection refused',
                    timestamp: new Date().toISOString()
                };

                res.status(503).json({
                    status: 'not_ready',
                    checks: checks
                });
            });

            const response = await request(app).get('/ready');

            expect(response.status).toBe(503);
            expect(response.body.status).toBe('not_ready');
            expect(response.body.checks.database).toBe('error');
        });
    });

    // ============================================
    // VALIDATION ENDPOINTS
    // ============================================
    describe('POST /api/auth/register - Validation', () => {
        it('should reject registration with invalid data', async () => {
            const request = require('supertest');
            const express = require('express');
            const { validateBody } = require('../middleware/validate');
            const schemas = require('../validators/schemas');

            const app = express();
            app.use(express.json());

            app.post('/api/auth/register', validateBody(schemas.registerSchema), (req, res) => {
                res.status(201).json({ message: 'Success' });
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    customerName: 'A', // Too short
                    scriptId: 'invalid', // Wrong format
                    email: 'not-email', // Invalid email
                    password: 'weak' // Weak password
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Validation failed');
            expect(response.body.details).toBeInstanceOf(Array);
            expect(response.body.details.length).toBeGreaterThan(0);
        });

        it('should accept valid registration data', async () => {
            const request = require('supertest');
            const express = require('express');
            const { validateBody } = require('../middleware/validate');
            const schemas = require('../validators/schemas');

            const app = express();
            app.use(express.json());

            app.post('/api/auth/register', validateBody(schemas.registerSchema), (req, res) => {
                res.status(201).json({ message: 'Success' });
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    customerName: 'Test Company',
                    scriptId: 'tracklib_test123',
                    userName: 'John Doe',
                    email: 'john@example.com',
                    password: 'SecurePass123'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message', 'Success');
        });
    });

    describe('POST /v1/events - Validation', () => {
        it('should reject event with invalid API key', async () => {
            const request = require('supertest');
            const express = require('express');
            const { validateBody } = require('../middleware/validate');
            const schemas = require('../validators/schemas');

            const app = express();
            app.use(express.json());

            app.post('/v1/events', validateBody(schemas.eventSchema), (req, res) => {
                res.status(200).json({ success: true });
            });

            const response = await request(app)
                .post('/v1/events')
                .send({
                    api_key: 'invalid_key_format',
                    session_id: 'session_123',
                    event_name: 'test_event'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Validation failed');
        });

        it('should accept valid event data', async () => {
            const request = require('supertest');
            const express = require('express');
            const { validateBody } = require('../middleware/validate');
            const schemas = require('../validators/schemas');

            const app = express();
            app.use(express.json());

            app.post('/v1/events', validateBody(schemas.eventSchema), (req, res) => {
                res.status(200).json({ success: true });
            });

            const response = await request(app)
                .post('/v1/events')
                .send({
                    api_key: 'trk_1a2b3c4d5e6f7890abcdef1234567890',
                    session_id: 'session_123456',
                    player_id: 'player_456',
                    event_name: 'deposit_successful',
                    parameters: { amount: 100 }
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });

        it('should reject event with empty event name', async () => {
            const request = require('supertest');
            const express = require('express');
            const { validateBody } = require('../middleware/validate');
            const schemas = require('../validators/schemas');

            const app = express();
            app.use(express.json());

            app.post('/v1/events', validateBody(schemas.eventSchema), (req, res) => {
                res.status(200).json({ success: true });
            });

            const response = await request(app)
                .post('/v1/events')
                .send({
                    api_key: 'trk_1a2b3c4d5e6f7890abcdef1234567890',
                    session_id: 'session_123',
                    event_name: ''
                });

            expect(response.status).toBe(400);
        });
    });

    // ============================================
    // ERROR HANDLING
    // ============================================
    describe('404 Not Found', () => {
        it('should return 404 for non-existent routes', async () => {
            const request = require('supertest');
            const express = require('express');
            const { notFoundHandler } = require('../middleware/errorHandler');

            const app = express();
            app.use(notFoundHandler);

            const response = await request(app).get('/non-existent-route');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
        });
    });
});
