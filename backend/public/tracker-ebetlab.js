(function() {
  // Config backend tarafından enjekte edilecek
  const config = __CONFIG__;

  if (!config) {
    console.error("Strastix: Configuration not found");
    return;
  }

  console.log(`Strastix v3.0 RONA Edition initialized for ${config.scriptId}`);

  // ============================================
  // CORE VARIABLES
  // ============================================
  const tracker = {};
  let sessionId = getOrCreateSessionId();
  let playerId = null;
  let playerUsername = null;
  let playerEmail = null;
  let eventQueue = [];
  let isOnline = navigator.onLine;

  // 🆕 RONA SPECIFIC TRACKING VARIABLES
  let currentFormData = {}; // Geçici form verileri
  let pendingTransactions = new Map(); // Bekleyen işlemler
  let lastKnownBalances = new Map(); // Bakiye takibi (currency bazlı)
  let availablePaymentMethods = new Map(); // Ödeme yöntemleri cache
  let userWallets = new Map(); // Kullanıcı cüzdanları

  // 🎮 GAME TRACKING VARIABLES
  let activeGameSession = null; // Aktif oyun oturumu
  let lastGameBalance = null; // Son oyun bakiyesi
  let totalBetsInSession = 0; // Oturumdaki toplam bahis sayısı
  let totalWageredInSession = 0; // Oturumdaki toplam bahis tutarı
  let totalWonInSession = 0; // Oturumdaki toplam kazanç

  // ============================================
  // 💳 RONA PAYMENT METHOD MAPPING
  // ============================================
  const RONA_PAYMENT_MAPPING = {
    manual: {
      category: 'MANUEL',
      displayName: 'Manuel Yatırım',
      type: 'manual',
      identifiers: ['manual', 'manuel']
    },
    fast_eft: {
      category: 'HAVALE/FAST',
      displayName: 'Havale/EFT/Fast',
      type: 'bank_transfer',
      identifiers: ['fast-eft', 'fast eft', 'havale', 'eft', 'fast', 'banka']
    },
    qr: {
      category: 'QR KOD',
      displayName: 'QR Kod',
      type: 'qr',
      identifiers: ['qr', 'qr_code', 'qr kod']
    },
    vevopay: {
      category: 'VEVOPAY',
      displayName: 'VevoPay',
      type: 'gateway',
      identifiers: ['vevopay', 'vevo']
    },
    safepays: {
      category: 'SAFEPAYS',
      displayName: 'SafePays',
      type: 'gateway',
      identifiers: ['safepays', 'safepay']
    },
    aninda: {
      category: 'ANINDAPAY',
      displayName: 'AnındaPay',
      type: 'gateway',
      identifiers: ['aninda', 'anındapay', 'anindapay']
    },
    papara: {
      category: 'PAPARA',
      displayName: 'Papara',
      type: 'wallet',
      identifiers: ['papara']
    },
    payfix: {
      category: 'SANAL CÜZDAN',
      displayName: 'Payfix',
      type: 'wallet',
      identifiers: ['payfix']
    },
    parazula: {
      category: 'SANAL CÜZDAN',
      displayName: 'Parazula',
      type: 'wallet',
      identifiers: ['parazula']
    },
    mefete: {
      category: 'SANAL CÜZDAN',
      displayName: 'Mefete',
      type: 'wallet',
      identifiers: ['mefete']
    },
    bitcoin: {
      category: 'KRIPTO',
      displayName: 'Bitcoin',
      type: 'crypto',
      identifiers: ['bitcoin', 'btc']
    },
    ethereum: {
      category: 'KRIPTO',
      displayName: 'Ethereum',
      type: 'crypto',
      identifiers: ['ethereum', 'eth']
    },
    tether: {
      category: 'KRIPTO',
      displayName: 'Tether (USDT)',
      type: 'crypto',
      identifiers: ['tether', 'usdt', 'trc', 'trc20', 'erc20']
    }
  };

  // ============================================
  // SESSION MANAGEMENT
  // ============================================
  function getOrCreateSessionId() {
    const key = 'tracklib_session_id';
    let sid = localStorage.getItem(key);

    const lastActivity = localStorage.getItem('tracklib_last_activity');
    const now = Date.now();

    if (sid && lastActivity && (now - parseInt(lastActivity)) < 30 * 60 * 1000) {
      localStorage.setItem('tracklib_last_activity', now.toString());
      return sid;
    }

    sid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, sid);
    localStorage.setItem('tracklib_last_activity', now.toString());
    return sid;
  }

  // ============================================
  // EVENT SENDING WITH RETRY
  // ============================================
  async function sendEvent(eventName, params, retryCount = 0) {
    const payload = {
      api_key: config.apiKey,
      session_id: sessionId,
      player_id: playerId,
      event_name: eventName,
      parameters: {
        ...params,
        username: playerUsername,
        email: playerEmail,
        page_title: document.title,
        referrer: document.referrer || 'direct',
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        user_agent: navigator.userAgent,
        language: navigator.language,
      },
      url: window.location.href,
      timestamp_utc: new Date().toISOString()
    };

    try {
      const response = await fetch(config.backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Script-Version': '3.0-RONA'
        },
        body: JSON.stringify(payload),
        keepalive: true
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`✓ Strastix RONA: ${eventName} sent`, params);
      return true;

    } catch (error) {
      console.error(`✗ Strastix RONA: ${eventName} failed:`, error.message);

      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => sendEvent(eventName, params, retryCount + 1), delay);
      } else {
        saveToQueue(eventName, params);
      }
      return false;
    }
  }

  // ============================================
  // OFFLINE QUEUE MANAGEMENT
  // ============================================
  function saveToQueue(eventName, params) {
    try {
      const queue = JSON.parse(localStorage.getItem('tracklib_queue') || '[]');
      queue.push({ eventName, params, timestamp: Date.now() });

      if (queue.length > 50) queue.shift();

      localStorage.setItem('tracklib_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('Strastix RONA: Queue save failed', e);
    }
  }

  function processQueue() {
    try {
      const queue = JSON.parse(localStorage.getItem('tracklib_queue') || '[]');
      if (queue.length === 0) return;

      console.log(`Strastix RONA: Processing ${queue.length} queued events`);

      queue.forEach(item => {
        sendEvent(item.eventName, item.params);
      });

      localStorage.removeItem('tracklib_queue');
    } catch (e) {
      console.error('Strastix RONA: Queue process failed', e);
    }
  }

  // ============================================
  // 🆕 RONA API INTERCEPTION
  // ============================================
  function interceptNetworkRequests() {
    // Fetch API interception
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      const options = args[1] || {};

      return originalFetch.apply(this, args).then(response => {
        if (response.ok) {
          response.clone().json().then(data => {
            analyzeRonaAPIResponse(url, data, options);
          }).catch(() => {});
        }
        return response;
      });
    };

    // XMLHttpRequest interception
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
      this._url = url;
      this._method = method;
      return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
      this.addEventListener('load', function() {
        if (this.status >= 200 && this.status < 300) {
          try {
            const data = JSON.parse(this.responseText);
            analyzeRonaAPIResponse(this._url, data, { method: this._method });
          } catch (e) {}
        }
      });
      return originalSend.apply(this, arguments);
    };
  }

  // ============================================
  // 🔍 RONA API RESPONSE ANALYZER
  // ============================================
  function analyzeRonaAPIResponse(url, data, options = {}) {
    if (!url || !data) return;

    const urlStr = url.toString();

    // 1. LOGIN API
    if (urlStr.includes('/api/player/auth/login') && data.success && data.data) {
      handleRonaLogin(data.data);
    }

    // 2. LOGOUT API
    if (urlStr.includes('/api/player/user/logout') && data.success) {
      handleRonaLogout();
    }

    // 3. PAYMENT METHODS API
    if (urlStr.includes('/api/player/payment/methods-all') && data.success && data.data) {
      handleRonaPaymentMethods(data.data);
    }

    // 4. WALLET/BALANCE API
    if (urlStr.includes('/api/player/wallet/index') && data.success && data.data) {
      handleRonaWalletUpdate(data.data);
    }

    // 5. BONUS CLAIM API
    if (urlStr.includes('/api/player/bonus-request-contents/claim/') && data.success !== undefined) {
      handleRonaBonusClaim(urlStr, data);
    }

    // 6. DEPOSIT BANK INFO API (Deposit initiated)
    if (urlStr.includes('/api/player/transactions/bank-info') && data.success && data.data) {
      handleRonaDepositInitiated(data.data);
    }

    // 7. GAME SERVICE API (Game bet/spin) - Multiple providers support
    // Pragmatic Play, Evolution, NetEnt, Play'n GO, Hacksaw, vs.
    const gamePatterns = [
      '/gameService',           // Generic game service
      '/gs2c/ge/',             // Game service pattern 1
      '/game/play',            // Common game play endpoint
      '/api/game/',            // API game endpoint
      'spin',                  // Spin actions
      'bet',                   // Bet actions
      'play',                  // Play actions
      'balance'                // Balance updates (most reliable)
    ];

    const isGameAPI = gamePatterns.some(pattern =>
      urlStr.toLowerCase().includes(pattern.toLowerCase())
    );

    if (isGameAPI) {
      handleRonaGameService(urlStr, data, options);
    }

    // 🆕 FALLBACK: Generic balance change detection
    // Herhangi bir API'de balance field'ı varsa game activity olarak değerlendir
    if (data && (data.balance || data.balance_cash || data.wallet_balance)) {
      handleGenericBalanceChange(urlStr, data);
    }
  }

  // ============================================
  // 🔐 RONA LOGIN HANDLER
  // ============================================
  function handleRonaLogin(loginData) {
    playerId = loginData.id;
    playerUsername = loginData.username;
    playerEmail = loginData.email;

    console.log(`✓ RONA Login detected: ${playerUsername} (ID: ${playerId})`);

    sendEvent('login_successful', {
      player_id: playerId,
      username: playerUsername,
      email: playerEmail,
      is_streamer: loginData.is_streamer || false,
      rank: loginData.rank || 'unknown',
      turnover: loginData.turnover || '0',
      registration_date: loginData.registration || null,
      authenticator_enabled: loginData.authenticator_enabled || false
    });
  }

  // ============================================
  // 🚪 RONA LOGOUT HANDLER
  // ============================================
  function handleRonaLogout() {
    console.log(`✓ RONA Logout detected: ${playerUsername}`);

    sendEvent('logout', {
      player_id: playerId,
      username: playerUsername
    });

    // Reset player data
    playerId = null;
    playerUsername = null;
    playerEmail = null;
  }

  // ============================================
  // 💳 RONA PAYMENT METHODS HANDLER
  // ============================================
  function handleRonaPaymentMethods(methodsData) {
    console.log('💳 RONA Payment methods loaded');

    // Cache payment methods
    availablePaymentMethods.clear();

    const allMethods = [];

    // Manual methods
    if (methodsData.manual && Array.isArray(methodsData.manual)) {
      methodsData.manual.forEach(method => {
        const methodInfo = {
          id: method.id,
          name: method.display_name,
          provider: method.provider?.name || 'manual',
          category: 'manual',
          min_deposit: parseFloat(method.min_deposit),
          max_deposit: parseFloat(method.max_deposit),
          deposit_able: method.deposit_able === 1,
          withdraw_able: method.withdraw_able === 1
        };

        availablePaymentMethods.set(method.id, methodInfo);
        allMethods.push(methodInfo);
      });
    }

    // Fast-EFT methods
    if (methodsData['fast-eft'] && Array.isArray(methodsData['fast-eft'])) {
      methodsData['fast-eft'].forEach(method => {
        const methodInfo = {
          id: method.id,
          name: method.display_name,
          provider: method.provider?.name || 'fast-eft',
          category: 'fast-eft',
          min_deposit: parseFloat(method.min_deposit),
          max_deposit: parseFloat(method.max_deposit),
          deposit_able: method.deposit_able === 1,
          withdraw_able: method.withdraw_able === 1
        };

        availablePaymentMethods.set(method.id, methodInfo);
        allMethods.push(methodInfo);
      });
    }

    // QR methods
    if (methodsData.qr && Array.isArray(methodsData.qr)) {
      methodsData.qr.forEach(method => {
        const methodInfo = {
          id: method.id,
          name: method.display_name,
          provider: method.provider?.name || 'qr',
          category: 'qr',
          min_deposit: parseFloat(method.min_deposit),
          max_deposit: parseFloat(method.max_deposit),
          deposit_able: method.deposit_able === 1,
          withdraw_able: method.withdraw_able === 1
        };

        availablePaymentMethods.set(method.id, methodInfo);
        allMethods.push(methodInfo);
      });
    }

    sendEvent('payment_methods_loaded', {
      total_methods: allMethods.length,
      deposit_methods: allMethods.filter(m => m.deposit_able).length,
      withdrawal_methods: allMethods.filter(m => m.withdraw_able).length,
      methods: allMethods.map(m => ({
        name: m.name,
        provider: m.provider,
        category: m.category
      }))
    });

    console.log(`✓ ${allMethods.length} payment methods cached`);
  }

  // ============================================
  // 💰 RONA WALLET/BALANCE UPDATE HANDLER
  // ============================================
  function handleRonaWalletUpdate(walletsData) {
    if (!Array.isArray(walletsData)) return;

    console.log('💰 RONA Wallet data received');

    const balanceChanges = [];
    let totalTRYBalance = 0;
    let tryBalanceChange = null;

    walletsData.forEach(wallet => {
      const currencyCode = (wallet.code || wallet.currency?.currency || '').toString().toUpperCase();
      const currentBalance = parseFloat(wallet.balance);
      const walletId = wallet.id;

      // Cache wallet info (tüm cüzdanlar için)
      userWallets.set(walletId, {
        id: walletId,
        currency: currencyCode,
        balance: currentBalance,
        active_bonus_id: wallet.active_bonus_id,
        network: wallet.currency?.network?.name || null
      });

      // 🎯 TRY bakiyesi için özel takip ve öncelik
      if (currencyCode === 'TRY' || currencyCode === 'TL') {
        totalTRYBalance = currentBalance;

        // TRY bakiye değişimi kontrolü
        const lastBalance = lastKnownBalances.get(walletId);
        if (lastBalance !== undefined && lastBalance !== currentBalance) {
          const change = currentBalance - lastBalance;

          tryBalanceChange = {
            currency: currencyCode,
            previous: lastBalance,
            current: currentBalance,
            change: change
          };

          balanceChanges.push(tryBalanceChange);

          console.log(`💰 ${currencyCode} balance changed: ${lastBalance} → ${currentBalance} (${change > 0 ? '+' : ''}${change})`);
        }

        lastKnownBalances.set(walletId, currentBalance);
      }
      // Diğer para birimlerini sadece log et, track etme
      else {
        console.log(`ℹ️  Non-TRY wallet: ${currencyCode} = ${currentBalance} (not tracked)`);

        // Cache'e kaydet ama balance change tracking yapma
        lastKnownBalances.set(walletId, currentBalance);
      }
    });

    // Send balance update event (sadece TRY değişimi varsa)
    if (tryBalanceChange || totalTRYBalance > 0) {
      sendEvent('wallet_updated', {
        total_wallets: walletsData.length,
        try_balance: totalTRYBalance,
        balance_change: tryBalanceChange ? tryBalanceChange.change : 0,
        balance_previous: tryBalanceChange ? tryBalanceChange.previous : null,
        balance_current: totalTRYBalance,
        active_bonus: walletsData.find(w => w.active_bonus_id !== null)?.active_bonus_id || null,
        tracked_currency: 'TRY'
      });
    }

    // Check for pending transaction matches (SADECE TRY için)
    if (tryBalanceChange && Math.abs(tryBalanceChange.change) > 0.01) {
      matchPendingTransaction(
        Math.abs(tryBalanceChange.change),
        tryBalanceChange.change > 0 ? 'deposit' : 'withdrawal'
      );
    }

    console.log(`✓ ${walletsData.length} wallets scanned, TRY balance: ${totalTRYBalance}`);
  }

  // ============================================
  // 🎁 RONA BONUS CLAIM HANDLER
  // ============================================
  function handleRonaBonusClaim(url, data) {
    // Extract bonus ID from URL
    const match = url.match(/\/claim\/(\d+)/);
    const bonusId = match ? match[1] : 'unknown';

    if (data.success === true) {
      console.log(`🎁 Bonus claimed successfully: ${bonusId}`);

      sendEvent('bonus_claimed_successful', {
        bonus_id: bonusId,
        timestamp: Date.now()
      });
    } else {
      console.log(`❌ Bonus claim failed: ${bonusId} - ${data.errors || 'unknown error'}`);

      sendEvent('bonus_claimed_failed', {
        bonus_id: bonusId,
        error: data.errors || 'unknown',
        timestamp: Date.now()
      });
    }
  }

  // ============================================
  // 💳 RONA DEPOSIT INITIATED HANDLER
  // ============================================
  function handleRonaDepositInitiated(responseData) {
    const depositUrl = responseData.url;
    const shouldNavigate = responseData.navigate;

    // Extract amount from currentFormData
    const amount = currentFormData.amount || extractAmountFromDOM();

    if (!amount) {
      console.warn('⚠️ Deposit initiated but amount not found');
      return;
    }

    // Detect payment method from URL
    const paymentMethod = detectPaymentMethodFromURL(depositUrl);

    const txId = `deposit_${Date.now()}`;

    pendingTransactions.set(txId, {
      type: 'deposit',
      amount: amount,
      currency: 'TRY',
      method: paymentMethod || 'unknown',
      url: depositUrl,
      navigate: shouldNavigate,
      timestamp: Date.now(),
      status: 'pending'
    });

    sendEvent('deposit_initiated', {
      transaction_id: txId,
      amount: amount,
      currency: 'TRY',
      payment_method: paymentMethod || 'unknown',
      payment_url: depositUrl,
      will_navigate: shouldNavigate
    });

    console.log(`💳 Deposit initiated: ${amount} TRY via ${paymentMethod || 'unknown'}`);

    // Clear form data
    currentFormData = {};
  }

  // ============================================
  // 💳 PAYMENT METHOD DETECTION FROM URL
  // ============================================
  function detectPaymentMethodFromURL(url) {
    if (!url) return null;

    const urlLower = url.toLowerCase();

    // Check against payment mapping
    for (const [key, value] of Object.entries(RONA_PAYMENT_MAPPING)) {
      for (const identifier of value.identifiers) {
        if (urlLower.includes(identifier.toLowerCase())) {
          return value.displayName;
        }
      }
    }

    // Check for specific providers
    if (urlLower.includes('epinlex')) return 'Epinlex Havale';
    if (urlLower.includes('vevopay')) return 'VevoPay';
    if (urlLower.includes('safepays')) return 'SafePays';
    if (urlLower.includes('aninda')) return 'AnındaPay';

    return 'unknown';
  }

  // ============================================
  // 💰 EXTRACT AMOUNT FROM DOM
  // ============================================
  function extractAmountFromDOM() {
    // Try multiple selectors for amount input
    const selectors = [
      'input[placeholder*="Miktar"]',
      'input[placeholder*="Amount"]',
      'input.form__input[type="text"]',
      'input[inputmode="decimal"]'
    ];

    for (const selector of selectors) {
      const input = document.querySelector(selector);
      if (input && input.value) {
        const amount = extractAmountFromInputValue(input.value);
        if (amount) return amount;
      }
    }

    return null;
  }

  // ============================================
  // 🔄 MATCH PENDING TRANSACTION
  // ============================================
  function matchPendingTransaction(amount, type = 'unknown') {
    let matched = false;

    for (let [txId, tx] of pendingTransactions.entries()) {
      // Type check
      if (type !== 'unknown' && tx.type !== type) continue;

      // Amount tolerance: 0.1
      const amountMatch = Math.abs(Math.abs(amount) - tx.amount) < 0.1;

      if (amountMatch) {
        console.log(`✅ Transaction matched: ${txId}`, tx);

        // Send success event
        if (tx.type === 'deposit') {
          sendEvent('deposit_successful', {
            transaction_id: txId,
            amount: tx.amount,
            currency: tx.currency || 'TRY',
            payment_method: tx.method,
            duration_seconds: Math.floor((Date.now() - tx.timestamp) / 1000)
          });
        } else if (tx.type === 'withdrawal') {
          sendEvent('withdrawal_successful', {
            transaction_id: txId,
            amount: tx.amount,
            currency: tx.currency || 'TRY',
            payment_method: tx.method,
            duration_seconds: Math.floor((Date.now() - tx.timestamp) / 1000)
          });
        }

        pendingTransactions.delete(txId);
        matched = true;
        break;
      }
    }

    if (!matched && amount > 0) {
      console.warn(`⚠️ Unmatched transaction: ${amount} (${type})`);
    }
  }


  // ============================================
  // 🆕 GENERIC BALANCE CHANGE HANDLER
  // ============================================
  function handleGenericBalanceChange(url, data) {
    // Skip if this is wallet API (already handled)
    if (url.includes('/api/player/wallet/')) return;

    // 🔍 CURRENCY CHECK: Sadece TRY/TL bakiyelerini track et
    const currency = data.currency || data.currency_code || data.code || 'TRY';
    const currencyUpper = currency.toString().toUpperCase();

    // Kripto ve diğer para birimlerini skip et
    if (currencyUpper !== 'TRY' && currencyUpper !== 'TL') {
      console.log(`⏩ Skipping non-TRY balance: ${currencyUpper}`);
      return;
    }

    // Balance field'larını kontrol et
    let balance = 0;

    // Önce TRY-specific field'lara bak
    if (data.balance_try || data.balance_TRY) {
      balance = parseFloat(data.balance_try || data.balance_TRY);
    }
    // Sonra generic balance field'lara bak (ama currency TRY olmalı)
    else if (data.balance || data.balance_cash || data.wallet_balance) {
      balance = parseFloat(data.balance || data.balance_cash || data.wallet_balance || 0);
    }

    if (balance === 0 || isNaN(balance)) return;

    // Makul TRY bakiye aralığını kontrol et (anti-spam)
    // Kripto değerler çok küçük olabilir (0.00001 BTC), TRY için minimum 1 TL
    if (balance < 0.1 || balance > 10000000) {
      console.log(`⚠️ Suspicious balance value: ${balance} TRY - skipping`);
      return;
    }

    // Detect provider from URL
    const provider = detectGameProvider(url);

    // Initialize game session if not exists
    if (!activeGameSession) {
      activeGameSession = {
        gameName: provider || 'unknown',
        gameUrl: url,
        startTime: Date.now(),
        startBalance: balance,
        bets: 0,
        totalWagered: 0,
        totalWon: 0,
        provider: provider
      };

      sendEvent('game_session_started', {
        game_name: provider || 'unknown',
        game_url: url,
        start_balance: balance,
        currency: 'TRY',
        provider: provider
      });

      console.log(`🎮 Game session started: ${provider || 'unknown'} (Balance: ${balance} TRY)`);
    }

    // Track balance change
    if (lastGameBalance !== null && lastGameBalance !== balance) {
      const balanceChange = balance - lastGameBalance;
      const isWin = balanceChange > 0;

      activeGameSession.bets++;

      if (isWin) {
        activeGameSession.totalWon += balanceChange;
      } else {
        activeGameSession.totalWagered += Math.abs(balanceChange);
      }

      sendEvent('game_bet_placed', {
        game_name: activeGameSession.gameName,
        provider: provider,
        bet_amount: isWin ? 0 : Math.abs(balanceChange),
        win_amount: isWin ? balanceChange : 0,
        net_profit: balanceChange,
        balance_before: lastGameBalance,
        balance_after: balance,
        currency: 'TRY',
        detection_method: 'generic_balance'
      });

      console.log(`🎲 ${provider || 'Game'} | Change: ${balanceChange > 0 ? '+' : ''}${balanceChange.toFixed(2)} TRY | Balance: ${balance.toFixed(2)} TRY`);
    }

    lastGameBalance = balance;
  }

  // ============================================
  // 🎮 DETECT GAME PROVIDER FROM URL
  // ============================================
  function detectGameProvider(url) {
    if (!url) return null;

    const urlLower = url.toLowerCase();

    // Known providers
    const providers = {
      'pragmatic': 'Pragmatic Play',
      'evolution': 'Evolution Gaming',
      'netent': 'NetEnt',
      'playngo': "Play'n GO",
      'hacksaw': 'Hacksaw Gaming',
      'nolimit': 'Nolimit City',
      'relax': 'Relax Gaming',
      'bgaming': 'BGaming',
      'evoplay': 'Evoplay',
      'pgsoft': 'PG Soft',
      'playson': 'Playson',
      'quickspin': 'Quickspin',
      'redtiger': 'Red Tiger',
      'yggdrasil': 'Yggdrasil',
      'thunderkick': 'Thunderkick',
      'elk': 'ELK Studios',
      'push': 'Push Gaming',
      'blueprint': 'Blueprint Gaming',
      'microgaming': 'Microgaming'
    };

    for (const [key, name] of Object.entries(providers)) {
      if (urlLower.includes(key)) {
        return name;
      }
    }

    return null;
  }

  // ============================================
  // 🎮 RONA GAME SERVICE HANDLER (Specific APIs)
  // ============================================
  function handleRonaGameService(url, data) {
    let gameData = null;

    // Response might be URL-encoded string or JSON
    if (typeof data === 'string') {
      gameData = parseURLEncodedResponse(data);
    } else if (typeof data === 'object') {
      gameData = data;
    }

    if (!gameData) {
      console.warn('⚠️ Could not parse game service response');
      return;
    }

    const balance = parseFloat(gameData.balance || gameData.balance_cash || 0);
    const win = parseFloat(gameData.w || gameData.tw || 0);
    const roundId = gameData.rid || gameData.round_id || 'unknown';
    const bonusBalance = parseFloat(gameData.balance_bonus || 0);
    const coinValue = parseFloat(gameData.c || 0);
    const lines = parseInt(gameData.l || 0);

    // Detect game name from URL
    const gameName = extractGameNameFromURL(url);

    // Initialize game session if not exists
    if (!activeGameSession) {
      activeGameSession = {
        gameName: gameName,
        gameUrl: url,
        startTime: Date.now(),
        startBalance: balance,
        bets: 0,
        totalWagered: 0,
        totalWon: 0
      };

      sendEvent('game_session_started', {
        game_name: gameName,
        game_url: url,
        start_balance: balance,
        currency: 'TRY'
      });

      console.log(`🎮 Game session started: ${gameName} (Balance: ${balance} TRY)`);
    }

    // Calculate bet amount from balance change
    let betAmount = 0;
    if (lastGameBalance !== null && lastGameBalance !== balance) {
      const balanceChange = balance - lastGameBalance;

      // If balance decreased (no win) or increased less than expected
      if (win === 0) {
        betAmount = Math.abs(balanceChange);
      } else {
        // Balance increased, so bet = balance_change - win
        betAmount = Math.abs(balanceChange - win);
      }
    }

    // If we couldn't calculate bet, estimate from coin value and lines
    if (betAmount === 0 && coinValue > 0 && lines > 0) {
      betAmount = coinValue * lines;
    }

    // Track bet
    if (betAmount > 0 || win > 0) {
      activeGameSession.bets++;
      activeGameSession.totalWagered += betAmount;
      activeGameSession.totalWon += win;

      totalBetsInSession++;
      totalWageredInSession += betAmount;
      totalWonInSession += win;

      const netProfit = win - betAmount;

      sendEvent('game_bet_placed', {
        game_name: gameName,
        round_id: roundId,
        bet_amount: betAmount,
        win_amount: win,
        net_profit: netProfit,
        balance_before: lastGameBalance,
        balance_after: balance,
        bonus_balance: bonusBalance,
        currency: 'TRY',
        coin_value: coinValue,
        lines: lines
      });

      console.log(`🎲 Bet: ${betAmount.toFixed(2)} TRY | Win: ${win.toFixed(2)} TRY | Net: ${netProfit > 0 ? '+' : ''}${netProfit.toFixed(2)} TRY | Balance: ${balance.toFixed(2)} TRY`);
    }

    lastGameBalance = balance;
  }

  // ============================================
  // 🎮 PARSE URL-ENCODED RESPONSE
  // ============================================
  function parseURLEncodedResponse(str) {
    if (!str) return null;

    const params = {};
    const pairs = str.split('&');

    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        params[key] = decodeURIComponent(value);
      }
    });

    return params;
  }

  // ============================================
  // 🎮 EXTRACT GAME NAME FROM URL
  // ============================================
  function extractGameNameFromURL(url) {
    if (!url) return 'unknown';

    // Try to extract from query params
    const urlObj = new URL(url);
    const gameName = urlObj.searchParams.get('game') ||
                     urlObj.searchParams.get('gameName') ||
                     urlObj.searchParams.get('name');

    if (gameName) return gameName;

    // Try to extract from path
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1];
    }

    return 'unknown';
  }

  // ============================================
  // 🎮 END GAME SESSION
  // ============================================
  function endGameSession() {
    if (!activeGameSession) return;

    const duration = Math.floor((Date.now() - activeGameSession.startTime) / 1000);
    const endBalance = lastGameBalance || activeGameSession.startBalance;
    const netProfit = endBalance - activeGameSession.startBalance;

    sendEvent('game_session_ended', {
      game_name: activeGameSession.gameName,
      game_url: activeGameSession.gameUrl,
      duration_seconds: duration,
      start_balance: activeGameSession.startBalance,
      end_balance: endBalance,
      net_profit: netProfit,
      total_bets: activeGameSession.bets,
      total_wagered: activeGameSession.totalWagered,
      total_won: activeGameSession.totalWon,
      rtp: activeGameSession.totalWagered > 0 ? (activeGameSession.totalWon / activeGameSession.totalWagered * 100).toFixed(2) : 0,
      currency: 'TRY'
    });

    console.log(`🏁 Game session ended: ${activeGameSession.gameName} | Duration: ${duration}s | Net: ${netProfit > 0 ? '+' : ''}${netProfit.toFixed(2)} TRY`);

    activeGameSession = null;
    lastGameBalance = null;
  }

  // ============================================
  // 🆕 INPUT FIELD MONITORING
  // ============================================
  function monitorFormInputs() {
    attachInputListeners();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            attachInputListeners(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function attachInputListeners(root = document) {
    const amountInputSelectors = [
      'input[name*="amount"]',
      'input[name*="miktar"]',
      'input[placeholder*="miktar"]',
      'input[placeholder*="amount"]',
      'input[id*="amount"]',
      'input[type="number"]',
      '.amount-input'
    ];

    amountInputSelectors.forEach(selector => {
      const inputs = root.querySelectorAll(selector);
      inputs.forEach(input => {
        if (input.dataset.trackerAttached) return;

        input.dataset.trackerAttached = 'true';

        input.addEventListener('blur', (e) => {
          const amount = extractAmountFromInputValue(e.target.value);
          if (amount) {
            currentFormData.amount = amount;
            console.log(`💰 RONA: Miktar girildi: ${amount} ₺`);
          }
        });
      });
    });
  }

  function extractAmountFromInputValue(value) {
    if (!value) return null;

    const cleaned = value.replace(/[^\d.,]/g, '');

    if (cleaned.includes(',')) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      return parseFloat(cleaned.replace(/,/g, ''));
    }
  }

  // ============================================
  // DOM CONFIG RULES SETUP
  // ============================================
  function setupDomTracking() {
    if (!config.domConfig || !config.domConfig.rules || !Array.isArray(config.domConfig.rules)) {
      console.log('Strastix RONA: No DOM rules configured');
      return;
    }

    config.domConfig.rules.forEach((rule, index) => {
      if (!rule.selector || !rule.eventName || !rule.trigger) {
        console.warn(`Strastix RONA: Invalid rule at index ${index}:`, rule);
        return;
      }

      try {
        const elements = document.querySelectorAll(rule.selector);

        if (elements.length === 0) {
          console.warn(`Strastix RONA: No elements found for selector: ${rule.selector}`);
          return;
        }

        elements.forEach(element => {
          element.addEventListener(rule.trigger, function() {
            // 🆕 CONDITIONS CHECK: Koşulları kontrol et
            if (rule.conditions) {
              // inputExists: Belirtilen input varsa devam et
              if (rule.conditions.inputExists) {
                const conditionElement = document.querySelector(rule.conditions.inputExists);
                if (!conditionElement) {
                  console.log(`Strastix RONA: Condition not met for ${rule.eventName} - ${rule.conditions.inputExists} not found`);
                  return; // Koşul sağlanmadı, event gönderme
                }
              }

              // urlContains: URL belirtilen string'i içeriyorsa devam et
              if (rule.conditions.urlContains) {
                if (!window.location.href.includes(rule.conditions.urlContains)) {
                  console.log(`Strastix RONA: Condition not met for ${rule.eventName} - URL doesn't contain ${rule.conditions.urlContains}`);
                  return;
                }
              }

              // pagePathEquals: Sayfa path'i eşitse devam et
              if (rule.conditions.pagePathEquals) {
                if (window.location.pathname !== rule.conditions.pagePathEquals) {
                  console.log(`Strastix RONA: Condition not met for ${rule.eventName} - path is ${window.location.pathname}`);
                  return;
                }
              }
            }

            console.log(`Strastix RONA: Event triggered - ${rule.eventName}`, {
              selector: rule.selector,
              trigger: rule.trigger
            });

            let parameters = { ...(rule.parameters || {}) };

            if (rule.extractAmount && rule.amountSelector) {
              const amount = extractAmount(rule.amountSelector);

              if (amount !== null) {
                parameters.amount = amount;
                console.log(`Strastix RONA: Amount extracted - ${amount} from ${rule.amountSelector}`);
              }
            }

            sendEvent(rule.eventName, parameters);
          });
        });

        console.log(`✓ Strastix RONA: Tracking setup for ${rule.eventName} (${elements.length} elements)`);
      } catch (error) {
        console.error(`Strastix RONA: Error setting up rule ${index}:`, error);
      }
    });
  }

  function extractAmount(selector) {
    if (!selector) return null;

    try {
      const selectors = selector.split(',').map(s => s.trim());

      for (const sel of selectors) {
        const element = document.querySelector(sel);

        if (!element) continue;

        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
          const value = element.value;
          if (value) {
            const amount = parseAmount(value);
            if (amount !== null) return amount;
          }
        }

        const text = element.textContent || element.innerText;
        if (text) {
          const amount = parseAmount(text);
          if (amount !== null) return amount;
        }
      }
    } catch (error) {
      console.warn('Strastix RONA: Amount extraction failed:', error);
    }

    return null;
  }

  function parseAmount(value) {
    if (!value) return null;

    const cleaned = value.toString()
      .replace(/[^\d.,\-]/g, '')
      .replace(',', '.');

    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? null : parsed;
  }

  window.addEventListener('online', () => {
    isOnline = true;
    console.log('Strastix RONA: Back online, processing queue');
    processQueue();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    console.log('Strastix RONA: Offline mode');
  });

  // ============================================
  // PUBLIC API
  // ============================================
  tracker.identify = function(userId) {
    playerId = userId;
    sendEvent('player_identified', { player_id: userId });
  };

  tracker.track = function(eventName, params = {}) {
    if (!config.apiKey) {
      console.error('Strastix RONA: Not initialized');
      return;
    }
    sendEvent(eventName, params);
  };

  tracker.getStatus = function() {
    return {
      version: '3.0-RONA',
      currentFormData: currentFormData,
      pendingTransactions: Array.from(pendingTransactions.entries()),
      lastKnownBalances: Array.from(lastKnownBalances.entries()),
      userWallets: Array.from(userWallets.entries()),
      sessionId: sessionId,
      playerId: playerId,
      playerUsername: playerUsername,
      playerEmail: playerEmail,
      availablePaymentMethods: Array.from(availablePaymentMethods.entries())
    };
  };

  tracker.clearPendingTransactions = function() {
    pendingTransactions.clear();
    console.log('RONA: Tüm pending transaction\'lar temizlendi');
  };

  tracker.endGame = function() {
    endGameSession();
  };

  tracker.getGameSession = function() {
    return activeGameSession;
  };

  // ============================================
  // AUTO TRACKING
  // ============================================
  window.addEventListener('load', () => {
    sendEvent('page_view', {
      page_path: window.location.pathname,
      page_url: window.location.href
    });

    // Initialize all tracking features
    interceptNetworkRequests();
    setupDomTracking();
    monitorFormInputs();

    processQueue();
  });

  let sessionStartTime = Date.now();
  window.addEventListener('beforeunload', () => {
    const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);

    // End active game session if exists
    if (activeGameSession) {
      endGameSession();
    }

    sendEvent('session_end', { duration_seconds: sessionDuration });
  });

  // Expose to window
  window.Strastix = tracker;
  window.tracker = tracker;

  // Debug commands
  window.getTrackerStatus = () => tracker.getStatus();
  window.clearPendingTx = () => tracker.clearPendingTransactions();
  window.getCurrentFormData = () => currentFormData;

  console.log('✓ Strastix v3.0 RONA Edition initialized successfully');
  console.log('✓ Available as: window.Strastix and window.tracker');
  console.log('✓ Features: Login/Logout, Wallet/Balance, Deposit, Bonus, Game Tracking');
  console.log('✓ Debug: window.getTrackerStatus() | window.clearPendingTx() | tracker.endGame()');
})();
