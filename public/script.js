// script.js (REVISED & SECURED)

// Konfigurasi
const API_BASE_URL = '/api'; // Menggunakan proxy Netlify yang diatur di netlify.toml
const API_TIMEOUT = 20000; // 20 detik timeout

// Event listener utama saat DOM sudah siap
document.addEventListener('DOMContentLoaded', function () {
    console.log("%cHallo, aku masih belajar bikin webapp jangan didebug yaa wkw. Maklum masih banyak bug, bukan anak KS soalnya.. wkw 😂 ~Fayadh", "color: #f0f0f0; background-color: #1e88e5; padding: 10px 20px; border-radius: 8px; font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 500; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);");

    // Inisialisasi semua komponen Materialize, termasuk Sidenav
    M.AutoInit();

    // Tambahkan event listener untuk form login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Tambahkan event listener untuk KEDUA tombol logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    const logoutButtonNav = document.getElementById('logout-button-nav');
    if (logoutButtonNav) {
        logoutButtonNav.addEventListener('click', handleLogout);
    }

    // Periksa status otentikasi saat halaman dimuat
    checkAuthStatus();

    // Tambahkan event listener untuk navigasi Sidenav
    document.querySelectorAll('.sidenav a[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.getAttribute('data-view');
            switchView(viewId);

            // PERBAIKAN: Hanya tutup sidenav jika dalam mode mobile (overlay)
            const sidenavInstance = M.Sidenav.getInstance(document.querySelector('.sidenav'));
            if (window.innerWidth < 993 && sidenavInstance.isOpen) {
                sidenavInstance.close();
            }
        });
    });

    // PERBAIKAN BUG: Sembunyikan semua view saat load, lalu tampilkan dashboard
    document.querySelectorAll('main .view').forEach(view => {
        view.style.display = 'none';
    });
    const initialView = document.getElementById('dashboard-view');
    if (initialView) {
        initialView.style.display = 'block';
    }

    // Set menu 'Dashboard' sebagai aktif saat pertama kali load
    const initialActiveMenu = document.querySelector('a[data-view="dashboard-view"]');
    if (initialActiveMenu) {
        initialActiveMenu.parentElement.classList.add('active');
    }

    // Event listener untuk menu navigasi
    document.querySelectorAll('.sidenav a, .topnav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.getAttribute('data-view');
            switchView(viewId);
        });
    });
});

// Fungsi untuk beralih antar view (Dashboard, Tugas Saya, dll.)
function switchView(viewId) {
    // Sembunyikan semua view
    document.querySelectorAll('main .view').forEach(view => {
        view.style.display = 'none';
    });

    // Tampilkan view yang dipilih
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
    }

    // Panggil fungsi yang sesuai untuk memuat data view
    if (viewId === 'link-pendukung-view') {
        loadLinkPendukung();
    } else if (viewId === 'tugas-saya-view') {
        loadTugasSaya();
    }

    // Hapus kelas 'active' dari semua item menu
    document.querySelectorAll('.sidenav li, .topnav li').forEach(li => {
        li.classList.remove('active');
    });

    // Tambahkan kelas 'active' ke item yang diklik di sidebar
    const activeSidebarLink = document.querySelector(`.sidenav a[data-view='${viewId}']`);
    if (activeSidebarLink && activeSidebarLink.parentElement) {
        activeSidebarLink.parentElement.classList.add('active');
    }

    // Tambahkan kelas 'active' ke item yang sesuai di navbar atas
    const activeNavMenuLink = document.querySelector(`.topnav-menu a[data-view='${viewId}']`);
    if (activeNavMenuLink && activeNavMenuLink.parentElement) {
        activeNavMenuLink.parentElement.classList.add('active');
    }

    // Muat data yang relevan berdasarkan view yang aktif
    switch (viewId) {
        case 'dashboard-view':
            loadDashboardData(); 
            break;
        case 'kinerja-tim-view':
            // Di masa depan, panggil fungsi untuk memuat data kinerja tim di sini
            console.log('Memuat data Kinerja Tim...');
            break;
    }
}

// Fungsi untuk memeriksa status autentikasi dan memperbarui UI (VERSI FINAL)
function checkAuthStatus() {
    const user = sessionStorage.getItem('user');
    const loginPage = document.getElementById('login-page');
    const mainContent = document.getElementById('main-content');

    if (user) {
        try {
            // Pengguna sudah login
            if (loginPage) loginPage.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
            document.title = 'Dashboard | Si Paling ZI'; // Ganti judul halaman

            const userData = JSON.parse(user);

            // Perbarui info pengguna di Sidenav dengan ID yang BENAR
            const userNameElement = document.getElementById('sidenav-user-name');
            const userRoleElement = document.getElementById('sidenav-user-role');
            if (userNameElement) userNameElement.textContent = userData.nama;
            if (userRoleElement) userRoleElement.textContent = userData.role;

            // Panggil kembali fungsi untuk set avatar
            setRandomAvatar();

            // PERBAIKAN: Baca view dari URL hash, atau default ke dashboard
            const viewIdFromHash = window.location.hash.substring(1);
            if (viewIdFromHash) {
                switchView(viewIdFromHash);
            } else {
                switchView('dashboard-view');
            }

        } catch (e) {
            console.error("Gagal mem-parsing data user, melakukan logout paksa.", e);
            handleLogout();
        }
    } else {
        // Pengguna belum login
        if (loginPage) loginPage.style.display = 'flex';
        if (mainContent) mainContent.style.display = 'none';
        document.title = 'Login | Si Paling ZI';
    }
}

// Fungsi untuk memanggil API yang aman dan sederhana
async function callApi(action, method = 'GET', data = {}) {
    const user = JSON.parse(localStorage.getItem('user'));

    // Siapkan payload. Untuk GET, ini akan menjadi query params.
    // Untuk POST, ini akan menjadi bagian dari body.
    const payload = { ...data };

    if (user && user.username && action !== 'login') {
        payload.username = user.username;
    }

    // URL dasar adalah proxy, bukan endpoint spesifik
    let url = API_BASE_URL; 
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const options = {
        method: method.toUpperCase(),
        headers: {
            'Content-Type': 'application/json',
        },
        signal: controller.signal,
    };

    if (options.method === 'POST') {
        // Backend mengharapkan format { action: '...', payload: {...} }
        options.body = JSON.stringify({ 
            action: action, 
            payload: payload 
        });
    } else if (options.method === 'GET') {
        // Untuk GET, semua data, termasuk 'action', menjadi query parameter
        payload.action = action;
        url += '?' + new URLSearchParams(payload).toString();
    }

    try {
        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Gagal mem-parsing error JSON dari server.' }));
            throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`Gagal memanggil API '${action}':`, error);
        throw error;
    }
}

// Fungsi untuk menangani login
async function handleLogin(event) {
    event.preventDefault(); // Mencegah aksi default tombol/form

    console.log('--- Memulai handleLogin ---');
    const usernameInput = document.querySelector('#username');
    const passwordInput = document.querySelector('#password'); // FIX: Menggunakan ID yang benar

    // Logging untuk diagnostik
    console.log('Mencari elemen #username:', usernameInput);
    console.log('Mencari elemen #password:', passwordInput); // FIX: Logging ID yang benar

    // Tambahkan pengecekan untuk memastikan elemen ada sebelum mengakses .value
    if (!usernameInput || !passwordInput) { // FIX: Memeriksa variabel yang benar
        console.error('Elemen input username atau password tidak ditemukan.');
        showError('Terjadi kesalahan pada halaman. Coba muat ulang.');
        return;
    }

    const username = usernameInput.value;
    const password = passwordInput.value; // FIX: Menggunakan variabel yang benar

    if (!username || !password) { // FIX: Memeriksa variabel yang benar
        showError('Username dan Password harus diisi.');
        return;
    }

    const loadingOverlay = document.getElementById('loading'); // Ambil elemen loading

    // Tampilkan loading overlay
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        M.toast({ html: 'Mencoba masuk...', classes: 'blue' });
        const result = await callApi('login', 'POST', { username, password }); // FIX: Mengirim 'password'

        // --- LOGGING DIAGNOSTIK ---
        console.log('Respons mentah dari server:', result);

        if (result && result.success) {
            console.log('Login berhasil. Data pengguna:', result.data);
            M.toast({ html: 'Login berhasil!', classes: 'green' });

            console.log('Menyimpan data pengguna ke sessionStorage...');
            sessionStorage.setItem('user', JSON.stringify(result.data));

            console.log('Memanggil checkAuthStatus() untuk memperbarui UI...');
            checkAuthStatus();
        } else {
            console.error('Login gagal menurut server. Pesan:', result ? result.message : 'Respons tidak valid');
            showError(result ? result.message : 'Terjadi kesalahan tidak diketahui.');
        }
    } catch (error) {
        console.error('Terjadi error saat memanggil API login:', error);
        showError('Gagal terhubung ke server. Periksa koneksi Anda.');
    } finally {
        // Sembunyikan loading overlay setelah selesai
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

// Fungsi untuk menangani logout
function handleLogout() {
    // Hapus data user dari session storage
    sessionStorage.removeItem('user');
    
    // Reset form login
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.reset();
    
    // Reset pesan error
    const errorElement = document.getElementById('login-error');
    if (errorElement) errorElement.style.display = 'none';
    
    // Perbarui UI
    checkAuthStatus();
    
    // Redirect ke halaman login
    window.location.hash = '';
}

// Fungsi untuk memuat data Link Pendukung dari Google Sheet
async function loadLinkPendukung() {
    // Tunda eksekusi untuk memastikan DOM view sudah dirender sepenuhnya
    setTimeout(async () => {
        console.log('[DIAG] 1. Memulai loadLinkPendukung (setelah jeda).');
        const container = document.getElementById('link-pendukung-container');
        if (!container) {
            console.error('[DIAG] GAGAL: Kontainer #link-pendukung-container masih tidak ditemukan.');
            return;
        }
        console.log('[DIAG] 2. Kontainer ditemukan.');

        try {
            showLoading(true);
            console.log('[DIAG] 3. Menampilkan loading overlay.');

            const result = await callApi('getLinkPendukung', 'GET');

            if (result.success && result.data) {
                let cardsHtml = '';
                if (result.data.length > 0) {
                    result.data.forEach(item => {
                        // Guard clause untuk data yang tidak valid atau baris kosong
                        if (!item || !item.judul_link) {
                            console.warn('[DIAG] Melewati item data yang tidak valid:', item);
                            return; // Lewati iterasi ini
                        }

                        // PERBAIKAN: Koleksi Ikon Diperbanyak untuk mendukung hingga 50+ link unik
                        const icons = [
                            // Kategori Dokumen & File (Biru & Merah)
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="#42A5F5"/></svg>`, // Dokumen Biru
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="#EF5350"/></svg>`, // PDF Merah
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="#78909C"/></svg>`, // Folder Abu-abu
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5S13.5 3.62 13.5 5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" fill="#AB47BC"/></svg>`, // Attachment Ungu
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z" fill="#26A69A"/></svg>`, // Spreadsheet Hijau

                            // Kategori Data & Grafik (Oranye & Kuning)
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" fill="#FFA726"/></svg>`, // Laporan Oranye
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5S13.5 3.62 13.5 5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" fill="#FFCA28"/></svg>`, // Grafik Naik Kuning
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" fill="#FFA726"/></svg>`, // Bar Chart Oranye
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h2v-6h-2v6zm0-8h2v-2h-2v2z" fill="#FFEE58"/></svg>`, // Database Kuning
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="#FF7043"/></svg>`, // Info Oranye Tua

                            // Kategori Web & Jaringan (Hijau & Teal)
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13 13v8h8v-8h-8zM3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="#66BB6A"/></svg>`, // Link Hijau
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" fill="#26A69A"/></svg>`, // Browser Teal
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 9.03 14.1 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" fill="#4DB6AC"/></svg>`, // Update Teal
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.63 5.84C16.27 4.48 14.21 3.5 12 3.5c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.68 0 6.84-2.47 7.73-5.84l-2.06-.65C16.83 16.53 14.61 18 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 12h7V5l-2.37.84z" fill="#00ACC1"/></svg>`, // Sync Cyan Tua

                            // Kategori Pengguna & Tim (Indigo & Ungu)
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#7E57C2"/></svg>`, // User Ungu
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z" fill="#5C6BC0"/></svg>`, // Grup Indigo
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0H6v4h8v-4h4V4h-4v2h-4V4h-4v4h-2z" fill="#7986CB"/></svg>`, // Tas Kerja Indigo Muda
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" fill="#9575CD"/></svg>`, // Kontak Ungu Muda
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="#BA68C8"/></svg>`, // Mood Senang Ungu

                            // Kategori Lain-lain (Beragam)
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13 13v8h8v-8h-8zM3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="#4DD0E1"/></svg>`, // Dashboard Cyan
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="#4FC3F7"/></svg>`, // Komentar Biru Muda
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="#F06292"/></svg>`, // Peringatan Pink
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#E57373"/></svg>`, // Hati Merah
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13 12l-2.5 2.5 1.41 1.41L16.17 12l-4.58-4.59L13 12zm-2.5 6.5L5.83 12l1.41-1.41L11.41 16.17l4.59-4.58L10.5 18.5z" fill="#FFF176"/></svg>`, // Bintang Kuning
                        ];

                        // Fungsi hash sederhana untuk memilih ikon secara konsisten
                        function simpleHash(str) {
                            let hash = 0;
                            for (let i = 0; i < str.length; i++) {
                                hash = (str.charCodeAt(i) + ((hash << 5) - hash)) & 0xFFFFFFFF;
                            }
                            return Math.abs(hash);
                        }

                        // Pilih ikon secara konsisten berdasarkan judul
                        const iconIndex = simpleHash(item.judul_link) % icons.length;
                        const selectedIconSvg = icons[iconIndex];

                        cardsHtml += `
                            <div class="card link-pendukung-card">
                                <div class="card-content">
                                    <div class="card-icon-wrapper">
                                        ${selectedIconSvg}
                                    </div>
                                    <span class="card-title">${item.judul_link}</span>
                                    <p class="link-description">${item.deskripsi_link || ''}</p>  <!-- Fallback jika deskripsi kosong -->
                                </div>
                                <div class="card-action">
                                    <a href="${item.alamat_link}" target="_blank" class="btn waves-effect waves-light blue">Kunjungi Link</a>
                                </div>
                            </div>
                        `;
                    });
                }
                container.innerHTML = cardsHtml;
            } else {
                throw new Error(result.message || 'Gagal memuat link pendukung.');
            }
        } catch (error) {
            console.error('Error loading link pendukung:', error);
            const container = document.getElementById('link-pendukung-container');
            container.innerHTML = `<p class="center-align red-text">Gagal memuat data. ${error.message}</p>`;
        } finally {
            showLoading(false);
            console.log('[DIAG] 11. Selesai. Menyembunyikan loading overlay.');
        }
    }, 0); // Jeda 0ms untuk menempatkan eksekusi di akhir antrian event
}

// Inisialisasi event listener untuk form bukti dukung
document.addEventListener('submit', async (event) => {
    // Cek apakah event berasal dari form yang kita inginkan
    if (event.target && event.target.matches('.bukti-form')) {
        event.preventDefault(); // Mencegah form dari submit tradisional

        const form = event.target;
        const button = form.querySelector('button[type="submit"]');
        const kode_hirarki = form.dataset.kode;
        const nilai = form.querySelector('input[type="url"]').value.trim();
        const user = JSON.parse(sessionStorage.getItem('user'));

        if (!nilai) {
            M.toast({ html: 'Link bukti dukung tidak boleh kosong!', classes: 'red' });
            return;
        }

        if (!user || !user.username) {
            M.toast({ html: 'Sesi tidak valid, silakan login ulang.', classes: 'red' });
            return;
        }

        button.disabled = true;
        button.innerHTML = 'Menyimpan...';

        try {
            const payload = {
                username: user.username,
                kode_hirarki: kode_hirarki,
                nilai: nilai
            };

            const result = await callApi('updateBuktiDukung', 'POST', payload);

            if (result.success) {
                M.toast({ html: 'Bukti dukung berhasil disimpan!', classes: 'green' });
            } else {
                throw new Error(result.message || 'Gagal menyimpan data.');
            }

        } catch (error) {
            console.error('Gagal menyimpan bukti dukung:', error);
            M.toast({ html: `Error: ${error.message}`, classes: 'red' });
        } finally {
            button.disabled = false;
            button.innerHTML = 'Simpan <i class="material-icons right">save</i>';
        }
    }
});

// Fungsi untuk menampilkan/menyembunyikan loading overlay
function showLoading(isLoading) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = isLoading ? 'flex' : 'none';
    }
}

// Fungsi untuk menampilkan pesan error atau sukses
function showError(message, type = 'error') {
    const classes = type === 'success' ? 'green' : 'red';
    M.toast({ html: message, classes: classes, displayLength: 4000 });
}

// Fungsi untuk mengatur avatar gambar berwarna secara acak menggunakan DiceBear API
function setRandomAvatar() {
    // Menggunakan gaya 'adventurer' untuk avatar manusia yang lebih menarik
    // Kita buat string acak untuk memastikan avatar selalu baru setiap kali dimuat ulang
    const seed = Math.random().toString(36).substring(7);
    const avatarUrl = `https://api.dicebear.com/8.x/adventurer/svg?seed=${seed}`;
    
    const avatarElement = document.getElementById('user-avatar-img');
    if (avatarElement) {
        avatarElement.src = avatarUrl;
    }
}

// Fungsi untuk memuat data dashboard
async function loadDashboardData() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user) return;

    showLoading(true);
    try {
        // Gunakan callApi dengan metode GET dan kirim username sebagai data
        const result = await callApi('getDashboardTugasStatus', 'GET', { username: user.username });
        if (result.success) {
            renderDashboardTable(result.data);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showError(`Gagal memuat data dashboard: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk merender tabel dashboard
function renderDashboardTable(tasks) {
    const tableBody = document.getElementById('dashboard-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!tasks || tasks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="center-align">Tidak ada data yang tersedia</td>
            </tr>
        `;
        return;
    }
    
    tasks.forEach(task => {
        const row = document.createElement('tr');
        
        // Fungsi untuk membuat badge status
        const getStatusBadge = (status) => {
            if (!status) return '';
            
            let color = 'grey';
            if (status.toLowerCase().includes('setuju') || status.toLowerCase().includes('terverifikasi')) {
                color = 'green';
            } else if (status.toLowerCase().includes('ditolak')) {
                color = 'red';
            } else if (status.toLowerCase().includes('proses') || status.toLowerCase().includes('dikerjakan')) {
                color = 'orange';
            }
            
            return `<span class="new badge ${color}" data-badge-caption="${status}"></span>`;
        };
        
        row.innerHTML = `
            <td>${task.kode || '-'}</td>
            <td>${task.pilar || '-'}</td>
            <td>${task.namaTugas || '-'}</td>
            <td>${task.pic || '-'}</td>
            <td>${getStatusBadge(task.statusPengerjaan)}</td>
            <td>${getStatusBadge(task.statusKetuaPilar)}</td>
            <td>${getStatusBadge(task.statusAdmin)}</td>
            <td>
                <button class="btn btn-small waves-effect waves-light" 
                        onclick="openTugasModal('${task.id}')">
                    <i class="material-icons">visibility</i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Fungsi untuk membuka modal detail tugas
async function openTugasModal(taskId) {
    try {
        showLoading(true);
        const response = await callApi('getTugasDetail', 'GET', { id: taskId });
        
        if (response.success && response.data) {
            const task = response.data;
            
            // Update modal content
            document.getElementById('modal-kode').textContent = task.kode || '-';
            document.getElementById('modal-nama-tugas').textContent = task.namaTugas || '-';
            document.getElementById('modal-pic').textContent = task.pic || '-';
            
            // Update links
            const linkReferensi = document.getElementById('modal-link-referensi');
            const linkGDrive = document.getElementById('modal-link-gdrive');
            
            if (task.linkReferensi) {
                linkReferensi.href = task.linkReferensi;
                linkReferensi.textContent = 'Buka Referensi';
            } else {
                linkReferensi.href = '#';
                linkReferensi.textContent = 'Tidak ada';
                linkReferensi.onclick = (e) => e.preventDefault();
            }
            
            if (task.linkGDrive) {
                linkGDrive.href = task.linkGDrive;
                linkGDrive.textContent = 'Buka GDrive';
            } else {
                linkGDrive.href = '#';
                linkGDrive.textContent = 'Tidak ada';
                linkGDrive.onclick = (e) => e.preventDefault();
            }
            
            // Tampilkan/sembunyikan section berdasarkan role
            const user = JSON.parse(sessionStorage.getItem('user'));
            const isPIC = user && user.username === task.pic;
            const isKetuaPilar = user && user.role === 'Ketua Pilar' && user.pilar === task.pilar;
            const isAdmin = user && user.role === 'Admin';
            
            document.getElementById('anggota-form-section').style.display = isPIC ? 'block' : 'none';
            document.getElementById('ketua-pilar-section').style.display = isKetuaPilar ? 'block' : 'none';
            document.getElementById('admin-section').style.display = isAdmin ? 'block' : 'none';
            
            // Update status dan catatan
            document.getElementById('modal-status-anggota').textContent = task.statusPengerjaan || '-';
            document.getElementById('modal-bukti-detail').textContent = task.buktiDukung || '-';
            document.getElementById('modal-status-ketua').textContent = task.statusKetuaPilar || '-';
            document.getElementById('modal-catatan-ketua').textContent = task.catatanKetua || '-';
            
            // Inisialisasi select
            const selects = document.querySelectorAll('select');
            M.FormSelect.init(selects);
            
            // Tampilkan modal
            const modal = M.Modal.getInstance(document.getElementById('detailModal')) || 
                         M.Modal.init(document.getElementById('detailModal'));
            modal.open();
        } else {
            throw new Error(response.message || 'Gagal memuat detail tugas');
        }
    } catch (error) {
        console.error('Error loading task details:', error);
        showError('Gagal memuat detail tugas: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk memuat dan merender data 'Tugas Saya'
async function loadTugasSaya() {
    const container = document.getElementById('tugas-saya-container');
    if (!container) return;

    showLoading(true);
    container.innerHTML = '<p class="center-align">Memuat tugas ZI Anda...</p>';

    try {
        // API akan mengembalikan gabungan data dari MappingTugas dan BuktiDukung
        const response = await callApi('getTugasSaya'); 

        if (response.success && Array.isArray(response.data)) {
            if (response.data.length === 0) {
                container.innerHTML = '<div class="center-align"><i class="large material-icons green-text">check_circle</i><p>Anda tidak memiliki tugas saat ini. Selamat bersantai!</p></div>';
                return;
            }

            container.innerHTML = ''; // Kosongkan kontainer

            response.data.forEach(tugas => {
                const li = document.createElement('li');
                li.id = `tugas-${tugas.kodeHirarki}`;

                // === Header Collapsible ===
                const header = document.createElement('div');
                header.className = 'collapsible-header';
                header.innerHTML = `<b>${tugas.kodeHirarki}</b> - ${tugas.tingkatan4}`;

                // === Body Collapsible (Struktur Baru) ===
                const body = document.createElement('div');
                body.className = 'collapsible-body';
                
                // Buat dropdown nilai dinamis
                const pilihanJawaban = tugas.pilihanJawaban.split('/').map(item => 
                    `<option value="${item}" ${tugas.nilai === item ? 'selected' : ''}>${item}</option>`
                ).join('');

                body.innerHTML = `
                    <div class="task-breadcrumb">
                        <p>${tugas.tingkatan1}</p>
                        <p>└─ ${tugas.tingkatan2}</p>
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;└─ ${tugas.tingkatan3}</p>
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ ${tugas.tingkatan4}</p>
                    </div>

                    <h5>Panduan Pemberian Nilai:</h5>
                    <p>${tugas.panduanPenilaian}</p>

                    <h5>Referensi:</h5>
                    <p><a href="${tugas.linkReferensi}" target="_blank">Berkas Referensi ZI</a></p>

                    <div class="divider" style="margin: 20px 0;"></div>

                    <a href="${tugas.linkGDrive}" target="_blank" class="btn blue waves-effect waves-light" style="width:100%; margin-bottom: 20px;">
                        <i class="material-icons left">cloud_upload</i>
                        Upload Bukti Dukung: ${tugas.tingkatan4}
                    </a>

                    <div class="row">
                        <div class="input-field col s12 m6">
                            <select id="nilai-${tugas.kodeHirarki}">
                                <option value="" disabled ${!tugas.nilai ? 'selected' : ''}>Pilih Nilai</option>
                                ${pilihanJawaban}
                            </select>
                            <label>Nilai</label>
                        </div>
                        <div class="input-field col s12 m6">
                            <textarea id="rincian-${tugas.kodeHirarki}" class="materialize-textarea">${tugas.jenisBuktiDukung || ''}</textarea>
                            <label for="rincian-${tugas.kodeHirarki}">Rincian Jenis Dokumen Bukti Dukung</label>
                        </div>
                    </div>
                    
                    <button class="btn green waves-effect waves-light" onclick="simpanBuktiDukung('${tugas.kodeHirarki}')">
                        <i class="material-icons left">save</i>
                        Simpan Rincian Bukti Dukung
                    </button>
                `;

                li.appendChild(header);
                li.appendChild(body);
                container.appendChild(li);
            });

            // Inisialisasi ulang semua komponen Materialize di dalam view ini
            M.Collapsible.init(container);
            const selects = container.querySelectorAll('select');
            M.FormSelect.init(selects);

        } else {
            throw new Error(response.message || 'Gagal mengambil data tugas.');
        }
    } catch (error) {
        console.error('Error in loadTugasSaya:', error);
        container.innerHTML = `<div class="center-align red-text"><i class="large material-icons">error_outline</i><p>Gagal memuat tugas: ${error.message}</p></div>`;
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menyimpan data bukti dukung
async function simpanBuktiDukung(kodeHirarki) {
    const nilai = document.getElementById(`nilai-${kodeHirarki}`).value;
    const rincian = document.getElementById(`rincian-${kodeHirarki}`).value;

    if (!nilai) {
        M.toast({ html: 'Silakan pilih nilai terlebih dahulu.', classes: 'orange' });
        return;
    }

    showLoading(true);
    try {
        const response = await callApi('saveBuktiDukung', 'POST', {
            kodeHirarki: kodeHirarki,
            nilai: nilai,
            jenisBuktiDukung: rincian
        });

        if (response.success) {
            M.toast({ html: 'Bukti dukung berhasil disimpan!', classes: 'green' });
        } else {
            throw new Error(response.message || 'Gagal menyimpan data.');
        }
    } catch (error) {
        console.error('Error saving bukti dukung:', error);
        M.toast({ html: `Error: ${error.message}`, classes: 'red' });
    } finally {
        showLoading(false);
    }
}
