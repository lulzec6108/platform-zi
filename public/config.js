// config.js - Production Ready

// Pastikan APP_CONFIG ada
window.APP_CONFIG = window.APP_CONFIG || {
    API_BASE: '/.netlify/functions/proxy',
    API_KEY: 'YOUR_API_KEY' // Akan diganti saat build
};

// Validasi konfigurasi saat runtime
function validateConfig() {
    const requiredConfigs = ['API_BASE', 'API_KEY'];
    const missingConfigs = [];

    requiredConfigs.forEach(key => {
        if (!window.APP_CONFIG[key] || window.APP_CONFIG[key] === 'YOUR_API_KEY') {
            missingConfigs.push(key);
        }
    });

    if (missingConfigs.length > 0) {
        console.error('Konfigurasi tidak lengkap atau tidak valid:', missingConfigs.join(', '));
        
        // Tampilkan pesan error di UI jika di production
        if (process.env.NODE_ENV === 'production') {
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #f44336;
                color: white;
                padding: 15px;
                text-align: center;
                z-index: 9999;
                font-family: Arial, sans-serif;
            `;
            errorMsg.textContent = 'Kesalahan Konfigurasi: Aplikasi tidak dapat berjalan. Harap hubungi administrator.';
            document.body.prepend(errorMsg);
        }
        
        return false;
    }
    
    // Log konfigurasi yang aman (tanpa menampilkan API_KEY lengkap)
    const safeConfig = {
        ...window.APP_CONFIG,
        API_KEY: window.APP_CONFIG.API_KEY ? 
            `***${window.APP_CONFIG.API_KEY.slice(-4)}` : 
            'not-set'
    };
    
    console.log('Konfigurasi Aplikasi:', safeConfig);
    return true;
}

// Validasi saat load
document.addEventListener('DOMContentLoaded', () => {
    validateConfig();
    
    // Jika di development, beri peringatan jika menggunakan API key default
    if (process.env.NODE_ENV !== 'production' && 
        window.APP_CONFIG.API_KEY === 'YOUR_API_KEY') {
        console.warn('PERINGATAN: Menggunakan API key default. Pastikan untuk mengatur API_KEY yang valid.');
    }
});

// Ekspos fungsi validasi untuk digunakan di tempat lain
window.validateAppConfig = validateConfig;
