# Coolify Deployment Checklist

Bu checklist'i Coolify'da deployment yaparken adım adım takip edin.

## ✅ Ön Hazırlık (Coolify Dashboard)

### 1. PostgreSQL Service Oluştur
```
Coolify → Resources → + New Resource → PostgreSQL 15

Settings:
├─ Name: strastix-postgres
├─ Version: 15-alpine
├─ Database Name: strastix_db
├─ Username: strastix_user
└─ Password: [GÜVENLİ ŞİFRE OLUŞTUR]

⚠️ ÖNEMLİ: Service detay sayfasından şunları not edin:
   - Internal Connection String (örn: postgresql://strastix_user:pass@strastix-postgres:5432/strastix_db)
   - Service Name (örn: strastix-postgres)
```

**Test Et:**
```bash
# Coolify terminal'den test et
psql postgresql://strastix_user:PASSWORD@strastix-postgres:5432/strastix_db -c "SELECT 1"
```

### 2. Redis Service Oluştur
```
Coolify → Resources → + New Resource → Redis 7

Settings:
├─ Name: strastix-redis
├─ Version: 7-alpine
└─ Password: [GÜVENLİ ŞİFRE OLUŞTUR]

⚠️ ÖNEMLİ: Service detay sayfasından şunları not edin:
   - Internal Connection String (örn: redis://:password@strastix-redis:6379)
   - Service Name (örn: strastix-redis)
```

**Test Et:**
```bash
# Coolify terminal'den test et
   redis-cli -h strastix-redis -p 6379 -a PASSWORD ping
```

---

## 🚀 Application Deployment

### 3. Yeni Docker Compose Projesi Oluştur
```
Coolify → Resources → + New Resource → Docker Compose

Git Configuration:
├─ Repository URL: [GIT REPO URL]
├─ Branch: main
├─ Base Directory: TrackLib
└─ Compose File: docker-compose.yml

Build Configuration:
├─ Network: Use Coolify's default network
└─ Coolify Proxy: ✅ Enabled
```

### 4. Environment Variables Ekle

**Coolify → [Projeniz] → Environment Variables → Add Variable**

#### Required Variables (Mutlaka Ekleyin):

```bash
# Database (Adım 1'den alın)
DATABASE_URL=postgresql://strastix_user:PASSWORD@strastix-postgres:5432/strastix_db

# Redis (Adım 2'den alın)
REDIS_URL=redis://:PASSWORD@strastix-redis:6379
REDIS_HOST=strastix-redis
REDIS_PORT=6379
REDIS_PASSWORD=PASSWORD_BURAYA

# Application Secrets
JWT_SECRET=GENERATE_32_CHAR_SECRET_HERE
BACKEND_URL=https://api.yourdomain.com

# Domains
BACKEND_DOMAIN=api.yourdomain.com
FRONTEND_DOMAIN=app.yourdomain.com
TRACKER_DOMAIN=tracker.yourdomain.com
```

**JWT_SECRET Oluştur:**
```bash
# Terminal'de çalıştır:
openssl rand -hex 32
```

#### Optional Variables:

```bash
# Telegram Bot (opsiyonel)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Meta Pixel (opsiyonel)
META_PIXEL_ID=
META_ACCESS_TOKEN=

# Google Ads (opsiyonel)
GOOGLE_ADS_ID=
GOOGLE_API_SECRET=
```

---

## 🌐 DNS Configuration

### 5. Domain Kayıtları Oluştur

**DNS Provider'ınızda (Cloudflare, GoDaddy, vb.):**

```
Type: A Record
Name: api.yourdomain.com
Value: [COOLIFY_SERVER_IP]
TTL: Auto or 3600

Type: A Record
Name: app.yourdomain.com
Value: [COOLIFY_SERVER_IP]
TTL: Auto or 3600

Type: A Record
Name: tracker.yourdomain.com
Value: [COOLIFY_SERVER_IP]
TTL: Auto or 3600
```

**DNS Propagation Kontrol:**
```bash
# Bu komutları terminalden çalıştır:
dig api.yourdomain.com
dig app.yourdomain.com
dig tracker.yourdomain.com

# Hepsi Coolify server IP'sini göstermeli
```

---

## 🔧 Coolify Domain Settings

### 6. Domain'leri Coolify'a Ekle

**Backend:**
```
Coolify → [Projeniz] → backend service → Domains
Domain: api.yourdomain.com
SSL: ✅ Let's Encrypt
```

**Frontend:**
```
Coolify → [Projeniz] → frontend service → Domains
Domain: app.yourdomain.com
SSL: ✅ Let's Encrypt
```

**Tracker:**
```
Coolify → [Projeniz] → tracker service → Domains
Domain: tracker.yourdomain.com
SSL: ✅ Let's Encrypt
```

---

## 🎯 Deploy!

### 7. İlk Deployment

```
Coolify → [Projeniz] → Deploy butonuna tıkla
```

**Build Logs'u İzle:**
- ✅ Backend build başarılı
- ✅ Frontend build başarılı
- ✅ Tracker build başarılı

**Deployment Logs'u İzle:**
- ✅ Backend: "Waiting for database..."
- ✅ Backend: "Running migrations..."
- ✅ Backend: "Starting server..."
- ✅ Backend: "Server started on port 3000"

---

## ✅ Deployment Sonrası Kontroller

### 8. Health Check'leri Test Et

**Backend Health:**
```bash
curl https://api.yourdomain.com/health
# Beklenen: {"status":"ok","timestamp":"...","uptime":123}
```

**Backend Readiness:**
```bash
curl https://api.yourdomain.com/ready
# Beklenen: {"status":"ready","database":"ok","redis":"ok"}
```

**Frontend:**
```bash
curl https://app.yourdomain.com
# Beklenen: HTML response
```

**Tracker:**
```bash
curl https://tracker.yourdomain.com
# Beklenen: HTML response
```

### 9. Container Logs Kontrol

**Backend Logs:**
```
Coolify → [Projeniz] → backend → Logs

Şunları arayın:
✅ "Database is ready!"
✅ "Migrations completed successfully!"
✅ "Server started on port 3000"
✅ "Redis connected successfully" (eğer console'da log varsa)
```

**PostgreSQL Logs:**
```
Coolify → Resources → strastix-postgres → Logs

Şunları arayın:
✅ "database system is ready to accept connections"
```

**Redis Logs:**
```
Coolify → Resources → strastix-redis → Logs

Şunları arayın:
✅ "Ready to accept connections"
```

### 10. Database Migration Status

**Coolify Terminal'den:**
```bash
# Backend container'a gir
cd /app
npx prisma migrate status

# Beklenen çıktı:
# Database schema is up to date!
```

---

## 🔍 Sorun Giderme

### Backend "unhealthy" Hatası

**1. Container loglarını kontrol et:**
```
Coolify → backend service → Logs
```

**Sık Görülen Hatalar:**

| Hata | Çözüm |
|------|-------|
| `Can't reach database server` | DATABASE_URL yanlış veya PostgreSQL servisi çalışmıyor |
| `Redis connection refused` | REDIS_HOST/PASSWORD yanlış veya Redis servisi çalışmıyor |
| `Migration failed` | Database schema hatalı, Prisma migration'ları manuel çalıştır |
| `Port 3000 already in use` | Container'ı restart et |

**2. Environment Variables'ları kontrol et:**
```
Coolify → [Projeniz] → Environment Variables

✅ DATABASE_URL doğru format: postgresql://user:pass@host:5432/db
✅ REDIS_URL doğru format: redis://:password@host:6379
✅ JWT_SECRET minimum 32 karakter
```

**3. Manuel Migration:**
```bash
# Coolify terminal'den backend container'a gir:
cd /app
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### SSL Certificate Hatası

**Çözüm:**
```
1. DNS'in propagate olduğundan emin ol (dig komutu ile test et)
2. Coolify → Domain Settings → "Force SSL Renewal" tıkla
3. Let's Encrypt rate limit'e takılmadığından emin ol (saatte 5 deneme limiti)
```

### Frontend Build Hatası

**Çözüm:**
```
1. Build logs'u kontrol et
2. VITE_API_URL environment variable'ı doğru mu kontrol et
3. npm install sorunsuz çalıştı mı kontrol et
```

---

## 📊 Monitoring

### Container Status
```
Coolify → [Projeniz] → Services

✅ backend: Running (healthy)
✅ frontend: Running (healthy)
✅ tracker: Running (healthy)
```

### Resource Usage
```
Coolify → [Projeniz] → Metrics

CPU Usage: < 50%
Memory Usage: < 70%
```

### Application Logs
```
Coolify → [Projeniz] → [Service] → Logs

Real-time log streaming aktif
```

---

## 🔄 Güncellemeler

### Code Update Sonrası Redeploy

**Otomatik (Git Push):**
```bash
git add .
git commit -m "Update feature"
git push origin main

# Coolify otomatik detect edip redeploy edecek
```

**Manuel:**
```
Coolify → [Projeniz] → Redeploy All
```

---

## ✅ Final Checklist

- [ ] PostgreSQL servisi oluşturuldu ve çalışıyor
- [ ] Redis servisi oluşturuldu ve çalışıyor
- [ ] Environment variables hepsi set edildi
- [ ] DNS kayıtları oluşturuldu ve propagate oldu
- [ ] Domain'ler Coolify'a eklendi
- [ ] SSL sertifikaları active
- [ ] Backend health check başarılı
- [ ] Frontend erişilebilir
- [ ] Tracker erişilebilir
- [ ] Database migration'lar başarıyla çalıştı
- [ ] Container logları hata içermiyor

---

**🎉 Deployment tamamlandı!**

Sorularınız için:
- Coolify Logs
- [COOLIFY-DEPLOYMENT.md](./COOLIFY-DEPLOYMENT.md)
- GitHub Issues
