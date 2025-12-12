# 🎯 Sabit Script URL'leri - Ebetlab & Truva

## 📌 Genel Bakış

CRM entegrasyonları arka plana alındı. Artık **Ebetlab** ve **Truva** için sabit URL'lerden tracker scriptleri sunulmaktadır.

## 🚀 Kullanım

### Ebetlab (RONA Infrastructure) için:

```html
<script src="http://localhost:3000/scripts/ebetlab.js" async></script>
```

### Truva (Pronet Infrastructure) için:

```html
<script src="http://localhost:3000/scripts/truva.js" async></script>
```

## 🔧 Backend Değişiklikleri

### 1. Yeni Endpoint'ler

**backend/index.js** dosyasına iki yeni endpoint eklendi:

- `GET /scripts/ebetlab.js` - Ebetlab için tracker script
- `GET /scripts/truva.js` - Truva için tracker script

### 2. Sabit Config

Her script kendi sabit config'i ile sunulur:

```javascript
// Ebetlab Config
{
  scriptId: 'ebetlab',
  apiKey: process.env.EBETLAB_API_KEY || 'trk_ebetlab_static',
  backendUrl: `${BACKEND_URL}/api/e`,
  domConfig: {}
}

// Truva Config
{
  scriptId: 'truva',
  apiKey: process.env.TRUVA_API_KEY || 'trk_truva_static',
  backendUrl: `${BACKEND_URL}/api/e`,
  domConfig: {}
}
```

### 3. Environment Variables

**backend/.env.example** dosyasına yeni değişkenler eklendi:

```env
# Ebetlab (RONA Infrastructure) API Key
EBETLAB_API_KEY=trk_ebetlab_static_key_change_in_production

# Truva (Pronet Infrastructure) API Key
TRUVA_API_KEY=trk_truva_static_key_change_in_production
```

## 🎨 Frontend Değişiklikleri

### Settings Sayfası Basitleştirildi

**frontend/src/pages/SettingsPage.jsx** dosyasından kaldırılanlar:

- ❌ Tracker Type Seçimi (Tabs kaldırıldı)
- ❌ Meta (Facebook) Ads Entegrasyonu
- ❌ Google Ads Entegrasyonu

Kalanlar:

- ✅ API Key
- ✅ Script ID
- ✅ Domain Güvenliği
- ✅ Telegram Entegrasyonu (Opsiyonel)
- ✅ **Yeni:** Sabit Script URL'leri Bilgisi

## 📦 Kurulum Adımları

### 1. Backend'i Hazırlayın

```bash
cd backend

# .env dosyasını oluşturun
cp .env.example .env

# Gerekli API key'leri düzenleyin
nano .env
```

### 2. API Key'leri Ayarlayın

.env dosyasında:

```env
EBETLAB_API_KEY=trk_your_ebetlab_production_key
TRUVA_API_KEY=trk_your_truva_production_key
```

### 3. Backend'i Başlatın

```bash
npm install
npm start
```

### 4. Frontend'i Başlatın

```bash
cd frontend
npm install
npm run dev
```

## 🔐 Güvenlik Notları

1. **Production'da:**
   - `.env` dosyasındaki API key'leri mutlaka değiştirin
   - Güvenli, rastgele anahtarlar kullanın
   - API key'leri asla git'e commit etmeyin

2. **Domain Kontrolü:**
   - Her script kendi domainleri ile sınırlı olabilir
   - `allowedDomains` ayarını Settings'den yapabilirsiniz

## 📝 Örnek Kullanım

### Ebetlab sitesinde:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Ebetlab Casino</title>
  <script src="http://your-tracker-server.com/scripts/ebetlab.js" async></script>
</head>
<body>
  <script>
    // Tracker hazır olduğunda
    window.addEventListener('strastix:ready', () => {
      // Kullanıcı girişi
      strastix.identify("USER_123");

      // Event gönderme
      strastix.track("deposit_successful", {
        amount: 100,
        currency: "TRY"
      });
    });
  </script>
</body>
</html>
```

### Truva sitesinde:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Truva Casino</title>
  <script src="http://your-tracker-server.com/scripts/truva.js" async></script>
</head>
<body>
  <script>
    window.addEventListener('strastix:ready', () => {
      strastix.identify("USER_456");
      strastix.track("game_started", {
        game_name: "Sweet Bonanza"
      });
    });
  </script>
</body>
</html>
```

## 🧪 Test Etme

### 1. Script'lerin Yüklendiğini Kontrol Edin

```bash
# Ebetlab script
curl http://localhost:3000/scripts/ebetlab.js

# Truva script
curl http://localhost:3000/scripts/truva.js
```

### 2. Browser Console'da Test Edin

```javascript
// Tracker yüklendikten sonra
console.log(strastix.getStatus());

// Test event gönder
strastix.track("test_event", { test: true });
```

## 🆘 Sorun Giderme

### Script Yüklenmiyor

1. Backend'in çalıştığından emin olun: `http://localhost:3000/health`
2. Script dosyalarının mevcut olduğunu kontrol edin:
   - `backend/public/tracker-ebetlab.js`
   - `backend/public/tracker-pronet.js`

### Events Kaydedilmiyor

1. API key'lerin doğru ayarlandığından emin olun
2. Browser console'da hata mesajlarını kontrol edin
3. Backend loglarını inceleyin

### CORS Hatası

Backend'de CORS zaten tüm origin'lere açık:

```javascript
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Authorization, X-Script-Version',
  credentials: true
};
```

## 📊 Eski Yapıdan Farklılıklar

| Özellik | Eski Yapı | Yeni Yapı |
|---------|-----------|-----------|
| Script URL | `/c/:scriptId.js` (dinamik) | `/scripts/ebetlab.js` (sabit) |
| Tracker Type | Settings'den seçilebilir | Sabit (URL'ye göre) |
| CRM Entegrasyonları | Frontend'de görünür | Arka planda (opsiyonel) |
| API Key | Customer bazlı | Site bazlı (Ebetlab, Truva) |

## 🚀 Production'a Geçiş

1. `.env` dosyasını production sunucusuna kopyalayın
2. API key'leri güvenli değerlerle değiştirin
3. `BACKEND_URL`'i production URL'iniz ile güncelleyin
4. `NODE_ENV=production npm start` ile başlatın
5. Script URL'lerini production domain'iniz ile güncelleyin

## 📞 Destek

Sorun yaşarsanız:
1. Backend loglarını kontrol edin
2. Browser console'u inceleyin
3. `.env` dosyasının doğru ayarlandığından emin olun

---

✨ **Not:** CRM entegrasyonları (Meta Ads, Google Ads) artık backend'de opsiyonel olarak çalışmaktadır. Frontend'den görünmese de, backend'de gerekli alanlara veri gönderilebilir.
