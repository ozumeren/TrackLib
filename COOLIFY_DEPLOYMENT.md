# 🚀 Coolify Deployment Guide - Sabit Scriptler

## 📋 Ön Hazırlık

Coolify'da projenizi deploy etmeden önce environment variable'ları ayarlayın.

## 🔧 Environment Variables (Coolify Dashboard)

Coolify dashboard'unuzda **Environment** sekmesine gidin ve şu variable'ları ekleyin:

### Temel Ayarlar

```env
# Database
DATABASE_URL=postgresql://user:password@postgres-host:5432/tracklib_db

# Redis (Coolify Redis service kullanıyorsanız)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Server
PORT=3000
NODE_ENV=production
BACKEND_URL=https://your-domain.com  # Coolify'ın verdiği public URL

# JWT Secret
JWT_SECRET=super_secret_production_key_buraya_gizli_bir_anahtar
```

### 🎯 Sabit Script API Keys

```env
# Ebetlab (RONA) için
EBETLAB_API_KEY=trk_production_ebetlab_key_12345

# Truva (Pronet) için
TRUVA_API_KEY=trk_production_truva_key_67890
```

### 📱 Opsiyonel: CRM Entegrasyonları

```env
# Telegram (Opsiyonel)
TELEGRAM_BOT_TOKEN=

# Meta Ads (Opsiyonel)
META_PIXEL_ID=
META_ACCESS_TOKEN=

# Google Ads (Opsiyonel)
GOOGLE_ADS_ID=
GOOGLE_API_SECRET=
```

## 📦 Coolify Service Yapılandırması

### 1. PostgreSQL Database

Coolify'da yeni bir **PostgreSQL** servisi oluşturun:

```yaml
Service Name: tracklib-postgres
Version: 15 (veya 16)
Database Name: tracklib_db
Username: tracklib_user
Password: [güvenli bir şifre]
```

Database URL'i:
```
postgresql://tracklib_user:password@tracklib-postgres:5432/tracklib_db
```

### 2. Redis Cache

Coolify'da yeni bir **Redis** servisi oluşturun:

```yaml
Service Name: tracklib-redis
Version: 7
Password: [opsiyonel]
```

Redis bağlantısı:
```env
REDIS_HOST=tracklib-redis
REDIS_PORT=6379
```

### 3. Backend Application

**Git Repository** seçeneği ile deploy edin:

```yaml
Repository: github.com/yourusername/tracker-hybrid
Branch: main
Root Directory: /backend
Build Command: npm install
Start Command: npm start
Port: 3000
```

## 🌐 Public URL Ayarları

### 1. Custom Domain Ekleyin

Coolify dashboard'dan:
- **Domains** sekmesine gidin
- Custom domain ekleyin: `tracker.yourdomain.com`
- Coolify otomatik SSL sertifikası oluşturur

### 2. BACKEND_URL'i Güncelleyin

Environment variable'larda:

```env
BACKEND_URL=https://tracker.yourdomain.com
```

## 📝 Script URL'leri

Deploy sonrası script'leriniz şu URL'lerden erişilebilir olacak:

### Ebetlab Script:
```
https://tracker.yourdomain.com/scripts/ebetlab.js
```

### Truva Script:
```
https://tracker.yourdomain.com/scripts/truva.js
```

## 🔍 Deployment Kontrolü

### 1. Health Check

```bash
curl https://tracker.yourdomain.com/health
```

Beklenen yanıt:
```json
{
  "status": "ok",
  "timestamp": "2024-12-12T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### 2. Readiness Check

```bash
curl https://tracker.yourdomain.com/ready
```

Beklenen yanıt:
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

### 3. Script Test

```bash
# Ebetlab script
curl https://tracker.yourdomain.com/scripts/ebetlab.js

# Truva script
curl https://tracker.yourdomain.com/scripts/truva.js
```

## 🎯 HTML'de Kullanım

### Ebetlab Sitesinde:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Ebetlab Casino</title>
  <script src="https://tracker.yourdomain.com/scripts/ebetlab.js" async></script>
</head>
<body>
  <script>
    window.addEventListener('strastix:ready', () => {
      console.log('Ebetlab Tracker Ready!');
      strastix.identify("USER_123");
    });
  </script>
</body>
</html>
```

### Truva Sitesinde:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Truva Casino</title>
  <script src="https://tracker.yourdomain.com/scripts/truva.js" async></script>
</head>
<body>
  <script>
    window.addEventListener('strastix:ready', () => {
      console.log('Truva Tracker Ready!');
      strastix.identify("USER_456");
    });
  </script>
</body>
</html>
```

## 🐛 Sorun Giderme

### Database Bağlantı Hatası

Coolify loglarını kontrol edin:

```bash
# Coolify dashboard'dan Logs sekmesine gidin
# Veya CLI ile:
coolify logs tracklib-backend
```

Hata: `Connection refused to postgres`
**Çözüm:** Database service ismini kontrol edin, `DATABASE_URL`'de doğru host olmalı

### Redis Bağlantı Hatası

```bash
# Redis servisinin çalıştığını kontrol edin
coolify service status tracklib-redis
```

### CORS Hatası

Environment variable'larda `BACKEND_URL`'in doğru olduğundan emin olun:

```env
BACKEND_URL=https://tracker.yourdomain.com  # http:// değil, https://
```

## 🔄 Güncelleme Süreci

### 1. Code Push

```bash
git add .
git commit -m "Update tracker scripts"
git push origin main
```

### 2. Coolify Auto-Deploy

Coolify otomatik olarak yeni commit'i deploy eder. Dashboard'dan deployment sürecini takip edin.

### 3. Manual Deploy

Gerekirse Coolify dashboard'dan **Deploy** butonuna tıklayarak manuel deploy yapabilirsiniz.

## 📊 Monitoring

### Coolify Dashboard'da:

1. **Metrics**: CPU, RAM kullanımı
2. **Logs**: Real-time uygulama logları
3. **Health Checks**: Otomatik sağlık kontrolü

### Uygulama Logları

```bash
# Coolify CLI
coolify logs tracklib-backend --follow

# Veya dashboard'dan Logs sekmesi
```

## 🔐 Güvenlik Önerileri

### 1. API Keys

- Production'da **mutlaka** güvenli, rastgele API key'ler kullanın
- Coolify'da environment variable'ları "Secret" olarak işaretleyin
- `.env` dosyasını asla Git'e commit etmeyin

### 2. Database Credentials

- PostgreSQL şifresini güçlü yapın (min 16 karakter)
- Database'i sadece backend service'e açık tutun (Coolify private network)

### 3. HTTPS

- Coolify otomatik Let's Encrypt SSL sağlar
- HTTP trafiğini HTTPS'e yönlendirin (Coolify bunu otomatik yapar)

### 4. Rate Limiting

Mevcut rate limiter ayarları:

```javascript
// backend/middleware/rateLimiter.js
scriptServingLimiter: 100 requests per 15 minutes
eventTrackingLimiter: 100 requests per 1 minute
```

Gerekirse bu değerleri artırabilirsiniz.

## 📈 Performans İpuçları

### 1. Caching

Script'ler 1 saat cache'leniyor:

```javascript
Cache-Control: public, max-age=3600
```

CDN kullanıyorsanız, Cloudflare gibi servisler script'leri edge'de cache'ler.

### 2. Redis Optimizasyonu

Redis connection pooling mevcut ayarlarda:

```javascript
retryStrategy: (times) => {
  if (times > 10) return null;
  return Math.min(times * 100, 3000);
}
```

### 3. Database Connection Pooling

Prisma otomatik connection pooling kullanır. Coolify'da PostgreSQL için connection limit'i artırabilirsiniz.

## 🎉 Deployment Checklist

- [ ] Coolify'da PostgreSQL servisi oluşturuldu
- [ ] Coolify'da Redis servisi oluşturuldu
- [ ] Environment variable'lar ayarlandı
- [ ] Custom domain eklendi
- [ ] SSL sertifikası aktif
- [ ] Health check başarılı
- [ ] Script URL'leri test edildi
- [ ] Production API key'leri ayarlandı
- [ ] Database migration'lar çalıştırıldı

## 🚨 İlk Deploy Sonrası

### Database Migration

```bash
# Coolify container'a bağlan
coolify ssh tracklib-backend

# Migration'ı çalıştır
cd /app
npx prisma migrate deploy
```

### Test Event Gönder

```bash
curl -X POST https://tracker.yourdomain.com/api/e \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "trk_production_ebetlab_key_12345",
    "session_id": "test_session",
    "player_id": "test_user",
    "event_name": "page_view",
    "parameters": {},
    "url": "https://test.com"
  }'
```

---

## 📞 Coolify Specific Issues

### Build Failed

**Hata:** `npm install` başarısız
**Çözüm:**
- `package.json` dosyasının repo'da olduğundan emin olun
- Coolify build log'larını inceleyin
- Node version'ı kontrol edin (package.json'da `engines` ekleyin)

### Container Restart Loop

**Hata:** Container sürekli restart oluyor
**Çözüm:**
- Database bağlantısını kontrol edin
- Environment variable'ların doğru olduğundan emin olun
- Coolify logs'ta hata mesajlarını arayın

---

✅ **Hazırsınız!** Coolify'da deployment tamamlandıktan sonra script URL'leriniz canlı olacak.
