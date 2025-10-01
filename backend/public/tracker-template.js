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
  
  window.igamingTracker = tracker;

  // --- GÜNCELLENDİ: Evrensel Gözlemci Motoru (Metin Kontrolü ile) ---
  function initializeObserver() {
    const domConfig = config.domConfig;
    if (!domConfig || !Array.isArray(domConfig.rules)) {
      console.warn("iGaming Tracker: 'domConfig' bulunamadı. Otomatik olay takibi başlatılamadı.");
      return;
    }

    // MutationObserver, sayfaya eklenen yeni elementleri (pop-up'lar gibi) izler.
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                // Sadece HTML elementlerini kontrol et
                if (node.nodeType !== 1) return; 

                for (const rule of domConfig.rules) {
                    try {
                        // Yeni eklenen element veya onun bir alt elementi, seçiciyle eşleşiyor mu?
                        const targetElement = node.matches(rule.selector) ? node : node.querySelector(rule.selector);
                        
                        // YENİ MANTIK: Element bulunduysa VE bir metin kuralı varsa, metni de kontrol et.
                        if (targetElement && (!rule.containsText || targetElement.innerText.toLowerCase().includes(rule.containsText.toLowerCase()))) {
                            
                            console.log(`%c iGaming Tracker: "${rule.eventName}" olayı için bir element yakalandı!`, 'color: green; font-weight: bold;');
                            
                            let params = {};
                            // Eğer miktar ayıklama kuralı varsa, onu çalıştır
                            if (rule.extractAmountRegex) {
                                const regex = new RegExp(rule.extractAmountRegex, 'i');
                                const match = targetElement.innerText.match(regex);
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
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    console.log("iGaming Tracker Evrensel Gözlemcisi aktif.");
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeObserver);
  } else {
    initializeObserver();
  }

  document.dispatchEvent(new CustomEvent('igamingTracker:loaded'));
})();

