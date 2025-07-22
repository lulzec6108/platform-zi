/**
 * Konfigurasi Aplikasi SI-PALING-ZI
 * File ini berisi konfigurasi yang diperlukan untuk koneksi ke backend
 */

// Inisialisasi objek konfigurasi
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Config] Initializing application configuration');
    
    // Cek apakah window.APP_CONFIG sudah ada, jika belum buat baru
    window.APP_CONFIG = window.APP_CONFIG || {};
    
    // Dapatkan API key dari environment variable (Netlify) atau .env (development)
    const envApiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || 
                     (window.APP_CONFIG?.API_KEY) || 
                     '';
    
    // Simpan API key ke window.APP_CONFIG
    window.APP_CONFIG.API_KEY = envApiKey;
    
    // Log konfigurasi (tidak menampilkan API key lengkap di log)
    console.log('[Config] App configuration loaded:', {
        isProduction: window.APP_CONFIG.IS_PRODUCTION,
        apiKeyConfigured: !!window.APP_CONFIG.API_KEY,
        apiKeyPrefix: window.APP_CONFIG.API_KEY ? 
                     `${window.APP_CONFIG.API_KEY.substring(0, 5)}...` : 'Not set'
    });
    
    // Tambahkan event listener untuk menangani error yang tidak tertangkap
    window.addEventListener('error', function(e) {
        console.error('[Global Error]', e.error || e.message || e);
    });
    
    // Tambahkan event listener untuk unhandled promise rejections
    window.addEventListener('unhandledrejection', function(e) {
        console.error('[Unhandled Promise Rejection]', e.reason || e);
    });
});

// Ekspor konfigurasi untuk modul lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.APP_CONFIG;
}
