// script.js

document.addEventListener('DOMContentLoaded', function() {
    // --- KONFIGURASI PENTING ---
    // Ganti dengan URL Web App Google Apps Script Anda
    const GAS_APP_URL = 'YOUR_GAS_APP_URL'; 
    // Ganti dengan API Key yang Anda atur di Script Properties
    const API_KEY = 'YOUR_API_KEY';

    // --- State Aplikasi ---
    let currentUser = null;
    let dashboardData = [];
    let tugasSayaData = [];
    let currentPage = 1;
    const rowsPerPage = 10;

    // --- Elemen DOM ---
    const loginPage = document.getElementById('login-page');
    const mainContent = document.getElementById('main-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const userInfo = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    
    const dashboardView = document.getElementById('dashboard-view');
    const tugasSayaView = document.getElementById('tugas-saya-view');
    const linkPendukungView = document.getElementById('link-pendukung-view');

    const dashboardLink = document.getElementById('dashboard-link');
    const tugasSayaLink = document.getElementById('tugas-saya-link');
    const linkPendukungLink = document.getElementById('link-pendukung-link');

    const dashboardTableBody = document.getElementById('dashboard-table-body');
    const tugasSayaContainer = document.getElementById('tugas-saya-container');
    const linkPendukungBody = document.getElementById('link-pendukung-body');

    const searchDashboard = document.getElementById('search-dashboard');
    const filterPilar = document.getElementById('filter-pilar');
    const filterStatusAnggota = document.getElementById('filter-status-anggota');
    const dashboardPagination = document.getElementById('dashboard-pagination');

    // Modal Elements
    const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    let activeTask = null; // Menyimpan data tugas yang sedang aktif di modal

    // --- Fungsi Helper untuk API Call ---
    async function callGasApi(action, method = 'GET', payload = {}) {
        let url = `${GAS_APP_URL}?action=${action}`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
                'x-api-key': API_KEY
            },
            redirect: 'follow'
        };

        if (method === 'POST') {
            options.body = JSON.stringify({ action, payload });
        } else if (method === 'GET' && Object.keys(payload).length > 0) {
            // Menambahkan parameter GET dari payload
            const queryParams = new URLSearchParams(payload).toString();
            url += `&${queryParams}`;
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error calling GAS API:', error);
            alert('Terjadi kesalahan saat berkomunikasi dengan server.');
            return { success: false, message: error.message };
        }
    }

    // --- Logika Aplikasi ---
    function init() {
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            showMainContent();
        } else {
            showLoginPage();
        }

        loginForm.addEventListener('submit', handleLogin);
        logoutBtn.addEventListener('click', handleLogout);
        dashboardLink.addEventListener('click', () => showView('dashboard'));
        tugasSayaLink.addEventListener('click', () => showView('tugas-saya'));
        linkPendukungLink.addEventListener('click', () => showView('link-pendukung'));

        searchDashboard.addEventListener('input', applyDashboardFilters);
        filterPilar.addEventListener('change', applyDashboardFilters);
        filterStatusAnggota.addEventListener('change', applyDashboardFilters);
    }

    async function handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const result = await callGasApi('login', 'POST', { username, password });

        if (result && result.success) {
            currentUser = result;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMainContent();
        } else {
            loginError.textContent = result.message || 'Login gagal.';
        }
    }

    function handleLogout() {
        currentUser = null;
        sessionStorage.removeItem('currentUser');
        showLoginPage();
    }

    function showLoginPage() {
        loginPage.classList.remove('d-none');
        mainContent.classList.add('d-none');
    }

    function showMainContent() {
        loginPage.classList.add('d-none');
        mainContent.classList.remove('d-none');
        displayUserInfo();
        showView('dashboard'); // Tampilkan dashboard sebagai default
    }

    function displayUserInfo() {
        if (currentUser) {
            userInfo.textContent = `Selamat datang, ${currentUser.nama} (${currentUser.role})`;
        }
    }

    function showView(viewName) {
        // Sembunyikan semua view
        dashboardView.classList.add('d-none');
        tugasSayaView.classList.add('d-none');
        linkPendukungView.classList.add('d-none');

        // Hapus kelas active dari semua link nav
        document.querySelectorAll('#sidebar .nav-link').forEach(link => link.classList.remove('active'));

        // Tampilkan view yang dipilih dan set link active
        if (viewName === 'dashboard') {
            dashboardView.classList.remove('d-none');
            dashboardLink.classList.add('active');
            loadDashboard();
        } else if (viewName === 'tugas-saya') {
            tugasSayaView.classList.remove('d-none');
            tugasSayaLink.classList.add('active');
            loadTugasSaya();
        } else if (viewName === 'link-pendukung') {
            linkPendukungView.classList.remove('d-none');
            linkPendukungLink.classList.add('active');
            loadLinkPendukung();
        }
    }

    // --- Logika Dashboard ---
    async function loadDashboard() {
        const result = await callGasApi('getDashboardTugasStatus', 'GET', { username: currentUser.username });
        if (Array.isArray(result)) {
            dashboardData = result;
            populatePilarFilter(result);
            applyDashboardFilters();
        } else {
            console.error("Failed to load dashboard data:", result);
            dashboardTableBody.innerHTML = '<tr><td colspan="8">Gagal memuat data.</td></tr>';
        }
    }

    function populatePilarFilter(data) {
        const pilars = [...new Set(data.map(item => item.pilar))];
        filterPilar.innerHTML = '<option value="">Semua Pilar</option>';
        pilars.forEach(pilar => {
            const option = document.createElement('option');
            option.value = pilar;
            option.textContent = pilar;
            filterPilar.appendChild(option);
        });
    }

    function applyDashboardFilters() {
        const searchTerm = searchDashboard.value.toLowerCase();
        const selectedPilar = filterPilar.value;
        const selectedStatus = filterStatusAnggota.value;

        const filteredData = dashboardData.filter(item => {
            const matchesSearch = item.nama.toLowerCase().includes(searchTerm) || item.namaLengkap.toLowerCase().includes(searchTerm);
            const matchesPilar = !selectedPilar || item.pilar === selectedPilar;
            const matchesStatus = !selectedStatus || item.statusAnggota === selectedStatus;
            return matchesSearch && matchesPilar && matchesStatus;
        });

        currentPage = 1;
        displayDashboardData(filteredData);
        setupDashboardPagination(filteredData);
    }

    function displayDashboardData(data) {
        dashboardTableBody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedData = data.slice(start, end);

        if (paginatedData.length === 0) {
            dashboardTableBody.innerHTML = '<tr><td colspan="8">Tidak ada data yang cocok.</td></tr>';
            return;
        }

        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.kode}</td>
                <td>${item.pilar}</td>
                <td>${item.nama}</td>
                <td>${item.namaLengkap}</td>
                <td><span class="badge-status ${item.statusAnggota === 'Sedang dikerjakan' ? 'badge-disetujui' : 'badge-kosong'}">${item.statusAnggota}</span></td>
                <td>${formatStatus(item.statusKetua)}</td>
                <td>${formatStatus(item.statusAdmin)}</td>
                <td><button class="btn btn-primary btn-sm btn-aksi" data-kode="${item.kode}" data-username="${item.tugasUsername}">Detail</button></td>
            `;
            dashboardTableBody.appendChild(row);
        });

        // Tambah event listener untuk tombol detail
        document.querySelectorAll('.btn-aksi').forEach(button => {
            button.addEventListener('click', (e) => {
                const kode = e.target.getAttribute('data-kode');
                const username = e.target.getAttribute('data-username');
                openDetailModal(kode, username);
            });
        });
    }

    function formatStatus(status) {
        if (!status) return `<span class="badge-status badge-kosong">Kosong</span>`;
        let badgeClass = '';
        if (status === 'Disetujui' || status === 'Terverifikasi') badgeClass = 'badge-disetujui';
        else if (status === 'Ditolak') badgeClass = 'badge-ditolak';
        else badgeClass = 'badge-menunggu';
        return `<span class="badge-status ${badgeClass}">${status}</span>`;
    }

    function setupDashboardPagination(data) {
        dashboardPagination.innerHTML = '';
        const pageCount = Math.ceil(data.length / rowsPerPage);

        for (let i = 1; i <= pageCount; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            const a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            a.innerText = i;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                displayDashboardData(data);
                // Update active class on pagination
                document.querySelectorAll('#dashboard-pagination .page-item').forEach(item => item.classList.remove('active'));
                li.classList.add('active');
            });
            li.appendChild(a);
            dashboardPagination.appendChild(li);
        }
    }

    // --- Logika Tugas Saya ---
    async function loadTugasSaya() {
        const result = await callGasApi('getMappingTugasForUser', 'GET', { username: currentUser.username });
        if (Array.isArray(result)) {
            tugasSayaData = result;
            displayTugasSaya(result);
        } else {
            console.error("Failed to load tugas saya data:", result);
            tugasSayaContainer.innerHTML = '<p>Gagal memuat data tugas.</p>';
        }
    }

    function displayTugasSaya(data) {
        tugasSayaContainer.innerHTML = '';
        if (data.length === 0) {
            tugasSayaContainer.innerHTML = '<p>Anda tidak memiliki tugas yang ditugaskan.</p>';
            return;
        }

        data.forEach(tugas => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-header">${tugas['Nama Tugas']}</div>
                <div class="card-body">
                    <p><strong>Kode:</strong> ${tugas['Kode Hirarki']}</p>
                    <p><strong>Pilar:</strong> ${tugas.Pilar}</p>
                    <p><strong>Deskripsi:</strong> ${tugas.Deskripsi}</p>
                    <button class="btn btn-primary btn-aksi" data-kode="${tugas['Kode Hirarki']}" data-username="${tugas.Username}">Kerjakan</button>
                </div>
            `;
            tugasSayaContainer.appendChild(card);
        });

        // Tambah event listener untuk tombol kerjakan
        tugasSayaContainer.querySelectorAll('.btn-aksi').forEach(button => {
            button.addEventListener('click', (e) => {
                const kode = e.target.getAttribute('data-kode');
                const username = e.target.getAttribute('data-username');
                openDetailModal(kode, username);
            });
        });
    }

    // --- Logika Link Pendukung ---
    async function loadLinkPendukung() {
        const result = await callGasApi('getLinkPendukung', 'GET');
        if (Array.isArray(result)) {
            linkPendukungBody.innerHTML = '';
            if (result.length === 0) {
                linkPendukungBody.innerHTML = '<tr><td colspan="2">Tidak ada link pendukung.</td></tr>';
                return;
            }
            result.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.deskripsi}</td>
                    <td><a href="${item.link}" target="_blank">${item.link}</a></td>
                `;
                linkPendukungBody.appendChild(row);
            });
        } else {
            linkPendukungBody.innerHTML = '<tr><td colspan="2">Gagal memuat data.</td></tr>';
        }
    }

    // --- Logika Modal Detail ---
    async function openDetailModal(kodeHirarki, username) {
        // Cari tugas dari dashboardData atau tugasSayaData
        activeTask = dashboardData.find(t => t.kode === kodeHirarki && t.tugasUsername === username) || 
                     tugasSayaData.find(t => t['Kode Hirarki'] === kodeHirarki && t.Username === username);
        
        if (!activeTask) {
            alert('Data tugas tidak ditemukan!');
            return;
        }

        // Ambil data bukti dukung terbaru
        const buktiDukung = await callGasApi('getBuktiDukung', 'GET', { username: username, kodeHirarki: kodeHirarki });

        // Isi data umum di modal
        document.getElementById('modal-kode').textContent = activeTask.kode || activeTask['Kode Hirarki'];
        document.getElementById('modal-nama-tugas').textContent = activeTask.nama || activeTask['Nama Tugas'];
        document.getElementById('modal-pic').textContent = activeTask.namaLengkap || currentUser.nama;
        document.getElementById('modal-link-referensi').href = activeTask.linkReferensiMelawi || '#';
        document.getElementById('modal-link-gdrive').href = activeTask.linkGDriveBukti || '#';

        // Reset semua section
        document.getElementById('anggota-form-section').style.display = 'none';
        document.getElementById('ketua-pilar-section').style.display = 'none';
        document.getElementById('admin-section').style.display = 'none';

        // Tampilkan section berdasarkan role
        const userRole = currentUser.role.toLowerCase();

        // 1. Section Anggota
        if (userRole === 'anggota' && currentUser.username === username) {
            document.getElementById('anggota-form-section').style.display = 'block';
            document.getElementById('bukti-jenis').value = buktiDukung.jenis || 'Link';
            document.getElementById('bukti-nilai').value = buktiDukung.nilai || '';
        }

        // 2. Section Ketua Pilar
        if (userRole === 'ketua pilar' && currentUser.pilar === activeTask.pilar) {
            document.getElementById('ketua-pilar-section').style.display = 'block';
            document.getElementById('modal-status-anggota').textContent = activeTask.statusAnggota;
            document.getElementById('modal-bukti-detail').innerHTML = buktiDukung.nilai ? `<a href="${buktiDukung.nilai}" target="_blank">${buktiDukung.nilai}</a>` : 'Belum ada';
            document.getElementById('ketua-status').value = buktiDukung.statusKetua || '';
            document.getElementById('ketua-catatan').value = buktiDukung.catatanKetua || '';
        }

        // 3. Section Admin
        if (userRole === 'admin') {
            document.getElementById('admin-section').style.display = 'block';
            document.getElementById('modal-status-ketua').textContent = buktiDukung.statusKetua || 'Belum dinilai';
            document.getElementById('modal-catatan-ketua').textContent = buktiDukung.catatanKetua || '-';
            document.getElementById('admin-status').value = buktiDukung.statusAdmin || '';
            document.getElementById('admin-catatan').value = buktiDukung.catatanAdmin || '';
        }

        detailModal.show();
    }

    // Event listeners untuk tombol simpan di dalam modal
    document.getElementById('save-bukti-btn').addEventListener('click', async () => {
        const payload = {
            username: activeTask.tugasUsername,
            kodeHirarki: activeTask.kode,
            jenis: document.getElementById('bukti-jenis').value,
            nilai: document.getElementById('bukti-nilai').value
        };
        const result = await callGasApi('saveBuktiDukung', 'POST', payload);
        if (result.success) {
            alert('Bukti dukung berhasil disimpan!');
            detailModal.hide();
            loadDashboard(); // Refresh data
            loadTugasSaya();
        } else {
            alert('Gagal menyimpan: ' + result.message);
        }
    });

    document.getElementById('save-ketua-status-btn').addEventListener('click', async () => {
        const payload = {
            username: activeTask.tugasUsername,
            kodeHirarki: activeTask.kode,
            role: 'ketua',
            status: document.getElementById('ketua-status').value,
            catatan: document.getElementById('ketua-catatan').value
        };
        const result = await callGasApi('setStatusPenilaian', 'POST', payload);
        if (result.success) {
            alert('Penilaian berhasil disimpan!');
            detailModal.hide();
            loadDashboard(); // Refresh data
        } else {
            alert('Gagal menyimpan: ' + result.message);
        }
    });

    document.getElementById('save-admin-status-btn').addEventListener('click', async () => {
        const payload = {
            username: activeTask.tugasUsername,
            kodeHirarki: activeTask.kode,
            role: 'admin',
            status: document.getElementById('admin-status').value,
            catatan: document.getElementById('admin-catatan').value
        };
        const result = await callGasApi('setStatusPenilaian', 'POST', payload);
        if (result.success) {
            alert('Verifikasi berhasil disimpan!');
            detailModal.hide();
            loadDashboard(); // Refresh data
        } else {
            alert('Gagal menyimpan: ' + result.message);
        }
    });

    // --- Inisialisasi Aplikasi ---
    init();
});
