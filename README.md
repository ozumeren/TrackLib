# Strastix Analytics Platform

Full-stack iGaming analytics platform with event tracking, segmentation, and fraud detection.

## 🚀 Stack

- **Backend**: Node.js + Express + Prisma + PostgreSQL + Redis
- **Frontend**: React 19 + Vite + Mantine UI
- **Tracker**: Vanilla JavaScript client-side scripts
- **Deployment**: Docker + Coolify

## 📦 Structure

```
.
├── backend/          # API server
├── frontend/         # Dashboard UI
├── tracker/          # Client tracking scripts
└── docker-compose.coolify.yml
```

## 🔧 Deployment (Coolify)

### Quick Start

**📖 Detaylı deployment guide için:** [COOLIFY-DEPLOYMENT.md](./COOLIFY-DEPLOYMENT.md)

### Deployment Özeti

1. **Coolify'da Harici Servisler Oluştur:**
   - PostgreSQL Database Service
   - Redis Cache Service

2. **Proje Oluştur:**
   - Type: Docker Compose
   - Repository: Your Git URL
   - Branch: main
   - Base Directory: `TrackLib`
   - Compose File: `docker-compose.yml`

3. **Environment Variables Ayarla:**
   ```env
   # Harici Database & Redis (Coolify servisleri)
   DATABASE_URL=postgresql://user:pass@postgres-service:5432/db
   REDIS_URL=redis://:password@redis-service:6379
   REDIS_HOST=redis-service
   REDIS_PORT=6379
   REDIS_PASSWORD=your_password

   # Application
   JWT_SECRET=<32-char-secret>
   BACKEND_URL=https://api.strastix.com

   # Domains
   BACKEND_DOMAIN=api.strastix.com
   FRONTEND_DOMAIN=app.strastix.com
   TRACKER_DOMAIN=tracker.strastix.com
   ```

4. **Deploy & Monitor:**
   - Coolify otomatik olarak build edip deploy eder
   - SSL sertifikaları otomatik oluşturulur
   - Health check'ler aktif olur

### Deployment Dosyaları
- `docker-compose.yml` - Ana deployment configuration (harici DB/Redis kullanır)
- `docker-compose.coolify.yml` - Eski versiyon (embedded DB/Redis - kullanılmıyor)
- `.env.example` - Environment variables template

## 🏃 Local Development

```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## 📡 Services

| Service | Port | Type | Description |
|---------|------|------|-------------|
| **PostgreSQL** | 5432 | External | Coolify Database Service (harici) |
| **Redis** | 6379 | External | Coolify Cache Service (harici) |
| **Backend** | 3000 | Container | Node.js API Server |
| **Frontend** | 3001 | Container | React Dashboard (Nginx) |
| **Tracker** | 8082 | Container | Test Casino (Nginx) |

**Not:** PostgreSQL ve Redis, `docker-compose.yml` içinde tanımlı değil. Coolify'da ayrı servisler olarak oluşturulmalı.

## 🔐 Features

- Multi-tracker support (Default, Pronet, Ebetlab)
- Real-time event tracking
- Dynamic segmentation engine
- Rules engine with 20+ trigger types
- Fraud detection (IP conflicts, risk profiles)
- Player journey visualization
- Multi-currency support
- Telegram notifications
- Ad platform integrations (Meta, Google)

## 📝 License

Proprietary - Strastix Analytics Platform
