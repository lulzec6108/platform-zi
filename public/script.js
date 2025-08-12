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

    // Inisialisasi Sidenav
    const sidenavs = document.querySelectorAll('.sidenav');
    M.Sidenav.init(sidenavs);

    // Inisialisasi Modals (DENGAN OPSI BARU UNTUK NONAKTIFKAN ANIMASI)
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals, {
        inDuration: 0, // Durasi masuk animasi (0 untuk instan)
        outDuration: 0, // Durasi keluar animasi (0 untuk instan)
        startingTop: '4%', // Posisi awal default Materialize
        endingTop: '10%' // Posisi akhir default Materialize
    });

    // Tampilkan view default (Dashboard)
    switchView('dashboard');

    // Setup event listener untuk tombol simpan di modal verifikasi
    const saveVerifikasiBtn = document.getElementById('save-verifikasi-btn');
    saveVerifikasiBtn.addEventListener('click', async () => {
    const statusSelect = document.getElementById('verifikasi-status-select');
    const catatanText = document.getElementById('verifikasi-catatan');
    let newStatus = statusSelect.value;
    const catatan = catatanText.value;
    const mode = saveVerifikasiBtn.dataset.mode || "detail";
    const userRole = JSON.parse(sessionStorage.getItem('user')).role;

    // If admin is revoking approval, force status to Ditolak Admin
    if (mode === 'revoke' && userRole.toLowerCase() === 'admin') {
        newStatus = 'Ditolak Admin';
        if (!catatan.trim()) {
            M.toast({ html: 'Catatan wajib diisi untuk membatalkan persetujuan.' });
            return;
        }
    }

    if (!newStatus) {
        M.toast({ html: 'Silakan pilih status terlebih dahulu.' });
        return;
    }
    if ((newStatus === 'Rejected' || newStatus === 'Ditolak Admin') && !catatan.trim()) {
        M.toast({ html: 'Catatan wajib diisi jika status ditolak.' });
        return;
    }

    saveVerifikasiBtn.disabled = true;
    saveVerifikasiBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Menyimpan...`;

    const payload = {
        role: userRole, // Perbaikan: Mengambil role dinamis dari state
        targetUsername: saveVerifikasiBtn.dataset.targetUsername,
        kodeHirarki: saveVerifikasiBtn.dataset.kodeHirarki,
        status: newStatus,
        catatan: catatan
    };

        try {
            const result = await callApi('handleSetStatusPenilaian', payload);
            if (result.success) {
                showError('Status berhasil diperbarui!', 'success');
                try {
                    const el = document.getElementById('verifikasiModal');
                    if (window.M && M.Modal && typeof M.Modal.getInstance === 'function') {
                        const modalInstance = M.Modal.getInstance(el);
                        if (modalInstance && typeof modalInstance.close === 'function') modalInstance.close();
                    } else if (el && typeof el.close === 'function') {
                        el.close();
                    }
                } catch (e) {
                    console.warn('Tidak dapat menutup modal:', e);
                }
                loadKinerjaTim(); // Muat ulang data setelah perubahan status
                M.toast({ html: 'Data berhasil diperbarui!' });
            } else {
                throw new Error(result.message || 'Gagal memperbarui status.');
            }
        } catch (error) {
            showError(`Error: ${error.message}`);
        } finally {
            saveVerifikasiBtn.disabled = false;
            saveVerifikasiBtn.innerHTML = 'Simpan Status';
            catatanText.value = '';
            statusSelect.value = '';
            if (window.M && M.FormSelect && typeof M.FormSelect.init === 'function') {
                M.FormSelect.init(statusSelect); // Re-init select
            }
        }
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

    // Muat data yang relevan berdasarkan view yang aktif (SATU SUMBER KEBENARAN)
    switch (viewId) {
        case 'dashboard-view':
            loadDashboardData(); 
            break;
        case 'tugas-saya-view':
            loadTugasSaya();
            break;
        case 'kinerja-tim-view':
            loadKinerjaTim();
            break;
        case 'link-pendukung-view':
            loadLinkPendukung();
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

// Fungsi terpusat untuk semua panggilan API ke backend
async function callApi(action, method = 'GET', body = null) {
    const user = JSON.parse(sessionStorage.getItem('user'));

    // Untuk GET, action dan username (jika ada) dikirim sebagai query parameter
    const params = new URLSearchParams({ action });
    if (method === 'GET' && user && user.username) {
        params.append('username', user.username);
    }

    const url = `/api/proxy?${params.toString()}`;

    const options = { 
        method,
        headers: { 'Content-Type': 'application/json' }
    };

    if (method === 'POST') {
        // Siapkan payload untuk body request
        const payload = { ...body };
        if (user && user.username) {
            payload.username = user.username;
        }
        
        // Body request untuk POST berisi action dan payload yang digabung.
        // Sesuai dengan code.gs versi lama.
        options.body = JSON.stringify({ 
            action,
            ...payload
        });
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, text: ${errorText}`);
        }
        const result = await response.json();
        if (result.success === false) {
            throw new Error(result.message || 'Terjadi kesalahan dari server.');
        }
        return result;
    } catch (error) {
        console.error(`Gagal memanggil API '${action}':`, error);
        showError(error.message);
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
        const container = document.getElementById('link-pendukung-container');
        const loader = document.querySelector('#link-pendukung-view .loader-container');
        if (!container) {
            console.error('Kontainer #link-pendukung-container tidak ditemukan.');
            return;
        }
        
        try {
            container.innerHTML = '';
            loader.style.display = 'block';
            
            // Panggil callApi hanya dengan action, karena method defaultnya GET
            // dan username akan ditambahkan secara otomatis oleh callApi.
            const result = await callApi('getLinkPendukung');

            if (result.success && result.data) {
                let cardsHtml = '';
                if (result.data.length > 0) {
                    result.data.forEach(item => {
                        // Guard clause untuk data yang tidak valid atau baris kosong
                        if (!item || !item.judul_link) {
                            console.warn('Melewati item data yang tidak valid:', item);
                            return; // Lewati iterasi ini
                        }

                        // PERBAIKAN: Koleksi Ikon Diperbanyak untuk mendukung hingga 50+ link unik
                        const icons = [
                            // Kategori Dokumen & File (Biru & Merah)
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" fill="#42A5F5"/></svg>`, // Dokumen Biru
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0H6v4h8v-4h4V4h-4v2h-4V4h-4v4h-2z" fill="#EF5350"/></svg>`, // PDF Merah
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13 13v8h8v-8h-8zM3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="#78909C"/></svg>`, // Folder Abu-abu
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5S13.5 3.62 13.5 5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6h-1.5z" fill="#AB47BC"/></svg>`, // Attachment Ungu
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" fill="#FFA726"/></svg>`, // Spreadsheet Hijau

                            // Kategori Data & Grafik (Oranye & Kuning)
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5S13.5 3.62 13.5 5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" fill="#FFCA28"/></svg>`, // Grafik Naik Kuning
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z" fill="#FFA726"/></svg>`, // Bar Chart Oranye
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" fill="#FFEE58"/></svg>`, // Database Kuning
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0H6v4h8v-4h4V4h-4v2h-4V4h-4v4h-2z" fill="#4DB6AC"/></svg>`, // Update Teal
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.63 5.84C16.27 4.48 14.21 3.5 12 3.5c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.68 0 6.84-2.47 7.73-5.84l-2.06-.65C16.83 16.53 14.61 18 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 12h7V5l-2.37.84z" fill="#00ACC1"/></svg>`, // Sync Cyan Tua

                            // Kategori Pengguna & Tim (Indigo & Ungu)
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#7E57C2"/></svg>`, // User Ungu
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z" fill="#5C6BC0"/></svg>`, // Grup Indigo
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0H6v4h8v-4h4V4h-4v2h-4V4h-4v4h-2z" fill="#7986CB"/></svg>`, // Tas Kerja Indigo Muda
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.63 5.84C16.27 4.48 14.21 3.5 12 3.5c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.68 0 6.84-2.47 7.73-5.84l-2.06-.65C16.83 16.53 14.61 18 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 12h7V5l-2.37.84z" fill="#9575CD"/></svg>`, // Kontak Ungu Muda
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="#7E57C2"/></svg>`, // Mood Senang Ungu
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13 12l-2.5 2.5 1.41 1.41L16.17 12l-4.58-4.59L13 12zm-2.5 6.5L5.83 12l1.41-1.41L11.41 16.17l4.59-4.58L10.5 18.5z" fill="#FFF176"/></svg>`, // Bintang Kuning
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" fill="#FF9800"/></svg>`, // Peringatan Oranye

                            // Kategori Lain-lain (Beragam)
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13 13v8h8v-8h-8zM3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="#4DD0E1"/></svg>`, // Dashboard Cyan
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="#4FC3F7"/></svg>`, // Komentar Biru Muda
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="#F06292"/></svg>`, // Peringatan Pink
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" fill="#E57373"/></svg>`, // Hati Merah
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
            loader.style.display = 'none';
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
    if (window.M && M.toast) {
        M.toast({ html: message, classes: classes, displayLength: 4000 });
    }
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
        const makeStatusBadge = (status) => {
            if (!status) return '';
            
            const s = (status || '').toString();
            const l = s.toLowerCase();
            let color = 'grey';
            if (l.includes('setuju') || l.includes('terverifikasi')) {
                color = 'green';
            } else if (l.includes('ditolak')) {
                color = 'red';
            } else if (l.includes('proses') || l.includes('dikerjakan')) {
                color = 'orange';
            }
            
            return `<span class="new badge ${color}" data-badge-caption="${s}"></span>`;
        };
        
        row.innerHTML = `
            <td>${task.kode || '-'}</td>
            <td>${task.pilar || '-'}</td>
            <td>${task.namaTugas || '-'}</td>
            <td>${task.pic || '-'}</td>
            <td>${makeStatusBadge(task.statusPengerjaan)}</td>
            <td>${makeStatusBadge(task.statusKetuaPilar)}</td>
            <td>${makeStatusBadge(task.statusAdmin)}</td>
            <td>
                <button class="btn btn-small waves-effect waves-light blue" 
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
                linkReferensi.textContent = 'Lihat Dokumen Referensi';
            } else {
                linkReferensi.href = '#';
                linkReferensi.textContent = 'Tidak ada';
                linkReferensi.onclick = (e) => e.preventDefault();
            }
            
            if (task.linkGDriveBukti) {
                linkGDrive.href = task.linkGDriveBukti;
                linkGDrive.style.display = 'block';
            } else {
                linkGDrive.href = '#';
                linkGDrive.style.display = 'none';
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
            if (window.M && M.FormSelect && typeof M.FormSelect.init === 'function') {
                M.FormSelect.init(selects);
            }
            
            // Tampilkan modal
            try {
                if (window.M && M.Modal && typeof M.Modal.getInstance === 'function') {
                    M.Modal.getInstance(document.getElementById('detailModal')).open();
                } else if (document.getElementById('detailModal') && typeof document.getElementById('detailModal').showModal === 'function') {
                    // Fallback untuk <dialog> jika ada
                    document.getElementById('detailModal').showModal();
                }
            } catch (e) {
                console.warn('Tidak dapat membuka modal:', e);
            }
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

// Normalize statuses from sheet variants
function normalizeStatus(str) {
    const s = (str || '').toString().trim().toLowerCase();
    if (!s) return '';
    if (/(approve|disetujui|diterima|terverifikasi)/i.test(s)) return 'approved';
    if (/(reject|ditolak)/i.test(s)) return 'rejected';
    if (/(menunggu|pending|verifikasi)/i.test(s)) return 'pending';
    return s;
  }
  
  function deriveTaskState(tugas) {
    const type = (tugas.submissionType || '').toLowerCase();
    const ketua = normalizeStatus(tugas.statusKetua);
    const admin = normalizeStatus(tugas.statusAdmin);
    const hasDraft = !!(tugas.jenisBuktiDukung && type !== 'final');
    const userStatusStr = (tugas.statusUser || tugas.status_user || '').toString().trim().toLowerCase();

    if (admin === 'rejected') {
      return { statusText: 'Rejected by Admin', phase: 'rejected_admin', canEditAnggota: true, ketuaCanAct: false, adminCanAct: false, lockUI: false };
    }
    if (ketua === 'rejected') {
      return { statusText: 'Rejected by Ketua Pilar', phase: 'rejected_ketua', canEditAnggota: true, ketuaCanAct: false, adminCanAct: false, lockUI: false };
    }

    const isUserSubmitted = userStatusStr.includes('terkirim') || userStatusStr.includes('submitted');
    const effectiveType = type || (isUserSubmitted ? 'final' : (hasDraft ? 'draft' : ''));
    const isUserWorking = userStatusStr.includes('sedang') || userStatusStr.includes('mengerja') || userStatusStr.includes('progress');

    if (effectiveType === 'final') {
      if ((ketua === 'pending' || !ketua) && !admin) {
        return { statusText: ketua === 'pending' ? 'Menunggu Verifikasi Ketua' : 'Submitted', phase: ketua === 'pending' ? 'pending_ketua' : 'submitted', canEditAnggota: false, ketuaCanAct: true, adminCanAct: false, lockUI: true };
      }
      if (ketua === 'approved' && (admin === 'pending' || !admin)) {
        return { statusText: admin === 'pending' ? 'Menunggu Verifikasi Admin' : 'Approved by Ketua Pilar', phase: admin === 'pending' ? 'pending_admin' : 'approved_ketua', canEditAnggota: false, ketuaCanAct: false, adminCanAct: true, lockUI: true };
      }
      if (ketua === 'approved' && admin === 'approved') {
        return { statusText: 'Approved by Admin', phase: 'approved_admin', canEditAnggota: false, ketuaCanAct: false, adminCanAct: false, lockUI: true };
      }
    }

    if (hasDraft || effectiveType === 'draft' || isUserWorking) {
      return { statusText: 'Sedang Mengerjakan', phase: 'working', canEditAnggota: true, ketuaCanAct: false, adminCanAct: false, lockUI: false };
    }

    return { statusText: 'Belum Mengerjakan', phase: 'idle', canEditAnggota: true, ketuaCanAct: false, adminCanAct: false, lockUI: false };
  }

// === Badge status konsisten berbasis deriveTaskState ===
function getStatusBadge(tugas) {
    const st = deriveTaskState(tugas);
    let color = 'grey';
    switch (st.phase) {
      case 'idle': color = 'grey'; break;
      case 'working': color = 'orange'; break;
      case 'submitted': color = 'blue'; break;
      case 'pending_ketua': color = 'blue'; break;
      case 'approved_ketua': color = 'blue'; break;
      case 'pending_admin': color = 'blue'; break;
      case 'approved_admin': color = 'green'; break;
      case 'rejected_ketua':
      case 'rejected_admin': color = 'red'; break;
      default: color = 'grey';
    }
    return `<span class="status-badge ${color}" title="${st.phase}">${st.statusText}</span>`;
  }

// --- FUNGSI UNTUK MENU TUGAS SAYA (VERSI STABIL) ---

// Fungsi utama untuk memuat dan menampilkan data 'Tugas Saya'
async function loadTugasSaya() {
    const view = document.getElementById('tugas-saya-view');
    const contentContainer = document.getElementById('tugas-saya-content');
    const loader = view.querySelector('.loader-container');
    const noDataMessage = view.querySelector('.no-data-message');

    // Tampilkan loader dan sembunyikan konten
    loader.style.display = 'block';
    contentContainer.style.display = 'none';
    noDataMessage.style.display = 'none';
    contentContainer.innerHTML = ''; // Kosongkan konten sebelum memuat

    try {
        const result = await callApi('getTugasSaya');
        if (result.success && result.data.length > 0) {
            displayTugasSaya(result.data); // Panggil fungsi untuk render UI
            contentContainer.style.display = 'block';
        } else {
            noDataMessage.style.display = 'block'; // Tampilkan pesan jika tidak ada data
        }
    } catch (error) {
        console.error('Error loading tugas saya:', error);
        showError('Gagal memuat data Tugas Saya.');
        noDataMessage.style.display = 'block';
        noDataMessage.textContent = 'Terjadi kesalahan saat memuat data.';
    } finally {
        loader.style.display = 'none'; // Sembunyikan loader setelah selesai
    }
}

// Fungsi untuk merender data tugas ke dalam UI collapsible
function displayTugasSaya(data) {
    const contentContainer = document.getElementById('tugas-saya-content');
    contentContainer.innerHTML = ''; // Pastikan bersih

    // 1. Kelompokkan tugas berdasarkan tingkatan 1 (area)
    const groupedTasks = data.reduce((acc, tugas) => {
        const groupName = tugas.tingkatan1 || 'Lainnya';
        if (!acc[groupName]) {
            acc[groupName] = [];
        }
        acc[groupName].push(tugas);
        return acc;
    }, {});

    // 2. Buat elemen collapsible
    const collapsibleUl = document.createElement('ul');
    collapsibleUl.className = 'collapsible expandable'; // expandable agar bisa buka banyak

    // 3. Isi collapsible dengan data yang sudah dikelompokkan
    Object.keys(groupedTasks).forEach((groupName, index) => {
        const tasksInGroup = groupedTasks[groupName];
        const li = document.createElement('li');
        // Buka item pertama secara default
        if (index === 0) {
            li.className = 'active';
        }

        const header = document.createElement('div');
        header.className = 'collapsible-header tugas-group-header';
        header.innerHTML = `
            <span class="group-title">
                <i class="material-icons">folder</i>
                <span class="group-text">${groupName}</span>
            </span>
        `;

        const body = document.createElement('div');
        body.className = 'collapsible-body';

        const cardContainer = document.createElement('div');
        cardContainer.className = 'task-cards-container';

        tasksInGroup.forEach(tugas => {
            const card = document.createElement('div');
            card.className = 'task-card card';

            // Ambil status badge dari fungsi yang sudah ada
            const statusBadgeHtml = getStatusBadge(tugas);

            card.innerHTML = `
                <div class="card-content">
                    <div class="card-status">${statusBadgeHtml}</div>
                    <span class="card-title">${tugas.tingkatan4 || 'Tugas Tanpa Nama'}</span>
                    <p><strong>Hirarki:</strong> ${tugas.tingkatan2 || ''} > ${tugas.tingkatan3 || ''}</p>
                </div>
                <div class="card-action">
                    <a href="#!" class="btn-flat btn-detail waves-effect">
                        <i class="material-icons">open_in_new</i>
                        <span>Detail & Upload</span>
                    </a>
                </div>
            `;
            card.querySelector('.btn-detail').addEventListener('click', (e) => {
                e.preventDefault();
                showTugasDetail(tugas);
            });
            cardContainer.appendChild(card);
        });

        body.appendChild(cardContainer);
        li.appendChild(header);
        li.appendChild(body);
        collapsibleUl.appendChild(li);
    });

    contentContainer.appendChild(collapsibleUl);

    // Inisialisasi ulang komponen collapsible Materialize
    if (window.M && M.Collapsible && typeof M.Collapsible.init === 'function') {
        M.Collapsible.init(collapsibleUl, { accordion: false });
    }
}

function getStatusBadgeLegacy(task) {
    const status = (task.status_tugas || 'Belum Dikerjakan').toString();
    const l = status.toLowerCase();
    let statusClass = 'grey';
    if (l.includes('approved') || l.includes('disetujui')) {
        statusClass = 'green';
    } else if (l.includes('rejected') || l.includes('ditolak')) {
        statusClass = 'red';
    } else if (l.includes('progress') || l.includes('dikerjakan') || l.includes('proses')) {
        statusClass = 'orange';
    } else if (l.includes('submitted') || l.includes('terkirim')) {
        statusClass = 'blue';
    }
    const statusText = status.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    return `<span class="new badge ${statusClass}" data-badge-caption="${statusText}"></span>`;
}

// Fungsi untuk membuka detail tugas (VERSI PERBAIKAN TOTAL)
async function showTugasDetail(tugas) {
    const modal = document.getElementById('detailModal');
    if (!modal) {
        console.error('Modal element with ID "detailModal" not found.');
        return;
    }

    // 1. Setup Diagram Pohon Hirarki
    const hierarchyBox = document.getElementById('modal-hierarchy-box');
    hierarchyBox.innerHTML = '';
    const levels = ['tingkatan1', 'tingkatan2', 'tingkatan3', 'tingkatan4'];
    levels.forEach((levelKey, index) => {
        if (tugas[levelKey]) {
            const item = document.createElement('div');
            item.className = `hierarchy-level level-${index + 1}`; // penting untuk indentasi bermakna
            item.textContent = tugas[levelKey];
            hierarchyBox.appendChild(item);
        }
    });

    // 2. Isi Info Detail
    document.getElementById('modal-detail-hirarki').textContent = tugas.tingkatan4 || '-';
    // Format Panduan Penilaian menjadi per-baris (a., b., c., ...)
    const panduanEl = document.getElementById('modal-opsi-jawaban');
    const rawPanduan = (tugas.panduanPenilaian || '').toString().trim();
    const formattedPanduan = (() => {
        if (!rawPanduan) return 'Panduan tidak tersedia.';
        // Jika sheet menggunakan pemisah '|', gunakan itu terlebih dahulu
        if (rawPanduan.includes('|')) {
            return rawPanduan
                .split('|')
                .map(s => s.trim())
                .filter(Boolean)
                .map(line => `<div class="panduan-line">${line}</div>`) 
                .join('');
        }
        // Sisipkan line break sebelum b., c., d., dst. tanpa mengubah a. di awal
        const withBreaks = rawPanduan
            .replace(/\s([b-z])\.\s/gi, (m, p1) => `<br>${p1}. `); // enter sebelum b. .. z.
        return withBreaks
            .split(/<br>/)
            .map(s => s.trim())
            .filter(Boolean)
            .map(line => `<div class="panduan-line">${line}</div>`)
            .join('');
    })();
    panduanEl.innerHTML = formattedPanduan;

    // 3. Setup Form Penilaian
    const nilaiSelect = document.getElementById('nilai-select');
    nilaiSelect.innerHTML = '<option value="" disabled selected>Pilih Nilai</option>';
    if (tugas.pilihanJawaban) {
        tugas.pilihanJawaban.split('/').forEach(opsi => {
            const option = document.createElement('option');
            option.value = opsi.trim();
            option.textContent = opsi.trim();
            nilaiSelect.appendChild(option);
        });
    }
    nilaiSelect.value = tugas.nilai || '';
    if (window.M && M.FormSelect && typeof M.FormSelect.init === 'function') {
        M.FormSelect.init(nilaiSelect);
    }

    // 4. Setup Rincian Bukti Dukung
    const rincianContainer = document.getElementById('rincian-fields-container');
    setupRincianFields(rincianContainer, tugas.jenisBuktiDukung);

    // 5. Logika Tombol Footer (dengan penghapusan listener lama)
    const openGdriveBtn = document.getElementById('open-gdrive-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const submitFinalBtn = document.getElementById('submit-final-btn');
    const addRincianBtn = document.getElementById('add-rincian-btn');

    // Mengatur link GDrive dan memastikannya terbuka di tab baru
    if (openGdriveBtn) {
        // Ikuti pola yang sama seperti link referensi
        const gdriveLink = (tugas.linkGDriveBukti || tugas.linkBuktiDukung || '').toString().trim();
        openGdriveBtn.href = gdriveLink || '#!';
        openGdriveBtn.target = '_blank';
    }

    // PERBAIKAN: Tambahkan kelas unik untuk styling
    if (openGdriveBtn) openGdriveBtn.classList.add('btn-gdrive');
    if (saveDraftBtn) saveDraftBtn.classList.add('btn-draft');
    if (submitFinalBtn) submitFinalBtn.classList.add('btn-submit');

    // Logika untuk menampilkan/menyembunyikan tombol berdasarkan status
    const st = deriveTaskState(tugas);
    if (st.lockUI) {
        if(openGdriveBtn) openGdriveBtn.style.display = 'none';
        if(saveDraftBtn) saveDraftBtn.style.display = 'none';
        if(submitFinalBtn) submitFinalBtn.style.display = 'none';
        if(addRincianBtn) addRincianBtn.style.display = 'none';
    } else {
        // Tampilkan tombol ketika anggota boleh mengedit
        const disp = st.canEditAnggota ? 'inline-block' : 'none';
        if(openGdriveBtn) openGdriveBtn.style.display = disp;
        if(saveDraftBtn) saveDraftBtn.style.display = disp;
        if(submitFinalBtn) submitFinalBtn.style.display = disp;
        if(addRincianBtn) addRincianBtn.style.display = disp;

        // Nonaktifkan simpan/kirim sampai user membuka GDrive (opsional, tetap dipertahankan)
        if(saveDraftBtn) saveDraftBtn.disabled = true;
        if(submitFinalBtn) submitFinalBtn.disabled = true;

        if (openGdriveBtn) {
            const newGdriveBtn = openGdriveBtn.cloneNode(true);
            openGdriveBtn.parentNode.replaceChild(newGdriveBtn, openGdriveBtn);
            newGdriveBtn.addEventListener('click', function() {
                // PERBAIKAN: Ambil referensi tombol terbaru dari dalam listener
                const currentSaveBtn = document.getElementById('save-draft-btn');
                const currentSubmitBtn = document.getElementById('submit-final-btn');
                
                if(currentSaveBtn) currentSaveBtn.disabled = false;
                if(currentSubmitBtn) currentSubmitBtn.disabled = false;
                
                if (window.M && M.toast) {
                    M.toast({ html: 'Tombol Simpan & Kirim telah diaktifkan.' });
                }
            }, { once: true }); // Opsi 'once' memastikan listener hanya berjalan sekali
        }
    }

    // Hapus listener lama untuk tombol simpan/kirim/tambah
    const newSaveDraftBtn = saveDraftBtn ? saveDraftBtn.cloneNode(true) : null;
    if (newSaveDraftBtn && saveDraftBtn.parentNode) saveDraftBtn.parentNode.replaceChild(newSaveDraftBtn, saveDraftBtn);

    const newSubmitFinalBtn = submitFinalBtn ? submitFinalBtn.cloneNode(true) : null;
    if (newSubmitFinalBtn && submitFinalBtn.parentNode) submitFinalBtn.parentNode.replaceChild(newSubmitFinalBtn, submitFinalBtn);

    const newAddBtn = addRincianBtn ? addRincianBtn.cloneNode(true) : null;
    if (newAddBtn && addRincianBtn.parentNode) addRincianBtn.parentNode.replaceChild(newAddBtn, addRincianBtn);

    // Tambah listener baru
    const rincianContainer2 = document.getElementById('rincian-fields-container');
    if (newAddBtn) newAddBtn.addEventListener('click', () => addRincianField(rincianContainer2)); // PERBAIKAN: Kirim elemen kontainer
    if (newSaveDraftBtn) newSaveDraftBtn.addEventListener('click', () => savePenilaian(tugas, 'draft'));
    if (newSubmitFinalBtn) newSubmitFinalBtn.addEventListener('click', () => savePenilaian(tugas, 'final'));

    // 6. Buka Modal
    try {
        if (window.M && M.Modal && typeof M.Modal.getInstance === 'function') {
            M.Modal.getInstance(modal).open();
        } else if (modal && typeof modal.showModal === 'function') {
            // Fallback untuk <dialog> jika ada
            modal.showModal();
        }
    } catch (e) {
        console.warn('Tidak dapat membuka modal:', e);
    }

    // Kembalikan render Status
    const statusContainer = document.getElementById('modal-status');
    statusContainer.innerHTML = getStatusBadge(tugas);

    // Kembalikan Link Referensi
    const referensiContainer = document.getElementById('modal-referensi-link');
    referensiContainer.innerHTML = '';
    const ref = (tugas.linkReferensi || '').toString().trim();
    if (ref) {
        const link = document.createElement('a');
        link.href = ref;
        link.textContent = 'Lihat Dokumen Referensi';
        link.target = '_blank';
        referensiContainer.appendChild(link);
    } else {
        referensiContainer.textContent = 'Tidak ada referensi.';
    }
}

// Fungsi untuk menyimpan data penilaian
async function savePenilaian(tugas, submissionType) {
    const modal = document.getElementById('detailModal');
    const nilaiSelect = document.getElementById('nilai-select');
    
    if (!nilaiSelect.value) {
        showError('Silakan pilih nilai terlebih dahulu.');
        return;
    }

    showLoading(true);
    try {
        const rincianInputs = document.getElementById('rincian-fields-container').querySelectorAll('input');
        const rincianValues = Array.from(rincianInputs).map(input => input.value.trim()).filter(val => val);
        const rincianText = rincianValues.join('|');

        const dataToUpdate = {
            kodeHirarki: tugas.kodeHirarki,
            nilai: nilaiSelect.value,
            jenisBuktiDukung: rincianText,
            submissionType: submissionType // BARU: Kirim tipe submisi ke backend
        };

        const response = await callApi('saveBuktiDukung', 'POST', dataToUpdate);

        if (response.success) {
            showError('Penilaian berhasil disimpan!', 'success');
            try {
                if (window.M && M.Modal && typeof M.Modal.getInstance === 'function') {
                    M.Modal.getInstance(modal).close();
                } else if (modal && typeof modal.close === 'function') {
                    // Fallback untuk <dialog> jika ada
                    modal.close();
                }
            } catch (e) {
                console.warn('Tidak dapat menutup modal:', e);
            }
            loadTugasSaya(); // Muat ulang data untuk menampilkan status terbaru
        } else {
            throw new Error(response.message || 'Gagal menyimpan data ke backend');
        }
    } catch (error) {
        showError('Gagal menyimpan: ' + (error.message || 'Terjadi kesalahan koneksi'));
    } finally {
        showLoading(false);
    }
}

// --- Cache for MappingTugas ---
window._mappingTugasCache = window._mappingTugasCache || {};
async function showVerifikasiDetail(item, mode = "detail") {
    showLoading(true);
    [
        'verifikasi-nilai-row','verifikasi-jenis-bukti-row','verifikasi-hierarchy-box','verifikasi-mapping-row','verifikasi-link-gdrive','verifikasi-link-referensi'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    document.getElementById('verifikasi-nama-anggota').textContent = item.namaAnggota || item.nama || '-';
    document.getElementById('verifikasi-nama-tugas').textContent = item.namaTugas || item.kodeHirarki || '-';
    document.getElementById('verifikasi-waktu-submisi').textContent = item.timestamp ? new Date(item.timestamp).toLocaleString('id-ID') : (item.waktuSubmisi ? new Date(item.waktuSubmisi).toLocaleString('id-ID') : '-');

    // Ambil MappingTugas dari cache atau fetch jika belum ada
    let mapping = null;
    const kode = item.kodeHirarki || item.kode || item.namaTugas;
    if (window._mappingTugasCache[kode]) {
        mapping = window._mappingTugasCache[kode];
    } else {
        try {
            const result = await callApi('getMappingTugasForUser', 'GET', { kode });
            if (result.success && result.data && result.data.length > 0) {
                mapping = result.data[0];
                window._mappingTugasCache[kode] = mapping;
            }
        } catch (e) {
            mapping = null;
        }
    }
    mapping = mapping || item;

    // Render Nilai dan Jenis Bukti Dukung
    document.getElementById('verifikasi-nilai-row').innerHTML = `<strong>Nilai:</strong> <span>${mapping.nilai || '-'}</span>`;
    document.getElementById('verifikasi-jenis-bukti-row').innerHTML = `<strong>Jenis Bukti Dukung:</strong> <span>${mapping.jenisBuktiDukung || '-'}</span>`;

    // Render pohon hirarki
    let hierarchyBox = document.getElementById('verifikasi-hierarchy-box');
    hierarchyBox.innerHTML = '';
    const levels = [
        { key: 'tingkatan1', label: 'Tingkatan 1' },
        { key: 'tingkatan2', label: 'Tingkatan 2' },
        { key: 'tingkatan3', label: 'Tingkatan 3' },
        { key: 'tingkatan4', label: 'Tingkatan 4' }
    ];
    let adaTingkatan = false;
    levels.forEach((lvl, idx) => {
        if (mapping[lvl.key]) {
            adaTingkatan = true;
            const div = document.createElement('div');
            div.className = `hierarchy-level level-${idx+1}`;
            div.textContent = mapping[lvl.key];
            hierarchyBox.appendChild(div);
        }
    });
    if (!adaTingkatan) {
        hierarchyBox.innerHTML = '<em>Detail tugas tidak ditemukan.</em>';
    }

    // Render Panduan Penilaian dan Pilihan Jawaban
    let mappingHTML = '';
    if (mapping.panduanPenilaian || mapping.pilihanJawaban) {
        mappingHTML += `<strong>Panduan Penilaian:</strong> <span class="preserve-whitespace">${mapping.panduanPenilaian || '-'}<\/span><br/>`;
        mappingHTML += `<strong>Pilihan Jawaban:</strong> ${mapping.pilihanJawaban || '-'}<br/>`;
    }
    document.getElementById('verifikasi-mapping-row').innerHTML = mappingHTML;

    // Render link GDrive
    const gdriveEl = document.getElementById('verifikasi-link-gdrive');
    if (mapping.linkGDrive && mapping.linkGDrive.startsWith('http')) {
        gdriveEl.innerHTML = `<a href="${mapping.linkGDrive}" target="_blank" rel="noopener noreferrer"><i class="material-icons left">folder_open<\/i>Lihat Bukti Dukung<\/a>`;
    } else {
        gdriveEl.innerHTML = '<em>Tidak ada link GDrive</em>';
    }
    // Render link Referensi
    const refEl = document.getElementById('verifikasi-link-referensi');
    if (mapping.linkReferensi && mapping.linkReferensi.startsWith('http')) {
        refEl.innerHTML = `<a href="${mapping.linkReferensi}" target="_blank" rel="noopener noreferrer"><i class="material-icons left">link<\/i>Lihat Referensi<\/a>`;
    } else {
        refEl.innerHTML = '<em>Tidak ada link referensi</em>';
    }

    // Status, catatan, dan modal
    const saveBtn = document.getElementById('save-verifikasi-btn');
    saveBtn.dataset.targetUsername = item.targetUsername;
    saveBtn.dataset.kodeHirarki = kode;
    saveBtn.dataset.mode = mode;
    const statusSelect = document.getElementById('verifikasi-status-select');
    const catatanText = document.getElementById('verifikasi-catatan');
    if (mode === 'revoke') {
        statusSelect.innerHTML = `<option value="Ditolak Admin" selected>Ditolak Admin<\/option>`;
        statusSelect.disabled = true;
        catatanText.value = '';
        catatanText.placeholder = 'Catatan wajib diisi untuk membatalkan persetujuan';
    } else {
        statusSelect.innerHTML = `
            <option value="" disabled selected>Pilih Status<\/option>
            <option value="Approved">Approved<\/option>
            <option value="Rejected">Rejected<\/option>
        `;
        statusSelect.disabled = false;
        catatanText.value = '';
        catatanText.placeholder = "Catatan (Wajib diisi jika 'Rejected')";
    }
    if (window.M && M.FormSelect && typeof M.FormSelect.init === 'function') {
        M.FormSelect.init(statusSelect);
    }
    try {
        if (window.M && M.Modal && typeof M.Modal.getInstance === 'function') {
            M.Modal.getInstance(document.getElementById('verifikasiModal')).open();
        } else if (document.getElementById('verifikasiModal') && typeof document.getElementById('verifikasiModal').showModal === 'function') {
            document.getElementById('verifikasiModal').showModal();
        }
    } catch (e) {
        console.warn('Tidak dapat membuka modal:', e);
    } finally {
        showLoading(false);
    }
}
    // Tampilkan spinner loading
    showLoading(true);
    // Bersihkan field
    [
        'verifikasi-nilai-row','verifikasi-jenis-bukti-row','verifikasi-hierarchy-box','verifikasi-mapping-row','verifikasi-link-gdrive','verifikasi-link-referensi'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    document.getElementById('verifikasi-nama-anggota').textContent = item.namaAnggota || item.nama || '-';
    document.getElementById('verifikasi-nama-tugas').textContent = item.namaTugas || item.kodeHirarki || '-';
    document.getElementById('verifikasi-waktu-submisi').textContent = item.timestamp ? new Date(item.timestamp).toLocaleString('id-ID') : (item.waktuSubmisi ? new Date(item.waktuSubmisi).toLocaleString('id-ID') : '-');

    // Tampilkan Nilai dan Jenis Bukti Dukung
    document.getElementById('verifikasi-nilai-row').innerHTML = `<strong>Nilai:</strong> <span>${item.nilai || '-'}</span>`;
    document.getElementById('verifikasi-jenis-bukti-row').innerHTML = `<strong>Jenis Bukti Dukung:</strong> <span>${item.jenisBuktiDukung || '-'}</span>`;

    // --- Ambil detail MappingTugas berdasarkan kodeHirarki ---
    // --- Gunakan field MappingTugas langsung dari item ---
    const mapping = {
        tingkatan1: item.tingkatan1,
        tingkatan2: item.tingkatan2,
        tingkatan3: item.tingkatan3,
        tingkatan4: item.tingkatan4,
        panduanPenilaian: item.panduanPenilaian,
        pilihanJawaban: item.pilihanJawaban
    };
    // --- Render Pohon Hirarki (Tingkatan 1-4) ---
    let hierarchyBox = document.getElementById('verifikasi-hierarchy-box');
    hierarchyBox.innerHTML = '';
    const levels = [
        { key: 'tingkatan1', label: 'Tingkatan 1' },
        { key: 'tingkatan2', label: 'Tingkatan 2' },
        { key: 'tingkatan3', label: 'Tingkatan 3' },
        { key: 'tingkatan4', label: 'Tingkatan 4' }
    ];
    let adaTingkatan = false;
    levels.forEach((lvl, idx) => {
        if (mapping[lvl.key]) {
            adaTingkatan = true;
            const div = document.createElement('div');
            div.className = `hierarchy-level level-${idx+1}`;
            div.textContent = mapping[lvl.key];
            hierarchyBox.appendChild(div);
        }
    });
    if (!adaTingkatan) {
        hierarchyBox.innerHTML = '<em>Detail tugas tidak ditemukan.</em>';
    }

    // --- Detail Lainnya (Panduan Penilaian, Pilihan Jawaban) ---
    let mappingHTML = '';
    if (mapping.panduanPenilaian || mapping.pilihanJawaban) {
        mappingHTML += `<strong>Panduan Penilaian:</strong> <span class=\"preserve-whitespace\">${mapping.panduanPenilaian || '-'}<\/span><br/>`;
        mappingHTML += `<strong>Pilihan Jawaban:</strong> ${mapping.pilihanJawaban || '-'}<br/>`;
    }
    document.getElementById('verifikasi-mapping-row').innerHTML = mappingHTML;

    // Render link GDrive
    const gdriveEl = document.getElementById('verifikasi-link-gdrive');
    if (item.linkGDrive && item.linkGDrive.startsWith('http')) {
        gdriveEl.innerHTML = `<a href="${item.linkGDrive}" target="_blank" rel="noopener noreferrer"><i class="material-icons left">folder_open</i>Lihat Bukti Dukung</a>`;
    } else {
        gdriveEl.innerHTML = '<em>Tidak ada link GDrive</em>';
    }
    // Render link Referensi
    const refEl = document.getElementById('verifikasi-link-referensi');
    if (item.linkReferensi && item.linkReferensi.startsWith('http')) {
        refEl.innerHTML = `<a href="${item.linkReferensi}" target="_blank" rel="noopener noreferrer"><i class="material-icons left">link</i>Lihat Referensi</a>`;
    } else {
        refEl.innerHTML = '<em>Tidak ada link referensi</em>';
    }

    const saveBtn = document.getElementById('save-verifikasi-btn');
    saveBtn.dataset.targetUsername = item.targetUsername;
    saveBtn.dataset.kodeHirarki = item.kodeHirarki;
    saveBtn.dataset.mode = mode;

    // Set modal status select and notes
    const statusSelect = document.getElementById('verifikasi-status-select');
    const catatanText = document.getElementById('verifikasi-catatan');
    if (mode === 'revoke') {
        // Admin revoke: force status to 'Ditolak Admin' and disable select
        statusSelect.innerHTML = `<option value="Ditolak Admin" selected>Ditolak Admin</option>`;
        statusSelect.disabled = true;
        catatanText.value = '';
        catatanText.placeholder = 'Catatan wajib diisi untuk membatalkan persetujuan';
    } else {
        // Normal: show both Approved/Rejected
        statusSelect.innerHTML = `
            <option value="" disabled selected>Pilih Status</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
        `;
        statusSelect.disabled = false;
        catatanText.value = '';
        catatanText.placeholder = "Catatan (Wajib diisi jika 'Rejected')";
    }
    if (window.M && M.FormSelect && typeof M.FormSelect.init === 'function') {
        M.FormSelect.init(statusSelect);
    }

    try {
        if (window.M && M.Modal && typeof M.Modal.getInstance === 'function') {
            M.Modal.getInstance(document.getElementById('verifikasiModal')).open();
        } else if (document.getElementById('verifikasiModal') && typeof document.getElementById('verifikasiModal').showModal === 'function') {
            document.getElementById('verifikasiModal').showModal();
        }
    } catch (e) {
        console.warn('Tidak dapat membuka modal:', e);
    } finally {
        showLoading(false);
    }
    // Tombol close (X)
    const closeBtn = document.getElementById('verifikasi-modal-close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            if (window.M && M.Modal && typeof M.Modal.getInstance === 'function') {
                M.Modal.getInstance(document.getElementById('verifikasiModal')).close();
            } else if (document.getElementById('verifikasiModal') && typeof document.getElementById('verifikasiModal').close === 'function') {
                document.getElementById('verifikasiModal').close();
            }
        };
    }
}

// Fungsi untuk memuat data kinerja tim
let isLoadingKinerjaTim = false;
async function loadKinerjaTim() {
    const loader = document.getElementById('kinerja-tim-loader');
    const content = document.getElementById('kinerja-tim-content');
    const tableBody = document.getElementById('kinerja-tim-table-body');
    const noDataMessage = document.getElementById('kinerja-tim-no-data');
    const user = JSON.parse(sessionStorage.getItem('user'));

    // Tampilkan loader dan sembunyikan konten
    if (isLoadingKinerjaTim) {
        console.warn('loadKinerjaTim already running, skipping duplicate call');
        return;
    }
    isLoadingKinerjaTim = true;
    console.log('Memuat Kinerja Tim');
    loader.style.display = 'block';
    content.style.display = 'none';
    noDataMessage.style.display = 'none';
    tableBody.innerHTML = '';

    try {
        const result = await callApi('getKinerjaTim');
        if (result.success && result.data.length > 0) {
            result.data.forEach(item => {
                const row = document.createElement('tr');

                // Fungsi untuk membuat status badge
                const createStatusBadge = (status) => {
                    if (!status) return '<span class="grey-text">-</span>';
                    
                    let color = 'grey';
                    if (status.toLowerCase().includes('setuju') || status.toLowerCase().includes('terverifikasi')) {
                        color = 'green';
                    } else if (status.toLowerCase().includes('ditolak')) {
                        color = 'red';
                    } else if (status.toLowerCase().includes('proses') || status.toLowerCase().includes('dikerjakan')) {
                        color = 'orange';
                    }
                    
                    return `<span class="status-badge-small ${color}">${status}</span>`;
                };
                
                let actionButtons = '';
const userRole = user.role ? user.role.toLowerCase() : '';
const statusAdmin = (item.statusAdmin || '').toLowerCase();
const statusKetua = (item.statusKetua || '').toLowerCase();

// Show 'Detail' for all, but show 'Revoke Approval' only if admin and already approved
if (userRole === 'admin' && statusAdmin.includes('setuju')) {
    actionButtons = `
        <button class="btn btn-small waves-effect waves-light blue" onclick='showVerifikasiDetail(${JSON.stringify(item)}, "detail")'>Detail</button>
        <button class="btn btn-small waves-effect waves-light red" onclick='showVerifikasiDetail(${JSON.stringify(item)}, "revoke")'>Revoke Approval</button>
    `;
} else if ((userRole === 'admin' && statusAdmin !== 'setuju') || (userRole === 'ketua pilar' && statusKetua !== 'setuju')) {
    // Show Detail for admin (not yet approved) and ketua pilar (not yet approved)
    actionButtons = `<button class="btn btn-small waves-effect waves-light blue" onclick='showVerifikasiDetail(${JSON.stringify(item)}, "detail")'>Detail</button>`;
} else {
    actionButtons = `<button class="btn btn-small waves-effect waves-light blue" onclick='showVerifikasiDetail(${JSON.stringify(item)}, "detail")'>Detail</button>`;
}

row.innerHTML = `
    <td>${item.nama || 'N/A'}</td>
    <td>${item.namaTugas || 'N/A'}</td>
    <td>${item.timestamp ? new Date(item.timestamp).toLocaleString('id-ID') : 'N/A'}</td>
    <td>${createStatusBadge(item.statusKetua)}</td>
    <td>${createStatusBadge(item.statusAdmin)}</td>
    <td>${actionButtons}</td>
`;
                tableBody.appendChild(row);
            });
            content.style.display = 'block';
        } else {
            noDataMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading Kinerja Tim:', error);
        showError('Gagal memuat data Kinerja Tim.');
        noDataMessage.style.display = 'block';
        noDataMessage.textContent = 'Terjadi kesalahan saat memuat data.';
    } finally {
        loader.style.display = 'none';
        isLoadingKinerjaTim = false;
    }
}

// Helper untuk menambahkan satu field rincian
function addRincianField(container, value = '') {
    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'validate';
    input.value = value;
    input.placeholder = 'Contoh: Laporan Pelaksanaan';

    const removeBtn = document.createElement('a');
    removeBtn.className = 'btn-floating btn-small waves-effect waves-light red';
    removeBtn.innerHTML = '<i class="material-icons">remove</i>';

    removeBtn.addEventListener('click', () => {
        inputGroup.remove();
    });

    inputGroup.appendChild(input);
    inputGroup.appendChild(removeBtn);
    container.appendChild(inputGroup);
}

// Fungsi untuk setup field rincian awal
function setupRincianFields(container, rincianText) {
    container.innerHTML = ''; // Selalu kosongkan dulu
    if (rincianText) {
        const rincianArray = rincianText.split('|').filter(item => item.trim() !== '');
        if (rincianArray.length > 0) {
            rincianArray.forEach(value => addRincianField(container, value));
        } else {
            addRincianField(container); // Jika kosong, tambahkan satu field default
        }
    } else {
        addRincianField(container); // Jika tidak ada data, tambahkan satu field default
    }
}
