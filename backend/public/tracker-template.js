(function() {
  // Config backend tarafından enjekte edilecek
  const config = __CONFIG__;
  
  if (!config) {
    console.error("TrackLib: Configuration not found");
    return;
  }

  console.log(`TrackLib v1.0 initialized for ${config.scriptId}`);

  // ============================================
  // CORE VARIABLES
  // ============================================
  const tracker = {};
  let sessionId = getOrCreateSessionId();
  let playerId = null;
  let eventQueue = []; // Retry mekanizması için
  let isOnline = navigator.onLine;

  // ============================================
  // SESSION MANAGEMENT
  // ============================================
  function getOrCreateSessionId() {
    const key = 'tracklib_session_id';
    let sid = localStorage.getItem(key);
    
    // Session süresi dolmuş mu kontrol et (30 dakika)
    const lastActivity = localStorage.getItem('tracklib_last_activity');
    const now = Date.now();
    
    if (sid && lastActivity && (now - parseInt(lastActivity)) < 30 * 60 * 1000) {
      localStorage.setItem('tracklib_last_activity', now.toString());
      return sid;
    }
    
    // Yeni session oluştur
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
          'X-Script-Version': '1.0'
        },
        body: JSON.stringify(payload),
        keepalive: true // Sayfa kapanırken bile gönder
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`✓ TrackLib: ${eventName} sent`);
      return true;

    } catch (error) {
      console.error(`✗ TrackLib: ${eventName} failed:`, error.message);
      
      // Retry logic (maksimum 3 deneme)
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`  Retrying in ${delay}ms...`);
        setTimeout(() => sendEvent(eventName, params, retryCount + 1), delay);
      } else {
        // Başarısız olayı localStorage'a kaydet
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
      
      // Maksimum 50 event sakla
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

  // Online/offline durumunu dinle
  window.addEventListener('online', () => {
    isOnline = true;
    console.log('TrackLib: Back online, processing queue');
    processQueue();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    console.log('TrackLib: Offline mode activated');
  });

  // ============================================
  // SOURCE ATTRIBUTION
  // ============================================
  function handleSourceAttribution() {
    const params = new URLSearchParams(window.location.search);
    const storageKey = 'tracklib_source';
    const storedSource = localStorage.getItem(storageKey);
    const ourSource = config.scriptId; // "pix_ronabet"

    // İlk ziyaret veya farklı kaynak
    if (!storedSource || storedSource !== ourSource) {
      localStorage.setItem(storageKey, ourSource);
      localStorage.setItem('tracklib_first_visit', new Date().toISOString());
    }

    // URL'e aff parametresi ekle
    if (params.get('aff') !== ourSource) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('aff', ourSource);
      window.history.replaceState({}, '', currentUrl.toString());
    }
  }

  // ============================================
  // AUTO EVENT TRACKING (DOM-based)
  // ============================================
  function activateAutoTracking() {
    const domConfig = config.domConfig;
    if (!domConfig || !Array.isArray(domConfig.rules)) {
      console.log('TrackLib: No DOM tracking rules configured');
      return;
    }

    // Click tracking with debounce
    let clickTimeout;
    document.body.addEventListener('click', function(event) {
      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        domConfig.rules.forEach(rule => {
          try {
            const element = event.target.closest(rule.selector);
            if (element) {
              console.log(`TrackLib: Auto-tracked "${rule.eventName}"`);
              tracker.track(rule.eventName, {
                element_text: element.textContent.trim().substring(0, 100),
                element_id: element.id || null,
                element_class: element.className || null
              });
            }
          } catch (e) {
            console.error(`TrackLib: Invalid selector "${rule.selector}"`, e);
          }
        });
      }, 100); // 100ms debounce
    }, true);

    console.log(`TrackLib: Auto-tracking enabled (${domConfig.rules.length} rules)`);
  }

  // ============================================
  // PUBLIC API
  // ============================================
  
  // Player kimliğini tanımla
  tracker.identify = function(userId) {
    if (!userId) {
      console.warn('TrackLib: Invalid user ID');
      return;
    }

    if (playerId !== userId) {
      playerId = userId;
      console.log(`TrackLib: Player identified as ${userId}`);
      
      // Queue'daki eventleri gönder
      if (eventQueue.length > 0) {
        console.log(`TrackLib: Sending ${eventQueue.length} queued events`);
        eventQueue.forEach(item => sendEvent(item.eventName, item.params));
        eventQueue = [];
      }

      // Identify eventini gönder
      tracker.track('player_identified', { player_id: userId });
    }
  };

  // Manuel event tracking
  tracker.track = function(eventName, params = {}) {
    if (!eventName) {
      console.warn('TrackLib: Event name required');
      return;
    }

    // Player ID yoksa queue'ya ekle
    if (!playerId) {
      console.log(`TrackLib: Queuing "${eventName}" (no player ID yet)`);
      eventQueue.push({ eventName, params });
      return;
    }

    sendEvent(eventName, params);
  };

  // Page view tracking
  tracker.pageView = function(customParams = {}) {
    tracker.track('page_view', {
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      ...customParams
    });
  };

  // Convenience methods
  tracker.login = (userId) => {
    tracker.identify(userId);
    tracker.track('login_successful');
  };

  tracker.deposit = (amount, currency = 'TRY', method = null) => {
    tracker.track('deposit_successful', { amount, currency, method });
  };

  tracker.withdrawal = (amount, currency = 'TRY', method = null) => {
    tracker.track('withdrawal_successful', { amount, currency, method });
  };

  // ============================================
  // INITIALIZATION
  // ============================================
  function initialize() {
    // 1. Source attribution
    handleSourceAttribution();
    
    // 2. Process queued events
    processQueue();
    
    // 3. Auto tracking
    activateAutoTracking();
    
    // 4. Initial page view
    tracker.pageView();
    
    // 5. Sayfa kapanırken son eventleri gönder
    window.addEventListener('beforeunload', () => {
      if (eventQueue.length > 0) {
        eventQueue.forEach(item => saveToQueue(item.eventName, item.params));
      }
    });

    console.log('TrackLib: Fully initialized ✓');
  }

  // Global scope'a ekle
  window.igamingTracker = tracker;
  window.tracker = tracker; // Backward compatibility

  // DOM ready olduğunda başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Custom event dispatch
  document.dispatchEvent(new CustomEvent('igamingTracker:loaded', { detail: config }));

})();