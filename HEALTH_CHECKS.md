# Health Check Endpoints

## Overview

Two health check endpoints have been added to monitor application health and readiness:

1. **`/health`** - Basic liveness check
2. **`/ready`** - Detailed readiness check with dependency validation

## Endpoints

### 1. GET `/health` - Liveness Probe

**Purpose:** Quick check to verify the server is running and responsive.

**Use Cases:**
- Load balancer health checks
- Monitoring systems (Uptime monitoring)
- Quick status verification

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-11-20T10:30:45.123Z",
  "uptime": 3600.5,
  "environment": "production"
}
```

**Example Usage:**
```bash
curl http://localhost:3000/health
```

**What it checks:**
- ✅ Server is running and accepting requests
- ✅ Event loop is responsive

**What it doesn't check:**
- ❌ Database connectivity
- ❌ Redis connectivity
- ❌ External service availability

---

### 2. GET `/ready` - Readiness Probe

**Purpose:** Comprehensive check to verify the application is ready to handle traffic.

**Use Cases:**
- Kubernetes readiness probes
- Container orchestration (Docker Swarm, ECS)
- Pre-deployment validation
- Continuous monitoring

**Response (200 OK) - All systems operational:**
```json
{
  "status": "ready",
  "checks": {
    "server": "ok",
    "database": "ok",
    "redis": "ok",
    "timestamp": "2024-11-20T10:30:45.123Z"
  }
}
```

**Response (503 Service Unavailable) - System not ready:**
```json
{
  "status": "not_ready",
  "checks": {
    "server": "ok",
    "database": "error",
    "redis": "ok",
    "timestamp": "2024-11-20T10:30:45.123Z",
    "databaseError": "Connection refused at localhost:5432"
  }
}
```

**Example Usage:**
```bash
curl http://localhost:3000/ready
```

**What it checks:**
- ✅ Server is running
- ✅ PostgreSQL database is accessible (executes `SELECT 1`)
- ✅ Redis is accessible (executes `PING`)

---

## Usage in Different Environments

### Docker Compose

```yaml
services:
  backend:
    image: tracklib-backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Kubernetes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: tracklib-backend
spec:
  containers:
  - name: backend
    image: tracklib-backend
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 15
      periodSeconds: 20
      timeoutSeconds: 5
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 10
      timeoutSeconds: 3
      failureThreshold: 3
```

### Nginx Load Balancer

```nginx
upstream backend {
    server backend1:3000 max_fails=3 fail_timeout=30s;
    server backend2:3000 max_fails=3 fail_timeout=30s;

    # Health check configuration
    check interval=3000 rise=2 fall=3 timeout=1000 type=http;
    check_http_send "GET /health HTTP/1.0\r\n\r\n";
    check_http_expect_alive http_2xx;
}
```

### Monitoring Tools

**Prometheus:**
```yaml
scrape_configs:
  - job_name: 'tracklib-backend'
    metrics_path: '/ready'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000']
```

**UptimeRobot / Pingdom:**
- URL: `https://your-domain.com/health`
- Method: GET
- Expected Response: 200 OK
- Check Interval: 5 minutes

---

## Testing

### Manual Testing

**Test basic health check:**
```bash
curl -i http://localhost:3000/health
```

**Test readiness check:**
```bash
curl -i http://localhost:3000/ready
```

**Test readiness with jq (pretty JSON):**
```bash
curl -s http://localhost:3000/ready | jq
```

### Automated Testing

**Shell script to verify deployment:**
```bash
#!/bin/bash

# Wait for server to be ready
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ready)

    if [ $RESPONSE -eq 200 ]; then
        echo "✅ Server is ready!"
        exit 0
    fi

    echo "⏳ Waiting for server... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

echo "❌ Server failed to become ready"
exit 1
```

---

## Best Practices

### When to Use Each Endpoint

| Endpoint | Purpose | Frequency | Timeout |
|----------|---------|-----------|---------|
| `/health` | Verify server is alive | Every 10-30s | 1-3s |
| `/ready` | Verify app can handle traffic | Every 30-60s | 3-5s |

### Recommendations

1. **Use `/health` for:**
   - Load balancer health checks
   - Quick uptime monitoring
   - Liveness probes in orchestration

2. **Use `/ready` for:**
   - Readiness probes before routing traffic
   - Pre-deployment verification
   - Dependency validation
   - Post-deployment smoke tests

3. **Set appropriate timeouts:**
   - `/health` should respond in < 100ms
   - `/ready` may take 1-3s due to database checks

4. **Monitor both endpoints:**
   - Alert on `/health` failures (server down)
   - Alert on `/ready` failures (degraded service)

---

## Troubleshooting

### `/health` returns 503 or no response

**Problem:** Server is down or not accepting connections

**Solutions:**
- Check if the server process is running
- Verify port 3000 is not blocked by firewall
- Check server logs for crash errors
- Verify environment variables are set

### `/ready` returns 503 with database error

**Problem:** Cannot connect to PostgreSQL

**Solutions:**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check DATABASE_URL in .env
echo $DATABASE_URL

# Restart database
docker-compose restart postgres
```

### `/ready` returns 503 with Redis error

**Problem:** Cannot connect to Redis

**Solutions:**
```bash
# Check if Redis is running
docker-compose ps redis

# Test Redis connection
redis-cli ping

# Restart Redis
docker-compose restart redis
```

---

## CI/CD Integration

### GitHub Actions

```yaml
- name: Wait for server
  run: |
    timeout 60 bash -c 'until curl -f http://localhost:3000/ready; do sleep 2; done'

- name: Run health check
  run: |
    curl -f http://localhost:3000/health || exit 1
```

### GitLab CI

```yaml
test:
  script:
    - npm start &
    - sleep 10
    - curl -f http://localhost:3000/ready || exit 1
```

---

## Response Codes

| Endpoint | Status | Code | Meaning |
|----------|--------|------|---------|
| `/health` | Healthy | 200 | Server is running |
| `/ready` | Ready | 200 | All dependencies OK |
| `/ready` | Not Ready | 503 | One or more dependencies failed |

---

## Security Considerations

- Health check endpoints are **publicly accessible** (no authentication required)
- They expose minimal information (uptime, status)
- Consider rate limiting in production if abused
- Monitor for DDoS attacks on health endpoints
- Use internal endpoints for detailed diagnostics

---

## Next Steps

1. ✅ Health checks implemented
2. ⏭️ Add monitoring integration (Prometheus metrics)
3. ⏭️ Set up alerting rules
4. ⏭️ Create runbook for health check failures
5. ⏭️ Add custom health checks for external APIs
