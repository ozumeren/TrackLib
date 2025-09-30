// --- Gerekli Kütüphaneler ---
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
app.use(express.json());

// --- Harici Route Dosyaları ---
const { protectWithJWT, protectWithApiKey, isOwner } = require('./authMiddleware');
const analyticsRoutes = require('./analyticsRoutes');
const segmentRoutes = require('./segmentRoutes');
const ruleRoutes = require('./ruleRoutes');
const userRoutes = require('./userRoutes');
const customerRoutes = require('./customerRoutes');

// --- ROTALAR (ROUTES) ---
app.use('/api/analytics', analyticsRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);

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
            backendUrl: `http://${req.get('host')}/v1/events`
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
            res.json({ name: user.name, email: user.email, token: token });
        } else {
            res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Giriş yapılamadı.' });
    }
});
app.use('/api/auth', authRoutes);

// 4. Olay Toplama ve Telegram Webhook Rotaları
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
                const { ruleId, variantId, goalEvent } = JSON.parse(abTestEntry);
                const rule = await prisma.rule.findUnique({ where: { id: ruleId } });
                if (eventData.event_name === rule?.conversionGoalEvent) {
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

// --- OTOMASYON ZAMANLAYICI (SCHEDULER) ---
cron.schedule('*/1 * * * *', async () => {
    // A/B Testi, Segmentasyon ve Tetikleyici motorları
});

// --- Veritabanı "Isıtma" Fonksiyonu ---
async function connectToDatabase() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log("Veritabanı bağlantısı başarılı.");
    } catch (error) {
        console.error("!!! Veritabanına bağlanılamadı. !!!");
        process.exit(1);
    }
}

// --- SUNUCUYU BAŞLATMA ---
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Backend sunucusu port ${PORT} üzerinde dinlemede...`);
    await connectToDatabase();
});

