// backend/services/fraudDetection.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

// ============================================
// CONFIGURATION
// ============================================

const FRAUD_CONFIG = {
    // Multi-account thresholds
    MAX_ACCOUNTS_PER_IP: 3,
    IP_CHECK_DAYS: 30,

    // Rapid withdrawal thresholds
    RAPID_WITHDRAWAL_HOURS: 2,
    MIN_DEPOSIT_BEFORE_WITHDRAWAL: 50,

    // Risk score weights
    WEIGHTS: {
        MULTI_ACCOUNT: 30,
        VPN_USAGE: 15,
        RAPID_WITHDRAWAL: 25,
        HIGH_CHARGEBACK: 20,
        SUSPICIOUS_PATTERN: 10
    },

    // Risk levels
    RISK_LEVELS: {
        LOW: { min: 0, max: 30 },
        MEDIUM: { min: 31, max: 60 },
        HIGH: { min: 61, max: 80 },
        CRITICAL: { min: 81, max: 100 }
    }
};

// ============================================
// FRAUD DETECTION FUNCTIONS
// ============================================

/**
 * Check for multi-account fraud based on IP address
 */
async function checkMultiAccountFraud(playerId, ipAddress, customerId) {
    try {
        if (!ipAddress) return null;

        // Find all unique players from the same IP in the last N days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - FRAUD_CONFIG.IP_CHECK_DAYS);

        const playersFromSameIP = await prisma.event.groupBy({
            by: ['playerId'],
            where: {
                ipAddress: ipAddress,
                customerId: customerId,
                playerId: { not: null },
                createdAt: {
                    gte: startDate
                }
            },
            _count: {
                playerId: true
            }
        });

        const accountCount = playersFromSameIP.length;

        if (accountCount > FRAUD_CONFIG.MAX_ACCOUNTS_PER_IP) {
            // Get player record
            const player = await prisma.player.findFirst({
                where: {
                    playerId: playerId,
                    customerId: customerId
                }
            });

            if (!player) return null;

            // Create fraud alert
            const alert = await createFraudAlert({
                playerId: player.id,
                alertType: 'MULTI_ACCOUNT',
                severity: accountCount > 5 ? 'CRITICAL' : 'HIGH',
                riskScore: Math.min(FRAUD_CONFIG.WEIGHTS.MULTI_ACCOUNT * (accountCount / 3), 100),
                reason: `Detected ${accountCount} accounts from IP ${ipAddress} in the last ${FRAUD_CONFIG.IP_CHECK_DAYS} days`,
                evidence: {
                    ipAddress,
                    accountCount,
                    accounts: playersFromSameIP.map(p => p.playerId),
                    checkPeriodDays: FRAUD_CONFIG.IP_CHECK_DAYS
                },
                customerId
            });

            logger.warn('Multi-account fraud detected', {
                playerId,
                ipAddress,
                accountCount,
                alertId: alert.id
            });

            return alert;
        }

        return null;
    } catch (error) {
        logger.error('Error checking multi-account fraud', { error: error.message, playerId, ipAddress });
        return null;
    }
}

/**
 * Check for rapid deposit-withdrawal pattern
 */
async function checkRapidWithdrawalFraud(playerId, eventName, customerId) {
    try {
        if (eventName !== 'withdrawal_initiated') return null;

        const player = await prisma.player.findFirst({
            where: {
                playerId: playerId,
                customerId: customerId
            }
        });

        if (!player) return null;

        // Check for deposits in the last N hours
        const checkDate = new Date();
        checkDate.setHours(checkDate.getHours() - FRAUD_CONFIG.RAPID_WITHDRAWAL_HOURS);

        const recentDeposits = await prisma.event.findMany({
            where: {
                playerId: playerId,
                customerId: customerId,
                eventName: 'deposit_completed',
                createdAt: {
                    gte: checkDate
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const recentWithdrawals = await prisma.event.findMany({
            where: {
                playerId: playerId,
                customerId: customerId,
                eventName: 'withdrawal_initiated',
                createdAt: {
                    gte: checkDate
                }
            }
        });

        // Calculate total deposit amount
        const totalDeposit = recentDeposits.reduce((sum, event) => {
            const amount = event.parameters?.amount || 0;
            return sum + parseFloat(amount);
        }, 0);

        // Check if withdrawal is happening too quickly after deposit
        if (recentDeposits.length > 0 && totalDeposit >= FRAUD_CONFIG.MIN_DEPOSIT_BEFORE_WITHDRAWAL) {
            const timeSinceDeposit = Date.now() - new Date(recentDeposits[0].createdAt).getTime();
            const hoursSinceDeposit = timeSinceDeposit / (1000 * 60 * 60);

            if (hoursSinceDeposit < FRAUD_CONFIG.RAPID_WITHDRAWAL_HOURS) {
                const alert = await createFraudAlert({
                    playerId: player.id,
                    alertType: 'RAPID_DEPOSIT_WITHDRAWAL',
                    severity: 'HIGH',
                    riskScore: FRAUD_CONFIG.WEIGHTS.RAPID_WITHDRAWAL,
                    reason: `Withdrawal initiated ${hoursSinceDeposit.toFixed(1)} hours after deposit`,
                    evidence: {
                        depositCount: recentDeposits.length,
                        withdrawalCount: recentWithdrawals.length,
                        totalDepositAmount: totalDeposit,
                        hoursSinceDeposit: hoursSinceDeposit.toFixed(1),
                        threshold: FRAUD_CONFIG.RAPID_WITHDRAWAL_HOURS
                    },
                    customerId
                });

                logger.warn('Rapid withdrawal fraud detected', {
                    playerId,
                    hoursSinceDeposit: hoursSinceDeposit.toFixed(1),
                    alertId: alert.id
                });

                return alert;
            }
        }

        return null;
    } catch (error) {
        logger.error('Error checking rapid withdrawal fraud', { error: error.message, playerId });
        return null;
    }
}

/**
 * Detect VPN/Proxy usage based on IP patterns
 */
function detectVpnUsage(ipAddress) {
    // Common VPN/Proxy IP ranges (simplified check)
    // In production, use a service like IPQualityScore, MaxMind, etc.

    if (!ipAddress) return false;

    // Common datacenter IP patterns (basic check)
    const datacenterPatterns = [
        /^5\./, // Certain VPN ranges
        /^185\./, // Common VPN providers
        /^195\./, // VPN ranges
    ];

    return datacenterPatterns.some(pattern => pattern.test(ipAddress));
}

/**
 * Calculate overall risk score for a player
 */
async function calculateRiskScore(playerId, customerId) {
    try {
        const player = await prisma.player.findFirst({
            where: {
                playerId: playerId,
                customerId: customerId
            },
            include: {
                riskProfile: true
            }
        });

        if (!player) return 0;

        let riskScore = 0;

        // Get risk profile or create default
        const profile = player.riskProfile || {
            hasMultipleAccounts: false,
            isVpnUser: false,
            rapidWithdrawal: false,
            chargebacks: 0
        };

        // Add risk points based on flags
        if (profile.hasMultipleAccounts) {
            riskScore += FRAUD_CONFIG.WEIGHTS.MULTI_ACCOUNT;
        }

        if (profile.isVpnUser) {
            riskScore += FRAUD_CONFIG.WEIGHTS.VPN_USAGE;
        }

        if (profile.rapidWithdrawal) {
            riskScore += FRAUD_CONFIG.WEIGHTS.RAPID_WITHDRAWAL;
        }

        if (profile.chargebacks > 0) {
            riskScore += FRAUD_CONFIG.WEIGHTS.HIGH_CHARGEBACK * Math.min(profile.chargebacks, 3);
        }

        if (profile.suspiciousPattern) {
            riskScore += FRAUD_CONFIG.WEIGHTS.SUSPICIOUS_PATTERN;
        }

        return Math.min(riskScore, 100);
    } catch (error) {
        logger.error('Error calculating risk score', { error: error.message, playerId });
        return 0;
    }
}

/**
 * Determine risk level from risk score
 */
function getRiskLevel(riskScore) {
    const levels = FRAUD_CONFIG.RISK_LEVELS;

    if (riskScore >= levels.CRITICAL.min) return 'CRITICAL';
    if (riskScore >= levels.HIGH.min) return 'HIGH';
    if (riskScore >= levels.MEDIUM.min) return 'MEDIUM';
    return 'LOW';
}

/**
 * Create or update player risk profile
 */
async function updatePlayerRiskProfile(playerId, ipAddress, customerId) {
    try {
        const player = await prisma.player.findFirst({
            where: {
                playerId: playerId,
                customerId: customerId
            }
        });

        if (!player) return null;

        // Check for VPN usage
        const isVpnUser = detectVpnUsage(ipAddress);

        // Get existing profile or create new one
        let profile = await prisma.playerRiskProfile.findUnique({
            where: { playerId: player.id }
        });

        // Collect unique IPs for this player
        const playerIPs = await prisma.event.groupBy({
            by: ['ipAddress'],
            where: {
                playerId: playerId,
                customerId: customerId,
                ipAddress: { not: null }
            }
        });

        const uniqueIPs = playerIPs.map(e => e.ipAddress);

        // Check for multi-account flag
        const hasMultipleAccounts = await checkIfHasMultipleAccounts(playerId, ipAddress, customerId);

        // Calculate risk score
        const riskScore = await calculateRiskScore(playerId, customerId);
        const riskLevel = getRiskLevel(riskScore);

        if (!profile) {
            // Create new profile
            profile = await prisma.playerRiskProfile.create({
                data: {
                    playerId: player.id,
                    customerId: customerId,
                    riskScore,
                    riskLevel,
                    isVpnUser,
                    hasMultipleAccounts,
                    ipAddresses: uniqueIPs,
                    deviceIds: [], // To be implemented with device fingerprinting
                    lastRiskCheck: new Date()
                }
            });
        } else {
            // Update existing profile
            profile = await prisma.playerRiskProfile.update({
                where: { playerId: player.id },
                data: {
                    riskScore,
                    riskLevel,
                    isVpnUser,
                    hasMultipleAccounts,
                    ipAddresses: uniqueIPs,
                    lastRiskCheck: new Date()
                }
            });
        }

        return profile;
    } catch (error) {
        logger.error('Error updating player risk profile', { error: error.message, playerId });
        return null;
    }
}

/**
 * Check if player has multiple accounts from same IP
 */
async function checkIfHasMultipleAccounts(playerId, ipAddress, customerId) {
    if (!ipAddress) return false;

    const accountsFromIP = await prisma.event.groupBy({
        by: ['playerId'],
        where: {
            ipAddress: ipAddress,
            customerId: customerId,
            playerId: { not: null }
        }
    });

    return accountsFromIP.length > FRAUD_CONFIG.MAX_ACCOUNTS_PER_IP;
}

/**
 * Create a fraud alert
 */
async function createFraudAlert(data) {
    try {
        const alert = await prisma.fraudAlert.create({
            data: {
                playerId: data.playerId,
                alertType: data.alertType,
                severity: data.severity,
                riskScore: data.riskScore,
                reason: data.reason,
                evidence: data.evidence,
                customerId: data.customerId,
                status: 'PENDING'
            }
        });

        logger.info('Fraud alert created', {
            alertId: alert.id,
            playerId: data.playerId,
            alertType: data.alertType,
            severity: data.severity
        });

        return alert;
    } catch (error) {
        logger.error('Error creating fraud alert', { error: error.message, data });
        throw error;
    }
}

/**
 * Main fraud detection entry point
 * Called when a new event is tracked
 */
async function detectFraud(eventData) {
    try {
        const { playerId, eventName, ipAddress, customerId } = eventData;

        if (!playerId || !customerId) return;

        const alerts = [];

        // Run fraud checks
        const multiAccountAlert = await checkMultiAccountFraud(playerId, ipAddress, customerId);
        if (multiAccountAlert) alerts.push(multiAccountAlert);

        const rapidWithdrawalAlert = await checkRapidWithdrawalFraud(playerId, eventName, customerId);
        if (rapidWithdrawalAlert) alerts.push(rapidWithdrawalAlert);

        // Update player risk profile
        await updatePlayerRiskProfile(playerId, ipAddress, customerId);

        return alerts;
    } catch (error) {
        logger.error('Error in fraud detection', { error: error.message, eventData });
        return [];
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    detectFraud,
    checkMultiAccountFraud,
    checkRapidWithdrawalFraud,
    calculateRiskScore,
    updatePlayerRiskProfile,
    createFraudAlert,
    FRAUD_CONFIG
};
