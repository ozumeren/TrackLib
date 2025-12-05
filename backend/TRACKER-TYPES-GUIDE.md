# 🎯 Tracker Types Sistemi - Kullanım Kılavuzu

## 📋 Genel Bakış

Artık müşteriler kendi altyapılarına özel optimize edilmiş tracker'ları seçebiliyorlar!

### Mevcut Tracker Tipleri

| Tracker Type | Dosya | Altyapı | Özellikler |
|--------------|-------|---------|-----------|
| **pronet** | `tracker-pronet.js` | Truva | Genel amaçlı tracking |
| **ebetlab** | `tracker-ebetlab.js` | Rona | API interception, Game tracking, Multi-currency |
| **default** | `tracker-template.js` | Generic | Basit event tracking |

---

## 🚀 Nasıl Çalışır?

### 1. Müşteri Kaydı (Frontend)

Register sayfasında müşteri tracker tipini seçer:

```jsx
<Select
  label="Tracker Script Tipi"
  data={[
    { value: 'default', label: '🔹 Default' },
    { value: 'pronet', label: '🎯 Pronet - Truva' },
    { value: 'ebetlab', label: '🚀 Ebetlab - Rona' }
  ]}
/>
```

### 2. Database Kaydı (Backend)

```javascript
await prisma.customer.create({
  data: {
    name: 'Rona Casino',
    scriptId: 'rona_tracker',
    trackerType: 'ebetlab',  // 🆕
    // ...
  }
});
```

### 3. Script Serving (Backend)

```javascript
const trackerTypeMap = {
  'pronet': 'tracker-pronet.js',
  'ebetlab': 'tracker-ebetlab.js',
  'default': 'tracker-template.js'
};

const trackerType = customer.trackerType || 'default';
const templateFileName = trackerTypeMap[trackerType];
```

---

## 📝 Migration Apply Etme

### Manuel Migration

```bash
cd TrackLib/backend

# PostgreSQL'e bağlan
psql -d tracklib

# Migration'ı uygula
\i prisma/migrations/20251205_add_tracker_type/migration.sql

# Kontrol et
SELECT "id", "name", "scriptId", "trackerType" FROM "Customer";
```

**Beklenen Çıktı:**
```
 id  |     name      |    scriptId    | trackerType
-----+---------------+----------------+-------------
  1  | Rona Casino   | rona_tracker   | ebetlab
  2  | Test Casino   | test_tracker   | default
```

### Prisma Generate (Client'ı güncelle)

```bash
npx prisma generate
```

---

## 🧪 Test Senaryoları

### Test 1: Yeni Müşteri Kaydı

1. Frontend'e git: `http://localhost:5173/register`
2. Form doldur:
   - Şirket Adı: Test Casino
   - Script ID: test
   - **Tracker Type: Pronet**
   - Email, şifre, vb.
3. "Hesap Oluştur"
4. Database'de kontrol:
```sql
SELECT "trackerType" FROM "Customer" WHERE "scriptId" = 'tracklib_test';
-- Sonuç: pronet
```

### Test 2: Script Serving

```bash
# Ebetlab tracker test
curl http://localhost:3000/c/rona_tracker.js | grep "RONA Edition"

# Pronet tracker test
curl http://localhost:3000/c/test_tracker.js | grep "TrackLib"

# Console'da backend log'u kontrol et:
# 📝 Using tracker: tracker-ebetlab.js (type: ebetlab) for Rona Casino
# 📝 Using tracker: tracker-pronet.js (type: pronet) for Test Casino
```

### Test 3: Frontend Dropdown

1. `http://localhost:5173/register` açın
2. "Tracker Script Tipi" dropdown'unu kontrol edin
3. 3 seçenek görmelisiniz:
   - 🔹 Default
   - 🎯 Pronet (Truva)
   - 🚀 Ebetlab (Rona)

---

## 🔧 Yeni Tracker Type Ekleme

### 1. Tracker Dosyası Oluştur

```bash
cd TrackLib/backend/public
cp tracker-template.js tracker-yeni.js
```

### 2. Backend'e Ekle

`index.js` içinde:
```javascript
const trackerTypeMap = {
  'pronet': 'tracker-pronet.js',
  'ebetlab': 'tracker-ebetlab.js',
  'yeni': 'tracker-yeni.js',  // 🆕
  'default': 'tracker-template.js'
};
```

### 3. Frontend'e Ekle

`Register.jsx` içinde:
```javascript
data={[
  { value: 'default', label: '🔹 Default' },
  { value: 'pronet', label: '🎯 Pronet - Truva' },
  { value: 'ebetlab', label: '🚀 Ebetlab - Rona' },
  { value: 'yeni', label: '✨ Yeni Tracker' }  // 🆕
]}
```

### 4. Validation Ekle

`index.js` içinde:
```javascript
const validTrackerTypes = ['pronet', 'ebetlab', 'yeni', 'default'];
```

---

## 📊 Database Schema

```prisma
model Customer {
  id          String   @id @default(cuid())
  name        String
  apiKey      String   @unique
  scriptId    String   @unique
  trackerType String   @default("default")  // 🆕
  // ...
}
```

---

## 🎯 Özet

### ✅ Tamamlanan İşlemler

1. **Database:**
   - ✅ Customer model'ine `trackerType` field eklendi
   - ✅ Migration oluşturuldu
   - ✅ Index eklendi

2. **Backend:**
   - ✅ tracker-rona.js → tracker-ebetlab.js (rename)
   - ✅ tracker-pronet.js oluşturuldu (Truva için)
   - ✅ Script serving trackerType'a göre çalışıyor
   - ✅ Registration endpoint trackerType kabul ediyor
   - ✅ Validation eklendi

3. **Frontend:**
   - ✅ Register formuna Select dropdown eklendi
   - ✅ 3 tracker tipi seçeneği
   - ✅ Form validation
   - ✅ Icon'lar ve açıklamalar

### 📂 Dosya Yapısı

```
TrackLib/backend/
├── public/
│   ├── tracker-template.js     (default)
│   ├── tracker-pronet.js       (Truva)
│   └── tracker-ebetlab.js      (Rona)
├── prisma/
│   ├── schema.prisma           (✅ trackerType added)
│   └── migrations/
│       └── 20251205_add_tracker_type/
│           └── migration.sql
├── index.js                     (✅ updated)
└── TRACKER-TYPES-GUIDE.md      (📘 bu dosya)

TrackLib/frontend/
└── src/
    └── pages/
        └── Register.jsx         (✅ updated)
```

---

## 🚀 Deployment

### Production'a Almadan Önce

1. **Migration'ı Apply Et:**
```bash
psql -d tracklib -f prisma/migrations/20251205_add_tracker_type/migration.sql
```

2. **Backend'i Restart Et:**
```bash
pm2 restart tracklib-backend
```

3. **Frontend'i Build Et:**
```bash
cd TrackLib/frontend
npm run build
```

4. **Test Et:**
   - Yeni müşteri kaydı yap
   - Her tracker tipini test et
   - Script serving'i kontrol et

---

## 🎉 Sonuç

Artık sistem **tamamen esnek**:
- ✅ Her müşteri kendi altyapısına uygun tracker'ı seçebiliyor
- ✅ Pronet (Truva) için optimize tracker
- ✅ Ebetlab (Rona) için özel tracker
- ✅ Default (generic) tracker
- ✅ Kolay genişletilebilir (yeni tracker eklemek çok kolay)

**Happy Tracking! 🎯**
