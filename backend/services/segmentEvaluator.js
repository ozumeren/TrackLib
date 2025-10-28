// backend/services/segmentEvaluator.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SegmentEvaluator {
  
  async evaluatePlayerForSegment(playerId, customerId, segment) {
    const criteria = segment.criteria;
    
    if (!criteria || !criteria.rules || criteria.rules.length === 0) {
      return false;
    }

    // Tüm kuralları kontrol et (AND logic)
    for (const rule of criteria.rules) {
      const matches = await this.evaluateRule(playerId, customerId, rule);
      if (!matches) {
        return false; // Bir kural bile uymazsa segment'e dahil değil
      }
    }

    return true; // Tüm kurallar uyuyor
  }

  async evaluateRule(playerId, customerId, rule) {
    const { fact, operator, value, periodInDays } = rule;

    let actualValue;

    // Fact'e göre değer hesapla
    switch (fact) {
      case 'loginCount':
        actualValue = await this.getLoginCount(playerId, customerId, periodInDays);
        break;
      
      case 'totalDeposit':
        actualValue = await this.getTotalDeposit(playerId, customerId);
        break;
      
      case 'depositCount':
        actualValue = await this.getDepositCount(playerId, customerId);
        break;
      
      case 'lastLoginDays':
        actualValue = await this.getLastLoginDays(playerId, customerId);
        break;
      
      default:
        console.warn(`Unknown fact: ${fact}`);
        return false;
    }

    // Operator'e göre karşılaştır
    return this.compareValues(actualValue, operator, value);
  }

  compareValues(actual, operator, expected) {
    switch (operator) {
      case 'greaterThanOrEqual':
        return actual >= expected;
      case 'lessThanOrEqual':
        return actual <= expected;
      case 'greaterThan':
        return actual > expected;
      case 'lessThan':
        return actual < expected;
      case 'equals':
        return actual === expected;
      case 'notEquals':
        return actual !== expected;
      default:
        return false;
    }
  }

  // ===== DATA FETCHERS =====
  
  async getLoginCount(playerId, customerId, periodInDays) {
    const cutoffDate = periodInDays 
      ? new Date(Date.now() - periodInDays * 24 * 60 * 60 * 1000)
      : null;

    const whereClause = {
      customerId,
      playerId,
      eventName: 'login_successful'
    };

    if (cutoffDate) {
      whereClause.createdAt = { gte: cutoffDate };
    }

    return await prisma.event.count({ where: whereClause });
  }

  async getTotalDeposit(playerId, customerId) {
    const deposits = await prisma.event.findMany({
      where: {
        customerId,
        playerId,
        eventName: 'deposit_successful'
      },
      select: { parameters: true }
    });

    return deposits.reduce((sum, event) => {
      return sum + (event.parameters?.amount || 0);
    }, 0);
  }

  async getDepositCount(playerId, customerId) {
    return await prisma.event.count({
      where: {
        customerId,
        playerId,
        eventName: 'deposit_successful'
      }
    });
  }

  async getLastLoginDays(playerId, customerId) {
    const lastLogin = await prisma.event.findFirst({
      where: {
        customerId,
        playerId,
        eventName: 'login_successful'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!lastLogin) return 999; // Hiç giriş yapmamış

    const daysSince = Math.floor(
      (Date.now() - lastLogin.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSince;
  }

  // ===== BULK EVALUATION =====
  
  async evaluateAllSegments(customerId) {
    console.log(`🔍 Evaluating segments for customer: ${customerId}`);

    const segments = await prisma.segment.findMany({
      where: { customerId }
    });

    const players = await prisma.player.findMany({
      where: { customerId },
      select: { id: true, playerId: true }
    });

    for (const segment of segments) {
      const matchingPlayerIds = [];

      for (const player of players) {
        const matches = await this.evaluatePlayerForSegment(
          player.playerId, 
          customerId, 
          segment
        );

        if (matches) {
          matchingPlayerIds.push(player.id);
        }
      }

      // Segment'in player listesini güncelle
      await prisma.segment.update({
        where: { id: segment.id },
        data: {
          players: {
            set: matchingPlayerIds.map(id => ({ id }))
          }
        }
      });

      console.log(`✅ Segment "${segment.name}": ${matchingPlayerIds.length} players matched`);
    }
  }
}

module.exports = new SegmentEvaluator();