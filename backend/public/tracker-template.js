(function() {
  // Config backend tarafından enjekte edilecek
  const config = __CONFIG__;
  
  if (!config) {
    console.error("TrackLib: Configuration not found");
    return;
  }

  console.log(`TrackLib v3.0 ODIN Edition initialized for ${config.scriptId}`);

  // ============================================
  // CORE VARIABLES
  // ============================================
  const tracker = {};
  let sessionId = getOrCreateSessionId();
  let playerId = null;
  let eventQueue = [];
  let isOnline = navigator.onLine;
  
  // 🆕 ADVANCED TRACKING VARIABLES
  let currentFormData = {}; // Geçici form verileri
  let pendingTransactions = new Map(); // Bekleyen işlemler
  let lastKnownBalances = new Map(); // Bakiye takibi
  let depositModalProcessed = new Set(); // İşlenmiş modal'ları takip et

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
          'X-Script-Version': '3.0-ODIN'
        },
        body: JSON.stringify(payload),
        keepalive: true
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`✓ TrackLib: ${eventName} sent`, params);
      return true;

    } catch (error) {
      console.error(`✗ TrackLib: ${eventName} failed:`, error.message);
      
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
      console.error('TrackLib: Queue save failed', e);
    }
  }

  function processQueue() {
    try {
      const queue = JSON.parse(localStorage.getItem('tracklib_queue') || '[]');
      if (queue.length === 0) return;

      console.log(`TrackLib: Processing ${queue.length} queued events`);
      
      queue.forEach(item => {
        sendEvent(item.eventName, item.params);
      });
      
      localStorage.removeItem('tracklib_queue');
    } catch (e) {
      console.error('TrackLib: Queue process failed', e);
    }
  }

  window.addEventListener('online', () => {
    isOnline = true;
    console.log('TrackLib: Back online, processing queue');
    processQueue();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    console.log('TrackLib: Offline mode');
  });

  // ============================================
  // 🆕 NETWORK REQUEST INTERCEPTION (ODIN API)
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
            analyzeNetworkResponse(url, data, options);
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
            analyzeNetworkResponse(this._url, data, { method: this._method });
          } catch (e) {}
        }
      });
      return originalSend.apply(this, arguments);
    };
  }

  function analyzeNetworkResponse(url, data, options = {}) {
    if (!url || !data) return;

    const urlStr = url.toString().toLowerCase();

    // 1. ODIN Balance API (get_accounts)
    if (urlStr.includes('/odin/api/user/accounts/get_accounts') || 
        urlStr.includes('/get_accounts')) {
      handleOdinBalanceUpdate(data);
    }

    // 2. ODIN Pending Transactions
    if (urlStr.includes('/transaction/getCustomerNewOrPendingTransactions')) {
      handleOdinPendingTransactions(data);
    }

    // 3. ODIN Withdrawal Request
    if (urlStr.includes('/payment/manualTransfer/withdraw')) {
      console.log('💸 Para çekme talebi gönderildi');
      sendEvent('withdrawal_initiated', {
        method: 'manual_transfer'
      });
    }

    // 4. Fallback: Genel bakiye ve işlem endpoint'leri
    if (urlStr.includes('/balance') || urlStr.includes('/wallet')) {
      handleBalanceUpdate(data);
    }

    if (urlStr.includes('/transaction') || urlStr.includes('/payment')) {
      handleTransactionUpdate(data);
    }
  }

  // ============================================
  // 🆕 ODIN BALANCE API HANDLER
  // ============================================
  function handleOdinBalanceUpdate(data) {
    if (!data.success || !Array.isArray(data.data)) return;

    console.log('🔄 ODIN get_accounts API yanıtı alındı');

    data.data.forEach(account => {
      const accountCode = account.accountType?.code;
      if (!accountCode) return;

      const balance = account.balance || 0;
      const lockedBalance = account.lockedBalance || 0;
      const availableBalance = balance - lockedBalance;
      
      // Ana bakiye takibi (Sport Real Balance)
      if (accountCode === 'SRB') {
        const lastBalance = lastKnownBalances.get('SRB') || 0;
        const lastLocked = lastKnownBalances.get('SRB_locked') || 0;

        // Balance değişimi
        if (balance !== lastBalance) {
          const balanceChange = balance - lastBalance;
          lastKnownBalances.set('SRB', balance);
          
          console.log(`💰 Sport Real Balance değişti: ${lastBalance} → ${balance} (${balanceChange > 0 ? '+' : ''}${balanceChange})`);
          
          // Locked balance yoksa ve balance azaldıysa -> withdrawal successful
          if (balanceChange < 0 && lockedBalance === 0) {
            matchPendingTransaction(Math.abs(balanceChange), 'withdrawal');
          }
          
          // Locked balance yoksa ve balance arttıysa -> deposit successful
          if (balanceChange > 0 && lockedBalance === 0) {
            matchPendingTransaction(Math.abs(balanceChange), 'deposit');
          }

          sendEvent('balance_updated', {
            account_type: 'Sport Real Balance',
            previous_balance: lastBalance,
            new_balance: balance,
            change: balanceChange,
            locked_balance: lockedBalance,
            available_balance: availableBalance
          });
        }

        // Locked balance değişimi
        if (lockedBalance !== lastLocked) {
          const lockedChange = lockedBalance - lastLocked;
          lastKnownBalances.set('SRB_locked', lockedBalance);
          
          console.log(`🔒 Kilitli bakiye değişti: ${lastLocked} → ${lockedBalance} (${lockedChange > 0 ? '+' : ''}${lockedChange})`);
          
          // Locked balance arttıysa -> withdrawal request confirmed
          if (lockedChange > 0) {
            sendEvent('balance_locked', {
              locked_amount: lockedChange,
              total_locked: lockedBalance,
              available_balance: availableBalance
            });
          }
          
          // Locked balance azaldıysa -> withdrawal cancelled or completed
          if (lockedChange < 0) {
            sendEvent('balance_unlocked', {
              unlocked_amount: Math.abs(lockedChange),
              total_locked: lockedBalance,
              available_balance: availableBalance
            });
          }
        }
      }

      // Diğer hesap tiplerini de kaydet
      lastKnownBalances.set(accountCode, balance);
    });
  }

  // ============================================
  // 🆕 ODIN PENDING TRANSACTIONS HANDLER
  // ============================================
  function handleOdinPendingTransactions(data) {
    if (!data.success || !Array.isArray(data.data)) return;

    console.log(`📋 ${data.data.length} pending transaction bulundu`);

    data.data.forEach(tx => {
      const txId = tx.transactionId?.toString();
      if (!txId) return;

      // Sadece yeni transaction'ları işle
      if (pendingTransactions.has(txId)) return;

      // Withdrawal transaction (masterCode: "W")
      if (tx.masterCode === 'W' && tx.status === 'N') {
        pendingTransactions.set(txId, {
          type: 'withdrawal',
          amount: tx.amount,
          currency: tx.transactionCurrency?.currencyCode || 'TRY',
          method: tx.transactionTypeName || 'unknown',
          status: 'pending',
          timestamp: tx.transactionDate,
          isCancelable: tx.isCancelable
        });

        console.log(`💸 Yeni para çekme talebi: ${tx.amount} ${tx.transactionCurrency?.currencySymbol}`);

        sendEvent('withdrawal_requested', {
          transaction_id: txId,
          amount: tx.amount,
          currency: tx.transactionCurrency?.currencyCode || 'TRY',
          method: tx.transactionTypeName || 'unknown',
          is_cancelable: tx.isCancelable
        });
      }

      // Deposit transaction (masterCode: "D" - muhtemelen)
      if (tx.masterCode === 'D' && tx.status === 'N') {
        pendingTransactions.set(txId, {
          type: 'deposit',
          amount: tx.amount,
          currency: tx.transactionCurrency?.currencyCode || 'TRY',
          method: tx.transactionTypeName || 'unknown',
          status: 'pending',
          timestamp: tx.transactionDate
        });

        console.log(`💳 Yeni para yatırma talebi: ${tx.amount} ${tx.transactionCurrency?.currencySymbol}`);
      }
    });
  }

  // ============================================
  // 🆕 DEPOSIT SUCCESS MODAL MONITOR (ODIN)
  // ============================================
  function monitorDepositSuccessModal() {
    const observer = new MutationObserver(() => {
      const modal = document.querySelector('#PaymentFormModal.modal.open');
      
      if (modal && 
          modal.style.display === 'block' && 
          modal.style.opacity === '1') {
        
        // Sadece bir kez işle
        const modalContent = modal.innerHTML;
        const modalHash = simpleHash(modalContent);
        
        if (depositModalProcessed.has(modalHash)) return;
        depositModalProcessed.add(modalHash);
        
        // Miktar çıkar
        const amountEl = modal.querySelector('.rslt-mdl h5 > span');
        const amountText = amountEl?.textContent || '';
        const amount = parseFloat(amountText.replace(/[^\d.,]/g, '').replace(',', '.'));
        
        // Ödeme yöntemi
        const iconImg = modal.querySelector('payment-icon img');
        const paymentClass = iconImg?.className || '';
        const paymentMethod = paymentClass
          .replace('-deposit', '')
          .replace(/-/g, ' ')
          .trim();
        
        if (amount && amount > 0) {
          console.log(`💰 Deposit pop-up açıldı: ${amount} TL (${paymentMethod})`);
          
          // Pending transaction ekle
          const txId = `deposit_${Date.now()}`;
          pendingTransactions.set(txId, {
            type: 'deposit',
            amount: amount,
            method: paymentMethod || 'unknown',
            status: 'pending',
            timestamp: Date.now()
          });
          
          sendEvent('deposit_initiated', {
            transaction_id: txId,
            amount: amount,
            payment_method: paymentMethod || 'unknown',
            currency: 'TRY'
          });
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  function generateTempId() {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Fallback balance handler (ODIN olmayan sistemler için)
  function handleBalanceUpdate(data) {
    const balance = data.balance || data.amount || data.wallet?.balance || null;
    
    if (balance === null || balance === undefined) return;

    const accountKey = 'main';
    const lastBalance = lastKnownBalances.get(accountKey) || 0;
    
    if (lastBalance !== balance) {
      const change = balance - lastBalance;
      lastKnownBalances.set(accountKey, balance);

      console.log(`💰 Bakiye değişti: ${lastBalance} → ${balance} (${change > 0 ? '+' : ''}${change})`);

      matchPendingTransaction(Math.abs(change), change > 0 ? 'deposit' : 'withdrawal');

      sendEvent('balance_updated', {
        previous_balance: lastBalance,
        new_balance: balance,
        change: change
      });
    }
  }

  function handleTransactionUpdate(data) {
    if (data.status === 'approved' || data.status === 'confirmed' || data.status === 'success') {
      const amount = data.amount || data.value || null;
      
      if (amount) {
        matchPendingTransaction(amount, 'unknown');
      }
    }
  }

  function matchPendingTransaction(amount, type = 'unknown') {
    let matched = false;

    for (let [txId, tx] of pendingTransactions.entries()) {
      // Tip kontrolü
      if (type !== 'unknown' && tx.type !== type) continue;

      // Miktar toleransı: 0.1 TL
      const amountMatch = Math.abs(Math.abs(amount) - tx.amount) < 0.1;
      
      if (amountMatch) {
        console.log(`✅ Transaction matched: ${txId}`, tx);
        
        // Başarılı event gönder
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
      console.warn(`⚠️  Eşleştirilemeyen işlem: ${amount} TL (${type})`);
    }
  }

  // ============================================
  // 🆕 ADVANCED DOM LISTENERS
  // ============================================
  function setupAdvancedDOMListeners() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('button, a, [role="button"]');
      if (!target) return;

      const text = target.textContent.trim();
      const classList = Array.from(target.classList).join(' ');
      
      // Hızlı tutar butonları
      if (isQuickAmountButton(target, text)) {
        const amount = extractAmountFromButton(text);
        if (amount) {
          currentFormData.amount = amount;
          console.log(`💰 Hızlı tutar seçildi: ${amount} ₺`);
          
          sendEvent('quick_amount_selected', {
            amount: amount,
            button_text: text
          });
        }
      }
      
      // "Yatırımı Yaptım" butonu
      else if (isDepositConfirmButton(target, text, classList)) {
        console.log('✅ "Yatırımı Yaptım" butonuna tıklandı');
        
        const amount = currentFormData.amount || getAmountFromInput();
        
        if (amount) {
          const txId = generateTempId();
          
          pendingTransactions.set(txId, {
            type: 'deposit',
            amount: amount,
            method: 'manual_transfer',
            status: 'pending',
            timestamp: Date.now()
          });
          
          console.log(`💳 Manuel yatırım kaydedildi: ${amount} ₺`);
          
          sendEvent('deposit_manual_confirmed', {
            transaction_id: txId,
            amount: amount,
            method: 'manual_transfer'
          });
        }
      }
      
      // "İşlemi Başlat" butonu (Gateway)
      else if (isStartTransactionButton(target, text, classList)) {
        console.log('🚀 "İşlemi Başlat" butonuna tıklandı');
        
        const amount = currentFormData.amount || getAmountFromInput();
        
        if (amount) {
          sendEvent('deposit_gateway_initiated', {
            amount: amount,
            method: 'payment_gateway'
          });
        }
      }
      
      // Bakiye yenileme butonu
      else if (isBalanceRefreshButton(target, text, classList)) {
        console.log('🔄 Bakiye güncelleme butonuna tıklandı');
        
        sendEvent('balance_refresh_clicked', {
          timestamp: Date.now()
        });
      }
    });
  }

  // Button detection helpers
  function isQuickAmountButton(button, text) {
    return /\d+\s*₺/.test(text) && button.type === 'button';
  }

  function isDepositConfirmButton(button, text, classList) {
    const normalizedText = text.toLowerCase().replace(/\s+/g, '');
    
    return (
      button.type === 'submit' ||
      normalizedText.includes('yatırımıyaptım') ||
      normalizedText.includes('yatırımyap') ||
      classList.includes('pymnt-frm-btn')
    );
  }

  function isStartTransactionButton(button, text, classList) {
    const normalizedText = text.toLowerCase().replace(/\s+/g, '');
    
    return (
      normalizedText.includes('işlemibaşlat') ||
      normalizedText.includes('başlat') ||
      classList.includes('start-transaction')
    );
  }

  function isBalanceRefreshButton(button, text, classList) {
    const normalizedText = text.toLowerCase().replace(/\s+/g, '');
    
    return (
      normalizedText.includes('bakiye') ||
      normalizedText.includes('güncelle') ||
      normalizedText.includes('refresh') ||
      normalizedText.includes('yenile') ||
      classList.includes('refresh-balance')
    );
  }

  // Amount extraction helpers
  function extractAmountFromButton(text) {
    const match = text.match(/[\d.,]+/);
    if (match) {
      const cleaned = match[0].replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned);
    }
    return null;
  }

  function getAmountFromInput() {
    const input = document.querySelector('#mntNpt') || 
                 document.querySelector('input[placeholder*="Yatırım"]') ||
                 document.querySelector('input[placeholder*="Tutar"]') ||
                 document.querySelector('input[name*="amount"]');
    
    if (input && input.value) {
      return extractAmountFromInputValue(input.value);
    }
    
    return null;
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
      'input[id="mntNpt"]',
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
            console.log(`💰 Miktar girildi: ${amount} ₺`);
          }
        });
      });
    });
  }

  // ============================================
  // AMOUNT EXTRACTION HELPER (DOM Config)
  // ============================================
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
      console.warn('TrackLib: Amount extraction failed:', error);
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

  // ============================================
  // DOM CONFIG RULES SETUP
  // ============================================
  function setupDomTracking() {
    if (!config.domConfig || !config.domConfig.rules || !Array.isArray(config.domConfig.rules)) {
      console.log('TrackLib: No DOM rules configured');
      return;
    }

    config.domConfig.rules.forEach((rule, index) => {
      if (!rule.selector || !rule.eventName || !rule.trigger) {
        console.warn(`TrackLib: Invalid rule at index ${index}:`, rule);
        return;
      }

      try {
        const elements = document.querySelectorAll(rule.selector);
        
        if (elements.length === 0) {
          console.warn(`TrackLib: No elements found for selector: ${rule.selector}`);
          return;
        }

        elements.forEach(element => {
          element.addEventListener(rule.trigger, function(event) {
            console.log(`TrackLib: Event triggered - ${rule.eventName}`, {
              selector: rule.selector,
              trigger: rule.trigger
            });

            let parameters = { ...(rule.parameters || {}) };

            if (rule.extractAmount && rule.amountSelector) {
              const amount = extractAmount(rule.amountSelector);
              
              if (amount !== null) {
                parameters.amount = amount;
                console.log(`TrackLib: Amount extracted - ${amount} from ${rule.amountSelector}`);
              } else {
                console.warn(`TrackLib: Could not extract amount from ${rule.amountSelector}`);
              }
            }

            Object.keys(parameters).forEach(key => {
              const value = parameters[key];
              if (typeof value === 'string' && value.startsWith('data-')) {
                const attrValue = element.getAttribute(value);
                if (attrValue) {
                  parameters[key] = attrValue;
                }
              }
            });

            sendEvent(rule.eventName, parameters);
          });
        });

        console.log(`✓ TrackLib: Tracking setup for ${rule.eventName} (${elements.length} elements)`);
      } catch (error) {
        console.error(`TrackLib: Error setting up rule ${index}:`, error);
      }
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================
  tracker.identify = function(userId) {
    playerId = userId;
    sendEvent('player_identified', { player_id: userId });
  };

  tracker.track = function(eventName, params = {}) {
    if (!config.apiKey) {
      console.error('TrackLib: Not initialized');
      return;
    }
    sendEvent(eventName, params);
  };

  tracker.register = function(userId, email) {
    playerId = userId;
    sendEvent('registration_successful', { player_id: userId, email });
  };

  tracker.login = function(userId) {
    playerId = userId;
    sendEvent('login_successful', { player_id: userId });
  };

  tracker.logout = function() {
    sendEvent('logout', { player_id: playerId });
    playerId = null;
  };

  tracker.deposit = function(amount, currency, method) {
    sendEvent('deposit_successful', {
      amount: parseFloat(amount),
      currency: currency || 'TRY',
      method: method || 'unknown'
    });
  };

  tracker.withdrawal = function(amount, currency, method) {
    sendEvent('withdrawal_successful', {
      amount: parseFloat(amount),
      currency: currency || 'TRY',
      method: method || 'unknown'
    });
  };

  tracker.bet = function(amount, currency, game) {
    sendEvent('bet_placed', {
      amount: parseFloat(amount),
      currency: currency || 'TRY',
      game: game || 'unknown'
    });
  };

  tracker.win = function(amount, currency, game) {
    sendEvent('win', {
      amount: parseFloat(amount),
      currency: currency || 'TRY',
      game: game || 'unknown'
    });
  };

  tracker.gameStart = function(gameName) {
    sendEvent('game_started', { game_name: gameName });
  };

  tracker.gameEnd = function(gameName, duration) {
    sendEvent('game_ended', {
      game_name: gameName,
      duration_seconds: duration
    });
  };

  // Debug functions
  tracker.extractAmount = extractAmount;
  tracker.getStatus = function() {
    return {
      version: '3.0-ODIN',
      currentFormData: currentFormData,
      pendingTransactions: Array.from(pendingTransactions.entries()),
      lastBalances: Array.from(lastKnownBalances.entries()),
      sessionId: sessionId,
      playerId: playerId
    };
  };

  tracker.clearPendingTransactions = function() {
    pendingTransactions.clear();
    console.log('🗑️ Tüm pending transaction\'lar temizlendi');
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
    setupDomTracking();
    setupAdvancedDOMListeners();
    monitorFormInputs();
    monitorDepositSuccessModal(); // ODIN deposit modal
    interceptNetworkRequests(); // ODIN API interception
    
    processQueue();
  });

  let sessionStartTime = Date.now();
  window.addEventListener('beforeunload', () => {
    const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
    sendEvent('session_end', { duration_seconds: sessionDuration });
  });

  // Expose to window
  window.TrackLib = tracker;
  window.tracker = tracker;
  
  // Debug commands
  window.getTrackerStatus = () => tracker.getStatus();
  window.clearPendingTx = () => tracker.clearPendingTransactions();
  window.getCurrentFormData = () => currentFormData;
  
  console.log('✓ TrackLib v3.0 ODIN Edition initialized successfully');
  console.log('✓ Available as: window.TrackLib and window.tracker');
  console.log('✓ Features: ODIN API, Deposit Modal, Withdrawal, Balance Tracking');
  console.log('✓ Debug: window.getTrackerStatus() | window.clearPendingTx()');
})();