(function() {
  const config = __CONFIG__;
  if (!config) {
    console.error("iGaming Tracker: Ana yapılandırma (config) bulunamadı.");
    return;
  }

  const tracker = {};
  let sessionId = getOrCreateSessionId();
  let playerId = null;

  function getOrCreateSessionId() {
    // ... (içerik aynı)
    let sid = localStorage.getItem('igaming_tracker_session_id');
    if (!sid) {
      sid = Date.now().toString(36) + Math.random().toString(36).substr(2);
      localStorage.setItem('igaming_tracker_session_id', sid);
    }
    return sid;
  }

  async function sendEvent(eventName, params) {
    // ... (içerik aynı)
    const payload = {
      api_key: config.apiKey,
      session_id: sessionId,
      player_id: playerId,
      event_name: eventName,
      parameters: params || {},
      url: window.location.href,
      timestamp_utc: new Date().toISOString()
    };
    try {
      await fetch(config.backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('iGaming Tracker Error:', error);
    }
  }

  tracker.identify = function(userId) {
    playerId = userId;
  };

  tracker.track = function(eventName, params = {}) {
    sendEvent(eventName, params);
  };
  
  window.igamingTracker = tracker;

  function initializeEventListener() {
    // --- YENİ HATA AYIKLAMA KODU ---
    console.log("--- iGaming Tracker DEBUG ---");
    console.log("Backend'den gelen tüm config objesi:", config);
    // --- HATA AYIKLAMA SONU ---

    const domConfig = config.domConfig;
    if (!domConfig || !Array.isArray(domConfig.rules)) {
      console.warn("iGaming Tracker: 'domConfig' veya 'rules' bulunamadı. Otomatik olay takibi başlatılamadı.");
      return;
    }

    console.log("iGaming Tracker: 'domConfig' bulundu. Tıklama dinleyicisi kuruluyor...");
    
    document.body.addEventListener('click', function(event) {
      // --- YENİ HATA AYIKLAMA KODU ---
      console.log("Sayfada bir tıklama oldu. Hedef element:", event.target);
      // --- HATA AYIKLAMA SONU ---
      
      for (const rule of domConfig.rules) {
        const matchingElement = event.target.closest(rule.selector);
        if (matchingElement) {
          console.log(`%c iGaming Tracker: "${rule.eventName}" olayı için bir tıklama yakalandı!`, 'color: green; font-weight: bold;');
          window.igamingTracker.track(rule.eventName, {});
        }
      }
    }, true);
    
    console.log("iGaming Tracker Evrensel Olay Dinleyicisi aktif.");
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEventListener);
  } else {
    initializeEventListener();
  }

  document.dispatchEvent(new CustomEvent('igamingTracker:loaded'));
})();
