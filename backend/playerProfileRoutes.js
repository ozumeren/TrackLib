// backend/playerProfileRoutes.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protectWithJWT } = require('./authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/player-profile/:playerId
 * Oyuncunun detaylı profilini ve tüm metriklerini döndürür
 */
router.get('/:playerId', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const { playerId } = req.params;

    try {
        // Tüm event'leri çek
        const events = await prisma.event.findMany({
            where: {
                customerId,
                playerId
            },
            orderBy: { createdAt: 'desc' },
            take: 1000 // Son 1000 event
        });

        if (events.length === 0) {
            return res.status(404).json({ error: 'Oyuncu bulunamadı.' });
        }

        // ===== GENEL BİLGİLER =====
        const firstSeen = events[events.length - 1].createdAt;
        const lastSeen = events[0].createdAt;
        const totalEvents = events.length;

        // ===== IP ANALİZİ =====
        const ipData = events
            .filter(e => e.ipAddress)
            .reduce((acc, event) => {
                const ip = event.ipAddress;
                if (!acc[ip]) {
                    acc[ip] = {
                        ipAddress: ip,
                        count: 0,
                        firstSeen: event.createdAt,
                        lastSeen: event.createdAt,
                        events: []
                    };
                }
                acc[ip].count++;
                if (event.createdAt > acc[ip].lastSeen) {
                    acc[ip].lastSeen = event.createdAt;
                }
                if (event.createdAt < acc[ip].firstSeen) {
                    acc[ip].firstSeen = event.createdAt;
                }
                // Son 5 event'i sakla
                if (acc[ip].events.length < 5) {
                    acc[ip].events.push({
                        eventName: event.eventName,
                        date: event.createdAt,
                        url: event.url
                    });
                }
                return acc;
            }, {});

        const ipHistory = Object.values(ipData).sort((a, b) => b.count - a.count);
        const uniqueIPCount = ipHistory.length;
        const mostUsedIP = ipHistory[0] || null;
        const currentIP = events[0]?.ipAddress || 'Unknown';

        // IP değişikliği analizi
        const ipChanges = [];
        for (let i = 1; i < events.length; i++) {
            if (events[i].ipAddress && events[i-1].ipAddress && 
                events[i].ipAddress !== events[i-1].ipAddress) {
                ipChanges.push({
                    from: events[i].ipAddress,
                    to: events[i-1].ipAddress,
                    date: events[i-1].createdAt
                });
            }
        }
        const recentIPChanges = ipChanges.slice(0, 5);

        // ===== DEPOSIT ANALİZİ =====
        const depositEvents = events.filter(e => e.eventName === 'deposit_successful');
        const deposits = depositEvents.map(e => ({
            amount: e.parameters?.amount || 0,
            currency: e.parameters?.currency || 'TRY',
            date: e.createdAt,
            method: e.parameters?.payment_method || 'unknown'
        }));

        const totalDeposit = deposits.reduce((sum, d) => sum + d.amount, 0);
        const depositCount = deposits.length;
        const avgDepositAmount = depositCount > 0 ? totalDeposit / depositCount : 0;

        // ===== WITHDRAWAL ANALİZİ =====
        const withdrawalEvents = events.filter(e => e.eventName === 'withdrawal_successful');
        const withdrawals = withdrawalEvents.map(e => ({
            amount: e.parameters?.amount || 0,
            currency: e.parameters?.currency || 'TRY',
            date: e.createdAt,
            method: e.parameters?.payment_method || 'unknown'
        }));

        const totalWithdrawal = withdrawals.reduce((sum, w) => sum + w.amount, 0);
        const withdrawalCount = withdrawals.length;

        // ===== BONUS BİLGİLERİ =====
        const bonusEvents = events.filter(e => 
            e.eventName === 'bonus_requested' || 
            e.eventName === 'bonus_credited'
        );
        const totalBonuses = bonusEvents.reduce((sum, e) => 
            sum + (e.parameters?.bonus_amount || 0), 0
        );

        // ===== LTV HESAPLAMA =====
        const ltv = totalDeposit - totalWithdrawal;

        // ===== MEVCUT BAKİYE =====
        // Son wallet_updated veya balance güncelleme eventini bul
        const balanceEvents = events.filter(e =>
            e.eventName === 'wallet_updated' ||
            e.eventName === 'balance_updated' ||
            e.parameters?.balance !== undefined ||
            e.parameters?.balance_current !== undefined ||
            e.parameters?.try_balance !== undefined
        );
        const lastBalanceEvent = balanceEvents.length > 0 ? balanceEvents[0] : null;
        const currentBalance = lastBalanceEvent?.parameters?.balance_current ||
                               lastBalanceEvent?.parameters?.try_balance ||
                               lastBalanceEvent?.parameters?.balance ||
                               0;

        // ===== AKTİVİTE İSTATİSTİKLERİ =====
        const loginCount = events.filter(e => e.eventName === 'login_successful').length;
        const registrationEvent = events.find(e => e.eventName === 'registration_completed');
        const registrationDate = registrationEvent?.createdAt || firstSeen;

        // Oyun aktiviteleri
        const gameEvents = events.filter(e => 
            e.eventName === 'game_started' || 
            e.eventName === 'game_ended'
        );
        const uniqueGames = [...new Set(gameEvents.map(e => e.parameters?.game_name).filter(Boolean))];

        // ===== BAŞARISIZ İŞLEMLER =====
        const failedDeposits = events.filter(e => e.eventName === 'deposit_failed').length;
        const failedWithdrawals = events.filter(e => e.eventName === 'withdrawal_failed').length;

        // ===== EVENT TİPLERİ DAĞILIMI =====
        const eventTypes = {};
        events.forEach(event => {
            eventTypes[event.eventName] = (eventTypes[event.eventName] || 0) + 1;
        });

        // ===== AKTİVİTE ISI HARİTASI (7 gün x 24 saat) =====
        const heatmapData = Array(7).fill(null).map(() => Array(24).fill(0));
        
        events.forEach(event => {
            const date = new Date(event.createdAt);
            const dayOfWeek = date.getDay(); // 0 = Pazar, 6 = Cumartesi
            const hour = date.getHours();
            heatmapData[dayOfWeek][hour]++;
        });

        // ===== GÜNLÜK AKTİVİTE (Son 30 gün) =====
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        
        const recentEventsFiltered = events.filter(e => new Date(e.createdAt) >= last30Days);
        
        const dailyActivity = {};
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            dailyActivity[dateKey] = 0;
        }
        
        recentEventsFiltered.forEach(event => {
            const dateKey = event.createdAt.toISOString().split('T')[0];
            if (dailyActivity[dateKey] !== undefined) {
                dailyActivity[dateKey]++;
            }
        });

        // ===== PAYMENT METHOD DAĞILIMI =====
        const paymentMethods = {};
        depositEvents.forEach(e => {
            const method = e.parameters?.payment_method || 'unknown';
            paymentMethods[method] = (paymentMethods[method] || 0) + 1;
        });

        // ===== SESSION ANALYSIS =====
        const uniqueSessions = [...new Set(events.map(e => e.sessionId))].length;
        const avgEventsPerSession = totalEvents / uniqueSessions;

        // ===== DEVICE & BROWSER INFO =====
        const deviceInfo = {
            mobile: events.filter(e => e.parameters?.device_type === 'mobile').length,
            desktop: events.filter(e => e.parameters?.device_type === 'desktop').length,
            tablet: events.filter(e => e.parameters?.device_type === 'tablet').length
        };

        // ===== RESPONSE =====
        res.json({
            playerId,
            
            // Temel bilgiler
            overview: {
                firstSeen,
                lastSeen,
                registrationDate,
                totalEvents,
                loginCount,
                uniqueSessions,
                avgEventsPerSession: avgEventsPerSession.toFixed(2)
            },

            // Finansal özet
            financial: {
                ltv,
                currentBalance,
                totalDeposit,
                totalWithdrawal,
                totalBonuses,
                depositCount,
                withdrawalCount,
                avgDepositAmount: avgDepositAmount.toFixed(2),
                netBalance: ltv,
                deposits,
                withdrawals,
                failedDeposits,
                failedWithdrawals,
                paymentMethods
            },

            // Oyun aktivitesi
            gaming: {
                totalGameSessions: gameEvents.length,
                uniqueGames: uniqueGames.length,
                favoriteGames: uniqueGames.slice(0, 5)
            },

            // Aktivite dağılımı
            activity: {
                eventTypes,
                dailyActivity: Object.entries(dailyActivity).map(([date, count]) => ({
                    date,
                    count
                })).reverse(),
                heatmapData,
                deviceInfo
            },

            // IP Tracking
            ipTracking: {
                currentIP: currentIP,
                uniqueIPCount: uniqueIPCount,
                mostUsedIP: mostUsedIP,
                ipHistory: ipHistory,
                recentIPChanges: recentIPChanges,
                totalIPChanges: ipChanges.length
            },

            // Son event'ler (timeline için)
            recentEvents: events.slice(0, 50).map(e => ({
                id: e.id,
                eventName: e.eventName,
                parameters: e.parameters,
                url: e.url,
                createdAt: e.createdAt,
                sessionId: e.sessionId
            }))
        });

    } catch (error) {
        console.error('Player profile error:', error);
        res.status(500).json({ error: 'Profil verileri alınamadı.' });
    }
});

/**
 * GET /api/player-profile/:playerId/summary
 * Hızlı özet bilgi (kartlar için)
 */
router.get('/:playerId/summary', protectWithJWT, async (req, res) => {
    const customerId = req.user.customerId;
    const { playerId } = req.params;

    try {
        const deposits = await prisma.event.aggregate({
            where: {
                customerId,
                playerId,
                eventName: 'deposit_successful'
            },
            _sum: {
                'parameters.amount': true
            },
            _count: true
        });

        const withdrawals = await prisma.event.aggregate({
            where: {
                customerId,
                playerId,
                eventName: 'withdrawal_successful'
            },
            _sum: {
                'parameters.amount': true
            },
            _count: true
        });

        // Manuel olarak deposit ve withdrawal toplamlarını hesapla
        const depositEvents = await prisma.event.findMany({
            where: {
                customerId,
                playerId,
                eventName: 'deposit_successful'
            },
            select: { parameters: true }
        });

        const withdrawalEvents = await prisma.event.findMany({
            where: {
                customerId,
                playerId,
                eventName: 'withdrawal_successful'
            },
            select: { parameters: true }
        });

        const totalDeposit = depositEvents.reduce((sum, e) => sum + (e.parameters?.amount || 0), 0);
        const totalWithdrawal = withdrawalEvents.reduce((sum, e) => sum + (e.parameters?.amount || 0), 0);

        res.json({
            totalDeposit,
            totalWithdrawal,
            ltv: totalDeposit - totalWithdrawal,
            depositCount: deposits._count,
            withdrawalCount: withdrawals._count
        });

    } catch (error) {
        console.error('Player summary error:', error);
        res.status(500).json({ error: 'Özet bilgi alınamadı.' });
    }
});

module.exports = router;