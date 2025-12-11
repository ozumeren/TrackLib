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
├── tracker/          # Test casino demo page
└── docker-compose.yml
```

## 🔧 Deployment (Coolify)

### Quick Start

**📖 Detaylı deployment guide için:** [DEPLOYMENT.md](./DEPLOYMENT.md)

### Deployment Özeti

**PostgreSQL ve Redis docker-compose.yml içinde embedded olarak geliyor!**

1. **Coolify'da Proje Oluştur:**
   - Type: Docker Compose
   - Repository: Your Git URL
   - Base Directory: `TrackLib`

2. **Environment Variables Ayarla (sadece 2 tane gerekli!):**
   ```env
   POSTGRES_PASSWORD=your_strong_password
   JWT_SECRET=your_32_char_secret
   ```

3. **Deploy!**
   - PostgreSQL, Redis, Backend, Frontend, Test Casino otomatik başlar
   - SSL sertifikaları otomatik oluşur

### Deployment Dosyaları
- `docker-compose.yml` - Production deployment (PostgreSQL + Redis embedded)
- `DEPLOYMENT.md` - Detaylı deployment guide
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
| **PostgreSQL** | 5432 | Embedded | Database (docker-compose içinde) |
| **Redis** | 6379 | Embedded | Cache (docker-compose içinde) |
| **Backend** | 3000 | Container | Node.js API Server |
| **Frontend** | 3001 | Container | React Dashboard (Nginx) |
| **Test Casino** | 80 | Container | Demo Casino Page (Nginx) |

**Not:** Tüm servisler tek `docker-compose.yml` içinde ve aynı network'te çalışır.

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
