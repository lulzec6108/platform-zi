/**
 * Konfigurasi Aplikasi SI-PALING-ZI
 * File ini berisi konfigurasi yang diperlukan untuk koneksi ke backend
 */

// Inisialisasi objek konfigurasi
(function() {
    console.log('[Config] Initializing application configuration');
    
    // Inisialisasi APP_CONFIG jika belum ada
    window.APP_CONFIG = window.APP_CONFIG || {
        API_BASE: '/.netlify/functions/proxy',
        API_KEY: 'YOUR_API_KEY' // Akan diganti saat runtime
    };

    // Fungsi untuk memeriksa validitas konfigurasi
    function validateConfig() {
        const required = ['API_KEY'];
        const missing = [];

        required.forEach(key => {
            if (!window.APP_CONFIG[key] || window.APP_CONFIG[key] === 'YOUR_API_KEY') {
                missing.push(key);
            }
        });

        if (missing.length > 0) {
            console.warn('Konfigurasi tidak lengkap atau tidak valid:', missing.join(', '));
            return false;
        }
        
        console.log('[Config] Konfigurasi valid');
        return true;
    }

    // Coba dapatkan API key dari URL parameters (untuk development)
    function getApiKeyFromUrl() {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('apiKey');
        } catch (e) {
            console.warn('Gagal mendapatkan API key dari URL:', e);
            return null;
        }
    }

    // Inisialisasi API key
    function initApiKey() {
        // 1. Coba dapatkan dari URL (untuk development)
        const urlApiKey = getApiKeyFromUrl();
        if (urlApiKey) {
            console.log('[Config] Menggunakan API key dari URL');
            window.APP_CONFIG.API_KEY = urlApiKey;
            return true;
        }

        // 2. Cek apakah sudah ada di window.APP_CONFIG
        if (window.APP_CONFIG.API_KEY && window.APP_CONFIG.API_KEY !== 'YOUR_API_KEY') {
            console.log('[Config] Menggunakan API key dari konfigurasi');
            return true;
        }

        // 3. Tampilkan pesan error
        console.error('[Config] API key tidak ditemukan');
        return false;
    }

    // Inisialisasi
    initApiKey();
    validateConfig();

    // Log konfigurasi (tanpa menampilkan API key lengkap)
    const logConfig = {
        ...window.APP_CONFIG,
        API_KEY: window.APP_CONFIG.API_KEY 
            ? `***${window.APP_CONFIG.API_KEY.slice(-4)}` 
            : 'not-set'
    };
    
    console.log('[Config] Konfigurasi aplikasi:', logConfig);
})();

// Handle global errors
window.addEventListener('error', function(e) {
    console.error('[Global Error]', e.error || e.message || e);
    
    // Tampilkan pesan error ke user jika diperlukan
    const errorMsg = e.error?.message || e.message || 'Terjadi kesalahan';
    if (typeof M !== 'undefined') { // Jika Materialize sudah di-load
        M.toast({html: `Error: ${errorMsg}`, classes: 'red'});
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('[Unhandled Promise Rejection]', e.reason || e);
    
    // Tampilkan pesan error ke user jika diperlukan
    const errorMsg = e.reason?.message || 'Terjadi kesalahan tak terduga';
    if (typeof M !== 'undefined') { // Jika Materialize sudah di-load
        M.toast({html: `Error: ${errorMsg}`, classes: 'red'});
    }
});
