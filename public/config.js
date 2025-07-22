// config.js
(function() {
    // Inisialisasi konfigurasi default
    window.APP_CONFIG = window.APP_CONFIG || {
        API_BASE: '/.netlify/functions/proxy',
        API_KEY: ''
    };

    // Cek apakah ada environment variable dari Netlify
    if (typeof process !== 'undefined' && process.env) {
        // Ini akan berjalan di sisi server (Netlify Functions)
        if (process.env.API_KEY) {
            window.APP_CONFIG.API_KEY = process.env.API_KEY;
        }
    } else {
        // Ini akan berjalan di sisi client
        const script = document.currentScript || 
            document.querySelector('script[src*="config.js"]');
        
        // Coba dapatkan API key dari atribut data
        if (script) {
            const apiKey = script.getAttribute('data-api-key');
            if (apiKey) {
                window.APP_CONFIG.API_KEY = apiKey;
                console.log('[Config] Menggunakan API key dari data attribute');
            }
        }

        // Cek URL parameter (hanya untuk development)
        const urlParams = new URLSearchParams(window.location.search);
        const urlApiKey = urlParams.get('apiKey');
        if (urlApiKey) {
            console.log('[Config] Menggunakan API key dari URL parameter');
            window.APP_CONFIG.API_KEY = urlApiKey;
        }
    }

    console.log('[Config] Konfigurasi diinisialisasi:', {
        ...window.APP_CONFIG,
        API_KEY: window.APP_CONFIG.API_KEY ? '***' + window.APP_CONFIG.API_KEY.slice(-4) : 'not set'
    });
})();
