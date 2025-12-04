// backend/routes/fraudRoutes.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { protectWithJWT } = require('../authMiddleware');
const { analyticsLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================
// GET FRAUD ALERTS
// ============================================

/**
 * GET /api/fraud/alerts
 * Get all fraud alerts with filtering
 */
router.get('/alerts', protectWithJWT, analyticsLimiter, async (req, res) => {
    try {
        const customerId = req.user.customerId;
        const { status, severity, alertType, limit = 50, offset = 0 } = req.query;

        const where = { customerId };

        if (status) where.status = status;
        if (severity) where.severity = severity;
        if (alertType) where.alertType = alertType;

        const [alerts, total] = await Promise.all([
            prisma.fraudAlert.findMany({
                where,
                include: {
                    player: {
                        select: {
                            playerId: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: parseInt(limit),
                skip: parseInt(offset)
            }),
            prisma.fraudAlert.count({ where })
        ]);

        res.json({
            alerts,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        logger.error('Error fetching fraud alerts', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch fraud alerts' });
    }
});

/**
 * GET /api/fraud/alerts/:alertId
 * Get a specific fraud alert by ID
 */
router.get('/alerts/:alertId', protectWithJWT, async (req, res) => {
    try {
        const { alertId } = req.params;
        const customerId = req.user.customerId;

        const alert = await prisma.fraudAlert.findFirst({
            where: {
                id: alertId,
                customerId
            },
            include: {
                player: {
                    select: {
                        playerId: true,
                        email: true,
                        riskProfile: true
                    }
                }
            }
        });

        if (!alert) {
            return res.status(404).json({ error: 'Fraud alert not found' });
        }

        res.json(alert);
    } catch (error) {
        logger.error('Error fetching fraud alert', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch fraud alert' });
    }
});

/**
 * PUT /api/fraud/alerts/:alertId/review
 * Review and update fraud alert status
 */
router.put('/alerts/:alertId/review', protectWithJWT, async (req, res) => {
    try {
        const { alertId } = req.params;
        const { status, action } = req.body;
        const customerId = req.user.customerId;
        const reviewedBy = req.user.email;

        // Validate status
        const validStatuses = ['PENDING', 'REVIEWED', 'CONFIRMED', 'FALSE_POSITIVE'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Validate action
        const validActions = ['FLAGGED', 'LIMITED', 'BLOCKED', 'VERIFICATION_REQUIRED'];
        if (action && !validActions.includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const alert = await prisma.fraudAlert.findFirst({
            where: {
                id: alertId,
                customerId
            }
        });

        if (!alert) {
            return res.status(404).json({ error: 'Fraud alert not found' });
        }

        const updatedAlert = await prisma.fraudAlert.update({
            where: { id: alertId },
            data: {
                status: status || alert.status,
                action: action || alert.action,
                actionTaken: action ? true : alert.actionTaken,
                reviewedBy,
                reviewedAt: new Date()
            },
            include: {
                player: {
                    select: {
                        playerId: true,
                        email: true
                    }
                }
            }
        });

        logger.info('Fraud alert reviewed', {
            alertId,
            status,
            action,
            reviewedBy
        });

        res.json(updatedAlert);
    } catch (error) {
        logger.error('Error reviewing fraud alert', { error: error.message });
        res.status(500).json({ error: 'Failed to review fraud alert' });
    }
});

// ============================================
// PLAYER RISK PROFILES
// ============================================

/**
 * GET /api/fraud/risk-profiles
 * Get all player risk profiles
 */
router.get('/risk-profiles', protectWithJWT, analyticsLimiter, async (req, res) => {
    try {
        const customerId = req.user.customerId;
        const { riskLevel, limit = 50, offset = 0 } = req.query;

        const where = { customerId };
        if (riskLevel) where.riskLevel = riskLevel;

        const [profiles, total] = await Promise.all([
            prisma.playerRiskProfile.findMany({
                where,
                include: {
                    player: {
                        select: {
                            playerId: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    riskScore: 'desc'
                },
                take: parseInt(limit),
                skip: parseInt(offset)
            }),
            prisma.playerRiskProfile.count({ where })
        ]);

        res.json({
            profiles,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        logger.error('Error fetching risk profiles', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch risk profiles' });
    }
});

/**
 * GET /api/fraud/risk-profiles/:playerId
 * Get risk profile for a specific player
 */
router.get('/risk-profiles/:playerId', protectWithJWT, async (req, res) => {
    try {
        const { playerId } = req.params;
        const customerId = req.user.customerId;

        const player = await prisma.player.findFirst({
            where: {
                playerId,
                customerId
            },
            include: {
                riskProfile: true,
                fraudAlerts: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 10
                }
            }
        });

        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        res.json(player);
    } catch (error) {
        logger.error('Error fetching player risk profile', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch player risk profile' });
    }
});

// ============================================
// FRAUD STATISTICS
// ============================================

/**
 * GET /api/fraud/stats
 * Get fraud detection statistics
 */
router.get('/stats', protectWithJWT, analyticsLimiter, async (req, res) => {
    try {
        const customerId = req.user.customerId;
        const { days = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Get alert counts by status
        const alertsByStatus = await prisma.fraudAlert.groupBy({
            by: ['status'],
            where: {
                customerId,
                createdAt: { gte: startDate }
            },
            _count: {
                id: true
            }
        });

        // Get alert counts by severity
        const alertsBySeverity = await prisma.fraudAlert.groupBy({
            by: ['severity'],
            where: {
                customerId,
                createdAt: { gte: startDate }
            },
            _count: {
                id: true
            }
        });

        // Get alert counts by type
        const alertsByType = await prisma.fraudAlert.groupBy({
            by: ['alertType'],
            where: {
                customerId,
                createdAt: { gte: startDate }
            },
            _count: {
                id: true
            }
        });

        // Get high-risk players count
        const highRiskPlayersCount = await prisma.playerRiskProfile.count({
            where: {
                customerId,
                riskLevel: { in: ['HIGH', 'CRITICAL'] }
            }
        });

        // Get total alerts count
        const totalAlerts = await prisma.fraudAlert.count({
            where: {
                customerId,
                createdAt: { gte: startDate }
            }
        });

        // Get pending alerts count
        const pendingAlerts = await prisma.fraudAlert.count({
            where: {
                customerId,
                status: 'PENDING'
            }
        });

        res.json({
            period: `${days} days`,
            totalAlerts,
            pendingAlerts,
            highRiskPlayersCount,
            alertsByStatus: alertsByStatus.reduce((acc, item) => {
                acc[item.status] = item._count.id;
                return acc;
            }, {}),
            alertsBySeverity: alertsBySeverity.reduce((acc, item) => {
                acc[item.severity] = item._count.id;
                return acc;
            }, {}),
            alertsByType: alertsByType.reduce((acc, item) => {
                acc[item.alertType] = item._count.id;
                return acc;
            }, {})
        });
    } catch (error) {
        logger.error('Error fetching fraud stats', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch fraud statistics' });
    }
});

module.exports = router;
