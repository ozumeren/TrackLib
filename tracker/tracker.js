(function() {
    const tracker = {};
    let customerApiKey = null;
    let sessionId = null;
    let playerId = null;

    // !!! ÖNEMLİ: Backend URL'inizi buraya girin
    const backendUrl = 'https://api.strastix.com/v1/events';

    function getOrCreateSessionId() {
        let sid = localStorage.getItem('tracker_session_id');
        if (!sid) {
            sid = Date.now().toString(36) + Math.random().toString(36).substr(2);
            localStorage.setItem('tracker_session_id', sid);
        }
        return sid;
    }

    async function sendEvent(eventName, params) {
        const payload = {
            api_key: customerApiKey,
            session_id: sessionId,
            player_id: playerId,
            event_name: eventName,
            parameters: params,
            url: window.location.href,
            timestamp_utc: new Date().toISOString()
        };

        try {
            await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log('Event sent:', eventName);
        } catch (error) {
            console.error('Tracker Error:', error);
        }
    }

    tracker.init = function(apiKey) {
        customerApiKey = apiKey;
        sessionId = getOrCreateSessionId();
    };

    tracker.identify = function(userId) {
        playerId = userId;
    };

    tracker.track = function(eventName, params = {}) {
        if (!customerApiKey) {
            console.error("Tracker not initialized.");
            return;
        }
        sendEvent(eventName, params);
    };

    window.tracker = tracker;
})();
