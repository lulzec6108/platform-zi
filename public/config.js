// config.js
(function() {
    // Inisialisasi konfigurasi default
    window.APP_CONFIG = window.APP_CONFIG || {
        API_BASE: '/.netlify/functions/proxy',
        API_KEY: 'semoga_bisa_wbk_aamiin' // Default value untuk development
    };

    // Coba dapatkan API key dari atribut data script
    const script = document.currentScript || 
        document.querySelector('script[src*="config.js"]');
    
    if (script) {
        const apiKey = script.getAttribute('data-api-key');
        if (apiKey && apiKey !== 'undefined') {
            window.APP_CONFIG.API_KEY = apiKey;
            console.log('[Config] Menggunakan API key dari data attribute');
        } else {
            console.warn('[Config] API key tidak ditemukan di data attribute');
        }
    }

    // Log konfigurasi untuk debugging (sensor API key)
    console.log('[Config] Konfigurasi diinisialisasi:', {
        ...window.APP_CONFIG,
        API_KEY: window.APP_CONFIG.API_KEY ? '***' + window.APP_CONFIG.API_KEY.slice(-4) : 'not set'
    });
})();
