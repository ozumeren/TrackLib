# 🚀 Strastix.com Coolify Deployment Guide

## ✅ Ön Kontroller

- ✅ Domain: strastix.com (DNS yönlendirmesi yapıldı)
- ✅ Server'da Coolify kurulu
- ✅ Git Repository: https://github.com/ozumeren/TrackLib.git

---

## 📋 Coolify'da Deployment Adımları

### 1️⃣ Yeni Resource Oluştur

1. **Coolify Dashboard** aç (http://SERVER_IP:8000)
2. **Projects** → **+ New Resource**
3. **Docker Compose** seç

### 2️⃣ Repository Ayarları

**Git Repository:**
```
Repository URL: https://github.com/ozumeren/TrackLib.git
Branch: main
Docker Compose Path: docker-compose.coolify.yml
```

### 3️⃣ Environment Variables

Coolify'da `.env` tab'ına aşağıdaki değişkenleri ekle:

```bash
# ==========================================
# DATABASE CONFIGURATION
# ==========================================
POSTGRES_USER=strastix_user
POSTGRES_PASSWORD=lsab7vqg51
POSTGRES_DB=strastix_db
DATABASE_URL=postgresql://strastix_user:lsab7vqg51@postgres:5432/strastix_db

# ==========================================
# REDIS CONFIGURATION
# ==========================================
REDIS_URL=redis://redis:6379

# ==========================================
# BACKEND CONFIGURATION
# ==========================================
NODE_ENV=production
PORT=3000
HTTPS_PORT=3443
BACKEND_URL=https://api.strastix.com

# ==========================================
# JWT SECRET (ÖNEMLİ: DEĞİŞTİR!)
# ==========================================
JWT_SECRET=strastix_236790ae1384b190c20e9e41fc102515

# ==========================================
# TELEGRAM BOT (Opsiyonel)
# ==========================================
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_if_needed

# ==========================================
# FRONTEND CONFIGURATION
# ==========================================
VITE_API_URL=https://api.strastix.com
```

### 4️⃣ Domain Ayarları

Coolify'da domain ayarlarını yap:

**Backend (API):**
- Domain: `api.strastix.com`
- Port: 3000
- SSL: ✅ Enable (Let's Encrypt)

**Frontend (Dashboard):**
- Domain: `app.strastix.com` veya `strastix.com`
- Port: 80
- SSL: ✅ Enable (Let's Encrypt)

### 5️⃣ Deploy Et

1. **Deploy** butonuna tıkla
2. Deployment loglarını izle
3. Tüm container'ların başarıyla ayağa kalkmasını bekle

---

## 🧪 Test & Doğrulama

### Backend Health Check

```bash
# Health endpoint
curl https://api.strastix.com/health

# Beklenen response:
{
  "status": "ok",
  "timestamp": "2024-12-03T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### Database & Redis Check

```bash
curl https://api.strastix.com/ready

# Beklenen response:
{
  "status": "ready",
  "checks": {
    "server": "ok",
    "database": "ok",
    "redis": "ok"
  }
}
```

### Tracker Script Test

```bash
# Script endpoint test
curl https://api.strastix.com/s/YOUR_SCRIPT_ID.js | head -20

# Config inject edilmiş olmalı:
# backendUrl: "https://api.strastix.com/v1/events"
```

### Event Tracking Test

```bash
curl -X POST https://api.strastix.com/v1/events \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "session_id": "test_session_123",
    "event_name": "test_event",
    "parameters": {"test": true}
  }'

# Beklenen response:
{"success": true}
```

---

## 🔐 DNS Ayarları

DNS provider'ınızda (Cloudflare, Namecheap, vs.) aşağıdaki kayıtları ekleyin:

```
A Record:
Name: api.strastix.com
Value: SERVER_IP_ADDRESS
TTL: 300 (veya Auto)

A Record:
Name: app.strastix.com (veya @)
Value: SERVER_IP_ADDRESS
TTL: 300 (veya Auto)
```

**Cloudflare kullanıyorsanız:**
- Proxy status: ☁️ Proxied (SSL/TLS şifreleme için)
- SSL/TLS mode: Full (strict) önerilen

---

## 🔧 Firewall Ayarları

Server'da gerekli portları aç:

```bash
# Coolify server'a SSH ile bağlan
ssh root@SERVER_IP

# UFW firewall kuralları
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw allow 3000/tcp   # Backend HTTP (opsiyonel)
ufw allow 3443/tcp   # Backend HTTPS (opsiyonel)
ufw allow 8000/tcp   # Coolify UI
ufw reload

# Durum kontrolü
ufw status
```

---

## 📊 Monitoring & Logs

### Coolify Dashboard'dan Log İzleme

1. **Coolify UI** → **Resources**
2. İlgili servisi seç (backend/postgres/redis)
3. **Logs** tab'ına tıkla
4. Real-time logları izle

### Docker Komutlarıyla Log İzleme

```bash
# Backend logs
docker logs -f strastix-backend

# PostgreSQL logs
docker logs -f strastix-postgres

# Redis logs
docker logs -f strastix-redis

# Tüm container'lar
docker ps | grep strastix
```

### Backend Log Dosyaları

```bash
# Container içindeki log dosyalarını görüntüle
docker exec -it strastix-backend sh
tail -f logs/combined.log
tail -f logs/error.log
```

---

## 🗄️ Database İşlemleri

### Backup Alma

```bash
# PostgreSQL backup
docker exec strastix-postgres pg_dump -U strastix_user strastix_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Backup Restore Etme

```bash
# Backup dosyasını restore et
docker exec -i strastix-postgres psql -U strastix_user strastix_db < backup_20241203_120000.sql
```

### Database Migration

```bash
# Yeni migration çalıştır
docker exec strastix-backend npx prisma migrate deploy
```

---

## 🔄 Güncelleme & Yeniden Deploy

### Kod Güncellemesi

```bash
# Local'de değişiklikleri yap
# Git'e commit et
git add .
git commit -m "Update: feature description"
git push origin main

# Coolify'da:
# 1. Otomatik deploy aktifse bekle
# 2. Manuel ise: Resources → Redeploy butonuna tıkla
```

### Rolling Update (Zero Downtime)

Coolify otomatik olarak zero-downtime deployment yapar:
1. Yeni container build edilir
2. Health check geçerse
3. Eski container kapatılır
4. Yeni container trafiği alır

---

## 🚨 Troubleshooting

### Container Başlamıyor

```bash
# Container durumunu kontrol et
docker ps -a | grep strastix

# Logs'a bak
docker logs strastix-backend

# Container'ı manuel başlat
docker start strastix-backend
```

### Database Bağlantı Hatası

```bash
# PostgreSQL bağlantısını test et
docker exec -it strastix-postgres psql -U strastix_user -d strastix_db

# DATABASE_URL'yi kontrol et (Coolify env variables)
```

### SSL Sertifika Sorunu

```bash
# Coolify'da domain ayarlarını kontrol et
# SSL: Enable
# Let's Encrypt: Auto

# DNS propagation kontrolü
nslookup api.strastix.com
```

### Redis Bağlantı Hatası

```bash
# Redis'in çalıştığını kontrol et
docker exec strastix-redis redis-cli ping
# Response: PONG

# Redis URL'yi kontrol et
echo $REDIS_URL
```

---

## 📝 Örnek Customer Ayarları

Dashboard'da yeni customer oluştururken:

**JavaScript Integration:**
```html
<!-- Sitenize eklenecek kod -->
<script src="https://api.strastix.com/s/strastix_CUSTOMER_ID.js"></script>
<script>
  Strastix.init();
  Strastix.track('page_view', { page: 'home' });
</script>
```

**Webhook URL (opsiyonel):**
```
https://your-game-server.com/strastix-webhook
```

---

## 🎯 Production Checklist

Deploy etmeden önce kontrol et:

- [ ] ✅ DNS kayıtları doğru yapılandırılmış (api.strastix.com)
- [ ] ✅ SSL sertifikaları çalışıyor (Let's Encrypt)
- [ ] ✅ Environment variables ayarlandı (.env)
- [ ] ✅ JWT_SECRET değiştirildi (güçlü şifre)
- [ ] ✅ POSTGRES_PASSWORD değiştirildi
- [ ] ✅ Health endpoints test edildi (/health, /ready)
- [ ] ✅ Event tracking test edildi
- [ ] ✅ Firewall kuralları uygulandı
- [ ] ✅ Backup stratejisi belirlendi
- [ ] ✅ Monitoring/alerting ayarlandı (Coolify)
- [ ] ✅ Log rotation yapılandırıldı

---

## 📞 Support & İletişim

**Coolify Dokümantasyon:**
https://coolify.io/docs

**Strastix GitHub:**
https://github.com/ozumeren/TrackLib

**Sorun Yaşarsan:**
1. Coolify logs'a bak
2. Container logs'a bak
3. Health endpoints'i test et
4. GitHub'da issue aç

---

## 🎉 Başarılı Deployment Sonrası

Tebrikler! Strastix başarıyla deploy edildi.

**Erişim URL'leri:**
- 🔌 API: https://api.strastix.com
- 📊 Dashboard: https://app.strastix.com
- 📈 Health: https://api.strastix.com/health
- ✅ Ready: https://api.strastix.com/ready

**Artık yapabileceklerin:**
1. Dashboard'a giriş yap
2. İlk customer'ı oluştur
3. Tracker script'i web sitenize ekle
4. Real-time analytics'i izle
5. A/B testleri oluştur
6. Segment'ler tanımla

**Başarılı deploymentlar!** 🚀
