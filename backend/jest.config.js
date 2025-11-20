// jest.config.js
module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Test file patterns
    testMatch: [
        '**/__tests__/**/*.test.js',
        '**/*.test.js'
    ],

    // Coverage configuration
    collectCoverageFrom: [
        'services/**/*.js',
        'middleware/**/*.js',
        'validators/**/*.js',
        'utils/**/*.js',
        '!**/__tests__/**',
        '!**/node_modules/**'
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50
        }
    },

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

    // Timeout for tests
    testTimeout: 10000,

    // Verbose output
    verbose: true,

    // Clear mocks between tests
    clearMocks: true,

    // Force exit after tests complete
    forceExit: true,

    // Detect open handles
    detectOpenHandles: true
};
