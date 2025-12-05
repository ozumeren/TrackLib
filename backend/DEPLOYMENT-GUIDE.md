# 🚀 Rona Tracker v3.0 - Production Deployment Guide

## 📋 Ön Gereksinimler

- ✅ Node.js (v16+)
- ✅ PostgreSQL database
- ✅ Redis
- ✅ Backend server hazır ve çalışıyor
- ✅ Domain/subdomain (örn: tracker.yourdomain.com)

---

## 🎯 Deployment Adımları

### ADIM 1: Customer Kaydı Oluştur

Backend klasöründe:

```bash
cd TrackLib/backend
node setup-rona-customer.js
```

**İnteraktif sorular:**
```
Customer Name: Rona Casino  (Enter = default)
Admin User Name: Rona Admin
Admin Email: admin@rona.com
Admin Password: [güvenli-şifre]
Allowed Domains: ronabet.com,www.ronabet.com
```

**Çıktı:**
```
✅ Rona customer başarıyla oluşturuldu!

📋 CUSTOMER BİLGİLERİ:
Customer ID:      1
Script ID:        rona_tracker
API Key:          trk_rona_abc123...
Allowed Domains:  ronabet.com, www.ronabet.com

🔗 Script URL:
http://localhost:3000/c/rona_tracker.js
```

**⚠️ ÖNEMLİ:** API Key'i kaydedin! (Database'de de saklanıyor)

---

### ADIM 2: DOM Config Yükle

```bash
node update-rona-config.js rona_tracker
```

**Çıktı:**
```
✅ Müşteri bulundu: Rona Casino (ID: 1)
✅ Config dosyası okundu: 5 rule bulundu
✅ Database başarıyla güncellendi!

📋 Yüklenen Rule'lar:
  1. Deposit Button Click
  2. Withdrawal Button Click
  3. Bonus Claim Button Click
  4. Deposit Amount Input
  5. Withdrawal Amount Input
```

---

### ADIM 3: Backend'i Yeniden Başlat

Backend'de değişiklikler yaptık, restart gerekiyor:

```bash
# Development
npm start

# Production (PM2 ile)
pm2 restart backend

# Production (systemd ile)
sudo systemctl restart tracklib-backend
```

**Kontrol et:**
```bash
curl http://localhost:3000/health

# Çıktı:
{
  "status": "ok",
  "timestamp": "2025-12-05T12:00:00.000Z",
  "uptime": 123.45
}
```

---

### ADIM 4: Script'i Test Et (Local)

#### 4.1 Test Sayfasını Aç

```bash
# Browser'da
open test-rona-tracking.html

# Ya da
http://localhost:3000/test-rona-tracking.html
```

#### 4.2 Console'da Script'i Kontrol Et

Browser console'da:
```javascript
// Tracker yüklendi mi?
console.log(window.tracker);

// Status kontrol
tracker.getStatus();

// Manuel event test
tracker.track('test_event', { test: true });
```

**Beklenen çıktı:**
```
✓ Strastix v3.0 RONA Edition initialized for rona_tracker
✓ Available as: window.Strastix and window.tracker
✓ Features: Login/Logout, Wallet/Balance, Deposit, Bonus, Game Tracking
```

---

### ADIM 5: Production URL Ayarla

#### 5.1 Backend .env Dosyasını Güncelle

```bash
nano .env
```

```env
# Backend URL (HTTPS kullan!)
BACKEND_URL=https://tracker.yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tracklib

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret (değiştir!)
JWT_SECRET=super-secret-key-12345

# Port
PORT=3000
HTTPS_PORT=3443
```

#### 5.2 HTTPS Sertifikası (Let's Encrypt)

```bash
# Certbot kurulu değilse
sudo apt install certbot

# Sertifika oluştur
sudo certbot certonly --standalone -d tracker.yourdomain.com

# Backend'e kopyala
sudo cp /etc/letsencrypt/live/tracker.yourdomain.com/fullchain.pem ./cert.pem
sudo cp /etc/letsencrypt/live/tracker.yourdomain.com/privkey.pem ./key.pem
sudo chown $USER:$USER cert.pem key.pem
```

#### 5.3 Nginx Reverse Proxy (Opsiyonel)

```nginx
# /etc/nginx/sites-available/tracker
server {
    listen 80;
    listen 443 ssl http2;
    server_name tracker.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/tracker.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tracker.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### ADIM 6: Rona Sitesine Entegre Et

#### 6.1 Script Tag'ini Ekle

Ronabet.com'un HTML'inde `<head>` bölümüne:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rona Casino</title>

    <!-- ✅ RONA TRACKER v3.0 -->
    <script src="https://tracker.yourdomain.com/c/rona_tracker.js" async></script>

    <!-- Diğer script'ler -->
</head>
<body>
    ...
</body>
</html>
```

#### 6.2 Test Et

Ronabet.com'u ziyaret edin ve F12 > Console:

```
✓ Strastix v3.0 RONA Edition initialized for rona_tracker
✓ Available as: window.Strastix and window.tracker
```

#### 6.3 Login Test

1. Ronabet'e login yapın
2. Console'da:

```
✓ RONA Login detected: username (ID: 12345)
✓ Strastix RONA: login_successful sent
```

---

### ADIM 7: Event'leri Kontrol Et

#### Backend'de Event'leri Görüntüle

```bash
# PostgreSQL'e bağlan
psql -d tracklib

# Son 10 event
SELECT
  "eventName",
  "playerId",
  "createdAt",
  "parameters"
FROM "Event"
WHERE "customerId" = 1
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Beklenen event'ler:**
```
page_view
login_successful
wallet_updated
payment_methods_loaded
deposit_button_clicked
deposit_initiated
deposit_successful
game_session_started
game_bet_placed
game_session_ended
```

---

## 🔒 Güvenlik Kontrol Listesi

- [ ] HTTPS kullanılıyor
- [ ] CORS allowedDomains doğru ayarlandı
- [ ] JWT_SECRET değiştirildi
- [ ] Database şifresi güçlü
- [ ] API rate limiting aktif
- [ ] Firewall kuralları ayarlandı
- [ ] Backup sistemi kuruldu

---

## 📊 Monitoring

### PM2 ile Process Monitoring

```bash
# Backend'i PM2 ile başlat
pm2 start index.js --name tracklib-backend

# Monitoring
pm2 monit

# Logs
pm2 logs tracklib-backend

# Auto-restart on system boot
pm2 startup
pm2 save
```

### Database Monitoring

```sql
-- Event count by day
SELECT
  DATE("createdAt") as date,
  COUNT(*) as total_events
FROM "Event"
WHERE "customerId" = 1
GROUP BY DATE("createdAt")
ORDER BY date DESC
LIMIT 7;

-- Most common events
SELECT
  "eventName",
  COUNT(*) as count
FROM "Event"
WHERE "customerId" = 1
GROUP BY "eventName"
ORDER BY count DESC;
```

---

## 🐛 Troubleshooting

### Problem 1: Script yüklenmiyor

**Kontrol:**
```bash
# Script endpoint'ini test et
curl https://tracker.yourdomain.com/c/rona_tracker.js

# CORS header'larını kontrol et
curl -H "Origin: https://ronabet.com" -I https://tracker.yourdomain.com/c/rona_tracker.js
```

**Çözüm:**
- Backend çalışıyor mu? `pm2 status`
- Port açık mı? `netstat -tulpn | grep 3000`
- CORS allowedDomains doğru mu?

### Problem 2: Event'ler backend'e gitmiyor

**Console'da:**
```javascript
tracker.getStatus()
```

**Network tab:**
- POST https://tracker.yourdomain.com/api/e
- Status: 200 OK

**Çözüm:**
- API Key doğru mu?
- CORS policy engellemiyor mu?
- Rate limit aşıldı mı?

### Problem 3: Game tracking çalışmıyor

**Console'da:**
```javascript
tracker.getGameSession()
// null dönüyorsa oyun henüz başlamadı
```

**Çözüm:**
- Bir oyun açıp spin yap
- Console'da "game_session_started" mesajını bekle
- Farklı sağlayıcı URL'lerini kontrol et

---

## 📝 Rollback Plan

Bir sorun çıkarsa eski haline dön:

```bash
# Git commit'i geri al
git revert HEAD

# Backend'i restart et
pm2 restart tracklib-backend

# Database'i restore et
pg_restore -d tracklib backup.dump
```

---

## 🎉 Deployment Tamamlandı!

Kontrol listesi:
- ✅ Customer kaydı oluşturuldu
- ✅ DOM config yüklendi
- ✅ Backend güncellendi
- ✅ HTTPS ayarlandı
- ✅ Script Rona'ya entegre edildi
- ✅ Event'ler geliyor
- ✅ Monitoring kuruldu

**Production URL:**
```
https://tracker.yourdomain.com/c/rona_tracker.js
```

**Dashboard URL:**
```
https://tracker.yourdomain.com/
```

---

## 📞 Destek

Sorular için:
- Backend logs: `pm2 logs tracklib-backend`
- Database logs: `sudo journalctl -u postgresql`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`

**Happy Tracking! 🚀**
