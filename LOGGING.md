# Logging System Documentation

## Overview

The application now includes a comprehensive logging system built with:
- **Winston** - Structured logging framework
- **Morgan** - HTTP request logging middleware

## Features

✅ **Structured Logging** - Timestamps, log levels, metadata
✅ **Multiple Transports** - Console, files, error-specific logs
✅ **HTTP Request Logging** - All API requests logged
✅ **Centralized Error Handling** - Consistent error responses
✅ **Log Rotation** - Automatic log file rotation (10MB max)
✅ **Environment-Based** - Different logging in dev vs production

---

## Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| `error` | Critical errors requiring immediate attention | Database connection failed |
| `warn` | Warning conditions that should be reviewed | Rate limit approaching |
| `info` | General informational messages | Server started, user logged in |
| `debug` | Detailed debugging information | Variable values, function calls |

**Default Level:** `info` (can be changed via `LOG_LEVEL` env variable)

---

## Log Files

All logs are stored in `/backend/logs/` directory:

| File | Contains | Rotation |
|------|----------|----------|
| `combined.log` | All log levels | 10MB, keep 5 files |
| `error.log` | Only error-level logs | 10MB, keep 5 files |

**Note:** Logs directory is automatically created and excluded from Git.

---

## Using the Logger

### Basic Usage

```javascript
const logger = require('./utils/logger');

// Different log levels
logger.error('Database connection failed', { error: err.message });
logger.warn('Rate limit approaching for user', { userId: 123 });
logger.info('User logged in successfully', { email: 'user@example.com' });
logger.debug('Processing payment', { amount: 100, currency: 'USD' });
```

### With Metadata

```javascript
logger.info('Payment processed', {
    userId: 123,
    amount: 100,
    currency: 'USD',
    paymentMethod: 'card'
});
```

### Logging Errors with Stack Traces

```javascript
try {
    // Some operation
} catch (error) {
    logger.error('Operation failed:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
    });
}
```

---

## HTTP Request Logging

All HTTP requests are automatically logged with:
- HTTP method (GET, POST, etc.)
- URL path
- Status code
- Response time
- IP address

### Development Mode
Uses Morgan's `dev` format - colorized, concise output:
```
GET /api/users 200 15.234 ms - 1024
```

### Production Mode
Uses Morgan's `combined` format - Apache-style logs written to files:
```
192.168.1.1 - - [20/Nov/2024:10:30:45 +0000] "GET /api/users HTTP/1.1" 200 1024 "-" "Mozilla/5.0"
```

---

## Error Handling

### Centralized Error Handler

All errors are caught and logged by the centralized error handler:

```javascript
// Automatically handles errors from async routes
app.get('/api/users', async (req, res) => {
    // If this throws an error, it's automatically caught and logged
    const users = await prisma.user.findMany();
    res.json(users);
});
```

### Error Response Format

**Development:**
```json
{
    "error": "Database query failed",
    "stack": "Error: Database query failed\n    at ..."
}
```

**Production:**
```json
{
    "error": "Database query failed"
}
```

### Special Error Handling

The error handler provides specific handling for:

| Error Type | Status Code | Response |
|------------|-------------|----------|
| Prisma errors (P*) | 400 | Database operation failed |
| JWT errors | 401 | Invalid/expired token |
| Validation errors | 400 | Validation failed |
| Not Found | 404 | Route not found |
| Generic errors | 500 | Internal server error |

---

## Configuration

### Environment Variables

```bash
# .env file
LOG_LEVEL=info          # error, warn, info, debug
NODE_ENV=production     # Changes logging format
```

### Log Levels by Environment

| Environment | Default Level | Format |
|-------------|---------------|--------|
| Development | `debug` | Colorized, verbose |
| Production | `info` | Combined, file-based |

---

## Monitoring & Analysis

### Viewing Logs in Real-Time

**Console output (development):**
```bash
npm run dev
```

**Tail log files:**
```bash
# All logs
tail -f backend/logs/combined.log

# Only errors
tail -f backend/logs/error.log

# Follow with grep
tail -f backend/logs/combined.log | grep ERROR
```

### Searching Logs

**Find all errors for a specific user:**
```bash
grep "userId.*123" backend/logs/error.log
```

**Find all 500 errors:**
```bash
grep "500" backend/logs/combined.log
```

**Count errors by type:**
```bash
grep "ERROR" backend/logs/combined.log | cut -d':' -f3 | sort | uniq -c
```

---

## Best Practices

### ✅ DO

```javascript
// Include context
logger.info('User created', { userId: user.id, email: user.email });

// Log errors with full details
logger.error('Payment failed', {
    error: err.message,
    userId: req.user.id,
    amount: payment.amount
});

// Use appropriate log levels
logger.debug('Cache hit', { key: cacheKey });  // Not logger.info()
```

### ❌ DON'T

```javascript
// Don't log sensitive data
logger.info('User logged in', { password: user.password }); // ❌

// Don't use console.log
console.log('User created');  // ❌ Use logger.info() instead

// Don't log excessive data
logger.info('All users', { users: allUsers }); // ❌ Too much data
```

### Sensitive Data to Avoid

- Passwords (plaintext or hashed)
- API keys and tokens
- Credit card numbers
- Social security numbers
- Full session data

---

## Troubleshooting

### Logs not appearing in files

**Check if logs directory exists:**
```bash
ls -la backend/logs/
```

**Check file permissions:**
```bash
chmod 755 backend/logs/
```

### Too many log files

**Adjust rotation settings in `utils/logger.js`:**
```javascript
new winston.transports.File({
    filename: 'combined.log',
    maxsize: 5242880,  // 5MB instead of 10MB
    maxFiles: 3        // Keep 3 files instead of 5
})
```

### Log files too large

**Enable compression (requires winston-daily-rotate-file):**
```bash
npm install winston-daily-rotate-file
```

---

## Integration with External Services

### Sending Logs to External Services

**Example: Sentry integration**
```javascript
const Sentry = require('@sentry/node');

// In utils/logger.js
logger.on('error', (err) => {
    Sentry.captureException(err);
});
```

**Example: CloudWatch Logs**
```javascript
const WinstonCloudWatch = require('winston-cloudwatch');

logger.add(new WinstonCloudWatch({
    logGroupName: 'tracklib-backend',
    logStreamName: 'production'
}));
```

---

## Maintenance

### Log Cleanup

**Manual cleanup:**
```bash
# Delete logs older than 30 days
find backend/logs/ -name "*.log" -mtime +30 -delete
```

**Automated cleanup (cron job):**
```bash
# Add to crontab
0 0 * * * find /path/to/backend/logs/ -name "*.log" -mtime +30 -delete
```

### Backup Logs

```bash
# Compress and backup weekly
tar -czf logs-backup-$(date +%Y%m%d).tar.gz backend/logs/
```

---

## Performance Considerations

- Log rotation prevents disk space issues
- Async writes don't block application
- Console logging disabled in production (optional)
- Consider log sampling for high-traffic routes

---

## Next Steps

1. ✅ Basic logging implemented
2. ⏭️ Add log aggregation (ELK stack, Datadog)
3. ⏭️ Set up alerting based on error patterns
4. ⏭️ Create log analysis dashboard
5. ⏭️ Implement request ID tracking for distributed tracing
