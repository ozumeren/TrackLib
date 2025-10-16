// backend/services/ruleEngine.js - Genişletilmiş Rule Engine

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class RuleEngine {
  constructor() {
    this.triggerHandlers = {
      INACTIVITY: this.handleInactivity.bind(this),
      EVENT: this.handleEvent.bind(this),
      SEGMENT_ENTRY: this.handleSegmentEntry.bind(this),
      SEGMENT_EXIT: this.handleSegmentExit.bind(this),
      TIME_BASED: this.handleTimeBased.bind(this),
      DEPOSIT_THRESHOLD: this.handleDepositThreshold.bind(this),
      WITHDRAWAL_THRESHOLD: this.handleWithdrawalThreshold.bind(this),
      LOGIN_STREAK: this.handleLoginStreak.bind(this),
      LOSS_STREAK: this.handleLossStreak.bind(this),
      WIN_STREAK: this.handleWinStreak.bind(this),
      FIRST_DEPOSIT: this.handleFirstDeposit.bind(this),
      BIRTHDAY: this.handleBirthday.bind(this),
      ACCOUNT_ANNIVERSARY: this.handleAccountAnniversary.bind(this),
      LOW_BALANCE: this.handleLowBalance.bind(this),
      HIGH_BALANCE: this.handleHighBalance.bind(this),
      GAME_SPECIFIC: this.handleGameSpecific.bind(this),
      BET_SIZE: this.handleBetSize.bind(this),
      SESSION_DURATION: this.handleSessionDuration.bind(this),
      MULTIPLE_FAILED_DEPOSITS: this.handleMultipleFailedDeposits.bind(this),
      RTP_THRESHOLD: this.handleRtpThreshold.bind(this),
      BONUS_EXPIRY: this.handleBonusExpiry.bind(this)
    };
  }

  // Ana çalıştırma fonksiyonu
  async checkAndExecuteRules(playerId, customerId, context = {}) {
    try {
      // Aktif kuralları öncelik sırasına göre getir
      const rules = await prisma.rule.findMany({
        where: {
          customerId,
          isActive: true
        },
        include: {
          variants: true
        },
        orderBy: {
          priority: 'desc'
        }
      });

      for (const rule of rules) {
        // Zaman kontrolü
        if (!this.isTimeValid(rule)) continue;

        // Koşul kontrolü
        if (!this.checkConditions(rule, context)) continue;

        // Sıklık kontrolü
        if (!await this.checkFrequency(rule, playerId)) continue;

        // Trigger kontrolü
        const handler = this.triggerHandlers[rule.triggerType];
        if (!handler) continue;

        const shouldTrigger = await handler(playerId, customerId, rule.config, context);
        
        if (shouldTrigger) {
          await this.executeRule(rule, playerId, customerId);
        }
      }
    } catch (error) {
      console.error('Rule engine error:', error);
    }
  }

  // Zaman kontrolü
  isTimeValid(rule) {
    const now = new Date();

    // Başlangıç tarihi kontrolü
    if (rule.startDate && now < new Date(rule.startDate)) {
      return false;
    }

    // Bitiş tarihi kontrolü
    if (rule.endDate && now > new Date(rule.endDate)) {
      return false;
    }

    // Aktif saatler kontrolü
    if (rule.activeHours && rule.activeHours.length > 0) {
      const currentHour = now.getHours();
      if (!rule.activeHours.includes(currentHour)) {
        return false;
      }
    }

    // Aktif günler kontrolü
    if (rule.activeDaysOfWeek && rule.activeDaysOfWeek.length > 0) {
      const currentDay = now.getDay();
      if (!rule.activeDaysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    return true;
  }

  // Koşul kontrolü
  checkConditions(rule, context) {
    if (!rule.conditions) return true;

    const conditions = rule.conditions;

    // Ülke kontrolü
    if (conditions.countries && conditions.countries.length > 0) {
      if (!context.country || !conditions.countries.includes(context.country)) {
        return false;
      }
    }

    // VIP tier kontrolü
    if (conditions.vipTiers && conditions.vipTiers.length > 0) {
      if (!context.vipTier || !conditions.vipTiers.includes(context.vipTier)) {
        return false;
      }
    }

    // Minimum yaş kontrolü
    if (conditions.minAge && context.age) {
      if (context.age < conditions.minAge) {
        return false;
      }
    }

    // Cihaz türü kontrolü
    if (conditions.deviceTypes && conditions.deviceTypes.length > 0) {
      if (!context.deviceType || !conditions.deviceTypes.includes(context.deviceType)) {
        return false;
      }
    }

    // İlk yatırım kontrolü
    if (conditions.firstDepositOnly && context.depositCount > 0) {
      return false;
    }

    // Hariç tutulan oyuncular
    if (conditions.excludedPlayerIds && conditions.excludedPlayerIds.includes(context.playerId)) {
      return false;
    }

    return true;
  }

  // Sıklık kontrolü
  async checkFrequency(rule, playerId) {
    // Maksimum çalışma sayısı kontrolü
    if (rule.maxExecutionsPerPlayer) {
      const executionCount = await prisma.ruleExecution.count({
        where: {
          ruleId: rule.id,
          playerId
        }
      });

      if (executionCount >= rule.maxExecutionsPerPlayer) {
        return false;
      }
    }

    // Cooldown kontrolü
    if (rule.cooldownPeriodDays) {
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() - rule.cooldownPeriodDays);

      const recentExecution = await prisma.ruleExecution.findFirst({
        where: {
          ruleId: rule.id,
          playerId,
          executedAt: {
            gte: cooldownDate
          }
        }
      });

      if (recentExecution) {
        return false;
      }
    }

    return true;
  }

  // ==========================================
  // TRIGGER HANDLERS
  // ==========================================

  async handleInactivity(playerId, customerId, config) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - config.days);

    const lastLogin = await prisma.event.findFirst({
      where: {
        customerId,
        playerId,
        eventName: 'login_successful',
        createdAt: {
          gte: daysAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return !lastLogin; // Giriş yoksa tetikle
  }

  async handleEvent(playerId, customerId, config, context) {
    return context.eventName === config.eventName;
  }

  async handleSegmentEntry(playerId, customerId, config, context) {
    // Oyuncunun belirtilen segmente yeni girip girmediğini kontrol et
    return context.segmentId === config.segmentId && context.action === 'entry';
  }

  async handleSegmentExit(playerId, customerId, config, context) {
    return context.segmentId === config.segmentId && context.action === 'exit';
  }

  async handleTimeBased(playerId, customerId, config) {
    const now = new Date();

    if (config.type === 'specific') {
      const targetDate = new Date(config.datetime);
      const timeDiff = Math.abs(now - targetDate);
      return timeDiff < 60000; // 1 dakika tolerans
    }

    if (config.type === 'daily') {
      const [hours, minutes] = config.time.split(':');
      return now.getHours() === parseInt(hours) && now.getMinutes() === parseInt(minutes);
    }

    if (config.type === 'monthly') {
      const [hours, minutes] = config.time.split(':');
      return now.getDate() === config.dayOfMonth && 
             now.getHours() === parseInt(hours) && 
             now.getMinutes() === parseInt(minutes);
    }

    return false;
  }

  async handleDepositThreshold(playerId, customerId, config) {
    const whereClause = {
      customerId,
      playerId,
      eventName: 'deposit_successful'
    };

    if (config.period !== 'total') {
      const date = new Date();
      if (config.period === 'daily') {
        date.setHours(0, 0, 0, 0);
      } else if (config.period === 'weekly') {
        date.setDate(date.getDate() - 7);
      } else if (config.period === 'monthly') {
        date.setMonth(date.getMonth() - 1);
      }
      whereClause.createdAt = { gte: date };
    }

    const deposits = await prisma.event.findMany({
      where: whereClause,
      select: {
        parameters: true
      }
    });

    const total = deposits.reduce((sum, event) => {
      return sum + (event.parameters?.amount || 0);
    }, 0);

    return total >= config.amount;
  }

  async handleWithdrawalThreshold(playerId, customerId, config) {
    const whereClause = {
      customerId,
      playerId,
      eventName: 'withdrawal_successful'
    };

    if (config.period !== 'total') {
      const date = new Date();
      if (config.period === 'daily') {
        date.setHours(0, 0, 0, 0);
      } else if (config.period === 'weekly') {
        date.setDate(date.getDate() - 7);
      } else if (config.period === 'monthly') {
        date.setMonth(date.getMonth() - 1);
      }
      whereClause.createdAt = { gte: date };
    }

    const withdrawals = await prisma.event.findMany({
      where: whereClause,
      select: {
        parameters: true
      }
    });

    const total = withdrawals.reduce((sum, event) => {
      return sum + (event.parameters?.amount || 0);
    }, 0);

    return total >= config.amount;
  }

  async handleLoginStreak(playerId, customerId, config) {
    const logins = await prisma.event.findMany({
      where: {
        customerId,
        playerId,
        eventName: 'login_successful'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: config.consecutiveDays
    });

    if (logins.length < config.consecutiveDays) return false;

    // Ardışık günleri kontrol et
    for (let i = 0; i < logins.length - 1; i++) {
      const day1 = new Date(logins[i].createdAt).setHours(0, 0, 0, 0);
      const day2 = new Date(logins[i + 1].createdAt).setHours(0, 0, 0, 0);
      const diffDays = (day1 - day2) / (1000 * 60 * 60 * 24);
      
      if (diffDays !== 1) return false;
    }

    return true;
  }

  async handleLossStreak(playerId, customerId, config) {
    const bets = await prisma.event.findMany({
      where: {
        customerId,
        playerId,
        eventName: 'bet_result'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: config.consecutiveCount
    });

    if (bets.length < config.consecutiveCount) return false;

    // Tüm bahislerin kaybetme olup olmadığını kontrol et
    return bets.every(bet => {
      const amount = bet.parameters?.amount || 0;
      if (config.minBetAmount && amount < config.minBetAmount) return false;
      return bet.parameters?.result === 'loss';
    });
  }

  async handleWinStreak(playerId, customerId, config) {
    const bets = await prisma.event.findMany({
      where: {
        customerId,
        playerId,
        eventName: 'bet_result'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: config.consecutiveCount
    });

    if (bets.length < config.consecutiveCount) return false;

    return bets.every(bet => {
      const amount = bet.parameters?.amount || 0;
      if (config.minBetAmount && amount < config.minBetAmount) return false;
      return bet.parameters?.result === 'win';
    });
  }

  async handleFirstDeposit(playerId, customerId, config, context) {
    if (context.eventName !== 'deposit_successful') return false;

    const previousDeposits = await prisma.event.count({
      where: {
        customerId,
        playerId,
        eventName: 'deposit_successful',
        createdAt: {
          lt: new Date(context.timestamp)
        }
      }
    });

    return previousDeposits === 0;
  }

  async handleBirthday(playerId, customerId, config, context) {
    if (!context.birthdate) return false;

    const today = new Date();
    const birthdate = new Date(context.birthdate);
    
    const daysUntilBirthday = this.getDaysUntilDate(
      birthdate.getMonth(),
      birthdate.getDate()
    );

    return daysUntilBirthday === (config.daysBefore || 0);
  }

  async handleAccountAnniversary(playerId, customerId, config, context) {
    if (!context.registrationDate) return false;

    const registrationDate = new Date(context.registrationDate);
    const today = new Date();
    
    const yearsDiff = today.getFullYear() - registrationDate.getFullYear();
    
    if (yearsDiff !== config.yearsSince) return false;

    // Aynı ay ve gün mü?
    return registrationDate.getMonth() === today.getMonth() &&
           registrationDate.getDate() === today.getDate();
  }

  async handleLowBalance(playerId, customerId, config, context) {
    return context.balance !== undefined && context.balance < config.threshold;
  }

  async handleHighBalance(playerId, customerId, config, context) {
    return context.balance !== undefined && context.balance > config.threshold;
  }

  async handleGameSpecific(playerId, customerId, config, context) {
    if (context.gameId !== config.gameId) return false;
    return context.eventName === config.eventType;
  }

  async handleBetSize(playerId, customerId, config, context) {
    if (context.eventName !== 'bet_placed') return false;
    
    const amount = context.betAmount || 0;
    return amount >= config.minAmount && amount <= config.maxAmount;
  }

  async handleSessionDuration(playerId, customerId, config, context) {
    if (!context.sessionDuration) return false;
    
    const durationMinutes = context.sessionDuration / 60000; // ms to minutes
    
    if (config.trigger === 'ongoing') {
      return durationMinutes >= config.durationMinutes;
    } else if (config.trigger === 'ended') {
      return context.sessionEnded && durationMinutes >= config.durationMinutes;
    }
    
    return false;
  }

  async handleMultipleFailedDeposits(playerId, customerId, config) {
    const timeAgo = new Date();
    timeAgo.setMinutes(timeAgo.getMinutes() - config.withinMinutes);

    const failedDeposits = await prisma.event.count({
      where: {
        customerId,
        playerId,
        eventName: 'deposit_failed',
        createdAt: {
          gte: timeAgo
        }
      }
    });

    return failedDeposits >= config.failedCount;
  }

  async handleRtpThreshold(playerId, customerId, config) {
    const bets = await prisma.event.findMany({
      where: {
        customerId,
        playerId,
        eventName: 'bet_result'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: config.minimumBets
    });

    if (bets.length < config.minimumBets) return false;

    const totalWagered = bets.reduce((sum, bet) => sum + (bet.parameters?.wagered || 0), 0);
    const totalWon = bets.reduce((sum, bet) => sum + (bet.parameters?.won || 0), 0);
    
    const rtp = (totalWon / totalWagered) * 100;

    if (config.operator === 'lessThan') {
      return rtp < config.rtpPercentage;
    } else if (config.operator === 'greaterThan') {
      return rtp > config.rtpPercentage;
    }

    return false;
  }

  async handleBonusExpiry(playerId, customerId, config, context) {
    if (!context.bonusExpiryDate) return false;

    const expiryDate = new Date(context.bonusExpiryDate);
    const now = new Date();
    
    const hoursUntilExpiry = (expiryDate - now) / (1000 * 60 * 60);

    if (config.bonusType && context.bonusType !== config.bonusType) {
      return false;
    }

    return hoursUntilExpiry <= config.hoursBefore && hoursUntilExpiry > 0;
  }

  // ==========================================
  // RULE EXECUTION
  // ==========================================

  async executeRule(rule, playerId, customerId) {
    try {
      // Varyant seç (ağırlıklı rastgele)
      const variant = this.selectVariant(rule.variants);
      
      if (!variant) {
        console.error('No variant selected for rule:', rule.id);
        return;
      }

      // Aksiyonu çalıştır
      await this.executeAction(variant, playerId, customerId);

      // Execution kaydı oluştur
      await prisma.ruleExecution.create({
        data: {
          ruleId: rule.id,
          variantId: variant.id,
          playerId,
          customerId,
          success: true
        }
      });

      // Varyant istatistiklerini güncelle
      await prisma.ruleVariant.update({
        where: { id: variant.id },
        data: {
          exposures: {
            increment: 1
          }
        }
      });

      // Kural istatistiklerini güncelle
      await prisma.rule.update({
        where: { id: rule.id },
        data: {
          totalExecutions: {
            increment: 1
          },
          lastExecutedAt: new Date()
        }
      });

      console.log(`✅ Rule executed: ${rule.name} for player ${playerId}`);
    } catch (error) {
      console.error('Rule execution error:', error);
      
      await prisma.ruleExecution.create({
        data: {
          ruleId: rule.id,
          playerId,
          customerId,
          success: false,
          errorMessage: error.message
        }
      });
    }
  }

  // Ağırlıklı rastgele varyant seçimi
  selectVariant(variants) {
    if (!variants || variants.length === 0) return null;

    const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const variant of variants) {
      random -= (variant.weight || 1);
      if (random <= 0) {
        return variant;
      }
    }

    return variants[0];
  }

  // Aksiyon çalıştırma
  async executeAction(variant, playerId, customerId) {
    const actionType = variant.actionType;
    const payload = variant.actionPayload;

    switch (actionType) {
      case 'SEND_TELEGRAM_MESSAGE':
        await this.sendTelegramMessage(playerId, customerId, payload);
        break;
      case 'SEND_EMAIL':
        await this.sendEmail(playerId, customerId, payload);
        break;
      case 'SEND_SMS':
        await this.sendSMS(playerId, customerId, payload);
        break;
      case 'ADD_BONUS':
        await this.addBonus(playerId, customerId, payload);
        break;
      case 'ADD_FREE_SPINS':
        await this.addFreeSpins(playerId, customerId, payload);
        break;
      // Diğer aksiyon türleri için handler'lar eklenebilir
      default:
        console.log(`Action type ${actionType} not implemented yet`);
    }
  }

  // Yardımcı fonksiyonlar
  getDaysUntilDate(month, day) {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), month, day);
    
    if (targetDate < today) {
      targetDate.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Aksiyon implementasyonları (placeholder)
  async sendTelegramMessage(playerId, customerId, payload) {
    // Telegram bot implementasyonu
    console.log('Sending Telegram message:', playerId, payload);
  }

  async sendEmail(playerId, customerId, payload) {
    // Email gönderimi
    console.log('Sending email:', playerId, payload);
  }

  async sendSMS(playerId, customerId, payload) {
    // SMS gönderimi
    console.log('Sending SMS:', playerId, payload);
  }

  async addBonus(playerId, customerId, payload) {
    // Bonus ekleme
    console.log('Adding bonus:', playerId, payload);
  }

  async addFreeSpins(playerId, customerId, payload) {
    // Free spin ekleme
    console.log('Adding free spins:', playerId, payload);
  }
}

module.exports = new RuleEngine();