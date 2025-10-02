(function() {
  const config = __CONFIG__;
  if (!config) {
    console.error("TrackLib: Ana yapılandırma (config) bulunamadı.");
    return;
  }

  // --- Kaynak Sahiplenme Mantığı ---
  function handleSourceAttribution() {
    const params = new URLSearchParams(window.location.search);
    const ourSource = 'pix';
    const storageKey = 'tracklib_source';
    const storedSource = localStorage.getItem(storageKey);

    if (storedSource !== ourSource) {
      localStorage.setItem(storageKey, ourSource);
    }

    if (params.get('aff') !== ourSource) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('aff', ourSource);
      window.history.replaceState({}, '', currentUrl.toString());
    }
  }

  // --- Çekirdek Tracker Kodu ---
  const tracker = {};
  let sessionId = getOrCreateSessionId();
  let playerId = null;
  let eventBuffer = []; // Kimlik bilinmeden önce gelen olaylar için bekleme odası

  function getOrCreateSessionId() {
    let sid = localStorage.getItem('tracklib_session_id');
    if (!sid) {
      sid = Date.now().toString(36) + Math.random().toString(36).substr(2);
      localStorage.setItem('tracklib_session_id', sid);
    }
    return sid;
  }

  async function sendEvent(eventName, params) {
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
      console.error('TrackLib Error:', error);
    }
  }

  // --- Tıklama Dinleyici Fonksiyonu ---
  function activateClickTracking() {
    const domConfig = config.domConfig;
    if (!domConfig || !Array.isArray(domConfig.rules)) return;

    document.body.addEventListener('click', function(event) {
      for (const rule of domConfig.rules) {
        try {
          const matchingElement = event.target.closest(rule.selector);
          if (matchingElement) {
            console.log(`TrackLib: "${rule.eventName}" olayı için bir tıklama yakalandı.`);
            tracker.track(rule.eventName, {});
          }
        } catch (e) {
          console.error(`TrackLib: Hatalı seçici "${rule.selector}"`, e);
        }
      }
    }, true);
    console.log("TrackLib Evrensel Olay Dinleyicisi aktif.");
  }

  // --- Kimlik Tanımlama ve Bekleme Odasını Boşaltma ---
  tracker.identify = function(userId) {
    if (userId && playerId !== userId) {
        playerId = userId;
        console.log(`TrackLib: Oyuncu kimliği ${playerId} olarak ayarlandı.`);
        if (eventBuffer.length > 0) {
            console.log(`TrackLib: Bekleme odasındaki ${eventBuffer.length} olay gönderiliyor...`);
            eventBuffer.forEach(event => sendEvent(event.eventName, event.params));
            eventBuffer = [];
        }
    }
  };

  // --- Olay Takibi ve Bekleme Odası Mantığı ---
  tracker.track = function(eventName, params = {}) {
    if (playerId) {
        sendEvent(eventName, params);
    } else {
        console.log(`TrackLib: Oyuncu kimliği henüz bilinmiyor. "${eventName}" olayı bekleme odasına eklendi.`);
        eventBuffer.push({ eventName, params });
    }
  };
  
  window.igamingTracker = tracker;

  // --- Ana Başlatma Fonksiyonu ---
  function initialize() {
    handleSourceAttribution();
    activateClickTracking(); // Tıklama dinleyicisini her zaman başlat
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  document.dispatchEvent(new CustomEvent('igamingTracker:loaded'));

})();
