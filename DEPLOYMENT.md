# Strastix - Coolify Deployment Guide

Complete guide for deploying the Strastix tracking and analytics system on Coolify.

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Coolify + Traefik                 │
│              (Automatic SSL/TLS Routing)            │
└─────────────────────────────────────────────────────┘
           │                │                │
           ▼                ▼                ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │   Frontend   │  │   Backend    │  │Test Casino   │
   │ (Dashboard)  │  │     API      │  │  Demo Page   │
   │              │  │              │  │              │
   │ strastix.com │  │api.strastix  │  │test.strastix │
   │              │  │     .com     │  │     .com     │
   │ Nginx:3001   │  │ Node:3000    │  │  Nginx:80    │
   └──────────────┘  └──────┬───────┘  └──────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
       ┌────────────┐              ┌────────────┐
       │ PostgreSQL │              │   Redis    │
       │   :5432    │              │   :6379    │
       └────────────┘              └────────────┘
```

## Services Overview

| Service      | Purpose                      | Port  | Domain              |
|--------------|------------------------------|-------|---------------------|
| Frontend     | Admin Dashboard (React)      | 3001  | strastix.com        |
| Backend      | API Server (Node.js/Express) | 3000  | api.strastix.com    |
| Test Casino  | Demo Casino Page (Static)    | 80    | test.strastix.com   |
| PostgreSQL   | Database                     | 5432  | Internal only       |
| Redis        | Cache & Rate Limiting        | 6379  | Internal only       |

## Prerequisites

1. **Coolify Instance** running and accessible
2. **Domain Names** configured:
   - `strastix.com` → Frontend
   - `api.strastix.com` → Backend
   - `test.strastix.com` → Test Casino Demo
3. **DNS Records** pointing to your Coolify server
4. **Git Repository** accessible to Coolify

## Step 1: Create New Service in Coolify

1. Go to your Coolify dashboard
2. Click **"New Service"**
3. Select **"Docker Compose"**
4. Choose your Git repository
5. Set the **Working Directory** to: `TrackLib`
6. Set **Branch** to: `main` (or your deployment branch)

## Step 2: Configure Environment Variables

In Coolify UI, add the following environment variables:

### Required Variables

```bash
# Database Password (generate strong password)
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# JWT Secret (generate: openssl rand -base64 64)
JWT_SECRET=YOUR_JWT_SECRET_MIN_32_CHARS
```

### Optional Variables (if using custom domains)

```bash
BACKEND_DOMAIN=api.strastix.com
FRONTEND_DOMAIN=strastix.com
TEST_CASINO_DOMAIN=test.strastix.com
```

### Optional Integrations

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Meta Pixel
META_PIXEL_ID=your_pixel_id
META_ACCESS_TOKEN=your_access_token

# Google Ads
GOOGLE_ADS_ID=your_ads_id
GOOGLE_API_SECRET=your_api_secret
```

## Step 3: Configure Domains in Coolify

For each service, add domains:

1. **Backend Service**
   - Domain: `api.strastix.com`
   - Port: `3000`
   - Enable SSL/TLS

2. **Frontend Service**
   - Domain: `strastix.com`
   - Port: `3001`
   - Enable SSL/TLS

3. **Test Casino Service**
   - Domain: `test.strastix.com`
   - Port: `80`
   - Enable SSL/TLS

## Step 4: Deploy

1. Click **"Deploy"** in Coolify
2. Monitor deployment logs
3. Wait for all services to become healthy

### Expected Deployment Timeline

- PostgreSQL: ~10-15 seconds
- Redis: ~5-10 seconds
- Backend: ~90-120 seconds (includes migrations)
- Frontend: ~30-60 seconds (build time)
- Test Casino: ~5-10 seconds

## Step 5: Verify Deployment

### Health Check Endpoints

```bash
# Backend API
curl https://api.strastix.com/health
# Expected: {"status":"ok"}

# Frontend
curl https://strastix.com
# Expected: HTML response

# Test Casino Demo
curl https://test.strastix.com/health
# Expected: healthy
```

### Service Logs

Check logs in Coolify for each service:

```bash
# Backend should show:
✅ Database is ready!
✅ Redis is ready!
✅ Migrations completed successfully!
🚀 Starting Node.js application...
```

## Troubleshooting

### Backend Not Starting

**Problem**: Backend container keeps restarting

**Solutions**:
1. Check environment variables are set:
   ```bash
   # In Coolify logs, look for:
   ❌ ERROR: DATABASE_URL is not set!
   ❌ ERROR: JWT_SECRET is not set!
   ```

2. Check database connection:
   ```bash
   # Backend logs should show:
   ✅ Database is ready!
   ```

3. Check migration status:
   ```bash
   # SSH into backend container
   docker exec -it strastix-backend sh
   npx prisma migrate status
   ```

### PostgreSQL Authentication Failed

**Problem**: `P1000: Authentication failed against database server`

**Solution**: This usually happens when `POSTGRES_PASSWORD` contains special characters.

**Fix**:
1. Use only these characters in password: `A-Z`, `a-z`, `0-9`, `_` (underscore)
2. Avoid special characters: `@ # ! % & * ( ) = + [ ] { } | \ / ? < > , . ; : ' " \``
3. Example good password: `MyStr0ng_P4ssw0rd_2024`
4. In Coolify, update `POSTGRES_PASSWORD` environment variable
5. Redeploy

### Database Migration Errors

**Problem**: Migration fails on first deployment

**Solution**: The startup script automatically handles this:
- Checks migration status
- Retries failed migrations
- Validates schema before proceeding

If migrations still fail, manually resolve:
```bash
docker exec -it strastix-backend sh
npx prisma migrate deploy
```

### Redis Authentication Error

**Problem**: `NOAUTH Authentication required` or `ReplyError: NOAUTH`

**Solution**: This is already fixed in the latest docker-compose.yml.

**Verify**:
1. Make sure you're using the latest code from Git
2. Redis should have `--protected-mode no` in command
3. Backend environment should have `REDIS_PASSWORD=""`

If still occurring:
```bash
# Check Redis is running without password
docker exec strastix-redis redis-cli ping
# Should return: PONG
```

### Redis Connection Issues

**Problem**: Backend warns about Redis timeout

**Solution**: Redis timeout is non-critical. Backend will continue without cache.

To fix:
1. Check Redis container is running
2. Verify Redis health check passes
3. Check internal network connectivity

### SSL/TLS Certificate Issues

**Problem**: Domain shows SSL error

**Solutions**:
1. Ensure DNS is propagated (use `dig` or `nslookup`)
2. Verify domain is correctly configured in Coolify
3. Check Traefik logs for certificate generation
4. Wait up to 5 minutes for Let's Encrypt

### Frontend Shows "API Not Available"

**Problem**: Frontend can't connect to backend

**Solutions**:
1. Verify backend domain is correct in `.env`:
   ```bash
   BACKEND_DOMAIN=api.strastix.com
   ```

2. Check CORS configuration in backend
3. Verify backend is accessible:
   ```bash
   curl https://api.strastix.com/health
   ```

## Database Management

### Access PostgreSQL

```bash
# SSH into Coolify server
docker exec -it strastix-postgres psql -U strastix_user -d strastix_db
```

### Backup Database

```bash
# Create backup
docker exec strastix-postgres pg_dump -U strastix_user strastix_db > backup.sql

# Restore backup
cat backup.sql | docker exec -i strastix-postgres psql -U strastix_user strastix_db
```

### View Database Size

```bash
docker exec strastix-postgres psql -U strastix_user -d strastix_db -c "\l+"
```

## Monitoring

### Check Service Status

```bash
# All services
docker ps | grep strastix

# Individual service logs
docker logs strastix-backend --tail 100 -f
docker logs strastix-frontend --tail 100 -f
docker logs strastix-test-casino --tail 100 -f
docker logs strastix-postgres --tail 100 -f
docker logs strastix-redis --tail 100 -f
```

### View Resource Usage

```bash
docker stats strastix-backend strastix-frontend strastix-test-casino strastix-postgres strastix-redis
```

### Backend Application Logs

```bash
# Logs are persisted in volume
docker exec strastix-backend cat /app/logs/combined.log
docker exec strastix-backend tail -f /app/logs/error.log
```

## Scaling & Performance

### Increase Redis Memory

Edit `docker-compose.yml`:
```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### PostgreSQL Performance Tuning

For high-traffic deployments, add to PostgreSQL environment:
```yaml
postgres:
  environment:
    POSTGRES_INITDB_ARGS: "-E UTF8 --locale=C"
    # Add these for performance
    POSTGRES_SHARED_BUFFERS: "256MB"
    POSTGRES_EFFECTIVE_CACHE_SIZE: "1GB"
    POSTGRES_WORK_MEM: "16MB"
```

### Backend Scaling

Coolify supports horizontal scaling. To run multiple backend instances:
1. Go to backend service settings
2. Increase replica count
3. Traefik automatically load balances

## Updates & Redeployment

### Deploy New Version

1. Push changes to Git repository
2. In Coolify: Click **"Redeploy"**
3. Coolify will:
   - Pull latest code
   - Rebuild containers
   - Run migrations automatically
   - Zero-downtime deployment

### Manual Rebuild

```bash
# Force rebuild specific service
docker-compose up -d --build backend
```

## Security Checklist

- [x] PostgreSQL not exposed to internet (internal network only)
- [x] Redis not exposed to internet (internal network only)
- [x] Strong POSTGRES_PASSWORD set
- [x] JWT_SECRET is 32+ characters
- [x] SSL/TLS enabled on all public domains
- [x] CORS configured in backend
- [x] Rate limiting enabled (via Redis)
- [x] Health checks configured
- [x] Logs directory has proper permissions

## Support & Documentation

### Backend API Documentation
- Endpoint: `https://api.strastix.com/api-docs` (if Swagger enabled)
- Health: `https://api.strastix.com/health`

### Test Casino Demo Integration
- Visit: `https://test.strastix.com`
- Check browser console for tracking events
- Events appear in backend API

### Common Commands

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# View environment variables
docker exec strastix-backend printenv

# Run Prisma Studio (database GUI)
docker exec -it strastix-backend npx prisma studio

# Generate new migration
docker exec -it strastix-backend npx prisma migrate dev --name migration_name
```

## Production Checklist

Before going live:

- [ ] All environment variables set correctly
- [ ] Strong passwords for POSTGRES_PASSWORD and JWT_SECRET
- [ ] DNS configured for all three domains
- [ ] SSL certificates active on all domains
- [ ] Backend health check returns 200
- [ ] Frontend loads without errors
- [ ] Test Casino demo page loads and sends events
- [ ] Database migrations completed successfully
- [ ] Redis connection established
- [ ] Logs are clean (no errors)
- [ ] Test user login on frontend
- [ ] Test event tracking on demo page
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured

## Architecture Decisions

### Why Embedded PostgreSQL/Redis?

- **Simplicity**: Single docker-compose.yml for everything
- **Reliability**: No external dependencies
- **Security**: Database not exposed to internet
- **Cost**: No separate database hosting fees
- **Performance**: Same network as backend (low latency)

### Why Named Volumes?

- **Data Persistence**: Survives container restarts
- **Easy Backups**: Can be backed up separately
- **Portability**: Can be migrated to another server

### Why Traefik Labels?

- **Automatic Routing**: Coolify uses Traefik
- **SSL/TLS**: Let's Encrypt certificates automatic
- **Load Balancing**: Built-in if scaling services
- **Path Routing**: Can add path-based routing if needed

## Next Steps

1. **Configure Tracking Script**: Update casino site with script ID
2. **Create Admin User**: Use frontend to create first user
3. **Set Up Rules**: Configure automation rules in dashboard
4. **Monitor Events**: Check event tracking is working
5. **Set Up Segments**: Create player segments
6. **Configure Integrations**: Add Telegram/Meta/Google if needed

---

**Need Help?**
- Check Coolify logs for deployment errors
- Review backend startup logs for migration issues
- Test each service individually using health endpoints
- Verify DNS and SSL certificate status
