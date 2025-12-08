# Strastix Tracker - Coolify Deployment Guide

Bu guide, Strastix Tracker'ı **harici PostgreSQL ve Redis** servisleri kullanarak Coolify'da deploy etmeniz için hazırlanmıştır.

## 📋 Ön Gereksinimler

### Coolify'da Oluşturulması Gerekenler:

1. **PostgreSQL Database Service**
   - Coolify Dashboard → Resources → New Resource → PostgreSQL
   - Database Name: `strastix_db`
   - Username: `strastix_user`
   - Password: Güçlü bir şifre belirleyin
   - Not alın: `Connection String` (DATABASE_URL)

2. **Redis Cache Service**
   - Coolify Dashboard → Resources → New Resource → Redis
   - Password: Güçlü bir şifre belirleyin
   - Not alın: `Connection String` (REDIS_URL)

3. **DNS Kayıtları**
   - `api.strastix.com` → Coolify Server IP (A Record)
   - `app.strastix.com` → Coolify Server IP (A Record)
   - `tracker.strastix.com` → Coolify Server IP (A Record)

---

## 🚀 Deployment Adımları

### 1. Coolify'da Yeni Proje Oluştur

```
Project Type: Docker Compose
Git Repository: Your repo URL
Branch: main (veya production)
Base Directory: TrackLib
```

### 2. Environment Variables Ayarla

Coolify UI'da **Environment Variables** sekmesine gidin ve şunları ekleyin:

#### Database & Cache (Harici Servisler)
```bash
DATABASE_URL=postgresql://strastix_user:YOUR_PASSWORD@postgres-service:5432/strastix_db
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@redis-service:6379
REDIS_HOST=redis-service
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
```

> **Not:** `postgres-service` ve `redis-service` isimleri Coolify'ın size vereceği service name'lerdir. Coolify PostgreSQL ve Redis servislerinizin detay sayfasından bulabilirsiniz.

#### Application Secrets
```bash
JWT_SECRET=your_32_char_minimum_secret_here
BACKEND_URL=https://api.strastix.com
```

JWT_SECRET oluşturmak için:
```bash
openssl rand -hex 32
```

#### Domains
```bash
BACKEND_DOMAIN=api.strastix.com
FRONTEND_DOMAIN=app.strastix.com
TRACKER_DOMAIN=tracker.strastix.com
```

#### Optional
```bash
TELEGRAM_BOT_TOKEN=your_bot_token
META_PIXEL_ID=
META_ACCESS_TOKEN=
GOOGLE_ADS_ID=
GOOGLE_API_SECRET=
```

### 3. Docker Compose File Seç

Coolify'da deployment oluştururken:
- **Compose File**: `docker-compose.yml`
- **Use Coolify Proxy**: ✅ Enabled

### 4. Deploy!

**Deploy** butonuna tıklayın. Coolify:
1. Backend, Frontend ve Tracker container'larını build edecek
2. PostgreSQL migration'ları otomatik çalıştıracak (backend Dockerfile'da tanımlı)
3. SSL sertifikalarını Let's Encrypt ile otomatik oluşturacak
4. Traefik reverse proxy ile tüm servisleri expose edecek

---

## 🔍 Deployment Sonrası Kontroller

### 1. Backend Health Check
```bash
curl https://api.strastix.com/health
```
Beklenen: `{"status":"ok"}`

### 2. Frontend Erişimi
Tarayıcıda: `https://app.strastix.com`

### 3. Tracker Test
Tarayıcıda: `https://tracker.strastix.com`

### 4. Database Connection Test
Coolify logs'ta backend servisini kontrol edin:
```
✓ Prisma migrations applied
✓ Backend server started on port 3000
```

### 5. Redis Connection Test
Backend logs'ta:
```
✓ Redis connected successfully
```

---

## 🏗️ Mimari Açıklama

```
                    ┌─────────────────────────────┐
                    │   Coolify Traefik Proxy     │
                    │   (SSL/TLS Termination)     │
                    └──────────┬──────────────────┘
                               │
                ┌──────────────┼──────────────────┐
                │              │                  │
        ┌───────▼──────┐  ┌───▼──────┐  ┌───────▼──────┐
        │   Backend    │  │ Frontend │  │   Tracker    │
        │ (Node.js)    │  │ (React)  │  │  (Nginx)     │
        │  Port 3000   │  │Port 3001 │  │  Port 8082   │
        └───────┬──────┘  └──────────┘  └──────────────┘
                │
        ┌───────┼────────────┐
        │       │            │
   ┌────▼────┐  │    ┌──────▼──────┐
   │ PostgreSQL│  │    │    Redis    │
   │ (External)│  │    │  (External) │
   │  Service  │  │    │   Service   │
   └──────────┘  │    └─────────────┘
                 │
        ┌────────▼────────┐
        │  Prisma ORM     │
        │  Auto Migrations│
        └─────────────────┘
```

### Servis Detayları:

| Servis | Port | Domain | Açıklama |
|--------|------|--------|----------|
| Backend | 3000 | api.strastix.com | Node.js/Express API, Prisma ORM |
| Frontend | 3001 | app.strastix.com | React Dashboard (Nginx) |
| Tracker | 8082 | tracker.strastix.com | Test Casino (Nginx) |
| PostgreSQL | 5432 | Internal | Harici Coolify servisi |
| Redis | 6379 | Internal | Harici Coolify servisi |

---

## 📊 Monitoring & Logs

### Coolify Dashboard'dan Log Takibi:

1. **Backend Logs**
   ```
   Coolify → Your Project → backend service → Logs
   ```
   Kontrol edilmesi gerekenler:
   - ✅ Prisma migration başarılı
   - ✅ Redis bağlantısı başarılı
   - ✅ Server started on port 3000

2. **Frontend Logs**
   ```
   Coolify → Your Project → frontend service → Logs
   ```
   Kontrol edilmesi gerekenler:
   - ✅ Build completed successfully
   - ✅ Nginx started

3. **Database Logs**
   ```
   Coolify → Resources → PostgreSQL → Logs
   ```

4. **Redis Logs**
   ```
   Coolify → Resources → Redis → Logs
   ```

---

## 🔧 Troubleshooting

### Problem: Backend Database Connection Error

**Hata:**
```
Error: Can't reach database server at `postgres-service:5432`
```

**Çözüm:**
1. Coolify PostgreSQL servisinin çalıştığını kontrol edin
2. `DATABASE_URL` environment variable'ının doğru olduğunu kontrol edin
3. Service name'in doğru olduğunu kontrol edin (Coolify service detail sayfasından)

### Problem: Redis Connection Refused

**Hata:**
```
Error: Redis connection refused
```

**Çözüm:**
1. Coolify Redis servisinin çalıştığını kontrol edin
2. `REDIS_PASSWORD` environment variable'ının doğru olduğunu kontrol edin
3. `REDIS_HOST` ve `REDIS_PORT` değerlerini kontrol edin

### Problem: Prisma Migrations Failed

**Hata:**
```
Error: Migration failed to apply
```

**Çözüm:**
1. Backend servisini restart edin (Coolify UI)
2. Prisma migration state'i kontrol edin:
   ```bash
   # Coolify backend container'a bağlan
   npx prisma migrate status
   ```
3. Gerekirse migration'ları manuel çalıştırın:
   ```bash
   npx prisma migrate deploy
   ```

### Problem: SSL Certificate Not Working

**Çözüm:**
1. DNS kayıtlarının propagate olduğunu kontrol edin:
   ```bash
   dig api.strastix.com
   dig app.strastix.com
   dig tracker.strastix.com
   ```
2. Coolify Traefik logs'u kontrol edin
3. Let's Encrypt rate limit'e takılmadığınızı kontrol edin

---

## 🔄 Güncelleme ve Yeniden Deploy

### Git Push ile Otomatik Deploy:

```bash
git add .
git commit -m "Update backend API"
git push origin main
```

Coolify otomatik olarak:
1. Yeni commit'i algılar
2. Container'ları yeniden build eder
3. Zero-downtime deployment yapar
4. Health check'leri kontrol eder

### Manuel Redeploy (Coolify UI):

```
Coolify → Your Project → Redeploy All
```

---

## 🔐 Güvenlik Best Practices

1. **Environment Variables**
   - ✅ Asla `.env` dosyasını git'e commit etmeyin
   - ✅ Güçlü şifreler kullanın (min 32 karakter)
   - ✅ JWT_SECRET'i production'da mutlaka değiştirin

2. **Database**
   - ✅ PostgreSQL kullanıcısı sadece gerekli yetkilere sahip olsun
   - ✅ Düzenli backup alın (Coolify otomatik backup ayarları)
   - ✅ Database connection limit ayarlayın

3. **Redis**
   - ✅ Redis password kullanın
   - ✅ Sadece internal network'ten erişim
   - ✅ Persistence ayarlarını kontrol edin

4. **SSL/TLS**
   - ✅ Coolify otomatik SSL yenileme (Let's Encrypt)
   - ✅ HTTPS-only mode aktif
   - ✅ HSTS headers enabled

---

## 📈 Scaling (İleri Seviye)

Coolify'da horizontal scaling için:

1. **Backend Scaling**
   ```
   Coolify → backend service → Scale → Replicas: 3
   ```

2. **Database Connection Pool**
   Backend'de `.env`:
   ```bash
   DATABASE_POOL_SIZE=20
   ```

3. **Redis Clustering** (Coolify Pro)
   Redis Cluster mode ile yüksek availability

---

## 📞 Destek

Sorun yaşarsanız:

1. Coolify logs'u kontrol edin
2. GitHub Issues: [Your repo issues]
3. Coolify Discord: https://discord.gg/coolify

---

## 📝 Notlar

- **Veritabanı ve Redis servisleri Coolify'da ayrı oluşturulmalı** (docker-compose.yml içinde yok)
- **Backup stratejisi:** Coolify PostgreSQL servisi otomatik backup yapıyor
- **SSL sertifikaları:** Traefik otomatik yeniliyor (Let's Encrypt)
- **Zero-downtime deployment:** Coolify built-in olarak destekliyor

---

**Son Güncelleme:** 2024-12-08
**Versiyon:** 1.0.0
