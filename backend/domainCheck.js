// backend/middleware/domainCheck.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script çağrılarını doğrular - sadece izin verilen domain'lerden geliyorsa kabul eder
 */
async function validateScriptOrigin(req, res, next) {
    try {
        const { scriptId } = req.params;
        const origin = req.get('origin') || req.get('referer');
        
        // Origin bulunamadıysa (direct access vs) geçir
        if (!origin) {
            return next();
        }

        // URL'den domain çıkar
        const originDomain = new URL(origin).hostname;

        // Customer'ı bul
        const customer = await prisma.customer.findUnique({
            where: { scriptId },
            select: { allowedDomains: true, name: true }
        });

        if (!customer) {
            return res.status(404)
                .type('text/javascript')
                .send('console.error("TrackLib: Invalid script ID");');
        }

        // Eğer allowedDomains boşsa (henüz ayarlanmamış), geçir
        if (!customer.allowedDomains || customer.allowedDomains.length === 0) {
            console.log(`⚠️  WARNING: ${customer.name} has no domain restrictions`);
            return next();
        }

        // Domain kontrolü yap
        const isAllowed = customer.allowedDomains.some(allowed => {
            // Wildcard desteği: *.example.com
            if (allowed.startsWith('*.')) {
                const baseDomain = allowed.substring(2);
                return originDomain.endsWith(baseDomain);
            }
            return originDomain === allowed;
        });

        if (!isAllowed) {
            console.log(`🚫 BLOCKED: ${originDomain} tried to use ${scriptId}`);
            return res.status(403)
                .type('text/javascript')
                .send(`console.error("TrackLib: Domain '${originDomain}' not authorized");`);
        }

        console.log(`✅ ALLOWED: ${originDomain} using ${scriptId}`);
        next();

    } catch (error) {
        console.error('Domain validation error:', error);
        next(); // Hata durumunda script'i engelleme, geçir
    }
}

/**
 * Event gönderimlerini doğrular
 */
async function validateEventOrigin(req, res, next) {
    try {
        const apiKey = req.body.api_key;
        const eventUrl = req.body.url; // Event'in gönderildiği sayfa URL'i

        if (!eventUrl) {
            return next(); // URL yoksa geçir
        }

        const eventDomain = new URL(eventUrl).hostname;

        const customer = await prisma.customer.findUnique({
            where: { apiKey },
            select: { allowedDomains: true, name: true }
        });

        if (!customer) {
            return res.status(403).json({ error: 'Invalid API key' });
        }

        // Domain kısıtlaması yoksa geçir
        if (!customer.allowedDomains || customer.allowedDomains.length === 0) {
            return next();
        }

        // Domain kontrolü
        const isAllowed = customer.allowedDomains.some(allowed => {
            if (allowed.startsWith('*.')) {
                const baseDomain = allowed.substring(2);
                return eventDomain.endsWith(baseDomain);
            }
            return eventDomain === allowed;
        });

        if (!isAllowed) {
            console.log(`🚫 EVENT BLOCKED: ${eventDomain} for ${customer.name}`);
            return res.status(403).json({ 
                error: 'Domain not authorized',
                domain: eventDomain 
            });
        }

        next();

    } catch (error) {
        console.error('Event origin validation error:', error);
        next(); // Hata durumunda geçir
    }
}

module.exports = { validateScriptOrigin, validateEventOrigin };