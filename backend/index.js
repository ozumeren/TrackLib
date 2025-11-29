// ============================================
// iGAMING TRACKER - BACKEND SERVER
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
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
const segmentEvaluator = require('./services/segmentEvaluator');
const ruleEngine = require('./services/ruleEngine');
const https = require('https');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { validateBody, validateParams } = require('./middleware/validate');
const schemas = require('./validators/schemas');
const {
    generalLimiter,
    authLimiter,
    eventTrackingLimiter,
    registrationLimiter,
    analyticsLimiter,
    adminLimiter,
    scriptServingLimiter
} = require('./middleware/rateLimiter');

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
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

// ============================================
// MIDDLEWARE
// ============================================
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Authorization, X-Script-Version',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// HTTP request logging
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined', { stream: logger.stream }));
} else {
    app.use(morgan('dev'));
}

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
app.use('/api/analytics', analyticsLimiter, analyticsRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

// Basic health check - Returns 200 if server is running
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Detailed readiness check - Validates all dependencies
app.get('/ready', async (req, res) => {
    const checks = {
        server: 'ok',
        database: 'checking',
        redis: 'checking',
        timestamp: new Date().toISOString()
    };

    let isReady = true;

    // Check database connection
    try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = 'ok';
    } catch (error) {
        checks.database = 'error';
        checks.databaseError = error.message;
        isReady = false;
    }

    // Check Redis connection
    try {
        await redis.ping();
        checks.redis = 'ok';
    } catch (error) {
        checks.redis = 'error';
        checks.redisError = error.message;
        isReady = false;
    }

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json({
        status: isReady ? 'ready' : 'not_ready',
        checks: checks
    });
});

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

// YENİ: Script ID bazlı route

app.get('/scripts/:scriptId.js', scriptServingLimiter, async (req, res) => {
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
            backendUrl: `${BACKEND_URL}/v1/events`,
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
app.get('/s/:scriptId.js', scriptServingLimiter, async (req, res) => {
    try {
        const { scriptId } = req.params;

        // Script ID formatını kontrol et (güvenlik)
        if (!/^[a-zA-Z0-9_-]+$/.test(scriptId)) {
            return res.status(400)
                .type('application/javascript; charset=utf-8')
                .send('console.error("TrackLib: Invalid script ID.");');
        }

        const customer = await prisma.customer.findUnique({ 
            where: { scriptId } 
        });
        
        if (!customer) {
            return res.status(404)
                .type('application/javascript; charset=utf-8')
                .send('console.error("TrackLib: Customer not found. Invalid script ID.");');
        }

        const templatePath = path.join(__dirname, 'public', 'tracker-template.js');
        
        if (!fs.existsSync(templatePath)) {
            return res.status(500)
                .type('application/javascript; charset=utf-8')
                .send('console.error("TrackLib: Template file not found.");');
        }

        let scriptContent = fs.readFileSync(templatePath, 'utf8');
        
        const config = {
            scriptId: scriptId,
            apiKey: customer.apiKey,
            backendUrl: `${BACKEND_URL}/v1/events`,
            domConfig: customer.domConfig || {}
        };
        
        scriptContent = scriptContent.replace('__CONFIG__', JSON.stringify(config));
        
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.removeHeader('X-Content-Type-Options');
        
        res.send(scriptContent);
        
        console.log(`✅ Script served: ${scriptId} from ${req.get('origin') || 'direct'}`);
        
    } catch (error) {
        console.error("Script generation error:", error);
        res.status(500)
            .type('application/javascript; charset=utf-8')
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

authRoutes.post('/register', registrationLimiter, validateBody(schemas.registerSchema), async (req, res) => {
    const { customerName, scriptId, userName, email, password } = req.body;

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

authRoutes.post('/login', validateBody(schemas.loginSchema), async (req, res) => {
    const { email, password } = req.body;

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

app.use('/api/auth', authLimiter, authRoutes);

// ============================================
// DOMAIN MANAGEMENT ROUTES
// ============================================
app.put('/api/customers/domains', protectWithJWT, isOwner, validateBody(schemas.domainsSchema), async (req, res) => {
    try {
        const { domains } = req.body;

        // Clean and normalize domains (validation already checked format)
        const cleanDomains = domains
            .map(d => d.trim().toLowerCase())
            .filter(d => d.length > 0);

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

// ============================================
// TELEGRAM WEBHOOK ROUTE
// ============================================
app.post('/telegram-webhook', validateBody(schemas.telegramWebhookSchema), async (req, res) => {
    const { chatId, apiKey } = req.body;

    try {
        await prisma.customer.update({
            where: { apiKey },
            data: { telegramChatId: chatId },
        });

        logger.info('Telegram Chat ID registered', { apiKey });
        res.json({ message: 'Telegram Chat ID başarıyla kaydedildi.' });

    } catch (error) {
        logger.error('Telegram webhook error:', { error: error.message, apiKey });
        res.status(500).json({ error: 'Chat ID kaydedilemedi.' });
    }
});

// ============================================
// AUTOMATION ENGINE (CRON JOB)
// ============================================

cron.schedule('*/5 * * * *', async () => {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    console.log(`⏰ [${timestamp}] Segment ve Kural Otomasyon motoru çalışıyor...`);

    try {
        // 1. Tüm müşterileri al
        const customers = await prisma.customer.findMany({
            select: { id: true, name: true }
        });

        for (const customer of customers) {
            console.log(`🔍 Processing customer: ${customer.name}`);

            // 2. Segmentleri değerlendir
            await segmentEvaluator.evaluateAllSegments(customer.id);

            // 3. Kuralları çalıştır
            const players = await prisma.player.findMany({
                where: { customerId: customer.id }
            });

            for (const player of players) {
                await ruleEngine.evaluatePlayer(player.playerId, customer.id);
            }
        }

        console.log(`✅ Automation cycle completed`);

    } catch (error) {
        console.error('❌ Automation engine error:', error);
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
    console.log(`📝 API Documentation: ${BACKEND_URL}/api`);
    console.log(`🎯 Script Endpoint: ${BACKEND_URL}/s/tracklib_deneme.js\n`);
});

app.post('/v1/events', eventTrackingLimiter, validateEventOrigin, protectWithApiKey, validateBody(schemas.eventSchema), async (req, res) => {
    const eventData = req.body;
    const customer = req.customer;

    // IP Address capture
    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                 || req.headers['x-real-ip']
                 || req.ip
                 || req.socket.remoteAddress
                 || 'Unknown';

    // IPv6 localhost normalization (::1 → 127.0.0.1)
    if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
        ipAddress = '127.0.0.1';
    }

    // IPv6 mapped IPv4 normalization (::ffff:192.168.1.1 → 192.168.1.1)
    if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.replace('::ffff:', '');
    }

    console.log('🌐 Captured IP:', ipAddress);

    try {
        // Rate limiting check
        const rateLimitKey = `rate:${customer.apiKey}:${eventData.session_id}`;
        const requestCount = await redis.incr(rateLimitKey);

        if (requestCount === 1) {
            await redis.expire(rateLimitKey, 60); // 1 minute
        }

        if (requestCount > 100) {
            console.log(`⚠️  Rate limit exceeded: ${customer.name}`);
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }

        // Create/update player record
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

        // Save event
        await prisma.event.create({
            data: {
                apiKey: eventData.api_key,
                sessionId: eventData.session_id,
                playerId: eventData.player_id || null,
                eventName: eventData.event_name,
                url: eventData.url || '',
                parameters: eventData.parameters || {},
                ipAddress: ipAddress,
                customerId: customer.id,
                createdAt: eventData.timestamp_utc ? new Date(eventData.timestamp_utc) : new Date(),
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

// HTTPS Server (opsiyonel - sadece sertifika varsa)
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };

    https.createServer(httpsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
        const httpsUrl = BACKEND_URL.replace('http:', 'https:').replace(`:${PORT}`, `:${HTTPS_PORT}`);
        console.log(`🔒 HTTPS Server running on port ${HTTPS_PORT}`);
        console.log(`   ${httpsUrl}`);
        console.log(`⚠️  Using self-signed certificate\n`);
    });
} else {
    console.log(`\n⚠️  HTTPS disabled - cert.pem and key.pem not found`);
    console.log(`   To enable HTTPS, run:`);
    console.log(`   cd backend`);
    console.log(`   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"\n`);
}

// ============================================
// GENERAL RATE LIMITING (Apply to all remaining routes)
// ============================================
app.use(generalLimiter);

// ============================================
// ERROR HANDLERS (Must be last)
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

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
