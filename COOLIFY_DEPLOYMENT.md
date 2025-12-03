# 🚀 Coolify Deployment Guide

## Ön Hazırlık

### 1. Git Repository'yi Hazırla

```bash
# Projeyi Git'e push et
git add .
git commit -m "Add Coolify deployment configs"
git push origin main
```

### 2. Eski Server'dan Backup Al

```bash
# PostgreSQL backup
ssh root@37.27.72.40
pg_dump -U postgres tracklib > /tmp/tracklib_backup.sql

# Backup'ı indir
scp root@37.27.72.40:/tmp/tracklib_backup.sql ./backup/
```

---

## 📦 Coolify'da Deployment

### Adım 1: Yeni Server'a Coolify Kur

```bash
# Yeni servera bağlan
ssh root@YENI_SERVER_IP

# Coolify'ı kur
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

**Coolify UI:** `http://YENI_SERVER_IP:8000`

---

### Adım 2: Coolify UI'da Proje Oluştur

1. **Coolify Dashboard** → `+ New Resource` → `Docker Compose`

2. **Repository Bilgilerini Gir:**
   - Repository: `https://github.com/KULLANICI/tracklib.git`
   - Branch: `main`
   - Docker Compose Path: `/docker-compose.coolify.yml`

3. **Environment Variables Ekle:**

Coolify UI'da `.env` bölümüne şunları ekle:

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=GUCLU_SIFRE_BURAYA
POSTGRES_DB=tracklib
DATABASE_URL=postgresql://postgres:GUCLU_SIFRE_BURAYA@postgres:5432/tracklib

# Redis
REDIS_URL=redis://redis:6379

# Backend
NODE_ENV=production
PORT=3000
HTTPS_PORT=3443
BACKEND_URL=https://DOMAIN.COM

# JWT Secret (ÖNEMLİ: Değiştir!)
JWT_SECRET=rastgele-uzun-gizli-anahtar-buraya

# Telegram (Opsiyonel)
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

4. **Deploy Et:**
   - `Deploy` butonuna tıkla
   - Deployment loglarını izle

---

### Adım 3: Database'i Restore Et

Deployment tamamlandıktan sonra:

```bash
# Postgres container'a bağlan
docker exec -i tracklib-postgres psql -U postgres tracklib < backup/tracklib_backup.sql

# Veya Coolify üzerinden:
# 1. Coolify → Resources → tracklib-postgres → Shell
# 2. Backup dosyasını upload et ve restore et
```

---

### Adım 4: SSL Sertifikası Ekle (HTTPS için)

#### Seçenek A: Let's Encrypt (Önerilen)

Coolify otomatik Let's Encrypt desteği var:

1. **Coolify → Settings → Domains**
2. Domain ekle: `api.tracklib.com`
3. **Enable SSL** ✅
4. Coolify otomatik olarak sertifika alacak

#### Seçenek B: Self-Signed (Test için)

```bash
# Backend container'a bağlan
docker exec -it tracklib-backend sh

# Self-signed sertifika oluştur
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=TR/ST=Istanbul/L=Istanbul/O=TrackLib/CN=tracklib.com"
```

---

### Adım 5: Port Forwarding ve Firewall

```bash
# Firewall ayarları (Coolify server'da)
ufw allow 3000/tcp  # HTTP Backend
ufw allow 3443/tcp  # HTTPS Backend
ufw allow 80/tcp    # Frontend HTTP
ufw allow 443/tcp   # Frontend HTTPS
ufw reload
```

---

## 🧪 Test Etme

### 1. Backend Health Check

```bash
# HTTP test
curl http://YENI_SERVER_IP:3000/health

# HTTPS test
curl -k https://YENI_SERVER_IP:3443/health
```

Başarılı response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-29T15:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

### 2. Database Test

```bash
curl http://YENI_SERVER_IP:3000/ready
```

Başarılı response:
```json
{
  "status": "ready",
  "checks": {
    "server": "ok",
    "database": "ok",
    "redis": "ok"
  }
}
```

### 3. Tracker Script Test

```bash
curl http://YENI_SERVER_IP:3000/s/tracklib_eren.js | head -20
```

Config'in inject edilmiş olması gerekir:
```javascript
const config = {
  "scriptId": "tracklib_eren",
  "apiKey": "trk_...",
  "backendUrl": "https://DOMAIN.COM/v1/events"
};
```

### 4. Event Tracking Test

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "api_key":"trk_f156cf7049620a16b135eae03c0d1eee",
    "session_id":"test_session_12345",
    "event_name":"test_event",
    "parameters":{}
  }' \
  http://YENI_SERVER_IP:3000/v1/events
```

Başarılı response:
```json
{"success": true}
```

---

## 🔧 Troubleshooting

### Logları Görüntüleme

```bash
# Coolify UI'dan:
# Resources → tracklib-backend → Logs

# Veya Docker komutlarıyla:
docker logs -f tracklib-backend
docker logs -f tracklib-postgres
docker logs -f tracklib-redis
```

### Container Durumu

```bash
docker ps | grep tracklib
docker compose -f docker-compose.coolify.yml ps
```

### Database Bağlantı Testi

```bash
docker exec -it tracklib-postgres psql -U postgres -d tracklib -c "SELECT COUNT(*) FROM \"Customer\";"
```

### Redis Testi

```bash
docker exec -it tracklib-redis redis-cli ping
# Response: PONG
```

---

## 📊 Monitoring (Coolify Built-in)

Coolify otomatik olarak şunları izler:
- ✅ Container health checks
- ✅ CPU/Memory kullanımı
- ✅ Disk kullanımı
- ✅ Network trafiği

**Dashboard:** Coolify UI → Resources → tracklib

---

## 🔄 Güncelleme (Update)

```bash
# Git'e yeni değişiklikleri push et
git add .
git commit -m "Update backend"
git push origin main

# Coolify otomatik olarak deploy eder (Auto-deploy aktifse)
# Veya manuel:
# Coolify UI → Resources → tracklib → Redeploy
```

---

## 🗑️ Eski Server'ı Temizleme

Yeni sistem çalıştıktan sonra:

```bash
# Eski servera bağlan
ssh root@37.27.72.40

# Servisleri durdur
pm2 stop all
pm2 delete all

# Veya Docker ise:
docker compose down
```

---

## 📞 Destek

Sorun yaşarsan:
1. Coolify loglarını kontrol et
2. Backend loglarını kontrol et: `docker logs tracklib-backend`
3. Health endpoint'i kontrol et: `/health` ve `/ready`

**İyi Deploymentlar!** 🚀
