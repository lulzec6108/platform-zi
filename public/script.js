// script.js (FINAL)

document.addEventListener('DOMContentLoaded', function() {
    // Inisialisasi komponen Materialize
    M.AutoInit();
    
    // Inisialisasi sidenav untuk mobile
    const sidenav = document.querySelectorAll('.sidenav');
    M.Sidenav.init(sidenav);
    
    // Inisialisasi modal
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
    
    // Inisialisasi select
    const selects = document.querySelectorAll('select');
    M.FormSelect.init(selects);
    
    // Set up event listeners
    setupEventListeners();
    
    // Periksa status login
    checkAuth();
});

// Variabel global
let currentUser = null;
let allTasks = [];
let currentView = 'dashboard';

// Fungsi untuk mengecek status autentikasi
function checkAuth() {
    const userData = sessionStorage.getItem('zi_user');
    if (userData) {
        // User sudah login
        currentUser = JSON.parse(userData);
        showMainContent();
    } else {
        // User belum login
        showLogin();
    }
}

// Fungsi untuk menangani login
async function handleLogin(event) {
    if (event) event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('login-error');
    
    if (!username || !password) {
        errorElement.textContent = 'Username dan password harus diisi';
        errorElement.style.display = 'block';
        return;
    }
    
    try {
        // Tampilkan loading
        const loginButton = document.querySelector('#login-form button[type="submit"]');
        const originalButtonText = loginButton.innerHTML;
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="material-icons left">loop</i> Memproses...';
        
        // Kirim permintaan login
        const response = await fetch('https://script.google.com/macros/s/AKfycbwQ5w6gV5J7QXdJ9ZQJQ9Q5ZQZQZQZQZQZQZQZQZQZQZQZQZQZQZ/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'login',
                username: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Simpan data user ke sessionStorage
            sessionStorage.setItem('zi_user', JSON.stringify(data.user));
            currentUser = data.user;
            showMainContent();
        } else {
            throw new Error(data.message || 'Login gagal');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorElement.textContent = error.message || 'Terjadi kesalahan saat login';
        errorElement.style.display = 'block';
    } finally {
        // Reset tombol login
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.innerHTML = originalButtonText;
        }
    }
}

// Fungsi untuk menampilkan halaman login
function showLogin() {
    document.getElementById('login-view').style.display = 'flex';
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('username').focus();
}

// Fungsi untuk menampilkan konten utama
function showMainContent() {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    
    // Update informasi user di sidebar
    updateUserInfo();
    
    // Muat data berdasarkan view yang aktif
    loadView(currentView);
}

// Fungsi untuk memperbarui informasi user di sidebar
function updateUserInfo() {
    if (!currentUser) return;
    
    const usernameElement = document.getElementById('sidebar-username');
    const roleElement = document.getElementById('sidebar-role');
    
    if (usernameElement) usernameElement.textContent = currentUser.nama || currentUser.username;
    if (roleElement) roleElement.textContent = currentUser.role;
}

// Fungsi untuk memuat view yang sesuai
async function loadView(viewName) {
    // Update active menu
    document.querySelectorAll('.sidebar-menu li').forEach(menuItem => {
        menuItem.classList.remove('active');
        if (menuItem.id === `${viewName}-link`) {
            menuItem.classList.add('active');
        }
    });
    
    // Sembunyikan semua view
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });
    
    // Tampilkan view yang dipilih
    const activeView = document.getElementById(`${viewName}-view`);
    if (activeView) {
        activeView.style.display = 'block';
        
        // Update judul halaman
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            const titleMap = {
                'dashboard': 'Daftar Tugas',
                'tugas-zi': 'Tugas ZI',
                'link-pendukung': 'Link Pendukung'
            };
            pageTitle.textContent = titleMap[viewName] || 'Dashboard';
        }
        
        // Muat data untuk view yang dipilih
        try {
            showLoading(true);
            switch(viewName) {
                case 'dashboard':
                    await loadDashboardData();
                    break;
                case 'tugas-zi':
                    await loadTugasZiData();
                    break;
                case 'link-pendukung':
                    await loadLinkPendukungData();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${viewName}:`, error);
            M.toast({html: `Gagal memuat data: ${error.message}`});
        } finally {
            showLoading(false);
        }
    }
    
    currentView = viewName;
}

// Fungsi untuk memuat data dashboard
async function loadDashboardData() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbwQ5w6gV5J7QXdJ9ZQJQ9Q5ZQZQZQZQZQZQZQZQZQZQZQZQZQZQZ/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getDashboardData',
                userId: currentUser.id,
                userRole: currentUser.role
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            allTasks = data.tasks || [];
            renderDashboardTable(allTasks);
        } else {
            throw new Error(data.message || 'Gagal memuat data dashboard');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        throw error;
    }
}

// Fungsi untuk merender tabel dashboard
function renderDashboardTable(tasks) {
    const tbody = document.getElementById('dashboard-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!tasks || tasks.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="9" class="center-align">Tidak ada data tugas</td>
        `;
        tbody.appendChild(row);
        return;
    }
    
    tasks.forEach((task, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${task.kode || '-'}</td>
            <td>${task.pilar || '-'}</td>
            <td>${task.namaTugas || '-'}</td>
            <td>${task.pic || '-'}</td>
            <td><span class="badge ${getStatusClass(task.statusPengerjaan)}">${task.statusPengerjaan || '-'}</span></td>
            <td><span class="badge ${getStatusClass(task.statusKetuaPilar)}">${task.statusKetuaPilar || '-'}</span></td>
            <td><span class="badge ${getStatusClass(task.statusAdmin)}">${task.statusAdmin || '-'}</span></td>
            <td>
                <button class="btn btn-small waves-effect waves-light blue" onclick="openTugasModal('${task.id}')">
                    <i class="material-icons">visibility</i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Fungsi untuk membuka modal detail tugas
function openTugasModal(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) {
        M.toast({html: 'Data tugas tidak ditemukan'});
        return;
    }
    
    // Isi data tugas ke dalam modal
    document.getElementById('modal-kode').textContent = task.kode || '-';
    document.getElementById('modal-nama-tugas').textContent = task.namaTugas || '-';
    document.getElementById('modal-pic').textContent = task.pic || '-';
    
    // Update link referensi
    const linkReferensi = document.getElementById('modal-link-referensi');
    if (task.linkReferensi) {
        linkReferensi.href = task.linkReferensi;
        linkReferensi.textContent = 'Buka Referensi';
    } else {
        linkReferensi.href = '#';
        linkReferensi.textContent = 'Tidak tersedia';
    }
    
    // Update link GDrive
    const linkGDrive = document.getElementById('modal-link-gdrive');
    if (task.linkGDrive) {
        linkGDrive.href = task.linkGDrive;
        linkGDrive.textContent = 'Lihat Bukti';
    } else {
        linkGDrive.href = '#';
        linkGDrive.textContent = 'Belum diunggah';
    }
    
    // Tampilkan/sembunyikan section berdasarkan role
    document.getElementById('anggota-form-section').style.display = 'none';
    document.getElementById('ketua-pilar-section').style.display = 'none';
    document.getElementById('admin-section').style.display = 'none';
    
    // Tampilkan section yang sesuai dengan role user
    if (currentUser.role.toLowerCase() === 'anggota' && currentUser.username === task.pic) {
        // Tampilkan form bukti dukung untuk anggota
        document.getElementById('anggota-form-section').style.display = 'block';
        document.getElementById('bukti-jenis').value = task.jenisBukti || '';
        document.getElementById('bukti-nilai').value = task.nilaiBukti || '';
        M.FormSelect.init(document.getElementById('bukti-jenis'));
    } else if (currentUser.role.toLowerCase() === 'ketua pilar' && currentUser.pilar === task.pilar) {
        // Tampilkan form penilaian untuk ketua pilar
        document.getElementById('ketua-pilar-section').style.display = 'block';
        document.getElementById('modal-status-anggota').textContent = task.statusPengerjaan || '-';
        document.getElementById('modal-bukti-detail').textContent = task.buktiDetail || '-';
        document.getElementById('ketua-status').value = task.statusKetuaPilar || '';
        document.getElementById('ketua-catatan').value = task.catatanKetua || '';
        M.FormSelect.init(document.getElementById('ketua-status'));
    } else if (currentUser.role.toLowerCase() === 'admin') {
        // Tampilkan form verifikasi untuk admin
        document.getElementById('admin-section').style.display = 'block';
        document.getElementById('modal-status-ketua').textContent = task.statusKetuaPilar || '-';
        document.getElementById('modal-catatan-ketua').textContent = task.catatanKetua || '-';
        document.getElementById('admin-status').value = task.statusAdmin || '';
        document.getElementById('admin-catatan').value = task.catatanAdmin || '';
        M.FormSelect.init(document.getElementById('admin-status'));
    }
    
    // Inisialisasi ulang komponen Materialize
    M.updateTextFields();
    
    // Tampilkan modal
    const modalInstance = M.Modal.getInstance(document.getElementById('detailModal'));
    modalInstance.open();
}

// Fungsi untuk mendapatkan class status
function getStatusClass(status) {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('selesai') || statusLower.includes('disetujui') || statusLower.includes('terverifikasi')) {
        return 'success';
    } else if (statusLower.includes('proses') || statusLower.includes('menunggu')) {
        return 'warning';
    } else if (statusLower.includes('ditolak') || statusLower.includes('gagal')) {
        return 'danger';
    }
    
    return 'info';
}

// Fungsi untuk menangani logout
function handleLogout() {
    // Hapus data user dari sessionStorage
    sessionStorage.removeItem('zi_user');
    currentUser = null;
    
    // Tampilkan halaman login
    showLogin();
    
    // Reset form login
    document.getElementById('login-form').reset();
    document.getElementById('login-error').style.display = 'none';
    
    M.toast({html: 'Anda telah logout'});
}

// Fungsi untuk menampilkan/menyembunyikan loading
function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    if (!loadingElement) return;
    
    if (show) {
        loadingElement.style.display = 'flex';
    } else {
        loadingElement.style.display = 'none';
    }
}

// Fungsi untuk mengatur event listeners
function setupEventListeners() {
    // Event listener untuk form login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Event listener untuk menu sidebar
    document.querySelectorAll('.sidebar-menu a').forEach(menuItem => {
        menuItem.addEventListener('click', function(e) {
            e.preventDefault();
            const viewName = this.parentElement.id.replace('-link', '');
            if (viewName === 'logout') {
                handleLogout();
            } else {
                loadView(viewName);
            }
        });
    });
    
    // Event listener untuk tombol simpan bukti (anggota)
    const saveBuktiBtn = document.getElementById('save-bukti-btn');
    if (saveBuktiBtn) {
        saveBuktiBtn.addEventListener('click', saveBuktiDukung);
    }
    
    // Event listener untuk tombol simpan penilaian (ketua pilar)
    const saveKetuaStatusBtn = document.getElementById('save-ketua-status-btn');
    if (saveKetuaStatusBtn) {
        saveKetuaStatusBtn.addEventListener('click', savePenilaianKetua);
    }
    
    // Event listener untuk tombol simpan verifikasi (admin)
    const saveAdminStatusBtn = document.getElementById('save-admin-status-btn');
    if (saveAdminStatusBtn) {
        saveAdminStatusBtn.addEventListener('click', saveVerifikasiAdmin);
    }
    
    // Event listener untuk pencarian
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
}

// Fungsi untuk menangani pencarian
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (!searchTerm) {
        renderDashboardTable(allTasks);
        return;
    }
    
    const filteredTasks = allTasks.filter(task => {
        return (
            (task.kode && task.kode.toLowerCase().includes(searchTerm)) ||
            (task.namaTugas && task.namaTugas.toLowerCase().includes(searchTerm)) ||
            (task.pic && task.pic.toLowerCase().includes(searchTerm)) ||
            (task.pilar && task.pilar.toLowerCase().includes(searchTerm))
        );
    });
    
    renderDashboardTable(filteredTasks);
}

// Fungsi untuk menyimpan bukti dukung (anggota)
async function saveBuktiDukung() {
    const jenis = document.getElementById('bukti-jenis').value;
    const nilai = document.getElementById('bukti-nilai').value.trim();
    
    if (!jenis || !nilai) {
        M.toast({html: 'Jenis dan nilai bukti harus diisi'});
        return;
    }
    
    try {
        // Tampilkan loading
        const button = document.getElementById('save-bukti-btn');
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="material-icons left">loop</i> Menyimpan...';
        
        // Kirim data ke server
        const response = await fetch('https://script.google.com/macros/s/AKfycbwQ5w6gV5J7QXdJ9ZQJQ9Q5ZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZ/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'saveBuktiDukung',
                userId: currentUser.id,
                taskId: currentTaskId,
                jenis: jenis,
                nilai: nilai
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            M.toast({html: 'Bukti berhasil disimpan'});
            
            // Perbarui data
            await loadDashboardData();
            
            // Tutup modal
            const modalInstance = M.Modal.getInstance(document.getElementById('detailModal'));
            modalInstance.close();
        } else {
            throw new Error(data.message || 'Gagal menyimpan bukti');
        }
    } catch (error) {
        console.error('Error saving bukti:', error);
        M.toast({html: `Gagal menyimpan bukti: ${error.message}`});
    } finally {
        // Reset tombol
        const button = document.getElementById('save-bukti-btn');
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="material-icons left">save</i> Simpan Bukti';
        }
    }
}

// Fungsi untuk menyimpan penilaian ketua pilar
async function savePenilaianKetua() {
    const status = document.getElementById('ketua-status').value;
    const catatan = document.getElementById('ketua-catatan').value.trim();
    
    if (!status) {
        M.toast({html: 'Status penilaian harus dipilih'});
        return;
    }
    
    try {
        // Tampilkan loading
        const button = document.getElementById('save-ketua-status-btn');
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="material-icons left">loop</i> Menyimpan...';
        
        // Kirim data ke server
        const response = await fetch('https://script.google.com/macros/s/AKfycbwQ5w6gV5J7QXdJ9ZQJQ9Q5ZQZQZQZQZQZQZQZQZQZQZQZQZQZQZ/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'savePenilaianKetua',
                userId: currentUser.id,
                taskId: currentTaskId,
                status: status,
                catatan: catatan
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            M.toast({html: 'Penilaian berhasil disimpan'});
            
            // Perbarui data
            await loadDashboardData();
            
            // Tutup modal
            const modalInstance = M.Modal.getInstance(document.getElementById('detailModal'));
            modalInstance.close();
        } else {
            throw new Error(data.message || 'Gagal menyimpan penilaian');
        }
    } catch (error) {
        console.error('Error saving penilaian:', error);
        M.toast({html: `Gagal menyimpan penilaian: ${error.message}`});
    } finally {
        // Reset tombol
        const button = document.getElementById('save-ketua-status-btn');
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="material-icons left">check</i> Simpan Penilaian';
        }
    }
}

// Fungsi untuk menyimpan verifikasi admin
async function saveVerifikasiAdmin() {
    const status = document.getElementById('admin-status').value;
    const catatan = document.getElementById('admin-catatan').value.trim();
    
    if (!status) {
        M.toast({html: 'Status verifikasi harus dipilih'});
        return;
    }
    
    try {
        // Tampilkan loading
        const button = document.getElementById('save-admin-status-btn');
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="material-icons left">loop</i> Menyimpan...';
        
        // Kirim data ke server
        const response = await fetch('https://script.google.com/macros/s/AKfycbwQ5w6gV5J7QXdJ9ZQJQ9Q5ZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZ/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'saveVerifikasiAdmin',
                userId: currentUser.id,
                taskId: currentTaskId,
                status: status,
                catatan: catatan
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            M.toast({html: 'Verifikasi berhasil disimpan'});
            
            // Perbarui data
            await loadDashboardData();
            
            // Tutup modal
            const modalInstance = M.Modal.getInstance(document.getElementById('detailModal'));
            modalInstance.close();
        } else {
            throw new Error(data.message || 'Gagal menyimpan verifikasi');
        }
    } catch (error) {
        console.error('Error saving verifikasi:', error);
        M.toast({html: `Gagal menyimpan verifikasi: ${error.message}`});
    } finally {
        // Reset tombol
        const button = document.getElementById('save-admin-status-btn');
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="material-icons left">verified</i> Simpan Verifikasi';
        }
    }
}

// Fungsi untuk memuat data tugas ZI
async function loadTugasZiData() {
    // Implementasi untuk memuat data tugas ZI
    const container = document.getElementById('tugas-zi-container');
    if (container) {
        container.innerHTML = '<p class="center-align">Fitur ini akan segera hadir</p>';
    }
}

// Fungsi untuk memuat data link pendukung
async function loadLinkPendukungData() {
    // Implementasi untuk memuat data link pendukung
    const container = document.getElementById('link-pendukung-container');
    if (container) {
        container.innerHTML = '<p class="center-align">Fitur ini akan segera hadir</p>';
    }
}

// Variabel untuk menyimpan ID tugas yang sedang aktif
let currentTaskId = null;
