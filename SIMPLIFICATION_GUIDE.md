# 🎯 Basit Tracker Sistemi - Kurulum Rehberi

## 📋 Yapılan Değişiklikler

### ❌ Kaldırılanlar:
- **API Key Sistemi** - Artık API key yok
- **Multi-tenant karmaşıklığı** - Her customer için ayrı API key yok
- **CRM Entegrasyonları** (Meta/Google Ads) - Backend'den tamamen kaldırıldı

### ✅ Basitleştirmeler:
- **Script ID Sistemi** - Sadece 'ebetlab' veya 'truva'
- **Domain Kontrolü** - .env dosyasından CORS ile
- **Tek Kullanıcı** - .env'de ADMIN_EMAIL ve ADMIN_PASSWORD

---

## 🚀 Kurulum Adımları

### 1. .env Dosyasını Güncelleyin

```bash
cd backend
cp .env.example .env
nano .env
```

Gerekli değişiklikleri yapın:

```env
# Tek Kullanıcı Auth
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_strong_password

# Domain Kontrolü
EBETLAB_ALLOWED_DOMAINS=ebetlab.com,www.ebetlab.com,*.ebetlab.com
TRUVA_ALLOWED_DOMAINS=truva.com,www.truva.com,*.truva.com
```

### 2. Database Migration

```bash
# Prisma schema değişikliklerini uygula
npx prisma migrate dev --name simplify_remove_api_keys

# Veya production'da:
npx prisma migrate deploy
```

### 3. Sistem Kurulumu

```bash
# Ebetlab ve Truva customer'larını oluştur
node setup-simple.js
```

**Çıktı:**
```
✅ Ebetlab Customer Oluşturuldu
✅ Truva Customer Oluşturuldu
✅ Admin Kullanıcı Oluşturuldu

📋 SCRIPT URL'LERİ:
   Ebetlab: http://localhost:3000/scripts/ebetlab.js
   Truva: http://localhost:3000/scripts/truva.js

📋 DASHBOARD ERİŞİMİ:
   URL: http://localhost:5173/login
   Email: admin@yourdomain.com
   Password: your_strong_password
```

### 4. Backend'i Başlatın

```bash
npm start
# veya
pm2 start index.js --name tracker-backend
```

---

## 📝 Script Kullanımı

### Ebetlab Sitesinde:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Ebetlab Casino</title>
  <script src="https://yourdomain.com/scripts/ebetlab.js" async></script>
</head>
<body>
  <script>
    window.addEventListener('strastix:ready', () => {
      strastix.identify("USER_123");
      strastix.track('page_view', { page: 'home' });
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
  <script src="https://yourdomain.com/scripts/truva.js" async></script>
</head>
<body>
  <script>
    window.addEventListener('strastix:ready', () => {
      strastix.identify("USER_456");
      strastix.track('page_view', { page: 'home' });
    });
  </script>
</body>
</html>
```

---

## 🔍 Event Tracking

Event gönderilirken artık **API key yerine script_id** kullanılır:

```javascript
// Tracker otomatik olarak script_id gönderir
const payload = {
  script_id: 'ebetlab', // veya 'truva'
  session_id: '...',
  player_id: 'USER_123',
  event_name: 'deposit_completed',
  parameters: { amount: 100, currency: 'TRY' },
  url: window.location.href
};

// Backend: POST /api/e
```

---

## 🛡️ Güvenlik

### Domain Kontrolü

.env dosyasında domain listesi tanımlayın:

```env
# Sadece bu domainlerden gelen eventler kabul edilir
EBETLAB_ALLOWED_DOMAINS=ebetlab.com,www.ebetlab.com
TRUVA_ALLOWED_DOMAINS=truva.com,www.truva.com

# Wildcard kullanımı
EBETLAB_ALLOWED_DOMAINS=*.ebetlab.com

# Development için hepsine izin ver
EBETLAB_ALLOWED_DOMAINS=*
```

### Rate Limiting

```javascript
// backend/index.js
// IP + scriptId bazlı rate limiting (100 req/dakika)
const rateLimitKey = `rate:${customer.scriptId}:${ipAddress}:${sessionId}`;
```

---

## 🔧 Database Şeması Değişiklikleri

### Customer Model:

**Önceki:**
```prisma
model Customer {
  id       String @id
  apiKey   String @unique  // ❌ Kaldırıldı
  scriptId String @unique
  ...
}
```

**Yeni:**
```prisma
model Customer {
  id       String @id
  scriptId String @unique  // ✅ Sadece scriptId
  ...
}
```

### Event Model:

**Önceki:**
```prisma
model Event {
  apiKey     String  // ❌ Kaldırıldı
  sessionId  String
  ...
}
```

**Yeni:**
```prisma
model Event {
  sessionId  String  // ✅ API key yok
  ...
}
```

---

## 📊 Middleware Değişiklikleri

### Önceki: protectWithApiKey

```javascript
// ❌ KALDIRILDI
async function protectWithApiKey(req, res, next) {
    const apiKey = req.body.api_key;
    const customer = await prisma.customer.findUnique({ where: { apiKey } });
    // ...
}
```

### Yeni: protectByScriptId

```javascript
// ✅ YENİ
async function protectByScriptId(req, res, next) {
    const scriptId = req.body.script_id;

    if (scriptId !== 'ebetlab' && scriptId !== 'truva') {
        return res.status(400).json({ error: 'Geçersiz Script ID' });
    }

    const customer = await prisma.customer.findUnique({ where: { scriptId } });
    req.customer = customer;
    next();
}
```

---

## 🐛 Sorun Giderme

### Event 400 Bad Request

**Sebep:** script_id eksik veya geçersiz

**Çözüm:** Tracker script'inin güncel olduğundan emin olun:

```bash
curl https://yourdomain.com/scripts/ebetlab.js | grep script_id
```

### Event 403 Forbidden

**Sebep:** Domain kontrolü başarısız

**Çözüm:** .env'de domaini ekleyin:

```env
EBETLAB_ALLOWED_DOMAINS=yourdomain.com
```

### Event 404 Not Found

**Sebep:** Customer kaydı yok

**Çözüm:** Setup script'ini çalıştırın:

```bash
node setup-simple.js
```

---

## ✅ Test Etme

### 1. Script URL Test

```bash
curl http://localhost:3000/scripts/ebetlab.js
# scriptId: "ebetlab" olmalı
```

### 2. Event Test

```bash
curl -X POST http://localhost:3000/api/e \
  -H "Content-Type: application/json" \
  -d '{
    "script_id": "ebetlab",
    "session_id": "test_session_123",
    "player_id": "test_user",
    "event_name": "test_event",
    "parameters": {},
    "url": "http://test.com"
  }'
```

**Beklenen:** `200 OK`

### 3. Dashboard Test

```
http://localhost:5173/login
Email: admin@strastix.com
Password: admin123
```

---

## 🚨 Production Deployment

### Coolify

1. Environment variables ayarlayın
2. Migration çalıştırın: `npx prisma migrate deploy`
3. Setup script çalıştırın: `node setup-simple.js`
4. Backend'i restart edin

### Manual VPS

```bash
# 1. Git pull
git pull origin main

# 2. Backend güncelleme
cd backend
npm install
npx prisma generate
npx prisma migrate deploy

# 3. Setup
node setup-simple.js

# 4. Restart
pm2 restart tracker-backend
```

---

## 📞 Destek

Sorun yaşarsanız:
1. Backend loglarını kontrol edin: `pm2 logs tracker-backend`
2. Database'i kontrol edin: `npx prisma studio`
3. Script URL'leri test edin: `curl https://yourdomain.com/scripts/ebetlab.js`

---

✅ **Basitleştirme Tamamlandı!** Artık API key olmadan sadece scriptId ile tracking yapabilirsiniz.
