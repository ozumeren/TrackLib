// ============================================
// iGAMING TRACKER - BACKEND SERVER
// ============================================

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
const axios = require('axios');
const https = require('https');

const httpsOptions = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem')
};
// ============================================
// INITIALIZATION
// ============================================
const app = express();
const prisma = new PrismaClient();
const redis = new Redis();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const JWT_SECRET = process.env.JWT_SECRET || 'bu-cok-gizli-bir-anahtar-ve-asla-degismemeli-12345';

// ============================================
// MIDDLEWARE
// ============================================
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Authorization, X-Script-Version',
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.static('public'));

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
const { protectWithJWT, protectWithApiKey, isOwner, isAdmin } = require('./authMiddleware');

// Domain validation middleware (opsiyonel - dosyayı oluşturmanız gerekiyor)
let validateScriptOrigin, validateEventOrigin;
try {
  const domainCheck = require('./middleware/domainCheck');
  validateScriptOrigin = domainCheck.validateScriptOrigin;
  validateEventOrigin = domainCheck.validateEventOrigin;
} catch (err) {
  console.log('⚠️  Domain validation middleware not found, skipping...');
  validateScriptOrigin = (req, res, next) => next();
  validateEventOrigin = (req, res, next) => next();
}

// ============================================
// EXTERNAL ROUTES
// ============================================
const analyticsRoutes = require('./analyticsRoutes');
const segmentRoutes = require('./segmentRoutes');
const ruleRoutes = require('./ruleRoutes');
const userRoutes = require('./userRoutes');
const customerRoutes = require('./customerRoutes');
const adminRoutes = require('./adminRoutes');
const playerProfileRoutes = require('./playerProfileRoutes');

app.use('/api/player-profile', playerProfileRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// HELPER FUNCTION - Create Default Data
// ============================================
async function createPredefinedData(customerId) {
  try {
    await prisma.segment.createMany({
      data: [
        {
          name: 'Aktif Oyuncular (Son 7 Gün)',
          description: 'Son 7 gün içinde en az bir kez giriş yapmış olan tüm oyuncular.',
          criteria: { 
            "rules": [
              { 
                "fact": "loginCount", 
                "operator": "greaterThanOrEqual", 
                "value": 1, 
                "periodInDays": 7 
              }
            ] 
          },
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
              actionPayload: { 
                "messageTemplate": "Merhaba {playerName}, seni tekrar aramızda görmeyi çok isteriz!" 
              },
            },
            {
              name: 'Varyant B: Free Spin Teklifi',
              actionType: 'SEND_TELEGRAM_MESSAGE',
              actionPayload: { 
                "messageTemplate": "Merhaba {playerName}! Geri dönmen için hesabına 10 Free Spin ekledik. Kaçırma!" 
              },
            },
          ],
        },
      },
    });

    console.log(`✅ Default data created for customer ID: ${customerId}`);
  } catch (error) {
    console.error(`❌ Error creating default data for customer ${customerId}:`, error);
  }
}

// ============================================
// SCRIPT SERVING ROUTES
// ============================================

// YENİ: Script ID bazlı route (pix_ronabet.js gibi)
app.get('/scripts/:scriptId.js', async (req, res) => {
    try {
        const { scriptId } = req.params;
        
        // Script ID formatını kontrol et (güvenlik)
        if (!/^[a-zA-Z0-9_-]+$/.test(scriptId)) {
            return res.status(400)
                .type('application/javascript; charset=utf-8')  // ✅ charset eklendi
                .send('console.error("TrackLib: Invalid script ID.");');
        }

        const customer = await prisma.customer.findUnique({ 
            where: { scriptId } 
        });
        
        if (!customer) {
            return res.status(404)
                .type('application/javascript; charset=utf-8')  // ✅ charset eklendi
                .send('console.error("TrackLib: Customer not found. Invalid script ID.");');
        }

        const templatePath = path.join(__dirname, 'public', 'tracker-template.js');
        
        if (!fs.existsSync(templatePath)) {
            return res.status(500)
                .type('application/javascript; charset=utf-8')  // ✅ charset eklendi
                .send('console.error("TrackLib: Template file not found.");');
        }

        let scriptContent = fs.readFileSync(templatePath, 'utf8');
        
        const config = {
            scriptId: scriptId,
            apiKey: customer.apiKey,
            backendUrl: `http://37.27.72.40:3000/v1/events`,
            domConfig: customer.domConfig || {}
        };
        
        scriptContent = scriptContent.replace('__CONFIG__', JSON.stringify(config));
        
        // ✅ DOĞRU HEADER SIRALAMASI
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        // ✅ X-Content-Type-Options kaldırıldı veya doğru ayarlandı
        res.removeHeader('X-Content-Type-Options');
        
        res.send(scriptContent);
        
        console.log(`✅ Script served: ${scriptId} from ${req.get('origin') || 'direct'}`);
        
    } catch (error) {
        console.error("Script generation error:", error);
        res.status(500)
            .type('application/javascript; charset=utf-8')  // ✅ charset eklendi
            .send('console.error("TrackLib: Script generation failed");');
    }
});
// ESKİ: API Key bazlı route (geriye dönük uyumluluk için)
app.get('/tracker/:apiKey.js', async (req, res) => {
    try {
        const { apiKey } = req.params;
        const customer = await prisma.customer.findUnique({ where: { apiKey } });
        
        if (!customer) {
            return res.status(404)
                .type('text/javascript')
                .send('console.error("TrackLib: Customer not found");');
        }

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

// ============================================
// AUTHENTICATION ROUTES
// ============================================
const authRoutes = express.Router();

authRoutes.post('/register', async (req, res) => {
    const { customerName, scriptId, userName, email, password } = req.body;
    
    // Validasyon
    if (!customerName || !scriptId || !userName || !email || !password) {
        return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
    }

    // Script ID formatı kontrolü
    if (!/^pix_[a-z0-9_]+$/.test(scriptId)) {
        return res.status(400).json({ 
            error: 'Script ID "pix_" ile başlamalı ve sadece küçük harf, rakam ve alt çizgi içerebilir.' 
        });
    }

    try {
        // Script ID benzersiz mi kontrol et
        const existingCustomer = await prisma.customer.findFirst({
            where: { 
              OR: [
                { scriptId: scriptId },
                { apiKey: scriptId }
              ]
            }
        });

        if (existingCustomer) {
            return res.status(400).json({ 
                error: 'Bu Script ID zaten kullanılıyor. Lütfen başka bir tane deneyin.' 
            });
        }

        // Şifreyi hashle
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // API Key oluştur
        const apiKey = `trk_${crypto.randomBytes(16).toString('hex')}`;
        
        // Müşteri ve kullanıcı oluştur
        const newCustomer = await prisma.customer.create({
            data: {
                name: customerName,
                apiKey: apiKey,
                scriptId: scriptId,
                allowedDomains: [], // Boş array, sonra müşteri ekleyecek
                users: {
                    create: { 
                        name: userName, 
                        email: email, 
                        password: hashedPassword, 
                        role: 'OWNER' 
                    },
                },
            },
            include: {
                users: true
            }
        });
        
        // Varsayılan segment ve rule'ları oluştur
        await createPredefinedData(newCustomer.id);
        
        res.status(201).json({ 
            message: 'Müşteri başarıyla oluşturuldu.',
            scriptId: scriptId,
            scriptUrl: `/scripts/${scriptId}.js`,
            integrationCode: `<script id="${scriptId}" src="http://${req.get('host')}/scripts/${scriptId}.js" async></script>`
        });
        
        console.log(`✅ New customer registered: ${customerName} (${scriptId})`);
        
    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === 'P2002') {
            const field = error.meta?.target?.[0];
            if (field === 'email') {
                return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanılıyor.' });
            } else if (field === 'scriptId') {
                return res.status(400).json({ error: 'Bu Script ID zaten kullanılıyor.' });
            }
        }
        
        res.status(500).json({ error: 'Kullanıcı oluşturulamadı.' });
    }
});

authRoutes.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'E-posta ve şifre gereklidir.' });
    }
    
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) {
            return res.status(401).json({ error: 'Geçersiz kimlik bilgileri.' });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Geçersiz kimlik bilgileri.' });
        }
        
        const token = jwt.sign(
            { userId: user.id, customerId: user.customerId, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({ 
            name: user.name, 
            role: user.role, 
            email: user.email, 
            token: token 
        });
        
        console.log(`✅ User logged in: ${email}`);
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Giriş yapılamadı.' });
    }
});

app.use('/api/auth', authRoutes);

// ============================================
// DOMAIN MANAGEMENT ROUTES
// ============================================
app.put('/api/customers/domains', protectWithJWT, isOwner, async (req, res) => {
    try {
        const { domains } = req.body;
        
        if (!Array.isArray(domains)) {
            return res.status(400).json({ error: 'Domains must be an array' });
        }

        // Her domain'i temizle ve doğrula
        const cleanDomains = domains
            .map(d => d.trim().toLowerCase())
            .filter(d => d.length > 0)
            .filter(d => {
                return /^(\*\.)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(d);
            });

        await prisma.customer.update({
            where: { id: req.user.customerId },
            data: { allowedDomains: cleanDomains }
        });

        res.json({ 
            message: 'Domains updated successfully',
            domains: cleanDomains 
        });

    } catch (error) {
        console.error('Domain update error:', error);
        res.status(500).json({ error: 'Failed to update domains' });
    }
});

app.get('/api/customers/domains', protectWithJWT, async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: req.user.customerId },
            select: { allowedDomains: true }
        });

        res.json({ domains: customer?.allowedDomains || [] });

    } catch (error) {
        console.error('Domain fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch domains' });
    }
});

// ============================================
// EVENT TRACKING ROUTE
// ============================================
app.options('/v1/events', cors(corsOptions));

app.post('/v1/events', validateEventOrigin, protectWithApiKey, async (req, res) => {
    const eventData = req.body;
    const customer = req.customer;
    
    try {
        // Rate limiting kontrolü
        const rateLimitKey = `rate:${customer.apiKey}:${eventData.session_id}`;
        const requestCount = await redis.incr(rateLimitKey);
        
        if (requestCount === 1) {
            await redis.expire(rateLimitKey, 60); // 1 dakika
        }
        
        if (requestCount > 100) {
            console.log(`⚠️  Rate limit exceeded: ${customer.name}`);
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }

        // Player kaydı oluştur/güncelle
        if (eventData.player_id) {
            await prisma.player.upsert({
                where: { 
                    playerId_customerId: { 
                        playerId: eventData.player_id, 
                        customerId: customer.id 
                    } 
                },
                update: {},
                create: { 
                    playerId: eventData.player_id, 
                    customerId: customer.id 
                },
            });
        }

        // Event'i kaydet
        await prisma.event.create({
            data: {
                apiKey: eventData.api_key,
                sessionId: eventData.session_id,
                playerId: eventData.player_id || null,
                eventName: eventData.event_name,
                url: eventData.url || '',
                parameters: eventData.parameters || {},
                customerId: customer.id,
                createdAt: eventData.timestamp_utc ? new Date(eventData.timestamp_utc) : new Date()
            },
        });

        // A/B Test conversion tracking
        if (eventData.player_id) {
            const abTestEntry = await redis.get(`ab_test:${eventData.player_id}`);
            
            if (abTestEntry) {
                const { variantId } = JSON.parse(abTestEntry);
                const variant = await prisma.ruleVariant.findUnique({ 
                    where: { id: variantId }, 
                    include: { rule: true } 
                });
                
                if (variant && eventData.event_name === variant.rule.conversionGoalEvent) {
                    await prisma.ruleVariant.update({
                        where: { id: variantId },
                        data: { conversions: { increment: 1 } },
                    });
                    console.log(`✅ A/B Test conversion recorded for variant ${variantId}`);
                }
            }
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Event tracking error:', error);
        res.status(500).json({ error: 'Failed to track event' });
    }
});

// ============================================
// TELEGRAM WEBHOOK ROUTE
// ============================================
app.post('/telegram-webhook', async (req, res) => {
    const { chatId, apiKey } = req.body;
    
    if (!chatId || !apiKey) {
        return res.status(400).json({ error: 'chatId ve apiKey gereklidir.' });
    }

    try {
        await prisma.customer.update({
            where: { apiKey },
            data: { telegramChatId: chatId },
        });
        
        res.json({ message: 'Telegram Chat ID başarıyla kaydedildi.' });
        console.log(`✅ Telegram Chat ID registered for API Key: ${apiKey}`);
        
    } catch (error) {
        console.error('Telegram webhook error:', error);
        res.status(500).json({ error: 'Chat ID kaydedilemedi.' });
    }
});

// ============================================
// AUTOMATION ENGINE (CRON JOB)
// ============================================
cron.schedule('* * * * *', async () => {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    console.log(`⏰ [${timestamp}] Otomasyon motoru çalışıyor...`);

    try {
        const activeRules = await prisma.rule.findMany({
            where: { isActive: true },
            include: { 
                customer: true, 
                variants: true 
            },
        });

        for (const rule of activeRules) {
            const players = await prisma.player.findMany({
                where: { customerId: rule.customerId },
            });

            for (const player of players) {
                let shouldTrigger = false;

                if (rule.triggerType === 'INACTIVITY') {
                    const minutesAgo = rule.config.minutes;
                    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);

                    const recentEvent = await prisma.event.findFirst({
                        where: {
                            customerId: rule.customerId,
                            playerId: player.playerId,
                            createdAt: { gte: cutoffTime },
                        },
                    });

                    shouldTrigger = !recentEvent;
                }

                if (shouldTrigger) {
                    console.log(`🎯 Rule "${rule.name}" triggered for player: ${player.playerId}`);

                    let abTestEntry = await redis.get(`ab_test:${player.playerId}`);
                    let variant;

                    if (abTestEntry) {
                        const { variantId } = JSON.parse(abTestEntry);
                        variant = rule.variants.find((v) => v.id === variantId);
                    }

                    if (!variant) {
                        const randomIndex = Math.floor(Math.random() * rule.variants.length);
                        variant = rule.variants[randomIndex];

                        await redis.set(
                            `ab_test:${player.playerId}`,
                            JSON.stringify({ variantId: variant.id }),
                            'EX',
                            60 * 60 * 24 * 30
                        );
                    }

                    // Execute action based on type
                    switch (variant.actionType) {
                        case 'SEND_TELEGRAM_MESSAGE':
                            if (rule.customer.telegramBotToken && rule.customer.telegramChatId) {
                                const bot = new TelegramBot(rule.customer.telegramBotToken);
                                const messageTemplate = variant.actionPayload.messageTemplate;
                                const finalMessage = messageTemplate.replace('{playerName}', player.playerId);

                                try {
                                    await bot.sendMessage(rule.customer.telegramChatId, finalMessage);
                                    console.log(`✅ Telegram message sent to ${player.playerId}`);
                                } catch (err) {
                                    console.error(`❌ Telegram error:`, err.message);
                                }
                            }
                            break;

                        case 'FORWARD_TO_META':
                            if (rule.customer.metaPixelId && rule.customer.metaAccessToken) {
                                const eventName = variant.actionPayload.eventName || 'Lead';

                                const payload = {
                                    data: [{
                                        event_name: eventName,
                                        event_time: Math.floor(Date.now() / 1000),
                                        action_source: 'website',
                                        user_data: {
                                            client_user_id: crypto.createHash('sha256').update(player.playerId).digest('hex'),
                                            em: player.email ? [crypto.createHash('sha256').update(player.email.toLowerCase()).digest('hex')] : [],
                                        },
                                    }],
                                };

                                const url = `https://graph.facebook.com/v19.0/${rule.customer.metaPixelId}/events?access_token=${rule.customer.metaAccessToken}`;

                                try {
                                    await axios.post(url, payload);
                                    console.log(`✅ Meta CAPI event sent: ${eventName} for ${player.playerId}`);
                                } catch (axiosError) {
                                    console.error(`❌ Meta CAPI error:`, axiosError.response?.data?.error?.message || axiosError.message);
                                }
                            }
                            break;

                        case 'FORWARD_TO_GOOGLE_ADS':
                            if (rule.customer.googleAdsId && rule.customer.googleApiSecret) {
                                const eventName = variant.actionPayload.eventName || 'lead';

                                const payload = {
                                    client_id: crypto.createHash('sha256').update(player.playerId).digest('hex'),
                                    events: [{
                                        name: eventName,
                                        params: {
                                            'send_to': rule.customer.googleAdsId,
                                        },
                                    }],
                                };

                                const url = `https://www.google-analytics.com/mp/collect?api_secret=${rule.customer.googleApiSecret}&measurement_id=${rule.customer.googleAdsId}`;

                                try {
                                    await axios.post(url, payload);
                                    console.log(`✅ Google Ads event sent: ${eventName} for ${player.playerId}`);
                                } catch (axiosError) {
                                    console.error(`❌ Google Ads error:`, axiosError.response?.data?.error?.message || axiosError.message);
                                }
                            }
                            break;
                    }

                    // A/B Test istatistiklerini güncelle (gösterim)
                    await prisma.ruleVariant.update({
                        where: { id: variant.id },
                        data: { exposures: { increment: 1 } },
                    });
                }
            }
        }
    } catch (error) {
        console.error(`❌ Automation engine error:`, error);
    }
});

// ============================================
// DATABASE CONNECTION TEST
// ============================================
async function connectToDatabase() {
    console.log("🔌 Testing database connection...");
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log("✅ Database connection successful.");
    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!!! DATABASE CONNECTION FAILED !!!!");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("Prisma error details:");
        console.error(error);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        process.exit(1);
    }
}

// ============================================
// START SERVER
// ============================================

// HTTP Server
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║   iGAMING TRACKER - BACKEND SERVER    ║
    ╠════════════════════════════════════════╣
    ║   HTTP Port: ${PORT.toString().padEnd(25)} ║
    ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(22)} ║
    ╚════════════════════════════════════════╝
    `);
    
    await connectToDatabase();
    
    console.log("\n🚀 HTTP Server is ready!");
    console.log(`📝 API Documentation: http://37.27.72.40:${PORT}/api`);
    console.log(`🎯 Script Endpoint: http://37.27.72.40:${PORT}/s/pix_deneme.js\n`);
});

// HTTPS Server (opsiyonel - sadece sertifika varsa)
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };

    https.createServer(httpsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`🔒 HTTPS Server running on port ${HTTPS_PORT}`);
        console.log(`   https://37.27.72.40:${HTTPS_PORT}`);
        console.log(`⚠️  Using self-signed certificate\n`);
    });
} else {
    console.log(`\n⚠️  HTTPS disabled - cert.pem and key.pem not found`);
    console.log(`   To enable HTTPS, run:`);
    console.log(`   cd /root/tracker/backend`);
    console.log(`   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=37.27.72.40"\n`);
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', async () => {
    console.log('⚠️  SIGTERM received, shutting down gracefully...');
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\n⚠️  SIGINT received, shutting down gracefully...');
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
});
