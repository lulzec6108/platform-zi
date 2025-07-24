// script.js (REVISED & SECURED)

// Konfigurasi
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbyi8ZxbUCzEa5QHiZW32Ifh23H9y8HaljrJOHjKa2f8rjUPuxuxKcr0TV9ygSVTbrY/exec';
const API_KEY = 'semoga_bisa_wbk_aamiin'; // Kunci API sederhana
const API_TIMEOUT = 20000; // 20 detik timeout

// Event listener utama saat DOM sudah siap
document.addEventListener('DOMContentLoaded', () => {
    console.log('%cHehe, masih belajar bikin webapp jangan didebug yaa, maklum masih banyak bug, bukan anak KS soalnya.. ~Fayadh', 'font-weight: bold; font-size: 14px; color: #1e88e5;');

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
});

// Fungsi untuk beralih antar view (Dashboard, Tugas Saya, dll.)
function switchView(viewId) {
    // Sembunyikan semua view utama
    document.querySelectorAll('.page-content > div').forEach(view => {
        view.style.display = 'none';
    });

    // Tampilkan view yang dipilih
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.style.display = 'block';
    } else {
        console.error(`View dengan ID '${viewId}' tidak ditemukan.`);
        return; // Hentikan jika view tidak ditemukan
    }

    // --- PERBAIKAN LOGIKA MENU AKTIF ---
    // 1. Hapus kelas 'active' dari SEMUA item menu (sidebar dan navbar atas)
    document.querySelectorAll('.sidenav li, .topnav-menu li').forEach(li => {
        li.classList.remove('active');
    });

    // 2. Tambahkan kelas 'active' ke item yang diklik di sidebar
    const activeSidebarLink = document.querySelector(`.sidenav a[data-view='${viewId}']`);
    if (activeSidebarLink && activeSidebarLink.parentElement) {
        activeSidebarLink.parentElement.classList.add('active');
    }

    // 3. Tambahkan kelas 'active' ke item yang sesuai di navbar atas
    const activeNavMenuLink = document.querySelector(`.topnav-menu a[data-view='${viewId}']`);
    if (activeNavMenuLink && activeNavMenuLink.parentElement) {
        activeNavMenuLink.parentElement.classList.add('active');
    }

    // Muat data yang relevan berdasarkan view yang aktif
    switch (viewId) {
        case 'dashboard-view':
            // Di masa depan, panggil fungsi untuk memuat data dashboard di sini
            // loadDashboardData(); 
            break;
        case 'tugas-saya-view':
            loadTugasSaya();
            break;
        case 'link-pendukung-view':
            loadLinkPendukung();
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

            // Perbarui info pengguna di Sidenav
            const userNameElement = document.getElementById('user-name');
            const userRoleElement = document.getElementById('user-role');
            if (userNameElement) userNameElement.textContent = userData.nama;
            if (userRoleElement) userRoleElement.textContent = userData.role;

            // Pindahkan ke dashboard sebagai default view setelah login
            // Cek apakah ada view yang sudah aktif, jika tidak, set default ke dashboard
            const currentActiveView = document.querySelector('.page-content > div[style*="display: block"]');
            if (!currentActiveView) {
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
    let url = `${API_BASE_URL}?action=${action}&apiKey=${API_KEY}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const options = {
        method: method.toUpperCase(),
        headers: {
            'Content-Type': 'text/plain;charset=utf-8', // Diperlukan untuk GAS
        },
        signal: controller.signal,
    };

    // Untuk metode POST, kirim data dalam body
    if (options.method === 'POST') {
        options.body = JSON.stringify(data);
        // Perlu mode 'no-cors' untuk beberapa jenis POST ke GAS, tapi kita coba dulu tanpa
        // options.mode = 'no-cors'; 
    } 
    // Untuk metode GET, kirim data sebagai query parameter
    else if (options.method === 'GET' && Object.keys(data).length > 0) {
        for (const key in data) {
            url += `&${key}=${data[key]}`;
        }
    }

    try {
        console.log(`[API] Request: ${options.method} ${url}`);
        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Respons dari server bukan JSON. Kemungkinan ada error di server.');
        }

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('API call timed out.');
            throw new Error('Permintaan ke server memakan waktu terlalu lama.');
        }
        console.error(`[API] Error calling ${action}:`, error);
        throw error; // Lemparkan lagi untuk ditangani oleh pemanggil
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

// Fungsi untuk memuat data tugas saya
async function loadTugasSaya() {
    try {
        showLoading(true);
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (!user) {
            showLogin();
            return;
        }
        
        const response = await callApi('getTugasSaya', 'GET', { username: user.username });
        
        if (response.success && response.data) {
            // Implementasi render tugas saya
            console.log('Tugas saya:', response.data);
        } else {
            throw new Error(response.message || 'Gagal memuat data tugas');
        }
    } catch (error) {
        console.error('Error loading my tasks:', error);
        showError('Gagal memuat data tugas: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
        showLoading(false);
    }
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

                        // Koleksi Ikon SVG Berwarna
                        const icons = [
                            // Ikon Dokumen Biru
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="#42A5F5"/></svg>`,
                            // Ikon Link Hijau
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="#66BB6A"/></svg>`,
                            // Ikon Laporan Oranye
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" fill="#FFA726"/></svg>`,
                            // Ikon Folder Abu-abu
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="#78909C"/></svg>`,
                            // Ikon PDF Merah
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 6c0 .55.45 1 1 1h2v2c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1h-2V6c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1v2zm-2 4h2v2c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1h-2V6c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1v2zm-1 4h1v1c0 .55-.45 1-1 1h-1c-.55 0-1-.45-1-1v-1zm-1-5h1v1c0 .55-.45 1-1 1h-1c-.55 0-1-.45-1-1V8zm-1 4h1v1c0 .55-.45 1-1 1h-1c-.55 0-1-.45-1-1v-1z" fill="#EF5350"/></svg>`
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

// Fungsi untuk menampilkan pesan error
function showError(message, duration = 5000) {
    M.toast({html: message, classes: 'red', displayLength: duration});
}
