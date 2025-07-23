// script.js (REVISED & SECURED)

// Konfigurasi
const API_BASE_URL = '/api'; // Menggunakan proxy Netlify yang diatur di netlify.toml
const API_TIMEOUT = 20000; // 20 detik timeout

// Event listener utama saat DOM sudah siap
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM siap. Inisialisasi aplikasi...');

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
        console.log(`Menampilkan view: ${viewId}`);
    } else {
        console.error(`View dengan ID '${viewId}' tidak ditemukan.`);
        return; // Hentikan jika view tidak ditemukan
    }

    // Perbarui status 'active' pada menu sidebar
    document.querySelectorAll('.sidenav li').forEach(li => {
        li.classList.remove('active');
    });

    const activeLink = document.querySelector(`.sidenav a[data-view='${viewId}']`);
    if (activeLink && activeLink.parentElement) {
        activeLink.parentElement.classList.add('active');
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
            const sidenavUserName = document.getElementById('sidenav-user-name');
            const sidenavUserRole = document.getElementById('sidenav-user-role');
            if (sidenavUserName) sidenavUserName.textContent = userData.nama || 'Pengguna';
            if (sidenavUserRole) sidenavUserRole.textContent = userData.role || 'Role';

            // Atur avatar pengguna secara acak
            setRandomAvatar();
            
            // Saat pertama kali login, tampilkan dashboard
            switchView('dashboard-view');
        } catch (e) {
            console.error('Gagal mem-parsing data pengguna, logout paksa:', e);
            handleLogout(); // Jika data user rusak, paksa logout
        }
    } else {
        // Pengguna belum login
        if (loginPage) loginPage.style.display = 'flex'; // DIUBAH DARI 'block' ke 'flex'
        if (mainContent) mainContent.style.display = 'none';
        document.title = 'Login | Si Paling ZI'; // Kembalikan judul halaman
    }
}

// Fungsi untuk memanggil API yang aman dan sederhana
async function callApi(action, method = 'GET', data = {}) {
    let url = `${API_BASE_URL}/${action}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const options = {
        method: method.toUpperCase(),
        headers: {
            'Content-Type': 'application/json',
        },
        signal: controller.signal,
    };

    // Untuk metode POST, kirim data dalam body
    if (options.method === 'POST') {
        options.body = JSON.stringify(data);
    } 
    // Untuk metode GET, kirim data sebagai query parameter
    else if (options.method === 'GET' && Object.keys(data).length > 0) {
        url += '?' + new URLSearchParams(data).toString();
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

            const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyi8ZxbUCzEa5QHiZW32Ifh23H9y8HaljrJOHjKa2f8rjUPuxuxKcr0TV9ygSVTbrY/exec';
            const API_KEY = 'semoga_bisa_wbk_aamiin';
            const fullUrl = `${WEB_APP_URL}?action=getLinkPendukung&apiKey=${API_KEY}`;
            console.log(`[DIAG] 4. Melakukan fetch ke: ${fullUrl}`);

            const response = await fetch(fullUrl);
            console.log('[DIAG] 5. Fetch selesai. Status respons:', response.status);

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('[DIAG] GAGAL: Respons bukan JSON. Tipe Konten:', contentType);
                throw new Error('Respons dari server bukan JSON.');
            }
            console.log('[DIAG] 6. Pengecekan Content-Type berhasil.');

            const result = await response.json();
            console.log('[DIAG] 7. Parsing JSON berhasil. Data diterima:', result);

            console.log('[DIAG] 8. Membersihkan kontainer.');
            container.innerHTML = ''; // Kosongkan kontainer sebelum mengisi

            // Buat kontainer untuk kartu-kartu
            const cardContainer = document.createElement('div');
            cardContainer.className = 'link-pendukung-cards-container';

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
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5-.67 1.5-1.5v-1zm-1.5-2.5H9v1h.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5zm7 6H15v-2h-1.5v4h2c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5zm-2.5-4H12v6h1.5V9zm-4.5 2H12v-2h-1.5V9z" fill="#EF5350"/></svg>`
            ];

            // Fungsi hash sederhana untuk memilih ikon secara konsisten
            function simpleHash(str) {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    hash = (str.charCodeAt(i) + ((hash << 5) - hash)) & 0xFFFFFFFF;
                }
                return Math.abs(hash);
            }

            console.log('[DIAG] 9. Mulai iterasi data untuk membuat kartu.');
            result.data.forEach(item => {
                // Pilih ikon secara konsisten berdasarkan judul
                const iconIndex = simpleHash(item.judul) % icons.length;
                const selectedIconSvg = icons[iconIndex];

                const card = document.createElement('div');
                card.className = `card link-pendukung-card`; // Warna solid tidak lagi di sini
                
                const cardContent = document.createElement('div');
                cardContent.className = 'card-content';
                cardContent.innerHTML = `
                    <div class="card-icon-wrapper">
                        ${selectedIconSvg}
                    </div>
                    <span class="card-title">${item.judul}</span>
                    <p class="link-description">${item.deskripsi}</p>
                `;

                const cardAction = document.createElement('div');
                cardAction.className = 'card-action';
                cardAction.innerHTML = `
                    <a href="${item.link}" target="_blank" class="btn waves-effect waves-light blue">Kunjungi Link</a>
                `;

                card.appendChild(cardContent);
                card.appendChild(cardAction);
                cardContainer.appendChild(card);
            });

            container.appendChild(cardContainer);

            console.log('[DIAG] 10. Data berhasil dirender sebagai kartu dengan ikon SVG.');

        } catch (error) {
            console.error('[DIAG] FINAL ERROR CATCH BLOCK:', error);
            if(container) container.innerHTML = '<p class="red-text">Gagal memuat data link. Silakan coba lagi nanti.</p>';
            showError('Gagal memuat Link Pendukung.');
        } finally {
            showLoading(false);
            console.log('[DIAG] 11. Selesai. Menyembunyikan loading overlay.');
        }
    }, 0); // Jeda 0ms untuk menempatkan eksekusi di akhir antrian event
}

// Inisialisasi event listener untuk form bukti dukung
document.addEventListener('DOMContentLoaded', function() {
    const saveBuktiBtn = document.getElementById('save-bukti-btn');
    if (saveBuktiBtn) {
        saveBuktiBtn.addEventListener('click', async function() {
            const jenis = document.getElementById('bukti-jenis').value;
            const nilai = document.getElementById('bukti-nilai').value.trim();
            
            if (!nilai) {
                showError('Nilai bukti harus diisi');
                return;
            }
            
            try {
                showLoading(true);
                const payload = {
                    jenis,
                    nilai,
                    kode_hirarki: document.getElementById('task-id-hidden').value,
                    username: JSON.parse(sessionStorage.getItem('user')).username
                };
                const result = await callApi('saveBuktiDukung', 'POST', payload);
                
                if (result.success) {
                    showError('Bukti berhasil disimpan', 'success');
                    
                    // Tutup modal
                    const modal = M.Modal.getInstance(document.getElementById('detailModal'));
                    if (modal) modal.close();
                    
                    // Refresh data
                    loadDashboardData();
                } else {
                    throw new Error(result.message || 'Gagal menyimpan bukti');
                }
            } catch (error) {
                console.error('Error saving evidence:', error);
                showError('Gagal menyimpan bukti: ' + (error.message || 'Terjadi kesalahan'));
            } finally {
                showLoading(false);
            }
        });
    }
});

// Inisialisasi event listener untuk form penilaian ketua pilar
document.addEventListener('DOMContentLoaded', function() {
    const saveKetuaBtn = document.getElementById('save-ketua-status-btn');
    if (saveKetuaBtn) {
        saveKetuaBtn.addEventListener('click', async function() {
            const status = document.getElementById('ketua-status').value;
            const catatan = document.getElementById('ketua-catatan').value.trim();
            
            if (!status) {
                showError('Status penilaian harus dipilih');
                return;
            }
            
            try {
                showLoading(true);
                const payload = {
                    status,
                    catatan,
                    kode_hirarki: document.getElementById('task-id-hidden').value,
                    username: JSON.parse(sessionStorage.getItem('user')).username
                };
                const result = await callApi('savePenilaianKetua', 'POST', payload);
                
                if (result.success) {
                    showError('Penilaian berhasil disimpan', 'success');
                    
                    // Tutup modal
                    const modal = M.Modal.getInstance(document.getElementById('detailModal'));
                    if (modal) modal.close();
                    
                    // Refresh data
                    loadDashboardData();
                } else {
                    throw new Error(result.message || 'Gagal menyimpan penilaian');
                }
            } catch (error) {
                console.error('Error saving assessment:', error);
                showError('Gagal menyimpan penilaian: ' + (error.message || 'Terjadi kesalahan'));
            } finally {
                showLoading(false);
            }
        });
    }
});

// Inisialisasi event listener untuk form verifikasi admin
document.addEventListener('DOMContentLoaded', function() {
    const saveAdminBtn = document.getElementById('save-admin-status-btn');
    if (saveAdminBtn) {
        saveAdminBtn.addEventListener('click', async function() {
            const status = document.getElementById('admin-status').value;
            const catatan = document.getElementById('admin-catatan').value.trim();
            
            if (!status) {
                showError('Status verifikasi harus dipilih');
                return;
            }
            
            try {
                showLoading(true);
                const payload = {
                    status,
                    catatan,
                    kode_hirarki: document.getElementById('task-id-hidden').value,
                    username: JSON.parse(sessionStorage.getItem('user')).username
                };
                const result = await callApi('saveVerifikasiAdmin', 'POST', payload);
                
                if (result.success) {
                    showError('Verifikasi berhasil disimpan', 'success');
                    
                    // Tutup modal
                    const modal = M.Modal.getInstance(document.getElementById('detailModal'));
                    if (modal) modal.close();
                    
                    // Refresh data
                    loadDashboardData();
                } else {
                    throw new Error(result.message || 'Gagal menyimpan verifikasi');
                }
            } catch (error) {
                console.error('Error saving verification:', error);
                showError('Gagal menyimpan verifikasi: ' + (error.message || 'Terjadi kesalahan'));
            } finally {
                showLoading(false);
            }
        });
    }
});

// Fungsi untuk menampilkan/menyembunyikan loading
function showLoading(show = true) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}

// Fungsi untuk menampilkan pesan error
function showError(message, duration = 5000) {
    M.toast({html: message, classes: 'red', displayLength: duration});
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
