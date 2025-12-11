#!/usr/bin/env node
// List all API endpoints
// Run with: node list-endpoints.js

console.log('📋 Backend API Endpoints\n');
console.log('=====================================\n');

console.log('🔓 PUBLIC ENDPOINTS:');
console.log('  GET  /health                    - Health check');
console.log('  GET  /ready                     - Readiness check');
console.log('  GET  /api                       - API documentation');
console.log('  GET  /scripts/:scriptId.js      - Get tracking script');
console.log('  GET  /c/:scriptId.js            - Get tracking script (short)');
console.log('  GET  /tracker/:apiKey.js        - Get tracker by API key');
console.log('');

console.log('🔐 AUTHENTICATION:');
console.log('  POST /api/auth/register         - Register new user');
console.log('  POST /api/auth/login            - Login');
console.log('  GET  /api/auth/me               - Get current user');
console.log('');

console.log('👤 USER MANAGEMENT:');
console.log('  GET  /api/users                 - List users (Admin/Owner)');
console.log('  POST /api/users                 - Create user (Owner)');
console.log('  PUT  /api/users/:id             - Update user (Owner)');
console.log('  DELETE /api/users/:id           - Delete user (Owner)');
console.log('');

console.log('🏢 CUSTOMER MANAGEMENT:');
console.log('  GET  /api/customers             - List customers (Admin)');
console.log('  GET  /api/customers/current     - Get current customer');
console.log('  POST /api/customers             - Create customer (Admin)');
console.log('  PUT  /api/customers/domains     - Update domains (Owner)');
console.log('  GET  /api/customers/domains     - Get domains');
console.log('');

console.log('📊 EVENT TRACKING:');
console.log('  POST /api/e                     - Track event (API Key required)');
console.log('  POST /api/events                - Track event (alternative)');
console.log('  GET  /api/events                - List events');
console.log('  GET  /api/events/stats          - Event statistics');
console.log('  GET  /api/events/unique-players - Unique players count');
console.log('');

console.log('🎮 PLAYER MANAGEMENT:');
console.log('  GET  /api/players               - List players');
console.log('  GET  /api/players/:id           - Get player details');
console.log('  GET  /api/players/:id/journey   - Player journey');
console.log('  GET  /api/players/:id/events    - Player events');
console.log('  GET  /api/players/stats         - Player statistics');
console.log('  POST /api/players/:playerId/connect-telegram - Connect Telegram');
console.log('');

console.log('🎯 SEGMENTS:');
console.log('  GET  /api/segments              - List segments');
console.log('  POST /api/segments              - Create segment');
console.log('  GET  /api/segments/:id          - Get segment');
console.log('  PUT  /api/segments/:id          - Update segment');
console.log('  DELETE /api/segments/:id        - Delete segment');
console.log('  POST /api/segments/:id/refresh  - Refresh segment');
console.log('  GET  /api/segments/:id/players  - Segment players');
console.log('');

console.log('📋 RULES ENGINE:');
console.log('  GET  /api/rules                 - List rules');
console.log('  POST /api/rules                 - Create rule');
console.log('  GET  /api/rules/:id             - Get rule');
console.log('  PUT  /api/rules/:id             - Update rule');
console.log('  DELETE /api/rules/:id           - Delete rule');
console.log('  POST /api/rules/:id/execute     - Execute rule manually');
console.log('  GET  /api/rules/:id/executions  - Rule executions');
console.log('');

console.log('📈 ANALYTICS:');
console.log('  GET  /api/analytics/overview    - Overview stats');
console.log('  GET  /api/analytics/events      - Event analytics');
console.log('  GET  /api/analytics/players     - Player analytics');
console.log('  GET  /api/analytics/funnel      - Funnel analysis');
console.log('  GET  /api/analytics/cohort      - Cohort analysis');
console.log('');

console.log('🚨 FRAUD DETECTION:');
console.log('  GET  /api/fraud/alerts          - List fraud alerts');
console.log('  GET  /api/fraud/alerts/:id      - Get alert details');
console.log('  PUT  /api/fraud/alerts/:id      - Update alert status');
console.log('  GET  /api/fraud/risk-profiles   - List risk profiles');
console.log('');

console.log('🔧 ADMIN:');
console.log('  GET  /api/admin/stats           - System statistics');
console.log('  GET  /api/admin/health          - Detailed health check');
console.log('');

console.log('🤖 WEBHOOKS:');
console.log('  POST /telegram-webhook          - Telegram webhook');
console.log('');

console.log('=====================================');
console.log('\n💡 Tips:');
console.log('  - Use /api/auth/register to create first user');
console.log('  - Use /api/auth/login to get JWT token');
console.log('  - Add "Authorization: Bearer <token>" header for protected routes');
console.log('  - Public tracking uses "X-API-Key" header');
console.log('');
