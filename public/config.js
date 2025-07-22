// config.js
(function() {
    // Jangan timpa konfigurasi yang sudah ada
    if (!window.APP_CONFIG) {
        window.APP_CONFIG = {};
    }

    // Log konfigurasi saat ini (tanpa menampilkan full API key)
    console.log('[Config] Konfigurasi sebelum inisialisasi:', {
        ...window.APP_CONFIG,
        API_KEY: window.APP_CONFIG.API_KEY ? '***' + window.APP_CONFIG.API_KEY.slice(-4) : 'not set'
    });

    // Hanya set nilai default jika belum ada
    if (!window.APP_CONFIG.API_BASE) {
        window.APP_CONFIG.API_BASE = '/.netlify/functions/proxy';
    }

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

    // Log konfigurasi akhir
    console.log('[Config] Konfigurasi akhir:', {
        ...window.APP_CONFIG,
        API_KEY: window.APP_CONFIG.API_KEY ? '***' + window.APP_CONFIG.API_KEY.slice(-4) : 'not set'
    });

    // Validasi konfigurasi
    if (!window.APP_CONFIG.API_KEY) {
        console.error('[Config] ERROR: API_KEY tidak ditemukan!');
    } else {
        console.log('[Config] API_KEY ditemukan dan siap digunakan');
    }
})();
