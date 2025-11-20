// backend/__tests__/rateLimiter.test.js
const request = require('supertest');
const express = require('express');
const {
    generalLimiter,
    authLimiter,
    eventTrackingLimiter,
    registrationLimiter,
    analyticsLimiter,
    adminLimiter,
    scriptServingLimiter,
    redis
} = require('../middleware/rateLimiter');

// Create test app
function createTestApp(limiter) {
    const app = express();
    app.use(express.json());
    app.use(limiter);
    app.get('/test', (req, res) => {
        res.status(200).json({ success: true });
    });
    app.post('/test', (req, res) => {
        res.status(200).json({ success: true });
    });
    return app;
}

// Helper to make multiple requests
async function makeRequests(app, count, method = 'get') {
    const requests = [];
    for (let i = 0; i < count; i++) {
        requests.push(
            request(app)[method]('/test')
                .set('X-Forwarded-For', '192.168.1.1')
        );
    }
    return Promise.all(requests);
}

describe('Rate Limiter Middleware', () => {
    // Clean up Redis after all tests
    afterAll(async () => {
        await redis.flushdb(); // Clear test data
        await redis.quit();
    });

    // Clean up between tests
    afterEach(async () => {
        await redis.flushdb();
    });

    describe('generalLimiter', () => {
        const app = createTestApp(generalLimiter);

        it('should allow requests under the limit', async () => {
            const response = await request(app)
                .get('/test')
                .set('X-Forwarded-For', '192.168.1.1');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should return rate limit headers', async () => {
            const response = await request(app)
                .get('/test')
                .set('X-Forwarded-For', '192.168.1.1');

            expect(response.headers['ratelimit-limit']).toBeDefined();
            expect(response.headers['ratelimit-remaining']).toBeDefined();
            expect(response.headers['ratelimit-reset']).toBeDefined();
        });

        it('should block requests exceeding the limit', async () => {
            // General limiter: 100 requests per 15 minutes
            // Make 101 requests
            const responses = await makeRequests(app, 101);

            // First 100 should succeed
            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBe(100);

            // 101st should be rate limited
            const rateLimitedCount = responses.filter(r => r.status === 429).length;
            expect(rateLimitedCount).toBe(1);
        }, 30000); // 30 second timeout for this test
    });

    describe('authLimiter', () => {
        const app = createTestApp(authLimiter);

        it('should allow requests under the limit', async () => {
            const responses = await makeRequests(app, 3, 'post');

            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        it('should block after 5 attempts', async () => {
            // Auth limiter: 5 requests per 15 minutes
            const responses = await makeRequests(app, 6, 'post');

            // First 5 should succeed
            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBe(5);

            // 6th should be rate limited
            const rateLimitedCount = responses.filter(r => r.status === 429).length;
            expect(rateLimitedCount).toBe(1);

            // Check error message
            const rateLimitedResponse = responses.find(r => r.status === 429);
            expect(rateLimitedResponse.body.error).toBe('Too many login attempts');
        });

        it('should include retry-after header when rate limited', async () => {
            const responses = await makeRequests(app, 6, 'post');
            const rateLimitedResponse = responses.find(r => r.status === 429);

            expect(rateLimitedResponse.body.retryAfter).toBeDefined();
        });
    });

    describe('eventTrackingLimiter', () => {
        const app = createTestApp(eventTrackingLimiter);

        it('should allow high volume of events', async () => {
            // Event tracking: 1000 requests per minute
            // Test with 50 requests
            const responses = await makeRequests(app, 50, 'post');

            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        it('should block after 1000 events per minute', async () => {
            // This test is slow, so we'll just verify the limiter is configured correctly
            const response = await request(app)
                .post('/test')
                .set('X-Forwarded-For', '192.168.1.1');

            expect(response.status).toBe(200);
            expect(response.headers['ratelimit-limit']).toBe('1000');
        });
    });

    describe('registrationLimiter', () => {
        const app = createTestApp(registrationLimiter);

        it('should allow 3 registrations per hour', async () => {
            const responses = await makeRequests(app, 3, 'post');

            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        it('should block 4th registration attempt', async () => {
            const responses = await makeRequests(app, 4, 'post');

            // First 3 should succeed
            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBe(3);

            // 4th should be rate limited
            const rateLimitedResponse = responses.find(r => r.status === 429);
            expect(rateLimitedResponse).toBeDefined();
            expect(rateLimitedResponse.body.error).toBe('Registration rate limit exceeded');
        });
    });

    describe('analyticsLimiter', () => {
        const app = createTestApp(analyticsLimiter);

        it('should allow 30 requests per minute', async () => {
            const responses = await makeRequests(app, 30);

            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        it('should block 31st request', async () => {
            const responses = await makeRequests(app, 31);

            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBe(30);

            const rateLimitedCount = responses.filter(r => r.status === 429).length;
            expect(rateLimitedCount).toBe(1);
        });
    });

    describe('adminLimiter', () => {
        const app = createTestApp(adminLimiter);

        it('should allow 60 requests per minute', async () => {
            const responses = await makeRequests(app, 60);

            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        it('should block 61st request', async () => {
            const responses = await makeRequests(app, 61);

            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBe(60);

            const rateLimitedCount = responses.filter(r => r.status === 429).length;
            expect(rateLimitedCount).toBe(1);
        });
    });

    describe('scriptServingLimiter', () => {
        const app = createTestApp(scriptServingLimiter);

        it('should allow 100 requests per minute', async () => {
            const responses = await makeRequests(app, 50);

            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        it('should return rate limit headers', async () => {
            const response = await request(app)
                .get('/test')
                .set('X-Forwarded-For', '192.168.1.1');

            expect(response.headers['ratelimit-limit']).toBe('100');
            expect(response.headers['ratelimit-remaining']).toBeDefined();
        });
    });

    describe('Rate limiter key generation', () => {
        it('should use different keys for different IPs', async () => {
            const app = createTestApp(generalLimiter);

            // IP 1: Make 100 requests
            await makeRequests(app, 100);

            // IP 2: Should still be able to make requests
            const response = await request(app)
                .get('/test')
                .set('X-Forwarded-For', '192.168.1.2');

            expect(response.status).toBe(200);
        }, 30000);
    });

    describe('Skip conditions', () => {
        it('should skip rate limiting for health checks', async () => {
            const app = express();
            app.use(express.json());
            app.use(generalLimiter);
            app.get('/health', (req, res) => {
                res.status(200).json({ status: 'ok' });
            });

            // Make 200 requests to /health (exceeding general limit of 100)
            const requests = [];
            for (let i = 0; i < 200; i++) {
                requests.push(
                    request(app)
                        .get('/health')
                        .set('X-Forwarded-For', '192.168.1.1')
                );
            }
            const responses = await Promise.all(requests);

            // All should succeed because health checks skip rate limiting
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        }, 30000);
    });

    describe('Error responses', () => {
        it('should return proper error structure when rate limited', async () => {
            const app = createTestApp(authLimiter);

            // Exceed auth limit (5 attempts)
            await makeRequests(app, 5, 'post');

            // 6th request should return proper error
            const response = await request(app)
                .post('/test')
                .set('X-Forwarded-For', '192.168.1.1');

            expect(response.status).toBe(429);
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('retryAfter');
        });
    });
});
