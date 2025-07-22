/**
 * Konfigurasi Aplikasi SI-PALING-ZI
 * File ini berisi konfigurasi yang diperlukan untuk koneksi ke backend
 */

// Inisialisasi objek konfigurasi
(function() {
    console.log('[Config] Initializing application configuration');
    
    // Inisialisasi APP_CONFIG
    window.APP_CONFIG = window.APP_CONFIG || {
        API_BASE: '/.netlify/functions/proxy',
        API_KEY: ''  // Akan diisi dari URL atau dari window._env_
    };

    // 1. Coba dapatkan API key dari URL (untuk development)
    try {
        const params = new URLSearchParams(window.location.search);
        const urlApiKey = params.get('apiKey');
        if (urlApiKey) {
            console.log('[Config] Menggunakan API key dari URL');
            window.APP_CONFIG.API_KEY = urlApiKey;
        }
    } catch (e) {
        console.warn('Gagal mendapatkan API key dari URL:', e);
    }

    // 2. Cek apakah API key sudah ada di window._env_ (untuk production)
    if (!window.APP_CONFIG.API_KEY && window._env_?.API_KEY) {
        console.log('[Config] Menggunakan API key dari window._env_');
        window.APP_CONFIG.API_KEY = window._env_.API_KEY;
    }

    // Validasi konfigurasi
    if (!window.APP_CONFIG.API_KEY) {
        console.warn('[Config] Peringatan: API_KEY tidak ditemukan');
    } else {
        console.log('[Config] API_KEY berhasil diinisialisasi');
    }

    // Log konfigurasi (tanpa menampilkan API key lengkap)
    console.log('[Config] Konfigurasi:', {
        ...window.APP_CONFIG,
        API_KEY: window.APP_CONFIG.API_KEY 
            ? `***${window.APP_CONFIG.API_KEY.slice(-4)}` 
            : 'tidak di-set'
    });
})();

// Handle global errors
window.addEventListener('error', (e) => {
    console.error('[Global Error]', e.error || e.message || e);
    
    // Tampilkan pesan error ke user jika diperlukan
    const errorMsg = e.error?.message || e.message || 'Terjadi kesalahan';
    if (typeof M !== 'undefined') { // Jika Materialize sudah di-load
        M.toast({html: `Error: ${errorMsg}`, classes: 'red'});
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('[Unhandled Promise Rejection]', e.reason || e);
    
    // Tampilkan pesan error ke user jika diperlukan
    const errorMsg = e.reason?.message || 'Terjadi kesalahan tak terduga';
    if (typeof M !== 'undefined') { // Jika Materialize sudah di-load
        M.toast({html: `Error: ${errorMsg}`, classes: 'red'});
    }
});
