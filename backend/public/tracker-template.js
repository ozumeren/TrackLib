(function() {
  // Config backend tarafından enjekte edilecek
  const config = __CONFIG__;
  
  if (!config) {
    console.error("TrackLib: Configuration not found");
    return;
  }

  console.log(`TrackLib v2.0 Advanced initialized for ${config.scriptId}`);

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
          'X-Script-Version': '2.0'
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
  // 🆕 NETWORK REQUEST INTERCEPTION
  // ============================================
  function interceptNetworkRequests() {
    // Fetch API interception
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      return originalFetch.apply(this, args).then(response => {
        if (response.ok) {
          const url = args[0];
          response.clone().json().then(data => {
            analyzeNetworkResponse(url, data);
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
            analyzeNetworkResponse(this._url, data);
          } catch (e) {}
        }
      });
      return originalSend.apply(this, arguments);
    };
  }

  function analyzeNetworkResponse(url, data) {
    if (!url || !data) return;

    // Bakiye güncellemesi tespiti
    if (url.includes('/balance') || url.includes('/wallet') || url.includes('/accounts')) {
      handleBalanceUpdate(data);
    }

    // İşlem onayı tespiti
    if (url.includes('/transaction') || url.includes('/payment')) {
      handleTransactionUpdate(data);
    }
  }

  function handleBalanceUpdate(data) {
    // Farklı API formatları için balance tespiti
    const balance = data.balance || data.amount || data.wallet?.balance || null;
    
    if (balance === null || balance === undefined) return;

    const accountKey = 'main';
    const lastBalance = lastKnownBalances.get(accountKey) || 0;
    
    if (lastBalance !== balance) {
      const change = balance - lastBalance;
      lastKnownBalances.set(accountKey, balance);

      console.log(`💰 Bakiye değişti: ${lastBalance} → ${balance} (${change > 0 ? '+' : ''}${change})`);

      // Pending transaction ile eşleştir
      matchPendingTransaction(Math.abs(change));

      sendEvent('balance_updated', {
        previous_balance: lastBalance,
        new_balance: balance,
        change: change,
        timestamp: Date.now()
      });
    }
  }

  function handleTransactionUpdate(data) {
    if (data.status === 'approved' || data.status === 'confirmed' || data.status === 'success') {
      const amount = data.amount || data.value || null;
      
      if (amount) {
        matchPendingTransaction(amount);
      }
    }
  }

  function matchPendingTransaction(amount) {
    let matched = false;

    for (let [txId, tx] of pendingTransactions.entries()) {
      // %5 tolerans ile miktar eşleşmesi
      const tolerance = Math.abs(tx.amount) * 0.05;
      
      if (Math.abs(Math.abs(amount) - tx.amount) <= tolerance) {
        console.log(`✅ İşlem eşleştirildi: ${txId}`, tx);
        
        // Başarılı deposit/withdrawal eventi gönder
        if (tx.type === 'deposit') {
          sendEvent('deposit_successful', {
            amount: tx.amount,
            currency: 'TRY',
            payment_method: tx.method,
            transaction_id: txId,
            duration_seconds: Math.floor((Date.now() - tx.initiatedAt) / 1000)
          });
        } else if (tx.type === 'withdrawal') {
          sendEvent('withdrawal_successful', {
            amount: tx.amount,
            currency: 'TRY',
            payment_method: tx.method,
            transaction_id: txId,
            duration_seconds: Math.floor((Date.now() - tx.initiatedAt) / 1000)
          });
        }

        pendingTransactions.delete(txId);
        matched = true;
        break;
      }
    }

    if (!matched && amount > 0) {
      console.warn(`⚠️  Eşleştirilemeyen bakiye değişikliği: ${amount}`);
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
      
      // Hızlı tutar butonları (100₺, 500₺, vs)
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
      
      // "Yatırımı Yaptım" butonu (Manuel Transfer)
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
            initiatedAt: Date.now(),
            buttonType: 'yatirim_yaptim'
          });
          
          console.log(`💳 Manuel yatırım kaydedildi: ${amount} ₺`);
          
          sendEvent('deposit_manual_confirmed', {
            transaction_id: txId,
            amount: amount,
            method: 'manual_transfer'
          });
        }
      }
      
      // "İşlemi Başlat" butonu (Otomatik Gateway)
      else if (isStartTransactionButton(target, text, classList)) {
        console.log('🚀 "İşlemi Başlat" butonuna tıklandı');
        
        const amount = currentFormData.amount || getAmountFromInput();
        
        if (amount) {
          const txId = generateTempId();
          
          pendingTransactions.set(txId, {
            type: 'deposit',
            amount: amount,
            method: 'gateway',
            status: 'pending',
            initiatedAt: Date.now(),
            buttonType: 'islemi_baslat'
          });
          
          console.log(`💳 Gateway yatırımı başlatıldı: ${amount} ₺`);
          
          sendEvent('deposit_gateway_initiated', {
            transaction_id: txId,
            amount: amount,
            method: 'gateway'
          });
        } else {
          console.warn('⚠️ İşlemi Başlat butonuna tıklandı ama miktar bulunamadı');
        }
      }
      
      // "Onayla" butonu
      else if (isConfirmButton(target, text, classList)) {
        console.log('✔️ "Onayla" butonuna tıklandı');
        
        sendEvent('confirm_button_clicked', {
          button_text: text
        });
      }
      
      // Bakiye güncelleme butonu
      else if (isBalanceRefreshButton(target, text, classList)) {
        console.log('🔄 Bakiye güncelleme butonuna tıklandı');
        
        sendEvent('balance_refresh_clicked', {
          button_text: text
        });
      }
      
    }, true); // capture phase
  }

  // ============================================
  // 🆕 BUTTON DETECTION FUNCTIONS
  // ============================================
  function isQuickAmountButton(button, text) {
    return /[\d.,]+\s*₺/.test(text) && button.type === 'button';
  }

  function isDepositConfirmButton(button, text, classList) {
    const normalizedText = text.toLowerCase().replace(/\s+/g, '');
    
    return (
      button.type === 'submit' ||
      normalizedText.includes('yatırımıyaptım') ||
      normalizedText.includes('yatırımyap') ||
      normalizedText.includes('depozitoyap') ||
      classList.includes('pymnt-frm-btn')
    );
  }

  function isStartTransactionButton(button, text, classList) {
    const normalizedText = text.toLowerCase().replace(/\s+/g, '');
    
    return (
      normalizedText.includes('işlemibaşlat') ||
      normalizedText.includes('başlat') ||
      normalizedText.includes('start') ||
      classList.includes('start-transaction')
    );
  }

  function isConfirmButton(button, text, classList) {
    const normalizedText = text.toLowerCase().replace(/\s+/g, '');
    
    return (
      normalizedText === 'onayla' ||
      normalizedText === 'confirm' ||
      normalizedText === 'approve' ||
      classList.includes('sgn-btn') ||
      classList.includes('confirm-btn')
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

  // ============================================
  // 🆕 AMOUNT EXTRACTION FUNCTIONS
  // ============================================
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
                 document.querySelector('input[placeholder*="Miktar"]') ||
                 document.querySelector('input[name*="amount"]');
    
    if (input && input.value) {
      return extractAmountFromInputValue(input.value);
    }
    
    return null;
  }

  function extractAmountFromInputValue(value) {
    if (!value) return null;
    
    const cleaned = value.replace(/[^\d.,]/g, '');
    
    // Türkçe format: 1.234,56
    if (cleaned.includes(',')) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }
    // İngilizce format: 1,234.56
    else {
      return parseFloat(cleaned.replace(/,/g, ''));
    }
  }

  // ============================================
  // 🆕 INPUT FIELD MONITORING
  // ============================================
  function monitorFormInputs() {
    attachInputListeners();

    // Dinamik olarak eklenen input'ları yakala (popup'lar için)
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
      'input[placeholder*="tutar"]',
      'input[id*="amount"]',
      'input[id*="miktar"]',
      'input[id="mntNpt"]',
      'input[type="number"]',
      '.amount-input',
      '.deposit-amount',
      '.withdrawal-amount'
    ];

    amountInputSelectors.forEach(selector => {
      const inputs = root.querySelectorAll(selector);
      inputs.forEach(input => {
        if (input.dataset.trackerAttached) return;
        
        input.dataset.trackerAttached = 'true';

        input.addEventListener('input', (e) => {
          const amount = extractAmountFromInputValue(e.target.value);
          if (amount) {
            currentFormData.amount = amount;
            console.log(`💰 Input'a miktar girildi: ${amount} ₺`);
            
            sendEvent('amount_input_changed', {
              amount: amount,
              input_id: e.target.id || 'unknown'
            });
          }
        });

        input.addEventListener('blur', (e) => {
          const amount = extractAmountFromInputValue(e.target.value);
          if (amount) {
            currentFormData.amount = amount;
            console.log(`💰 Miktar onaylandı: ${amount} ₺`);
            
            sendEvent('amount_input_confirmed', {
              amount: amount,
              input_id: e.target.id || 'unknown'
            });
          }
        });

        if (input.placeholder) {
          console.log(`📝 Input field bulundu, placeholder: "${input.placeholder}"`);
        }
      });
    });
  }

  // ============================================
  // AMOUNT EXTRACTION HELPER (DOM Config için)
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

            // Miktar çıkarma
            if (rule.extractAmount && rule.amountSelector) {
              const amount = extractAmount(rule.amountSelector);
              
              if (amount !== null) {
                parameters.amount = amount;
                console.log(`TrackLib: Amount extracted - ${amount} from ${rule.amountSelector}`);
              } else {
                console.warn(`TrackLib: Could not extract amount from ${rule.amountSelector}`);
              }
            }

            // Data attributes'tan dinamik parametreler
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
  // HELPER FUNCTIONS
  // ============================================
  function generateTempId() {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  // 🆕 Debug fonksiyonları
  tracker.extractAmount = extractAmount;
  tracker.getStatus = function() {
    return {
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
    
    // 🆕 Gelişmiş tracking özelliklerini başlat
    setupDomTracking();
    setupAdvancedDOMListeners();
    monitorFormInputs();
    interceptNetworkRequests();
    
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
  
  // 🆕 Debug komutları
  window.getTrackerStatus = () => tracker.getStatus();
  window.clearPendingTx = () => tracker.clearPendingTransactions();
  window.getCurrentFormData = () => currentFormData;
  
  console.log('✓ TrackLib Advanced v2.0 initialized successfully');
  console.log('✓ Available as: window.TrackLib and window.tracker');
  console.log('✓ Debug: window.getTrackerStatus() | window.clearPendingTx()');
})();