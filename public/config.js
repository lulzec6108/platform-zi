// config.js
(function() {
    // Inisialisasi konfigurasi default
    window.APP_CONFIG = window.APP_CONFIG || {
        API_BASE: '/.netlify/functions/proxy',
        API_KEY: 'semoga_bisa_wbk_aamiin' // Default value untuk development
    };

    // Cek apakah ada konfigurasi dari server (Netlify akan meng-inject ini)
    const configScript = document.querySelector('script[data-config]');
    if (configScript) {
        try {
            const config = JSON.parse(configScript.getAttribute('data-config'));
            if (config.API_KEY) {
                window.APP_CONFIG.API_KEY = config.API_KEY;
                console.log('[Config] Menggunakan API key dari data-config');
            }
        } catch (e) {
            console.warn('[Config] Gagal memparsing data-config', e);
        }
    }

    // Log konfigurasi untuk debugging (sensor API key)
    const logConfig = {
        ...window.APP_CONFIG,
        API_KEY: window.APP_CONFIG.API_KEY 
            ? '***' + window.APP_CONFIG.API_KEY.slice(-4) 
            : 'not set'
    };
    
    console.log('[Config] Konfigurasi diinisialisasi:', logConfig);
    
    // Validasi konfigurasi
    if (!window.APP_CONFIG.API_KEY) {
        console.error('[Config] ERROR: API_KEY tidak ditemukan!');
    } else {
        console.log('[Config] API_KEY ditemukan dan siap digunakan');
    }
})();
