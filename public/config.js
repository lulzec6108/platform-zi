// config.js
// Konfigurasi frontend
window.APP_CONFIG = {
    API_BASE: '/.netlify/functions/proxy',
    // API_KEY akan diisi saat runtime melalui Netlify Environment Variables
    API_KEY: 'YOUR_API_KEY' // Akan diganti saat build/deploy
};

// Fungsi untuk update config dari environment
function updateConfigFromEnvironment() {
    // Update config dari environment jika tersedia
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.API_KEY) {
            window.APP_CONFIG.API_KEY = process.env.API_KEY;
        }
    }
    
    // Update dari URL parameters (untuk development)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('api_key')) {
        window.APP_CONFIG.API_KEY = urlParams.get('api_key');
    }
    
    console.log('App config loaded:', window.APP_CONFIG);
}

// Panggil fungsi update config
document.addEventListener('DOMContentLoaded', updateConfigFromEnvironment);
