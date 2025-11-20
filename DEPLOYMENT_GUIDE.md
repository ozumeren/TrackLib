# TrackLib Deployment Guide

## Environment Setup

### Backend Configuration

1. **Create `.env` file in `/backend` directory:**

```bash
cd backend
cp .env.example .env
```

2. **Edit `.env` file with your configuration:**

```env
# Server Configuration
PORT=3000
HTTPS_PORT=3443
NODE_ENV=production

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tracklib?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Application URLs
# Replace with your actual domain or IP
BACKEND_URL=http://your-domain.com:3000
FRONTEND_URL=http://your-domain.com

# External Services (Optional)
TELEGRAM_BOT_TOKEN=
META_PIXEL_ID=
GOOGLE_ADS_ID=
```

### Frontend Configuration

1. **Create `.env` file in `/frontend` directory:**

```bash
cd frontend
cp .env.example .env
```

2. **Edit `.env` file:**

```env
# Backend API URL
VITE_API_BASE_URL=http://your-domain.com:3000
```

## Production Deployment Checklist

### Security
- ✅ Change `JWT_SECRET` to a strong random string
- ✅ Update `BACKEND_URL` to your production domain
- ✅ Set `NODE_ENV=production`
- ✅ Configure HTTPS with valid SSL certificates (not self-signed)
- ✅ Update CORS settings if needed in `backend/index.js`

### Database
- ✅ Update `DATABASE_URL` with production PostgreSQL credentials
- ✅ Run database migrations: `npx prisma migrate deploy`
- ✅ Set up automated database backups

### Performance
- ✅ Configure Redis for production use
- ✅ Set up database connection pooling
- ✅ Enable gzip compression
- ✅ Configure CDN for static assets (optional)

### Monitoring
- ✅ Set up error logging (e.g., Sentry)
- ✅ Configure application monitoring (e.g., Prometheus)
- ✅ Set up uptime monitoring

## Development vs Production

| Environment Variable | Development | Production |
|---------------------|-------------|------------|
| `BACKEND_URL` | `http://localhost:3000` | `https://api.yourdomain.com` |
| `VITE_API_BASE_URL` | `http://localhost:3000` | `https://api.yourdomain.com` |
| `NODE_ENV` | `development` | `production` |
| `JWT_SECRET` | Default (insecure) | Strong random string |

## Quick Start

### Development

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with local settings
npm run dev

# Frontend (in new terminal)
cd frontend
npm install
cp .env.example .env
# Edit .env with local settings
npm run dev
```

### Production

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with production settings
npm run build
npm start

# Frontend
cd frontend
npm install
cp .env.example .env
# Edit .env with production settings
npm run build
# Serve the dist/ folder with nginx or similar
```

## Notes

- Never commit `.env` files to version control
- Always use HTTPS in production
- Rotate `JWT_SECRET` periodically
- Keep database credentials secure
- Monitor application logs for suspicious activity
