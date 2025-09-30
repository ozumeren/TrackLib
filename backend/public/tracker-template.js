(function() {
  // Bu obje sunucu tarafından (index.js içinde) dinamik olarak doldurulacak.
  const config = __CONFIG__;

  if (!config || !config.apiKey || !config.backendUrl) {
    console.error("iGaming Tracker: Configuration is missing.");
    return;
  }

  // --- Agresif Kaynak Sahiplenme Mantığı ---
  function handleSourceAttribution() {
    const params = new URLSearchParams(window.location.search);
    const ourSource = 'pix'; // Sahiplenilecek varsayılan ve tek kaynak etiketi
    const storageKey = 'igaming_tracker_source';
    
    const storedSource = localStorage.getItem(storageKey);

    // Oturumun sahibi zaten biz miyiz? Değilse, sahiplen.
    if (storedSource !== ourSource) {
      console.log(`Yeni veya farklı bir oturum tespit edildi. Kaynak '${ourSource}' olarak sahipleniliyor.`);
      localStorage.setItem(storageKey, ourSource);
    }

    // URL'nin doğru etikete sahip olduğundan emin ol.
    if (params.get('aff') !== ourSource) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('aff', ourSource);
      
      // Sayfayı yenilemeden URL'yi güncelle
      window.history.replaceState({}, '', currentUrl.toString());
    }
  }
  // --- Kaynak Sahiplenme Sonu ---


  // --- Çekirdek Tracker Kodu ---
  const tracker = {};
  let sessionId = null;
  let playerId = null;

  function getOrCreateSessionId() {
    let sid = localStorage.getItem('igaming_tracker_session_id');
    if (!sid) {
      sid = Date.now().toString(36) + Math.random().toString(36).substr(2);
      localStorage.setItem('igaming_tracker_session_id', sid);
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
      console.error('iGaming Tracker Error:', error);
    }
  }

  tracker.identify = function(userId) {
    playerId = userId;
  };

  tracker.track = function(eventName, params = {}) {
    sendEvent(eventName, params);
  };
  
  sessionId = getOrCreateSessionId();
  window.igamingTracker = tracker;

  // --- Gözlemci ve Dinleyici Motoru ---
  function initializeListeners() {
    handleSourceAttribution(); // Her sayfa yüklendiğinde kaynak sahiplenme kontrolünü yap
    
    const domConfig = config.domConfig;
    if (!domConfig || !Array.isArray(domConfig.rules)) return;

    // Tüm sayfa üzerindeki tıklamaları dinle
    document.body.addEventListener('click', function(event) {
      // Müşteriye özel her bir kuralı (reçeteyi) döngüye al
      for (const rule of domConfig.rules) {
        try {
          // Tıklanan element veya onun bir üst elementi, kuraldaki seçiciyle eşleşiyor mu?
          const matchingElement = event.target.closest(rule.selector);
          
          if (matchingElement) {
            console.log(`iGaming Tracker: "${rule.eventName}" olayı için bir tıklama yakalandı.`);
            
            let params = {};
            if (rule.extractAmountRegex) {
              const regex = new RegExp(rule.extractAmountRegex, 'i');
              const match = matchingElement.innerText.match(regex);
              if (match && match[1]) {
                params.amount = parseFloat(match[1].replace(',', '.'));
              }
            }
            
            window.igamingTracker.track(rule.eventName, params);
          }
        } catch (e) {
          console.error(`iGaming Tracker: Hatalı seçici "${rule.selector}"`, e);
        }
      }
    }, true); 

    console.log("iGaming Tracker Evrensel Olay Dinleyicisi aktif.");
  }

  // Sayfa tamamen yüklendiğinde dinleyiciyi başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeListeners);
  } else {
    initializeListeners();
  }

  // Script'in yüklendiğini bildiren özel bir olay fırlat
  document.dispatchEvent(new CustomEvent('igamingTracker:loaded'));

})();

