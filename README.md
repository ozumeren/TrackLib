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

### 1. Create New Resource
- **Type**: Docker Compose
- **Repository**: https://github.com/ozumeren/TrackLib
- **Branch**: main
- **Compose File**: docker-compose.coolify.yml

### 2. Environment Variables

```env
# Database (auto-created by compose)
POSTGRES_USER=strastix_user
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=strastix_db

# Backend
JWT_SECRET=<32-char-secret>
BACKEND_URL=https://api.strastix.com
TELEGRAM_BOT_TOKEN=<optional>
```

### 3. Domains
- Backend: `api.strastix.com`
- Frontend: `dashboard.strastix.com` or `strastix.com`

### 4. Deploy
Click **Deploy** - Coolify will:
- ✅ Start PostgreSQL + Redis
- ✅ Build & run backend (port 3000)
- ✅ Build & run frontend (port 80)
- ✅ Run Prisma migrations
- ✅ Setup SSL with Let's Encrypt

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

- **PostgreSQL**: Database (internal port 5432)
- **Redis**: Caching & rate limiting (internal port 6379)
- **Backend**: API server (port 3000)
- **Frontend**: Dashboard UI (port 80)

All services communicate via `strastix-network` internal Docker network.

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
