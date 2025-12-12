# 🚨 403 Forbidden Hatası - Hızlı Çözüm

## Sorun
`POST https://api.strastix.com/api/e 403 (Forbidden)` hatası alıyorsunuz.

**Neden?** VPS'de `setup-static-customers.js` henüz çalıştırılmadığı için `ebetlab` ve `truva` customer'ları yok.

---

## ⚡ Hızlı Çözüm 1: Mevcut Customer API Key Kullanın

VPS'de zaten kayıtlı bir customer varsa, onun API key'ini kullanabilirsiniz:

### 1. VPS'de .env Dosyasını Düzenleyin

```bash
ssh user@your-vps-ip
cd /path/to/TrackLib/backend
nano .env
```

### 2. Mevcut Customer API Key'ini Ekleyin

```env
# Mevcut customer'ınızın API key'ini kullanın
EBETLAB_API_KEY=trk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TRUVA_API_KEY=trk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Nereden Bulunur?**
- Dashboard'a giriş yapın
- Settings sayfasına gidin
- API Key'i kopyalayın

### 3. Backend'i Restart Edin

```bash
# Coolify kullanıyorsanız
# Dashboard'dan "Restart" butonuna basın

# veya PM2 kullanıyorsanız
pm2 restart backend
```

---

## ✅ Kalıcı Çözüm: Static Customer'ları Oluşturun

### 1. VPS'ye Bağlanın

```bash
ssh user@your-vps-ip
cd /path/to/TrackLib/backend
```

### 2. Git Pull Çekin

```bash
git pull origin main
```

### 3. Setup Script'ini Çalıştırın

```bash
node setup-static-customers.js
```

**Çıktı:**
```
✅ Ebetlab Customer Created/Updated:
   - Script ID: ebetlab
   - API Key: trk_ebetlab_static
   - Admin Email: admin@ebetlab.com
   - Admin Password: ebetlab123

✅ Truva Customer Created/Updated:
   - Script ID: truva
   - API Key: trk_truva_static
   - Admin Email: admin@truva.com
   - Admin Password: truva123
```

### 4. .env Dosyasını Güncelleyin

Setup script çalıştıktan sonra .env dosyasını güncelleyin:

```bash
nano .env
```

```env
# Script'in oluşturduğu API key'leri kullanın
EBETLAB_API_KEY=trk_ebetlab_static
TRUVA_API_KEY=trk_truva_static
```

### 5. Backend'i Restart Edin

```bash
pm2 restart backend
# veya Coolify dashboard'dan Restart
```

---

## 🔍 Hata Kontrolü

### 1. Script'in API Key'ini Kontrol Edin

Browser console'da:
```javascript
// Script yüklendikten sonra
fetch('https://api.strastix.com/scripts/ebetlab.js')
  .then(r => r.text())
  .then(text => {
    const match = text.match(/"apiKey":"([^"]+)"/);
    console.log('Script API Key:', match ? match[1] : 'Not found');
  });
```

### 2. Backend Loglarını Kontrol Edin

```bash
# Coolify
coolify logs tracklib-backend --follow

# PM2
pm2 logs backend
```

Şunu arayın:
```
📝 Ebetlab script serving with API key: trk_ebetla...
```

### 3. Database'de Customer Var mı?

VPS'de:
```bash
cd /path/to/TrackLib/backend
npx prisma studio
```

Customer tablosunda `scriptId: ebetlab` ve `scriptId: truva` kayıtları olmalı.

---

## 🐛 Hala 403 Alıyorsanız

### Domain Validation Hatası Olabilir

Backend'de domain validation aktif olabilir. Geçici olarak devre dışı bırakmak için:

**backend/index.js** dosyasında:

```javascript
// Satır ~732
app.post('/api/e',
  eventTrackingLimiter,
  // validateEventOrigin,  // ← Bunu geçici olarak yorum satırı yapın
  protectWithApiKey,
  validateBody(schemas.eventSchema),
  async (req, res) => {
```

**⚠️ Dikkat:** Bu sadece test için. Production'da domain validation aktif olmalı.

---

## ✅ Test Etme

403 hatası düzeldikten sonra test edin:

```javascript
// Browser console'da
strastix.track('test_event', { test: true });
```

Backend loglarında şunu görmelisiniz:
```
✓ Strastix: test_event sent
```

---

## 📞 Sorun Devam Ederse

1. Backend loglarını paylaşın
2. Browser console'daki tam hata mesajını paylaşın
3. Script URL'inin doğru yüklendiğinden emin olun:
   ```bash
   curl https://api.strastix.com/scripts/ebetlab.js | grep apiKey
   ```
