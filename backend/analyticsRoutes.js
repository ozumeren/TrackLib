const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protectWithJWT } = require('./authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/summary', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
        const totalEvents = await prisma.event.count({ where: { customerId, createdAt: { gte: twentyFourHoursAgo } } });
        const uniquePlayers = await prisma.event.findMany({ where: { customerId, createdAt: { gte: twentyFourHoursAgo }, playerId: { not: null } }, distinct: ['playerId'], select: { playerId: true } });
        const totalRegistrations = await prisma.event.count({ where: { customerId, eventName: 'registration_completed', createdAt: { gte: twentyFourHoursAgo } } });
        const totalDeposits = await prisma.event.count({ where: { customerId, eventName: 'deposit_successful', createdAt: { gte: twentyFourHoursAgo } } });
        res.json({
            last_24_hours: {
                totalEvents,
                uniquePlayerCount: uniquePlayers.length,
                uniquePlayers: uniquePlayers.map(p => p.playerId),
                totalRegistrations,
                totalDeposits,
            },
        });
    } catch (error) {
        console.error("Özet verileri çekilirken hata:", error);
        res.status(500).json({ error: 'Özet verileri çekilemedi.' });
    }
});

router.get('/journey/:playerId', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const { playerId } = req.params;
    try {
        const events = await prisma.event.findMany({ where: { customerId, playerId }, orderBy: { createdAt: 'desc' }, take: 100 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: 'Oyuncu yolculuğu çekilemedi.' });
    }
});

router.post('/funnel', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const { steps, days = 7 } = req.body;
    if (!steps || !Array.isArray(steps) || steps.length < 2) {
        return res.status(400).json({ error: 'Huni için en az 2 adım gereklidir.' });
    }
    try {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const funnelResults = [];
        let progressingSessionIds = null;
        for (let i = 0; i < steps.length; i++) {
            const stepName = steps[i];
            let queryConditions = {
                customerId,
                eventName: stepName,
                createdAt: { gte: startDate },
            };
            if (progressingSessionIds !== null) {
                if (progressingSessionIds.length === 0) {
                    funnelResults.push({ step: stepName, count: 0 });
                    continue;
                }
                queryConditions.sessionId = { in: progressingSessionIds };
            }
            const uniqueSessionsInStep = await prisma.event.findMany({
                where: queryConditions,
                distinct: ['sessionId'],
                select: { sessionId: true },
            });
            const count = uniqueSessionsInStep.length;
            funnelResults.push({ step: stepName, count });
            progressingSessionIds = uniqueSessionsInStep.map(p => p.sessionId);
        }
        res.json({ funnelResults });
    } catch (error) {
        console.error('Huni analizi hatası:', error);
        res.status(500).json({ error: 'Huni analizi yapılamadı.' });
    }
});

router.get('/abandoned-deposits', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const days = parseInt(req.query.days || '7', 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
        // 1. Adım ve 2. Adım (Aynı kalıyor)
        const viewedDepositPagePlayers = await prisma.event.findMany({
            where: { customerId, eventName: 'deposit_page_view', createdAt: { gte: startDate }, playerId: { not: null } },
            distinct: ['playerId'], select: { playerId: true },
        });
        const viewedPlayerIds = new Set(viewedDepositPagePlayers.map(p => p.playerId));

        const successfulDepositPlayers = await prisma.event.findMany({
            where: { customerId, eventName: 'deposit_successful', createdAt: { gte: startDate }, playerId: { in: Array.from(viewedPlayerIds) } },
            distinct: ['playerId'], select: { playerId: true },
        });
        const successfulPlayerIds = new Set(successfulDepositPlayers.map(p => p.playerId));

        // 3. Adım (Aynı kalıyor)
        const abandonedPlayerIds = [...viewedPlayerIds].filter(id => !successfulPlayerIds.has(id));

        if (abandonedPlayerIds.length === 0) {
            return res.json({ periodInDays: days, abandonedCount: 0, players: [] });
        }

        // 4. YENİ Adım: Terk eden her oyuncunun en son denediği yatırım miktarını bul.
        const abandonedPlayersWithAmount = await Promise.all(
            abandonedPlayerIds.map(async (playerId) => {
                const lastAttempt = await prisma.event.findFirst({
                    where: {
                        customerId,
                        playerId,
                        eventName: 'deposit_page_view',
                        createdAt: { gte: startDate },
                        // parameters alanının 'amount' anahtarına sahip olduğundan emin ol
                        parameters: { path: ['amount'], not: 'null' }
                    },
                    orderBy: { createdAt: 'desc' }, // En son denemeyi bul
                });

                return {
                    playerId: playerId,
                    // Eğer 'amount' parametresi varsa onu, yoksa null döndür
                    lastAttemptedAmount: lastAttempt?.parameters?.amount || null,
                    lastAttemptDate: lastAttempt?.createdAt || null,
                };
            })
        );

        res.json({
            periodInDays: days,
            abandonedCount: abandonedPlayersWithAmount.length,
            players: abandonedPlayersWithAmount,
        });

    } catch (error) {
        console.error("Terk edilmiş yatırım analizi hatası:", error);
        res.status(500).json({ error: 'Veri analizi yapılamadı.' });
    }
});

router.get('/timeseries', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const days = parseInt(req.query.days || '7', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
        // Son 'days' güne ait ilgili olayları çek
        const events = await prisma.event.findMany({
            where: {
                customerId,
                createdAt: { gte: startDate },
                eventName: { in: ['login_successful', 'registration_completed', 'deposit_successful'] }
            },
            select: {
                eventName: true,
                createdAt: true,
            }
        });

        // Veriyi günlere göre grupla
        const dailyData = {};
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0]; // 'YYYY-MM-DD' formatı
            dailyData[key] = { date: key, logins: 0, registrations: 0, deposits: 0 };
        }

        events.forEach(event => {
            const key = event.createdAt.toISOString().split('T')[0];
            if (dailyData[key]) {
                if (event.eventName === 'login_successful') dailyData[key].logins++;
                if (event.eventName === 'registration_completed') dailyData[key].registrations++;
                if (event.eventName === 'deposit_successful') dailyData[key].deposits++;
            }
        });
        
        // Obje'yi sıralı bir diziye dönüştür
        const sortedData = Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json(sortedData);
    } catch (error) {
        console.error("Zaman serisi verileri çekilirken hata:", error);
        res.status(500).json({ error: 'Grafik verileri alınamadı.' });
    }
});
router.get('/live-events', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const limit = parseInt(req.query.limit || '20', 10);
    const after = req.query.after; // Timestamp for pagination

    try {
        const whereClause = {
            customerId: customerId,
        };

        // Eğer 'after' parametresi varsa, sadece o zamandan sonraki eventleri al
        if (after) {
            whereClause.createdAt = {
                gt: new Date(after)
            };
        }

        const events = await prisma.event.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                eventName: true,
                playerId: true,
                parameters: true,
                url: true,
                createdAt: true,
                sessionId: true,
            }
        });

        // Event'leri zenginleştir
        const enrichedEvents = events.map(event => ({
            id: event.id,
            eventName: event.eventName,
            playerId: event.playerId || 'Anonymous',
            parameters: event.parameters,
            url: event.url,
            createdAt: event.createdAt,
            sessionId: event.sessionId,
            // Event type'a göre icon ve renk
            metadata: getEventMetadata(event.eventName, event.parameters)
        }));

        res.json({
            events: enrichedEvents,
            timestamp: new Date().toISOString(),
            count: enrichedEvents.length
        });

    } catch (error) {
        console.error('Live events error:', error);
        res.status(500).json({ error: 'Canlı eventler alınamadı.' });
    }
});

// Event metadata helper function
function getEventMetadata(eventName, parameters) {
    const metadata = {
        icon: '📊',
        color: 'blue',
        label: eventName
    };

    switch (eventName) {
        case 'page_view':
            metadata.icon = '👁️';
            metadata.color = 'gray';
            metadata.label = 'Sayfa Görüntüleme';
            break;
        case 'login_successful':
            metadata.icon = '🔐';
            metadata.color = 'green';
            metadata.label = 'Giriş Başarılı';
            break;
        case 'registration_completed':
            metadata.icon = '✨';
            metadata.color = 'violet';
            metadata.label = 'Kayıt Tamamlandı';
            break;
        case 'deposit_successful':
            metadata.icon = '💰';
            metadata.color = 'teal';
            metadata.label = 'Para Yatırma';
            if (parameters?.amount) {
                metadata.value = `${parameters.amount} ${parameters.currency || 'TRY'}`;
            }
            break;
        case 'deposit_failed':
            metadata.icon = '❌';
            metadata.color = 'red';
            metadata.label = 'Yatırma Başarısız';
            break;
        case 'withdrawal_requested':
            metadata.icon = '💸';
            metadata.color = 'yellow';
            metadata.label = 'Para Çekme Talebi';
            if (parameters?.amount) {
                metadata.value = `${parameters.amount} ${parameters.currency || 'TRY'}`;
            }
            break;
        case 'withdrawal_successful':
            metadata.icon = '✅';
            metadata.color = 'green';
            metadata.label = 'Para Çekme Başarılı';
            if (parameters?.amount) {
                metadata.value = `${parameters.amount} ${parameters.currency || 'TRY'}`;
            }
            break;
        case 'withdrawal_failed':
            metadata.icon = '❌';
            metadata.color = 'red';
            metadata.label = 'Para Çekme Başarısız';
            if (parameters?.amount) {
                metadata.value = `${parameters.amount} ${parameters.currency || 'TRY'}`;
            }
            break;
        case 'player_identified':
            metadata.icon = '👤';
            metadata.color = 'blue';
            metadata.label = 'Oyuncu Tanımlandı';
            break;
        default:
            metadata.icon = '📌';
            metadata.color = 'gray';
            metadata.label = eventName.replace(/_/g, ' ');
    }

    return metadata;
}

module.exports = router;

