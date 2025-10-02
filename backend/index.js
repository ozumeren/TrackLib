// --- Gerekli Kütüphaneler ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios'); // YENİ: Meta API isteği için eklendi

// --- Başlangıç Ayarları ---
const app = express();
const prisma = new PrismaClient();
const redis = new Redis();
const PORT = 3000;
const JWT_SECRET = 'bu-cok-gizli-bir-anahtar-ve-asla-degismemeli-12345';

// --- Middleware Ayarları ---
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Authorization',
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// --- Harici Route Dosyaları ---
const { protectWithJWT, protectWithApiKey, isOwner, isAdmin } = require('./authMiddleware');
const analyticsRoutes = require('./analyticsRoutes');
const segmentRoutes = require('./segmentRoutes');
const ruleRoutes = require('./ruleRoutes');
const userRoutes = require('./userRoutes');
const customerRoutes = require('./customerRoutes');
const adminRoutes = require('./adminRoutes');

// --- ROTALAR (ROUTES) ---
app.use('/api/analytics', analyticsRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin', adminRoutes);

// 1. Dinamik Tracker.js Sunucusu
app.get('/tracker/:apiKey.js', async (req, res) => {
    try {
        const { apiKey } = req.params;
        const customer = await prisma.customer.findUnique({ where: { apiKey } });
        if (!customer) return res.status(404).type('text/javascript').send('// Customer not found.');
        const templatePath = path.join(__dirname, 'public', 'tracker-template.js');
        let scriptContent = fs.readFileSync(templatePath, 'utf8');
        const config = {
            apiKey: customer.apiKey,
            backendUrl: `http://${req.get('host')}/v1/events`,
            domConfig: customer.domConfig || {}
        };
        scriptContent = scriptContent.replace('__CONFIG__', JSON.stringify(config));
        res.setHeader('Content-Type', 'application/javascript');
        res.send(scriptContent);
    } catch (error) {
        console.error("Tracker script generation error:", error);
        res.status(500).type('text/javascript').send('// Error generating tracker script.');
    }
});

// 2. Yeni Müşteri için Varsayılan Verileri Oluşturma Fonksiyonu
async function createPredefinedData(customerId) {
  try {
    await prisma.segment.createMany({
      data: [
        {
          name: 'Aktif Oyuncular (Son 7 Gün)',
          description: 'Son 7 gün içinde en az bir kez giriş yapmış olan tüm oyuncular.',
          criteria: { "rules": [{ "fact": "loginCount", "operator": "greaterThanOrEqual", "value": 1, "periodInDays": 7 }] },
          customerId: customerId,
        },
      ],
    });
    await prisma.rule.create({
      data: {
        name: 'Pasif Oyuncuları Geri Kazanma Kampanyası (Örnek)',
        isActive: true,
        triggerType: 'INACTIVITY',
        config: { "minutes": 1440 * 14 },
        conversionGoalEvent: 'login_successful',
        customerId: customerId,
        variants: {
          create: [
            {
              name: 'Varyant A: Standart Hatırlatma',
              actionType: 'SEND_TELEGRAM_MESSAGE',
              actionPayload: { "messageTemplate": "Merhaba {playerName}, seni tekrar aramızda görmeyi çok isteriz!" },
            },
            {
              name: 'Varyant B: Free Spin Teklifi',
              actionType: 'SEND_TELEGRAM_MESSAGE',
              actionPayload: { "messageTemplate": "Merhaba {playerName}! Geri dönmen için hesabına 10 Free Spin ekledik. Kaçırma!" },
            },
          ],
        },
      },
    });
  } catch (error) {
    console.error(`Müşteri ID ${customerId} için varsayılan veri oluşturulurken hata oluştu:`, error);
  }
}

// 3. Yetkilendirme (Auth) Rotaları
const authRoutes = express.Router();
authRoutes.post('/register', async (req, res) => {
    const { customerName, userName, email, password } = req.body;
    if (!customerName || !userName || !email || !password) {
        return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const apiKey = `trk_${crypto.randomBytes(16).toString('hex')}`;
        const newCustomer = await prisma.customer.create({
            data: {
                name: customerName,
                apiKey: apiKey,
                users: {
                    create: { name: userName, email: email, password: hashedPassword, role: 'OWNER' },
                },
            },
        });
        await createPredefinedData(newCustomer.id);
        res.status(201).json({ message: 'Müşteri başarıyla oluşturuldu.' });
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanılıyor.' });
        res.status(500).json({ error: 'Kullanıcı oluşturulamadı.' });
    }
});
authRoutes.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign(
                { userId: user.id, customerId: user.customerId, role: user.role },
                JWT_SECRET,
                { expiresIn: '1d' }
            );
            res.json({ name: user.name, role: user.role, email: user.email, token: token });
        } else {
            res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
        }
    } catch (error) {
        console.error("Giriş sırasında kritik hata:", error);
        res.status(500).json({ error: 'Giriş yapılamadı.' });
    }
});
app.use('/api/auth', authRoutes);

// 4. Olay Toplama ve Telegram Webhook Rotaları
app.options('/v1/events', cors(corsOptions));
app.post('/v1/events', protectWithApiKey, async (req, res) => {
    const eventData = req.body;
    const customer = req.customer;
    try {
        if (eventData.player_id) {
             await prisma.player.upsert({
                where: { playerId_customerId: { playerId: eventData.player_id, customerId: customer.id } },
                update: {},
                create: { playerId: eventData.player_id, customerId: customer.id },
            });
        }
        await prisma.event.create({
            data: {
                apiKey: eventData.api_key, sessionId: eventData.session_id,
                playerId: eventData.player_id, eventName: eventData.event_name,
                url: eventData.url, parameters: eventData.parameters || {},
                customerId: customer.id,
            },
        });
        if (eventData.player_id) {
            const abTestEntry = await redis.get(`ab_test:${eventData.player_id}`);
            if (abTestEntry) {
                const { variantId } = JSON.parse(abTestEntry);
                const variant = await prisma.ruleVariant.findUnique({ where: {id: variantId}, include: {rule: true} });
                if (variant && eventData.event_name === variant.rule.conversionGoalEvent) {
                    await prisma.ruleVariant.update({
                        where: { id: variantId },
                        data: { conversions: { increment: 1 } },
                    });
                    console.log(`--> A/B Test DÖNÜŞÜM! Oyuncu ${eventData.player_id}, varyant ${variantId} için dönüşüm sağladı.`);
                    await redis.del(`ab_test:${eventData.player_id}`);
                }
            }
        }
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error("Event işleme hatası:", error);
        res.status(500).json({ status: 'error' });
    }
});
app.post('/v1/telegram/webhook/:apiKey', async (req, res) => {
    const { apiKey } = req.params;
    const message = req.body.message;
    const customer = await prisma.customer.findUnique({ where: { apiKey } });
    if (!customer) return res.sendStatus(404);
    if (message && message.text && message.text.startsWith('/start')) {
        const chatId = message.chat.id.toString();
        const playerId = message.text.split(' ')[1];
        if (playerId) {
            try {
                const player = await prisma.player.upsert({
                    where: { playerId_customerId: { playerId, customerId: customer.id } },
                    update: {},
                    create: { playerId, customerId: customer.id },
                });
                await prisma.telegramConnection.upsert({
                    where: { playerId: player.id },
                    update: { telegramChatId: chatId },
                    create: { telegramChatId: chatId, playerId: player.id, customerId: customer.id },
                });
                if (customer.telegramBotToken) {
                    const bot = new TelegramBot(customer.telegramBotToken);
                    bot.sendMessage(chatId, 'Hesabınız başarıyla bağlandı!');
                }
            } catch (error) { console.error('Eşleştirme hatası:', error.message); }
        }
    }
    res.sendStatus(200);
});

// --- OTOMASYON ZAMANLAYICI (Sunucu Taraflı Etiketleme ile Güncellendi) ---
cron.schedule('*/1 * * * *', async () => {
    const timestamp = `[${new Date().toLocaleTimeString()}]`;
    console.log(`${timestamp} --- Otomasyon Motoru Başlatıldı ---`);

    try {
        const activeRules = await prisma.rule.findMany({
            where: { isActive: true },
            include: { customer: true, variants: true },
        });

        for (const rule of activeRules) {
            let playersToTrigger = [];

            if (rule.triggerType === 'INACTIVITY') {
                const inactivityMinutes = rule.config.minutes || 2;
                const threshold = new Date(Date.now() - inactivityMinutes * 60 * 1000);
                const activePlayerEvents = await prisma.event.findMany({
                    where: { customerId: rule.customerId, eventName: 'login_successful', createdAt: { gte: threshold } },
                    select: { playerId: true }, distinct: ['playerId'],
                });
                const activePlayerIds = activePlayerEvents.map(e => e.playerId).filter(id => id);
                playersToTrigger = await prisma.player.findMany({
                    where: { customerId: rule.customerId, NOT: { playerId: { in: activePlayerIds } } },
                    include: { telegramConnection: true }
                });
            }
            
            // ... (Diğer tetikleyici türleri: EVENT, SEGMENT_ENTRY mantığı buraya eklenebilir) ...

            if (playersToTrigger.length > 0) {
                console.log(`[${rule.name}] kuralı için ${playersToTrigger.length} oyuncu bulundu.`);

                for (const player of playersToTrigger) {
                    if (rule.variants.length === 0) continue;
                    
                    const variant = rule.variants[Math.floor(Math.random() * rule.variants.length)];
                    
                    // --- AKSİYON TÜRÜNE GÖRE İŞLEM YAP ---
                    switch (variant.actionType) {
                        case 'SEND_TELEGRAM_MESSAGE':
                            if (player.telegramConnection && rule.customer.telegramBotToken) {
                                const bot = new TelegramBot(rule.customer.telegramBotToken);
                                let message = variant.actionPayload.messageTemplate.replace('{playerName}', player.playerId);
                                await bot.sendMessage(player.telegramConnection.telegramChatId, message);
                                console.log(`--> [Telegram] Oyuncu ${player.playerId}'ye mesaj gönderildi.`);
                            }
                            break;

                        case 'FORWARD_TO_META_ADS':
                            if (rule.customer.metaPixelId && rule.customer.metaAccessToken) {
                                const eventName = variant.actionPayload.eventName || 'Lead'; // Varsayılan olay
                                const eventTime = Math.floor(Date.now() / 1000);
                                
                                const payload = {
                                    data: [{
                                        event_name: eventName,
                                        event_time: eventTime,
                                        action_source: 'system', // Sunucu taraflı olduğunu belirtir
                                        user_data: {
                                            external_id: [crypto.createHash('sha256').update(player.playerId).digest('hex')],
                                            em: player.email ? [crypto.createHash('sha256').update(player.email.toLowerCase()).digest('hex')] : [],
                                        },
                                    }],
                                };

                                const url = `https://graph.facebook.com/v19.0/${rule.customer.metaPixelId}/events?access_token=${rule.customer.metaAccessToken}`;
                                
                                try {
                                    await axios.post(url, payload);
                                    console.log(`--> [Meta CAPI] Oyuncu ${player.playerId} için "${eventName}" olayı gönderildi.`);
                                } catch (axiosError) {
                                    console.error(`--> [Meta CAPI] Hata: ${axiosError.response?.data?.error?.message || axiosError.message}`);
                                }
                            }
                            break;
                        case 'FORWARD_TO_GOOGLE_ADS':
                            if (rule.customer.googleAdsId && rule.customer.googleApiSecret) {
                                const eventName = variant.actionPayload.eventName || 'lead'; // Google için genellikle küçük harf kullanılır
                                
                                const payload = {
                                    // Oyuncu ID'sinden hash'lenmiş bir client_id oluşturuyoruz
                                    client_id: crypto.createHash('sha256').update(player.playerId).digest('hex'),
                                    events: [{
                                        name: eventName,
                                        params: {
                                            // event_category gibi ek parametreler buraya eklenebilir
                                            'send_to': rule.customer.googleAdsId,
                                        },
                                    }],
                                };

                                const url = `https://www.google-analytics.com/mp/collect?api_secret=${rule.customer.googleApiSecret}&measurement_id=${rule.customer.googleAdsId}`;
                                
                                try {
                                    await axios.post(url, payload);
                                    console.log(`--> [Google Ads MP] Oyuncu ${player.playerId} için "${eventName}" olayı gönderildi.`);
                                } catch (axiosError) {
                                    console.error(`--> [Google Ads MP] Hata: ${axiosError.response?.data?.error?.message || axiosError.message}`);
                                }
                            }
                            break;
                    }

                    // A/B Testi istatistiklerini güncelle (gösterim)
                    await prisma.ruleVariant.update({
                        where: { id: variant.id },
                        data: { exposures: { increment: 1 } },
                    });
                }
            }
        }
    } catch (error) {
        console.error(`${timestamp} Otomasyon motoru hatası:`, error);
    }
});

// --- Veritabanı "Isıtma" Fonksiyonu ---
async function connectToDatabase() {
    console.log("Veritabanı bağlantısı kontrol ediliyor...");
    try {
        // Veritabanına basit bir sorgu göndererek bağlantıyı test et
        await prisma.$queryRaw`SELECT 1`;
        console.log("Veritabanı bağlantısı başarılı.");
    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!!! VERİTABANI BAĞLANTISI BAŞARISIZ OLDU !!!!");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("Prisma'dan gelen detaylı hata mesajı:");
        console.error(error); // Hatanın tamamını logla
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        
        // Sunucuyu başlatma, çünkü veritabanı olmadan çalışamaz
        process.exit(1);
    }
}
// --- SUNUCUYU BAŞLATMA ---
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Backend sunucusu port ${PORT} üzerinde dinlemede...`);
    await connectToDatabase();
});
