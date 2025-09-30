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

module.exports = router;

