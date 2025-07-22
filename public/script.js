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
});

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
                method, // Sertakan method dalam body untuk Netlify Functions
                ...(method !== 'GET' && { data }), // Hanya sertakan data jika bukan GET
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
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log(`[API] Response: ${action}`, responseData);
        return responseData;
    } catch (error) {
        console.error(`[API] Error: ${action}`, error);
        throw error;
    }
}

// Fungsi untuk menampilkan error
function showError(message) {
    console.error('[Error]', message);
    M.toast({
        html: `<span>${message}</span>`,
        classes: 'red',
        displayLength: 4000
    });
}

// Fungsi untuk menampilkan loading
function showLoading(show = true) {
    const loader = document.getElementById('loader-overlay');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

// Fungsi untuk menangani login
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value;
    const loginButton = event.target.querySelector('button[type="submit"]');
    const errorElement = document.getElementById('login-error');
    
    if (!loginButton) return;
    
    try {
        // Validasi input
        if (!username || !password) {
            throw new Error('Username dan password harus diisi');
        }
        
        // Tampilkan loading
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="material-icons left">loop</i> Memproses...';
        
        // Sembunyikan pesan error sebelumnya
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        // Panggil API login
        const response = await callApi('login', 'POST', { username, password });
        
        if (response.success && response.user) {
            // Simpan data user
            sessionStorage.setItem('user', JSON.stringify(response.user));
            window.location.href = '/dashboard.html';
        } else {
            throw new Error(response.message || 'Login gagal');
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Tampilkan pesan error
        if (errorElement) {
            errorElement.textContent = error.message || 'Terjadi kesalahan saat login';
            errorElement.style.display = 'block';
            
            // Scroll ke error message
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } finally {
        // Reset tombol login
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.innerHTML = '<i class="material-icons left">login</i> Masuk';
        }
    }
}

// Fungsi untuk menangani logout
function handleLogout() {
    sessionStorage.removeItem('user');
    window.location.href = '/';
}

// Inisialisasi event listeners
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Inisialisasi navigasi
    const navLinks = {
        'dashboard-link': 'dashboard-view',
        'tugas-saya-link': 'tugas-saya-view',
        'link-pendukung-link': 'link-pendukung-view'
    };
    
    Object.entries(navLinks).forEach(([linkId, viewId]) => {
        const link = document.getElementById(linkId);
        const view = document.getElementById(viewId);
        
        if (link && view) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Sembunyikan semua view
                document.querySelectorAll('[id$="-view"]').forEach(v => {
                    v.classList.add('d-none');
                });
                
                // Tampilkan view yang dipilih
                view.classList.remove('d-none');
                
                // Update active nav item
                document.querySelectorAll('.sidenav a').forEach(a => {
                    a.classList.remove('active');
                });
                link.classList.add('active');
                
                // Load data jika diperlukan
                if (viewId === 'dashboard-view') {
                    loadDashboardData();
                } else if (viewId === 'tugas-saya-view') {
                    loadTugasSaya();
                } else if (viewId === 'link-pendukung-view') {
                    loadLinkPendukung();
                }
            });
        }
    });
    
    // Cek status login
    const user = sessionStorage.getItem('user');
    if (user) {
        document.getElementById('login-page').classList.add('d-none');
        document.getElementById('main-content').classList.remove('d-none');
        
        // Update info user
        const userData = JSON.parse(user);
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.textContent = `${userData.nama} (${userData.role})`;
        }
        
        // Load data awal
        loadDashboardData();
    } else {
        document.getElementById('login-page').classList.remove('d-none');
        document.getElementById('main-content').classList.add('d-none');
    }
});

// Fungsi untuk memuat data dashboard
async function loadDashboardData() {
    try {
        showLoading(true);
        const response = await callApi('getDashboardData');
        
        if (response.success && response.data) {
            renderDashboardTable(response.data);
        } else {
            throw new Error(response.message || 'Gagal memuat data dashboard');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Gagal memuat data dashboard: ' + (error.message || 'Terjadi kesalahan'));
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
