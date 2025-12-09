# 🚀 Coolify Quick Start Guide

**5 dakikada deploy edin!**

## ✅ Ön Gereksinim

- Coolify instance'ınız hazır
- Git repository'niz Coolify'dan erişilebilir
- 3 domain hazır (veya subdomain)

---

## 📋 Adım 1: Coolify'da Proje Oluştur

```
Coolify Dashboard → + New Resource → Docker Compose

Git Repository:
├─ URL: [Your Git URL]
├─ Branch: main
├─ Base Directory: TrackLib
└─ Compose File: docker-compose.yml

✅ Save
```

---

## 🔐 Adım 2: Environment Variables Ekle

**Coolify → Your Project → Environment Variables → Bulk Add**

Aşağıdaki tüm değişkenleri kopyalayıp yapıştırın:

```bash
# Database Credentials
# ⚠️ POSTGRES_PASSWORD mutlaka değiştirin!
POSTGRES_USER=strastix_user
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE_min16chars
POSTGRES_DB=strastix_db

# JWT Secret (32+ karakter)
# ⚠️ Mutlaka değiştirin! Aşağıdaki komutu çalıştırın:
# openssl rand -hex 32
JWT_SECRET=YOUR_32_CHAR_MINIMUM_SECRET_HERE_CHANGE_THIS

# ℹ️ Domains are hardcoded in docker-compose.yml:
# - test.strastix.com    (Test Casino)
# - api.strastix.com     (Backend API)
# - strastix.com         (Frontend Panel)

# Optional: Telegram Bot
TELEGRAM_BOT_TOKEN=

# ℹ️ Not: DATABASE_URL otomatik oluşturulur:
# postgresql://strastix_user:YOUR_PASSWORD@postgres:5432/strastix_db
```

**JWT_SECRET oluştur:**
```bash
# Terminal'de:
openssl rand -hex 32
```

---

## 🌐 Adım 3: DNS Ayarları

DNS provider'ınızda (Cloudflare, GoDaddy, etc.):

```
Type: A
Host: strastix.com (veya @)
Value: [COOLIFY_SERVER_IP]

Type: A
Host: api.strastix.com (veya api)
Value: [COOLIFY_SERVER_IP]

Type: A
Host: test.strastix.com (veya test)
Value: [COOLIFY_SERVER_IP]
```

**Propagation kontrolü:**
```bash
dig strastix.com
dig api.strastix.com
dig test.strastix.com
# Hepsi Coolify IP'sini göstermeli
```

---

## 🎯 Adım 4: Deploy!

```
Coolify → Your Project → Deploy butonuna tıkla
```

**Logları izle:**
- ✅ PostgreSQL starting...
- ✅ Redis starting...
- ✅ Backend: "Waiting for database..."
- ✅ Backend: "Migrations completed successfully!"
- ✅ Backend: "Server started on port 3000"

**Süre:** ~3-5 dakika

---

## ✅ Adım 5: Test Et

**Backend Health:**
```bash
curl https://api.strastix.com/health
# Expected: {"status":"ok",...}
```

**Frontend Panel:**
```bash
curl https://strastix.com
# Expected: HTML response (React Dashboard)
```

**Test Casino:**
```bash
curl https://test.strastix.com
# Expected: HTML response (Rona API Simulator)
```

---

## 🎉 Başarılı!

Şimdi şunlara erişebilirsiniz:
- 📊 Frontend Panel: `https://strastix.com`
- 🔌 Backend API: `https://api.strastix.com`
- 🧪 Test Casino: `https://test.strastix.com`

---

## 🔧 Sorun mu Yaşıyorsunuz?

### Backend unhealthy hatası:

**1. Container logs kontrol:**
```
Coolify → backend service → Logs
```

**2. Environment variables kontrol:**
```
Coolify → Environment Variables
✅ POSTGRES_PASSWORD set edilmiş mi?
✅ JWT_SECRET set edilmiş mi?
```

**3. Database migration:**
```bash
# Backend container'a gir (Coolify terminal):
cd /app
npx prisma migrate deploy
```

### DNS hatası:

```bash
# Propagation kontrolü:
dig api.yourdomain.com

# Coolify IP'sini görmiyorsa, 5-10 dakika bekle
```

### SSL hatası:

```
Coolify → Domains → Force SSL Renewal
```

---

## 📚 Daha Fazla Bilgi

- **Detaylı deployment:** [COOLIFY-DEPLOYMENT.md](./COOLIFY-DEPLOYMENT.md)
- **Checklist:** [COOLIFY-CHECKLIST.md](./COOLIFY-CHECKLIST.md)
- **README:** [README.md](./README.md)

---

## 🔄 Güncelleme Yapmak

```bash
# Code değişikliği sonrası:
git push origin main

# Coolify otomatik redeploy yapacak
# veya manuel:
# Coolify → Your Project → Redeploy
```

---

**💡 İpucu:** İlk deployment'ta SSL sertifikası oluşturulacak, 1-2 dakika sürebilir.
