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
    console.log('TrackLib: Offline mode');
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
      console.error('TrackLib: Not initialized');
      return;
    }
    sendEvent(eventName, params);
  };

  // Yüksek seviye event fonksiyonları
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
      currency: currency || 'USD',
      method: method || 'unknown'
    });
  };

  tracker.withdrawal = function(amount, currency, method) {
    sendEvent('withdrawal_successful', {
      amount: parseFloat(amount),
      currency: currency || 'USD',
      method: method || 'unknown'
    });
  };

  tracker.bet = function(amount, currency, game) {
    sendEvent('bet_placed', {
      amount: parseFloat(amount),
      currency: currency || 'USD',
      game: game || 'unknown'
    });
  };

  tracker.win = function(amount, currency, game) {
    sendEvent('win', {
      amount: parseFloat(amount),
      currency: currency || 'USD',
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

  // ============================================
  // EXPOSE TO WINDOW - After all methods are defined
  // ============================================
  window.TrackLib = tracker;
  window.tracker = tracker;
  
  console.log('✓ Tracker methods exposed to window');

  // ============================================
  // AUTO TRACKING
  // ============================================
  
  // Page view tracking
  window.addEventListener('load', () => {
    sendEvent('page_view', {
      page_path: window.location.pathname,
      page_url: window.location.href
    });
    
    // Process queued events
    processQueue();
  });

  // Session tracking
  let sessionStartTime = Date.now();
  window.addEventListener('beforeunload', () => {
    const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
    sendEvent('session_end', { duration_seconds: sessionDuration });
  });

  console.log('✓ TrackLib fully initialized');
})();