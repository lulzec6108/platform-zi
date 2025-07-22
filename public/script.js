// script.js (OPTIMIZED)

// Konfigurasi
const API_BASE = '/.netlify/functions/proxy';
const API_TIMEOUT = 15000; // 15 detik timeout

// Inisialisasi Materialize dan komponen
document.addEventListener('DOMContentLoaded', function() {
    M.AutoInit();
    
    // Pastikan APP_CONFIG sudah diinisialisasi oleh config.js
    window.APP_CONFIG = window.APP_CONFIG || {
        API_KEY: '',
        API_BASE: API_BASE
    };
    
    // Log konfigurasi untuk debugging (sensor API key)
    console.log('APP_CONFIG:', {
        ...window.APP_CONFIG,
        API_KEY: window.APP_CONFIG.API_KEY ? '***' + window.APP_CONFIG.API_KEY.slice(-4) : 'not set'
    });
    
    // Cek API key
    if (!window.APP_CONFIG.API_KEY) {
        console.error('API key tidak ditemukan. Pastikan config.js dimuat dengan benar.');
    }
    
    // Inisialisasi komponen Materialize
    const elems = document.querySelectorAll('.modal');
    M.Modal.init(elems);
    
    // Inisialisasi form login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Inisialisasi tombol logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Cek status login
    checkAuthStatus();
});

// Fungsi untuk memeriksa status autentikasi
function checkAuthStatus() {
    const loginPage = document.getElementById('login-page');
    const mainContent = document.getElementById('main-content');
    const user = sessionStorage.getItem('user');
    
    if (user) {
        try {
            const userData = JSON.parse(user);
            const userInfo = document.getElementById('user-info');
            const userName = document.getElementById('user-name');
            const userRole = document.getElementById('user-role');
            
            if (userInfo) userInfo.textContent = userData.nama || 'User';
            if (userName) userName.textContent = userData.nama || 'User';
            if (userRole) userRole.textContent = userData.role || 'User';
            
            if (loginPage) loginPage.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
            
            // Load data awal
            loadDashboardData();
        } catch (e) {
            console.error('Error parsing user data:', e);
            handleLogout();
        }
    } else {
        if (loginPage) loginPage.style.display = 'block';
        if (mainContent) mainContent.style.display = 'none';
    }
}

// Fungsi untuk memanggil API dengan error handling yang lebih baik
async function callApi(action, method = 'GET', data = {}) {
    // Validasi input
    if (!action || typeof action !== 'string') {
        throw new Error('Action harus berupa string yang valid');
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const options = {
            method: 'POST', // Selalu gunakan POST untuk Netlify Functions
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': window.APP_CONFIG.API_KEY || ''
            },
            body: JSON.stringify({
                action,
                method,
                ...(method !== 'GET' && { data }),
                timestamp: new Date().toISOString()
            }),
            signal: controller.signal
        };

        console.log(`[API] Request: ${action}`, { 
            method,
            hasApiKey: !!window.APP_CONFIG.API_KEY,
            apiKeyLast4: window.APP_CONFIG.API_KEY ? '***' + window.APP_CONFIG.API_KEY.slice(-4) : 'not set'
        });

        const response = await fetch(window.APP_CONFIG.API_BASE || API_BASE, options);
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
            error.status = response.status;
            throw error;
        }

        const responseData = await response.json();
        console.log(`[API] Response: ${action}`, responseData);
        return responseData;
    } catch (error) {
        console.error(`[API] Error: ${action}`, error);
        
        // Handle error spesifik
        if (error.name === 'AbortError') {
            error.message = 'Permintaan timeout. Silakan coba lagi.';
        } else if (error.status === 401) {
            handleLogout();
            error.message = 'Sesi Anda telah berakhir. Silakan login kembali.';
        } else if (!navigator.onLine) {
            error.message = 'Tidak ada koneksi internet. Periksa koneksi Anda.';
        }
        
        throw error;
    }
}

// Fungsi untuk menangani login
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    const errorElement = document.getElementById('login-error');
    
    if (!username || !password) {
        if (errorElement) {
            errorElement.textContent = 'Username dan password harus diisi';
            errorElement.style.display = 'block';
        }
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await callApi('login', 'POST', { username, password });
        
        if (response && response.success && response.user) {
            // Simpan data user ke session storage
            sessionStorage.setItem('user', JSON.stringify(response.user));
            
            // Perbarui UI
            checkAuthStatus();
            
            // Tampilkan notifikasi sukses
            M.toast({html: 'Login berhasil!', classes: 'green'});
        } else {
            throw new Error(response?.message || 'Login gagal. Periksa kembali username dan password Anda.');
        }
    } catch (error) {
        console.error('Login error:', error);
        
        if (errorElement) {
            errorElement.textContent = error.message || 'Terjadi kesalahan saat login. Silakan coba lagi.';
            errorElement.style.display = 'block';
        }
    } finally {
        showLoading(false);
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

// Fungsi untuk memuat data dashboard
async function loadDashboardData() {
    try {
        showLoading(true);
        const response = await callApi('getDashboardData');
        
        if (response.success && response.data) {
            renderDashboardTable(response.data);
        } else {
            throw new Error(response?.message || 'Gagal memuat data dashboard');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError(error.message || 'Terjadi kesalahan saat memuat data dashboard');
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
                const response = await callApi('saveBuktiDukung', 'POST', {
                    jenis,
                    nilai
                });
                
                if (response.success) {
                    showError('Bukti berhasil disimpan', 'success');
                    
                    // Tutup modal
                    const modal = M.Modal.getInstance(document.getElementById('detailModal'));
                    if (modal) modal.close();
                    
                    // Refresh data
                    loadDashboardData();
                } else {
                    throw new Error(response.message || 'Gagal menyimpan bukti');
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
                const response = await callApi('savePenilaianKetua', 'POST', {
                    status,
                    catatan
                });
                
                if (response.success) {
                    showError('Penilaian berhasil disimpan', 'success');
                    
                    // Tutup modal
                    const modal = M.Modal.getInstance(document.getElementById('detailModal'));
                    if (modal) modal.close();
                    
                    // Refresh data
                    loadDashboardData();
                } else {
                    throw new Error(response.message || 'Gagal menyimpan penilaian');
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
                const response = await callApi('saveVerifikasiAdmin', 'POST', {
                    status,
                    catatan
                });
                
                if (response.success) {
                    showError('Verifikasi berhasil disimpan', 'success');
                    
                    // Tutup modal
                    const modal = M.Modal.getInstance(document.getElementById('detailModal'));
                    if (modal) modal.close();
                    
                    // Refresh data
                    loadDashboardData();
                } else {
                    throw new Error(response.message || 'Gagal menyimpan verifikasi');
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
