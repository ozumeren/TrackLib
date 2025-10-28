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
  // 💳 PAYMENT METHOD MAPPING
  // ============================================
  const PAYMENT_METHOD_MAPPING = {
    vevopay: {
      category: 'ÖZEL',
      displayName: 'VevoPay',
      type: 'gateway',
      identifiers: ['vevopay', 'vevopay-havale', 'deposit-1548']
    },
    havale_fast: {
      category: 'HAVALE/FAST',
      displayName: 'Havale/EFT/Fast',
      type: 'gateway',
      identifiers: ['havale', 'eft', 'fast', 'bank_transfer', 'banka_havalesi']
    },
    manuel_havale: {
      category: 'MANUEL HAVALE',
      displayName: 'Manuel Havale',
      type: 'manual',
      identifiers: ['manuel', 'manuel_havale', 'manuel_transfer']
    },
    papara: {
      category: 'PAPARA',
      displayName: 'Papara',
      type: 'wallet',
      identifiers: ['papara']
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
    payco: {
      category: 'SANAL CÜZDAN',
      displayName: 'Payco',
      type: 'wallet',
      identifiers: ['payco']
    },
    paypay: {
      category: 'SANAL CÜZDAN',
      displayName: 'PayPay',
      type: 'wallet',
      identifiers: ['paypay']
    },
    qr_code: {
      category: 'QR KOD',
      displayName: 'QR Kod',
      type: 'gateway',
      identifiers: ['qr', 'qr_code', 'qr_kod']
    },
    credit_card: {
      category: 'KREDİ KARTI',
      displayName: 'Kredi Kartı',
      type: 'gateway',
      identifiers: ['credit_card', 'kredi_karti', 'kredi_kartı', 'visa', 'mastercard', 'bank_card']
    }
  };

  // ============================================
  // 💳 PAYMENT METHOD DETECTION FUNCTIONS
  // ============================================
  
  /**
   * API endpoint'inden ödeme yöntemini tespit eder
   */
  function detectPaymentMethodFromAPI(url) {
    if (!url) return null;
    
    const match = url.match(/\/odin\/api\/user\/payment\/([^\/]+)\/(deposit|withdraw)/);
    if (!match) return null;

    const methodName = match[1].toLowerCase().replace(/-/g, '_');
    const action = match[2];

    for (const [key, value] of Object.entries(PAYMENT_METHOD_MAPPING)) {
      if (key === methodName || value.identifiers.some(id => id === methodName)) {
        return { 
          ...value, 
          action, 
          detectedFrom: 'api_endpoint' 
        };
      }
    }

    return {
      category: 'UNKNOWN',
      displayName: methodName,
      type: 'unknown',
      action,
      detectedFrom: 'api_endpoint'
    };
  }

  /**
   * DOM element'inden ödeme yöntemini tespit eder
   */
  function detectPaymentMethodFromDOM(element) {
    if (!element) return null;

    const classList = (element.className || '').toLowerCase();
    const imgSrc = (element.querySelector('img')?.src || '').toLowerCase();
    const text = (element.textContent || '').toLowerCase();

    for (const [key, value] of Object.entries(PAYMENT_METHOD_MAPPING)) {
      for (const identifier of value.identifiers) {
        const idLower = identifier.toLowerCase();
        if (classList.includes(idLower) || 
            imgSrc.includes(idLower) || 
            text.includes(idLower)) {
          return { 
            ...value, 
            detectedFrom: 'dom_element' 
          };
        }
      }
    }

    return null;
  }

  /**
   * Pop-up HTML içeriğinden ödeme yöntemini tespit eder
   */
  function detectPaymentMethodFromPopup(html) {
    if (!html) return null;
    
    const lowerHTML = html.toLowerCase();

    for (const [key, value] of Object.entries(PAYMENT_METHOD_MAPPING)) {
      for (const identifier of value.identifiers) {
        if (lowerHTML.includes(identifier.toLowerCase())) {
          return { 
            ...value, 
            detectedFrom: 'popup_content' 
          };
        }
      }
    }

    return null;
  }

  // 🎰 TRUVABET GAME TRACKING VARIABLES
  let activeGameSession = null;
  let lastKnownBalance = null;
  let balanceCheckInterval = null;

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
// ============================================
// 🎁 BONUS TRACKING
// ============================================
function analyzeBonusResponse(url, data) {
  if (!url || !data) return;
  
  const urlStr = url.toString().toLowerCase();
  
  // Bonus API: truvabonus-api.gorselpanel.com/api/NewFrames/Index
  if (urlStr.includes('truvabonus-api.gorselpanel.com') || 
      urlStr.includes('/newframes/index')) {
    
    // En son bonus talebi (process)
    if (data.process && data.process.name) {
      const bonus = data.process;
      
      sendEvent('bonus_requested', {
        bonus_id: bonus.id || 0,
        bonus_name: bonus.name,
        request_date: bonus.date,
        status: bonus.status ? 'approved' : 'pending',
        message: bonus.message || 'Beklemede'
      });
      
      console.log(`🎁 Bonus talebi: ${bonus.name} (${bonus.status ? 'Onaylandı' : 'Beklemede'})`);
    }
    
    // Bonus talep geçmişi analizi
    if (data.requests && Array.isArray(data.requests)) {
      const approvedBonuses = data.requests.filter(r => r.status === true);
      const rejectedBonuses = data.requests.filter(r => r.status === false);
      
      console.log(`📊 Bonus geçmişi: ${approvedBonuses.length} onaylı, ${rejectedBonuses.length} reddedildi`);
    }
  }
}
  function analyzeNetworkResponse(url, data, options = {}) {
    if (!url || !data) return;

    const urlStr = url.toString();
    
    // ✅ PAYMENT METHOD DETECTION
    const paymentInfo = detectPaymentMethodFromAPI(urlStr);
    if (paymentInfo) {
      console.log(`💳 API'den ödeme yöntemi tespit edildi:`, paymentInfo);
    }

    // 1. ODIN Balance API (get_accounts)
    if (urlStr.includes('/odin/api/user/accounts/get_accounts') || 
        urlStr.includes('/get_accounts')) {
      handleOdinBalanceUpdate(data);
    }

    // 2. ODIN Deposit API
    if (urlStr.includes('/odin/api/user/payment/') && urlStr.includes('/deposit')) {
      const amount = data.amount || data.value || null;
      
      if (amount && paymentInfo) {
        const txId = `deposit_${Date.now()}`;
        pendingTransactions.set(txId, {
          type: 'deposit',
          amount: amount,
          method: paymentInfo.displayName,
          category: paymentInfo.category,
          paymentType: paymentInfo.type,
          currency: 'TRY',
          status: 'pending',
          timestamp: Date.now()
        });
        
        sendEvent('deposit_initiated', {
          transaction_id: txId,
          amount: amount,
          payment_method: paymentInfo.displayName,
          payment_category: paymentInfo.category,
          payment_type: paymentInfo.type,
          currency: 'TRY'
        });
      }
    }

    // 3. ODIN Pending Transactions
    if (urlStr.includes('/transaction/getCustomerNewOrPendingTransactions')) {
      handleOdinPendingTransactions(data);
    }

    // 4. ODIN Withdrawal Request
    if (urlStr.includes('/payment/') && urlStr.includes('/withdraw')) {
      console.log('💸 Para çekme talebi gönderildi');
      
      const withdrawalPaymentInfo = detectPaymentMethodFromAPI(urlStr);
      const amount = data.amount || data.value || null;
      
      if (amount && withdrawalPaymentInfo) {
        const txId = `withdrawal_${Date.now()}`;
        pendingTransactions.set(txId, {
          type: 'withdrawal',
          amount: amount,
          method: withdrawalPaymentInfo.displayName,
          category: withdrawalPaymentInfo.category,
          paymentType: withdrawalPaymentInfo.type,
          currency: 'TRY',
          status: 'pending',
          timestamp: Date.now()
        });
        
        sendEvent('withdrawal_initiated', {
          transaction_id: txId,
          amount: amount,
          payment_method: withdrawalPaymentInfo.displayName,
          payment_category: withdrawalPaymentInfo.category,
          payment_type: withdrawalPaymentInfo.type,
          currency: 'TRY'
        });
        
        console.log(`💸 Pending withdrawal: ${txId} - ${amount} TRY via ${withdrawalPaymentInfo.displayName}`);
      }
    }
  analyzeBonusResponse(url, data);
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
// 🎯 TRUVABET PAYMENT METHOD DETECTION
// ============================================
const PAYMENT_METHOD_MAP = {
  'banka_havalesi': 'bank_transfer',
  'bank_transfer': 'bank_transfer',
  'havale': 'bank_transfer',
  'eft': 'bank_transfer',
  
  'bitcoin': 'bitcoin',
  'btc': 'bitcoin',
  
  'kredi_kartı': 'credit_card',
  'credit_card': 'credit_card',
  'visa': 'credit_card',
  'mastercard': 'credit_card',
  
  'mefete': 'mefete',
  'papara': 'papara',
  'parazula': 'parazula',
  'payco': 'payco',
  'payfix': 'payfix',
  'paypay': 'paypay',
  
  'qr_kod': 'qr_code',
  'qr': 'qr_code',
  
  'tether': 'usdt',
  'usdt': 'usdt',
  'trc20': 'trc20',
  'erc20': 'erc20',
  
  'ethereum': 'ethereum',
  'eth': 'ethereum',
  
  'crypto': 'crypto',
  'kripto': 'crypto'
};

function detectPaymentMethod() {
  // 1. Modal içindeki aktif ödeme yöntemini kontrol et
  const activePaymentTab = document.querySelector('.payment-tab.active, .pymnt-mdl .active');
  if (activePaymentTab) {
    const text = activePaymentTab.textContent.toLowerCase().trim();
    for (const [key, value] of Object.entries(PAYMENT_METHOD_MAP)) {
      if (text.includes(key)) return value;
    }
  }
  
  // 2. URL'den çıkar
  const url = window.location.href.toLowerCase();
  for (const [key, value] of Object.entries(PAYMENT_METHOD_MAP)) {
    if (url.includes(key)) return value;
  }
  
  // 3. Son tıklanan payment button'dan
  const lastClickedPayment = document.querySelector('[data-payment-method]');
  if (lastClickedPayment) {
    return lastClickedPayment.dataset.paymentMethod;
  }
  
  return 'unknown';
}

// Deposit initiated event'inde kullan:
//sendEvent('deposit_initiated', {
  //transaction_id: txId,
  //amount: amount,
  //currency: 'TRY',
  //method: detectPaymentMethod() // 
//});

// ============================================
// 🆕 ADVANCED DOM LISTENERS (HELPER'LARDAN SONRA!)
// ============================================
function setupAdvancedDOMListeners() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button, a, [role="button"]');
    if (!target) return;

    const text = target.textContent.trim();
    const classList = Array.from(target.classList).join(' ');
    
    // ❌ ÇEKİM BUTONLARINI ATLA
    const isWithdrawalButton = text.toLowerCase().includes('çek') || 
                                text.toLowerCase().includes('withdraw') ||
                                classList.includes('withdrawal') ||
                                classList.includes('withdraw-btn');
    
    if (isWithdrawalButton) {
      console.log('🚫 Withdrawal button detected, skipping deposit tracking');
      return;
    }
    
    if (isQuickAmountButton(target, text)) {
      const amount = extractAmountFromButton(text);
      if (amount) {
        currentFormData.amount = amount;
        console.log(`💰 Hızlı tutar seçildi: ${amount} ₺`);
      }
    }
    
    // "Yatırımı Yaptım" butonu
    else if (isDepositConfirmButton(target, text, classList)) {
      console.log('💳 "Yatırımı Yaptım" butonuna tıklandı');
      
      const amount = currentFormData.amount || getAmountFromInput();
      
      if (amount) {
        const txId = `tx_${Date.now()}`;
        
        pendingTransactions.set(txId, {
          type: 'deposit',
          amount: amount,
          timestamp: Date.now(),
          currency: 'TRY',
          method: 'unknown'
        });

        sendEvent('deposit_initiated', {
          transaction_id: txId,
          amount: amount,
          currency: 'TRY',
          method: 'manual'
        });

        console.log(`📝 Bekleyen para yatırma işlemi: ${txId} - ${amount} ₺`);
      }
    }
    
    // "İşlemi Başlat" butonu
    else if (isStartTransactionButton(target, text, classList)) {
      console.log('🚀 "İşlemi Başlat" butonuna tıklandı');
      
      const amount = currentFormData.amount || getAmountFromInput();
      
      if (amount) {
        sendEvent('deposit_gateway_initiated', {
          amount: amount,
          currency: 'TRY',
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

  // ============================================
// 🎁 BONUS BUTTON CLICK TRACKING
// ============================================
function setupBonusButtonTracking() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button, a, [role="button"]');
    if (!target) return;
    
    const text = target.textContent.trim().toLowerCase();
    
    // "Talep Et" butonu
    if (text.includes('talep et') || text.includes('bonus al')) {
      // Bonus kartını bul
      const bonusCard = target.closest('.bonus-card, [class*="bonus"]');
      if (bonusCard) {
        const bonusName = bonusCard.querySelector('h3, h4, .bonus-title, .name')?.textContent?.trim();
        const bonusDesc = bonusCard.querySelector('.description, .desc, p')?.textContent?.trim();
        
        if (bonusName) {
          sendEvent('bonus_claim_clicked', {
            bonus_name: bonusName,
            bonus_description: bonusDesc || 'N/A'
          });
          
          console.log(`🎁 Bonus talep butonu tıklandı: ${bonusName}`);
        }
      }
    }
  });
}

// ============================================
// 🆕 BUTTON DETECTION HELPERS (ÖNCELİKLE TANIMLA!)
// ============================================
function isQuickAmountButton(button, text) {
  return /\d+\s*₺/.test(text) && button.type === 'button';
}

function isDepositConfirmButton(button, text, classList) {
  const normalizedText = text.toLowerCase().replace(/\s+/g, '');
  
  return (
    normalizedText.includes('yatır') ||
    classList.includes('deposit-btn') ||
    classList.includes('deposit-confirm') ||
    button.closest('#depositModal, #depositForm')
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

function extractAmountFromButton(text) {
  const match = text.match(/[\d.,]+/);
  if (match) {
    const cleaned = match[0].replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned);
  }
  return null;
}

function getAmountFromInput() {
  const selectors = [
    'input[name*="amount"]',
    'input[name*="miktar"]',
    'input[id*="amount"]',
    'input[id="mntNpt"]',
    '.amount-input'
  ];
  
  for (const selector of selectors) {
    const input = document.querySelector(selector);
    if (input && input.value) {
      return extractAmountFromInputValue(input.value);
    }
  }
  
  return null;
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
        }
      }
    });
  }

  // ============================================
  // 🆕 ODIN PENDING TRANSACTIONS HANDLER
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

  function handleOdinPendingTransactions(data) {
    if (!data.success || !Array.isArray(data.data)) return;

    data.data.forEach(tx => {
      const txType = tx.transactionType?.code;
      
      // Para yatırma işlemi
      if (txType === 'D' || txType === 'Deposit') {
        const txId = `odin_${tx.id}`;
        
        if (!pendingTransactions.has(txId)) {
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
        
        
        const amountEl = modal.querySelector('.rslt-mdl h5 > span');
        const amountText = amountEl?.textContent || '';
        const amount = parseFloat(amountText.replace(/[^\d.,]/g, '').replace(',', '.'));
        
        const modalHTML = modal.innerHTML;
        const paymentInfo = detectPaymentMethodFromPopup(modalHTML);
        
        if (amount && amount > 0) {
          if (paymentInfo) {
            console.log(`💳 Ödeme yöntemi: ${paymentInfo.displayName} (${paymentInfo.category})`);
          }
          
          const txId = `deposit_${Date.now()}`;
          pendingTransactions.set(txId, {
            type: 'deposit',
            amount: amount,
            method: paymentInfo?.displayName || 'unknown',
            category: paymentInfo?.category || 'unknown',
            paymentType: paymentInfo?.type || 'unknown',
            status: 'pending',
            timestamp: Date.now()
          });
          
          
          sendEvent('deposit_initiated', {
            transaction_id: txId,
            amount: amount,
            payment_method: paymentInfo?.displayName || 'unknown',
            payment_category: paymentInfo?.category || 'unknown',
            payment_type: paymentInfo?.type || 'unknown',
            currency: 'TRY'
          });
          
          console.log(`✅ Deposit success modal detected: ${amount} ₺`);
          
          setTimeout(() => {
            depositModalProcessed.delete(modalHash);
          }, 10000);
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
  // BALANCE & TRANSACTION HANDLERS
  // ============================================
  function handleBalanceUpdate(data) {
    const balance = data.balance || data.amount || data.value;
    
    if (balance !== null && balance !== undefined) {
      const lastBalance = lastKnownBalances.get('generic') || 0;
      lastKnownBalances.set('generic', balance);
      
      const change = balance - lastBalance;
      
      if (change !== 0 && lastBalance > 0) {
        console.log(`💰 Balance updated: ${lastBalance} → ${balance} (${change > 0 ? '+' : ''}${change})`);

        matchPendingTransaction(Math.abs(change), change > 0 ? 'deposit' : 'withdrawal');

        sendEvent('balance_updated', {
          previous_balance: lastBalance,
          new_balance: balance,
          change: change
        });
      }
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
            payment_category: tx.category || 'unknown',
            payment_type: tx.paymentType || 'unknown',
            duration_seconds: Math.floor((Date.now() - tx.timestamp) / 1000)
          });
        } else if (tx.type === 'withdrawal') {
          sendEvent('withdrawal_successful', {
            transaction_id: txId,
            amount: tx.amount,
            currency: tx.currency || 'TRY',
            payment_method: tx.method,
            payment_category: tx.category,
            payment_type: tx.paymentType,
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
  // GAME TRACKING
  // ============================================

  // BALANCE EXTRACTION - TRUVABET SPECIFIC
  function extractTruvabetBalance() {
    // Öncelik 1: Header'daki ana bakiye
    const mainBalanceSelectors = [
      '.balance-dropdown-main span[title="Ana Bakiye"] span',
      '.balance-dropdown-main .left > span > span',
    ];
    
    for (const selector of mainBalanceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || element.innerText;
        const match = text.match(/([\d.,]+)/);
        if (match) {
          const balance = parseFloat(match[1].replace(',', ''));
          if (!isNaN(balance)) {
            return balance;
          }
        }
      }
    }
    
    // Öncelik 2: Dropdown içindeki "Bakiye"
    const dropdownBalance = document.querySelector('.balance-dropdropdown .blance-text.blc-color:nth-of-type(2) span span');
    if (dropdownBalance) {
      const text = dropdownBalance.textContent || dropdownBalance.innerText;
      const match = text.match(/([\d.,]+)/);
      if (match) {
        const balance = parseFloat(match[1].replace(',', ''));
        if (!isNaN(balance)) {
          return balance;
        }
      }
    }
    
    return null;
  }

  // GAME URL PATTERN DETECTION
  function extractGameInfoFromURL(url) {
    const patterns = [
      {
        regex: /\/games\/detail\/casino\/normal\/(\d+)/,
        type: 'casino'
      },
      {
        regex: /\/games\/livecasino\/detail\/normal\/(\d+)/,
        type: 'live_casino'
      },
      {
        regex: /\/games\/casino\/detail\/normal\/(\d+)/,
        type: 'casino'
      },
      {
        regex: /\/games\/poker/,
        type: 'poker'
      },
      {
        regex: /\/games\/bingo\/(\d+)/,
        type: 'bingo'
      }
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern.regex);
      if (match) {
        return {
          gameId: match[1] || 'unknown',
          gameType: pattern.type,
          gameName: extractGameNameFromTitle()
        };
      }
    }
    
    return null;
  }

  function extractGameNameFromTitle() {
    const title = document.title;
    const match = title.match(/^([^|]+)/);
    return match ? match[1].trim() : 'Unknown Game';
  }

  // GAME SESSION HANDLERS
  function handleTruvabetGameStart(gameInfo) {
    if (activeGameSession) {
      handleTruvabetGameEnd();
    }
    
    const balanceBefore = extractTruvabetBalance();
    
    activeGameSession = {
      gameId: gameInfo.gameId,
      gameName: gameInfo.gameName,
      gameType: gameInfo.gameType,
      gameUrl: window.location.href,
      startTime: Date.now(),
      balanceBefore: balanceBefore
    };
    
    sendEvent('game_started', {
      game_id: gameInfo.gameId,
      game_name: gameInfo.gameName,
      game_type: gameInfo.gameType,
      game_url: window.location.href,
      balance_before: balanceBefore,
      currency: 'TRY'
    });
    
    startTruvabetBalanceMonitoring();
    
    console.log(`🎮 Game started: ${gameInfo.gameName} (Balance: ${balanceBefore} TRY)`);
  }

  function handleTruvabetGameEnd() {
    if (!activeGameSession) return;
    
    stopTruvabetBalanceMonitoring();
    
    const balanceAfter = extractTruvabetBalance();
    const duration = Math.floor((Date.now() - activeGameSession.startTime) / 1000);
    
    let balanceChange = null;
    let result = 'unknown';
    
    if (activeGameSession.balanceBefore !== null && balanceAfter !== null) {
      balanceChange = balanceAfter - activeGameSession.balanceBefore;
      result = balanceChange > 0 ? 'win' : (balanceChange < 0 ? 'loss' : 'neutral');
    }
    
    sendEvent('game_ended', {
      game_id: activeGameSession.gameId,
      game_name: activeGameSession.gameName,
      game_type: activeGameSession.gameType,
      game_url: activeGameSession.gameUrl,
      balance_before: activeGameSession.balanceBefore,
      balance_after: balanceAfter,
      balance_change: balanceChange,
      duration_seconds: duration,
      result: result,
      currency: 'TRY'
    });
    
    console.log(`🏁 Game ended: ${activeGameSession.gameName} | Duration: ${duration}s | Balance: ${activeGameSession.balanceBefore} → ${balanceAfter} (${balanceChange > 0 ? '+' : ''}${balanceChange})`);
    
    activeGameSession = null;
  }

  // BALANCE MONITORING (During Game)
  function startTruvabetBalanceMonitoring() {
    stopTruvabetBalanceMonitoring();
    
    lastKnownBalance = extractTruvabetBalance();
    
    balanceCheckInterval = setInterval(() => {
      const currentBalance = extractTruvabetBalance();
      
      if (currentBalance !== null && lastKnownBalance !== null && currentBalance !== lastKnownBalance) {
        const change = currentBalance - lastKnownBalance;
        
        if (Math.abs(change) > 1) {
          sendEvent('in_game_balance_change', {
            game_id: activeGameSession?.gameId,
            game_name: activeGameSession?.gameName,
            balance_before: lastKnownBalance,
            balance_after: currentBalance,
            balance_change: change,
            currency: 'TRY'
          });
        }
        
        lastKnownBalance = currentBalance;
      }
    }, 10000);
  }

  function stopTruvabetBalanceMonitoring() {
    if (balanceCheckInterval) {
      clearInterval(balanceCheckInterval);
      balanceCheckInterval = null;
    }
  }

  // URL CHANGE DETECTION (SPA Navigation)
  function setupTruvabetGameDetection() {
    let lastUrl = location.href;
    
    // İlk yükleme kontrolü
    const initialGameInfo = extractGameInfoFromURL(lastUrl);
    if (initialGameInfo) {
      setTimeout(() => handleTruvabetGameStart(initialGameInfo), 2000);
    }
    
    // URL değişikliklerini izle
    const urlObserver = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        
        const gameInfo = extractGameInfoFromURL(currentUrl);
        
        if (gameInfo) {
          setTimeout(() => handleTruvabetGameStart(gameInfo), 2000);
        } else if (activeGameSession && !currentUrl.includes('/games/')) {
          handleTruvabetGameEnd();
        }
      }
    });
    
    urlObserver.observe(document, { subtree: true, childList: true });
    
    console.log('✅ Truvabet game detection setup complete');
  }

  // BALANCE REFRESH BUTTON TRACKING
  function setupTruvabetBalanceRefreshTracking() {
    const refreshButton = document.querySelector('.refresh-icon');
    if (refreshButton && !refreshButton.dataset.trackerBound) {
      refreshButton.addEventListener('click', () => {
        setTimeout(() => {
          const newBalance = extractTruvabetBalance();
          if (newBalance !== null && newBalance !== lastKnownBalance) {
            sendEvent('balance_refreshed', {
              balance_before: lastKnownBalance,
              balance_after: newBalance,
              balance_change: newBalance - (lastKnownBalance || 0),
              currency: 'TRY',
              triggered_by: 'user_click'
            });
            lastKnownBalance = newBalance;
          }
        }, 1000);
      });
      refreshButton.dataset.trackerBound = 'true';
    }
  }

  // Periyodik olarak refresh butonunu kontrol et
  setInterval(setupTruvabetBalanceRefreshTracking, 3000);

  // IFRAME GAME DETECTION
  function setupTruvabetIframeDetection() {
    const iframeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'IFRAME') {
            const src = node.src || '';
            
            if (src.includes('game') || src.includes('play') || 
                src.includes('pragmatic') || src.includes('evolution') ||
                src.includes('provider') || src.includes('casino')) {
              
              const currentUrl = window.location.href;
              const gameInfo = extractGameInfoFromURL(currentUrl);
              
              if (gameInfo && !activeGameSession) {
                console.log(`🎮 Game iframe detected: ${gameInfo.gameName}`);
                handleTruvabetGameStart(gameInfo);
              }
              
              const removalObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  mutation.removedNodes.forEach((removedNode) => {
                    if (removedNode === node) {
                      console.log(`🏁 Game iframe removed`);
                      handleTruvabetGameEnd();
                      removalObserver.disconnect();
                    }
                  });
                });
              });
              
              if (node.parentNode) {
                removalObserver.observe(node.parentNode, { childList: true });
              }
            }
          }
        });
      });
    });
    
    iframeObserver.observe(document.body, {
      childList: true,
      subtree: true
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
  tracker.getTruvabetBalance = extractTruvabetBalance;
  tracker.getTruvabetGameSession = () => activeGameSession;
  tracker.endTruvabetGame = handleTruvabetGameEnd;
  
  tracker.getStatus = function() {
    return {
      version: '3.0-ODIN-TRUVABET',
      currentFormData: currentFormData,
      pendingTransactions: Array.from(pendingTransactions.entries()),
      lastBalances: Array.from(lastKnownBalances.entries()),
      sessionId: sessionId,
      playerId: playerId,
      activeGameSession: activeGameSession,
      lastKnownBalance: lastKnownBalance
    };
  };

  tracker.clearPendingTransactions = function() {
    pendingTransactions.clear();
    console.log('Tüm pending transaction\'lar temizlendi');
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
    setupAdvancedDOMListeners();
    monitorFormInputs();
    monitorDepositSuccessModal();
    setupBonusButtonTracking(); 
    
    // Initialize game tracking
    setupTruvabetGameDetection();
    setupTruvabetIframeDetection();
    setupTruvabetBalanceRefreshTracking();
    
    processQueue();
  });

  let sessionStartTime = Date.now();
  window.addEventListener('beforeunload', () => {
    const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
    
    if (activeGameSession) {
      handleTruvabetGameEnd();
    }
    
    sendEvent('session_end', { duration_seconds: sessionDuration });
  });

  // Expose to window
  window.TrackLib = tracker;
  window.tracker = tracker;
  
  // Debug commands
  window.getTrackerStatus = () => tracker.getStatus();
  window.clearPendingTx = () => tracker.clearPendingTransactions();
  window.getCurrentFormData = () => currentFormData;
  
  console.log('✓ TrackLib v3.0 ODIN-TRUVABET Edition initialized successfully');
  console.log('✓ Available as: window.TrackLib and window.tracker');
  console.log('✓ Features: ODIN API, Deposit Modal, Withdrawal, Balance Tracking, Game Tracking');
  console.log('✓ Game Tracking: Truvabet-specific ');
  console.log('✓ Debug: window.getTrackerStatus() | window.clearPendingTx()');
})();