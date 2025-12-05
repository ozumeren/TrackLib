# 🎯 Rona Tracker v3.0 - Kurulum ve Kullanım Kılavuzu

## 📦 Tamamlanan Özellikler

### ✅ API Tracking (7 Endpoint)
1. **Login API** - Kullanıcı girişi
2. **Logout API** - Kullanıcı çıkışı
3. **Payment Methods API** - Ödeme yöntemleri
4. **Wallet/Balance API** - Cüzdan bakiyeleri (TRY, BTC, ETH, USDT, vb.)
5. **Bonus Claim API** - Bonus talepleri
6. **Deposit API** - Para yatırma işlemleri
7. **Game Service API** - Oyun bahisleri ve kazançları

### 🎮 Game Tracking
- Oyun oturumu başlatma/bitirme
- Bahis miktarı tracking
- Kazanç miktarı tracking
- RTP hesaplama (Return to Player %)
- Toplam bahis/kazanç istatistikleri

### 📊 Track Edilen Event'ler (11 adet)
1. `login_successful`
2. `logout`
3. `payment_methods_loaded`
4. `wallet_updated`
5. `bonus_claimed_successful`
6. `bonus_claimed_failed`
7. `deposit_initiated`
8. `deposit_successful`
9. `game_session_started`
10. `game_bet_placed`
11. `game_session_ended`

### 🆕 DOM Button Tracking (5 Rule)
1. `deposit_button_clicked` - Deposit buton tıklaması
2. `withdrawal_button_clicked` - Withdrawal buton tıklaması
3. `bonus_claim_button_clicked` - Bonus talep butonu
4. `deposit_amount_entered` - Deposit miktarı girişi
5. `withdrawal_amount_entered` - Withdrawal miktarı girişi

---

## 🚀 Kurulum Adımları

### 1️⃣ Database'de Müşteri Oluştur

```bash
cd TrackLib/backend
node
```

Node REPL'de:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Rona müşterisini oluştur
await prisma.customer.create({
  data: {
    name: 'Rona Casino',
    scriptId: 'rona_tracker',
    apiKey: 'trk_rona_' + Math.random().toString(36).substr(2, 16),
    allowedDomains: ['ronabet.com', 'www.ronabet.com'],
    users: {
      create: {
        name: 'Rona Admin',
        email: 'admin@rona.com',
        password: '$2b$10$HASH', // bcrypt hash'lenmiş şifre
        role: 'OWNER'
      }
    }
  }
});

// Çıkış
process.exit();
```

### 2️⃣ DOM Config'i Yükle

```bash
cd TrackLib/backend
node update-rona-config.js rona_tracker
```

Çıktı:
```
✅ Müşteri bulundu: Rona Casino (ID: 1)
✅ Config dosyası okundu: 5 rule bulundu
✅ Database başarıyla güncellendi!

📋 Yüklenen Rule'lar:
  1. Deposit Button Click
     Event: deposit_button_clicked
     ...
```

### 3️⃣ Backend'i Yükle (tracker-rona.js)

Backend index.js dosyasında script serving route'unu güncelle:

```javascript
// Line 260 civarında
const templatePath = path.join(__dirname, 'public',
  customer.scriptId === 'rona_tracker' ? 'tracker-rona.js' : 'tracker-template.js'
);
```

Ya da Rona için özel endpoint ekle:

```javascript
// Rona için özel route
app.get('/c/rona_tracker.js', scriptServingLimiter, async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { scriptId: 'rona_tracker' }
  });

  if (!customer) {
    return res.status(404).send('console.error("Rona tracker not found");');
  }

  const templatePath = path.join(__dirname, 'public', 'tracker-rona.js');
  let scriptContent = fs.readFileSync(templatePath, 'utf8');

  const config = {
    scriptId: 'rona_tracker',
    apiKey: customer.apiKey,
    backendUrl: `${BACKEND_URL}/api/e`,
    domConfig: customer.domConfig || {}
  };

  scriptContent = scriptContent.replace('__CONFIG__', JSON.stringify(config));

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(scriptContent);
});
```

### 4️⃣ Rona Sitesine Entegre Et

Ronabet.com'un `<head>` bölümüne ekle:

```html
<script src="https://your-backend.com/c/rona_tracker.js" async></script>
```

Ya da test için:

```html
<script src="http://localhost:3000/c/rona_tracker.js" async></script>
```

---

## 🧪 Test Senaryoları

### Test 1: API Tracking

1. Ronabet.com'a git
2. F12 > Console'u aç
3. Login yap
4. Console'da şu mesajları göreceksin:

```
✓ RONA Login detected: username (ID: 12345)
✓ Strastix RONA: login_successful sent
💰 RONA Wallet data received
✓ Strastix RONA: wallet_updated sent
```

### Test 2: Deposit Button Tracking

1. Deposit sayfasına git
2. Miktar gir: `100`
3. "Talep Gönder" butonuna tıkla
4. Console'da:

```
💰 RONA: Miktar girildi: 100 ₺
Strastix RONA: Event triggered - deposit_button_clicked
Strastix RONA: Amount extracted - 100 from input[placeholder="Miktar"]
✓ Strastix RONA: deposit_button_clicked sent
```

### Test 3: Bonus Claim

1. Bonus sayfasına git
2. "Talep Et" butonuna tıkla
3. Console'da:

```
Strastix RONA: Event triggered - bonus_claim_button_clicked
✓ Strastix RONA: bonus_claim_button_clicked sent
🎁 Bonus claimed successfully: 123
✓ Strastix RONA: bonus_claimed_successful sent
```

### Test 4: Game Tracking

1. Bir oyun başlat (örn: Sweet Bonanza)
2. Birkaç spin yap
3. Console'da:

```
🎮 Game session started: Sweet Bonanza (Balance: 1000.00 TRY)
🎲 Bet: 5.00 TRY | Win: 15.50 TRY | Net: +10.50 TRY | Balance: 1010.50 TRY
🎲 Bet: 5.00 TRY | Win: 0.00 TRY | Net: -5.00 TRY | Balance: 1005.50 TRY
```

4. Oyunu kapat veya console'da:

```javascript
tracker.endGame()
```

Çıktı:
```
🏁 Game session ended: Sweet Bonanza | Duration: 120s | Net: +5.50 TRY
✓ Strastix RONA: game_session_ended sent
```

---

## 🛠️ Debugging Komutları

### Browser Console'da

```javascript
// Tracker durumunu göster
tracker.getStatus()

// Çıktı:
{
  version: '3.0-RONA',
  sessionId: '1733483729000-abc123',
  playerId: '12345',
  playerUsername: 'testuser',
  currentFormData: { amount: 100 },
  pendingTransactions: [...],
  lastKnownBalances: [[1, 1000.00], [2, 0.5]],
  userWallets: [...],
  availablePaymentMethods: [...]
}

// Aktif oyun oturumunu göster
tracker.getGameSession()

// Oyun oturumunu bitir
tracker.endGame()

// Pending transaction'ları temizle
tracker.clearPendingTransactions()

// Manuel event gönder
tracker.track('custom_event', { key: 'value' })
```

---

## 📈 Backend'de Event'leri Görüntüleme

### Database'den son event'leri çek:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Son 10 event
const events = await prisma.event.findMany({
  where: { customerId: 1 }, // Rona customer ID
  orderBy: { createdAt: 'desc' },
  take: 10
});

console.log(events);
```

### Redis'te queue'yu kontrol et:

```bash
redis-cli
> KEYS *
> GET tracklib_queue
```

---

## 🔧 Sorun Giderme

### Problem: Event'ler gönderilmiyor

**Çözüm:**
1. Console'da hata var mı kontrol et
2. Network tab'da API isteklerini kontrol et
3. Backend'in çalıştığından emin ol:

```bash
curl http://localhost:3000/health
```

### Problem: Deposit/Withdraw butonları karışıyor

**Çözüm:** `rona-dom-config.json` dosyasında conditions kontrolü yapılıyor:

```json
{
  "conditions": {
    "inputExists": "input[placeholder=\"Miktar\"]"
  }
}
```

Bu sayede hangi sayfada olduğumuzu anlıyoruz.

### Problem: Amount extract edilemiyor

**Çözüm:** Console'da test et:

```javascript
// Manuel amount extraction test
const amount = document.querySelector('input[placeholder="Miktar"]')?.value;
console.log('Amount:', amount);
```

---

## 📝 Gelecek Özellikler (Opsiyonel)

- [ ] Withdrawal tracking (deposit ile aynı mantık)
- [ ] Game provider tracking (Pragmatic, Evolution, vb.)
- [ ] VIP level tracking
- [ ] Referral tracking
- [ ] Cashback tracking

---

## 🎉 Özet

Rona Tracker v3.0 artık **tam fonksiyonel** durumda:

✅ 7 API endpoint tracking
✅ 11 event tracking
✅ 5 DOM button tracking
✅ Game session tracking
✅ RTP calculation
✅ Multi-currency wallet tracking
✅ Offline queue support
✅ Auto-retry failed requests
✅ Conditions-based DOM tracking

**Toplam: 23 farklı tracking noktası!**

Herhangi bir soru veya sorun için backend loglarını kontrol edin:

```bash
cd TrackLib/backend
npm start
```

---

**🚀 Happy Tracking!**
