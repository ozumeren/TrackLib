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
const { protectWithJWT, protectWithApiKey, isOwner, isAdmin } = require('./authMiddleware');
const analyticsRoutes = require('./analyticsRoutes');
const segmentRoutes = require('./segmentRoutes');
const ruleRoutes = require('./ruleRoutes');
const userRoutes = require('./userRoutes');
const customerRoutes = require('./customerRoutes');
const adminRoutes = require('./adminRoutes'); // YENİ: Admin rotalarını dahil et

// --- ROTALAR (ROUTES) ---
app.use('/api/analytics', analyticsRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin', adminRoutes); // YENİ: Admin rotalarını uygulamaya ekle

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
        console.error("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!!! GİRİŞ SIRASINDA KRİTİK HATA YAKALANDI !!!!");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n");
        console.error("HATA MESAJI:", error.message);
        console.error("HATA KODU:", error.code);
        console.error("TÜM HATA OBJESİ:", JSON.stringify(error, null, 2));
        console.error("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n");
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

cron.schedule('*/1 * * * *', async () => {
    const timestamp = `[${new Date().toLocaleTimeString()}]`;
    console.log(`${timestamp} --- Otomasyon Motoru Başlatıldı ---`);

    // --- BÖLÜM 1: A/B Testi Motoru (Pasiflik) ---
    try {
        const inactivityRules = await prisma.rule.findMany({
            where: { isActive: true, triggerType: 'INACTIVITY', variants: { some: {} } },
            include: { customer: true, variants: true },
        });

        for (const rule of inactivityRules) {
            if (rule.variants.length < 2) continue;
            const inactivityMinutes = rule.config.minutes || 2;
            const threshold = new Date(Date.now() - inactivityMinutes * 60 * 1000);
            const activePlayerEvents = await prisma.event.findMany({
                where: { customerId: rule.customerId, eventName: 'login_successful', createdAt: { gte: threshold } },
                select: { playerId: true }, distinct: ['playerId'],
            });
            const activePlayerIds = activePlayerEvents.map(e => e.playerId).filter(id => id);
            const allPlayersWithConnections = await prisma.player.findMany({
                where: { customerId: rule.customerId, NOT: { playerId: { in: activePlayerIds } } },
                include: { telegramConnection: true }
            });

            if (allPlayersWithConnections.length > 0 && rule.customer.telegramBotToken) {
                const bot = new TelegramBot(rule.customer.telegramBotToken);
                for (const player of allPlayersWithConnections) {
                    if (player.telegramConnection) {
                        const variantIndex = Math.floor(Math.random() * rule.variants.length);
                        const assignedVariant = rule.variants[variantIndex];
                        
                        const abTestPayload = { ruleId: rule.id, variantId: assignedVariant.id };
                        await redis.set(`ab_test:${player.playerId}`, JSON.stringify(abTestPayload), 'EX', 60 * 60 * 24 * 7);

                        let message = assignedVariant.actionPayload.messageTemplate || "Seni özledik!";
                        message = message.replace('{playerName}', player.playerId);
                        await bot.sendMessage(player.telegramConnection.telegramChatId, message);
                        await prisma.ruleVariant.update({
                            where: { id: assignedVariant.id },
                            data: { exposures: { increment: 1 } },
                        });
                        console.log(`--> [${rule.name}] Oyuncu ${player.playerId}, [${assignedVariant.name}] varyantına atandı.`);
                        await prisma.player.delete({ where: { id: player.id } });
                    }
                }
            }
        }
    } catch (error) {
        console.error(`${timestamp} A/B Testi motoru hatası:`, error);
    }

    // --- BÖLÜM 2: SEGMENTASYON MOTORU VE TETİKLEYİCİ ---
    try {
        const segmentsBefore = await prisma.segment.findMany({
            include: { players: { select: { id: true } } }
        });
        const segmentMapBefore = new Map(segmentsBefore.map(s => [s.id, new Set(s.players.map(p => p.id))]));

        const segmentsToProcess = await prisma.segment.findMany();
        for (const segment of segmentsToProcess) {
            const players = await prisma.player.findMany({ where: { customerId: segment.customerId } });
            const playersToConnect = [];
            for (const player of players) {
                let matchesAllCriteria = true;
                if (!segment.criteria || !Array.isArray(segment.criteria.rules)) continue;
                for (const criteria of segment.criteria.rules) {
                    let playerStat = 0;
                    if (criteria.fact === 'loginCount') {
                       const periodInDays = criteria.periodInDays || 30;
                       const startDate = new Date(Date.now() - periodInDays * 24 * 60 * 60 * 1000);
                       playerStat = await prisma.event.count({
                           where: { playerId: player.playerId, customerId: segment.customerId, eventName: 'login_successful', createdAt: { gte: startDate } }
                       });
                    }
                    if (criteria.fact === 'totalDeposit') {
                        const depositEvents = await prisma.event.findMany({
                            where: {
                                playerId: player.playerId, customerId: segment.customerId,
                                eventName: 'deposit_successful',
                                parameters: { path: ['amount'], not: 'null' }
                            }
                        });
                        playerStat = depositEvents.reduce((total, event) => {
                            if (event.parameters && typeof event.parameters.amount === 'number') {
                                return total + event.parameters.amount;
                            }
                            return total;
                        }, 0);
                    }
                    let match = false;
                    if (criteria.operator === 'greaterThanOrEqual' && playerStat >= criteria.value) match = true;
                    if (!match) {
                        matchesAllCriteria = false;
                        break; 
                    }
                }
                if (matchesAllCriteria) {
                    playersToConnect.push({ id: player.id });
                }
            }
            await prisma.segment.update({
                where: { id: segment.id },
                data: { players: { set: playersToConnect } }
            });
        }
        
        const segmentsAfter = await prisma.segment.findMany({
            where: { id: { in: [...segmentMapBefore.keys()] } },
            include: { players: { select: { id: true, playerId: true } } }
        });

        const segmentEntryRules = await prisma.rule.findMany({
            where: { isActive: true, triggerType: 'SEGMENT_ENTRY' },
            include: { customer: true, variants: true }
        });

        for (const segment of segmentsAfter) {
            const playersBefore = segmentMapBefore.get(segment.id) || new Set();
            for (const playerAfter of segment.players) {
                if (!playersBefore.has(playerAfter.id)) {
                    console.log(`Oyuncu [${playerAfter.playerId}], [${segment.name}] segmentine YENİ GİRDİ.`);
                    for (const rule of segmentEntryRules) {
                        if (rule.config.segmentId === segment.id) {
                            const player = await prisma.player.findUnique({ where: { id: playerAfter.id }, include: { telegramConnection: true } });
                            if (player && player.telegramConnection && rule.customer.telegramBotToken && rule.variants.length > 0) {
                                const bot = new TelegramBot(rule.customer.telegramBotToken);
                                const variant = rule.variants[Math.floor(Math.random() * rule.variants.length)];
                                let message = variant.actionPayload.messageTemplate.replace('{playerName}', player.playerId);
                                await bot.sendMessage(player.telegramConnection.telegramChatId, message);
                                await prisma.ruleVariant.update({
                                    where: { id: variant.id },
                                    data: { exposures: { increment: 1 } },
                                });
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error(`${timestamp} Segmentasyon/Tetikleyici motoru hatası:`, error);
    }
});


// --- SUNUCUYU BAŞLATMA ---
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Backend sunucusu port ${PORT} üzerinde dinlemede...`);
    await connectToDatabase();
});

