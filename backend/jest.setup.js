// jest.setup.js
// Global test setup and configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock console methods to reduce noise
global.console = {
    ...console,
    log: jest.fn(), // Mock console.log
    debug: jest.fn(), // Mock console.debug
    info: jest.fn(), // Mock console.info
    warn: jest.fn(), // Mock console.warn
    // Keep error for debugging failed tests
    error: console.error,
};

// Global test timeout
jest.setTimeout(10000);
