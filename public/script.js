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

            // Tutup sidenav setelah item diklik (khusus mobile)
            const sidenavInstance = M.Sidenav.getInstance(document.querySelector('.sidenav'));
            if (sidenavInstance.isOpen) {
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
            loadDashboardData();
            break;
        case 'tugas-saya-view':
            loadTugasSaya();
            break;
        case 'link-pendukung-view':
            loadLinkPendukung();
            break;
        case 'kinerja-tim-view':
            // Di masa depan, panggil fungsi seperti loadKinerjaTimData() di sini
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

// Fungsi untuk memuat link pendukung
async function loadLinkPendukung() {
    try {
        showLoading(true);
        const response = await callApi('getLinkPendukung');
        
        if (response.success && response.data) {
            const container = document.getElementById('link-pendukung-body');
            if (container) {
                container.innerHTML = response.data.map(link => `
                    <tr>
                        <td>${link.deskripsi || '-'}</td>
                        <td>
                            <a href="${link.url}" target="_blank" rel="noopener noreferrer">
                                ${link.nama || 'Buka Link'}
                            </a>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            throw new Error(response.message || 'Gagal memuat link pendukung');
        }
    } catch (error) {
        console.error('Error loading support links:', error);
        showError('Gagal memuat link pendukung: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
        showLoading(false);
    }
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
