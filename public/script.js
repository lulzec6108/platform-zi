// script.js (FINAL)

document.addEventListener('DOMContentLoaded', function() {
    // --- Variabel Global & State ---
    // Variabel akan diinisialisasi di dalam fungsi untuk memastikan referensi yang 'segar'
    let loginListenerAttached = false;
    let mainContentLoaded = false;
    let activeTask = null;
    let tugasModal;

    // --- Fungsi API Call ---
    async function callGasApi(action, method = 'GET', payload = {}) {
        showLoader(); // Tampilkan loader
        const url = `/.netlify/functions/proxy`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const body = { action, payload };

        if (method === 'POST') {
            options.body = JSON.stringify(body);
        } else { // GET
            // Untuk GET, kita tidak mengirim body, parameter dikirim oleh proxy
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                return { success: false, message: `Error: ${response.statusText}` };
            }
            return await response.json();
        } catch (error) {
            return { success: false, message: 'Tidak dapat terhubung ke server.' };
        } finally {
            hideLoader(); // Sembunyikan loader
        }
    }

    // --- Fungsi UI & Kontrol State ---
    function showLogin() {
        const loginView = document.getElementById('login-page');
        const mainContentView = document.getElementById('main-content');
        if (loginView) loginView.classList.remove('d-none');
        if (mainContentView) mainContentView.classList.add('d-none');
        sessionStorage.removeItem('zi_user');
        setupLoginListeners();
    }

    function showMainContent(user) {
        try {
            const loginView = document.getElementById('login-page');
            const mainContentView = document.getElementById('main-content');
            const userInfo = document.getElementById('user-info');

            if (userInfo) {
                userInfo.textContent = `${user.nama} (${user.pilar})`;
            }

            if (loginView) loginView.classList.add('d-none');
            if (mainContentView) mainContentView.classList.remove('d-none');
            
            setupMainContentListeners();
            const dashboardElement = document.getElementById('dashboard-view');
            if(dashboardElement) showView(dashboardElement);
            loadDashboard(); 

        } catch (error) {
            const loginError = document.getElementById('login-error');
            if(loginError) {
                loginError.textContent = `Terjadi error setelah login: ${error.message}`;
            }
            showLogin();
        }
    }

    // --- Navigasi & Tampilan ---
    function showView(viewToShow) {
        const allViews = [
            document.getElementById('dashboard-view'),
            document.getElementById('tugas-saya-view'), 
            document.getElementById('link-pendukung-view')
        ];

        allViews.forEach(v => {
            if (v) v.style.display = 'none';
        });

        if (viewToShow) viewToShow.style.display = 'block';
    }

    // --- Inisialisasi Komponen Materialize ---
    function initMaterialize() {
        const sidenavs = document.querySelectorAll('.sidenav');
        M.Sidenav.init(sidenavs);

        const modals = document.querySelectorAll('.modal');
        M.Modal.init(modals);

        const selects = document.querySelectorAll('select');
        M.FormSelect.init(selects);
    }

    // --- Setup Event Listeners ---
    function setupLoginListeners() {
        const loginForm = document.getElementById('login-form');
        const loginError = document.getElementById('login-error');

        if (loginForm && !loginListenerAttached) {
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                if (loginError) loginError.textContent = '';
                const username = loginForm.username.value;
                const password = loginForm.password.value;

                const result = await callGasApi('login', 'POST', { username, password });

                if (result && result.success && result.user) {
                    sessionStorage.setItem('zi_user', JSON.stringify(result.user));
                    showMainContent(result.user);
                } else {
                    if (loginError) {
                        loginError.textContent = result ? result.message : 'Login gagal!';
                    }
                }
            });
            loginListenerAttached = true;
        }

        const logoutBtn = document.getElementById('logout-btn'); 
        if (logoutBtn) logoutBtn.addEventListener('click', showLogin);

        // Tambahkan listener untuk tombol logout di mobile
        const logoutBtnMobile = document.getElementById('logout-btn-mobile');
        if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', showLogin);
    }

    function setupMainContentListeners() {
        if (mainContentLoaded) return;

        const logoutButton = document.getElementById('logout-btn'); 
        if (logoutButton) {
            logoutButton.addEventListener('click', function() {
                showLogin();
            });
        }

        const navDashboard = document.getElementById('dashboard-link');
        const navTugas = document.getElementById('tugas-saya-link');
        const navLinkPendukung = document.getElementById('link-pendukung-link');

        if (navDashboard) {
            navDashboard.addEventListener('click', (e) => { 
                e.preventDefault(); 
                const view = document.getElementById('dashboard-view');
                showView(view); 
                loadDashboard(); 
            });
        }
        if (navTugas) {
            navTugas.addEventListener('click', (e) => { 
                e.preventDefault(); 
                const view = document.getElementById('tugas-saya-view');
                showView(view); 
                loadTugas(); 
            });
        }
        if (navLinkPendukung) {
            navLinkPendukung.addEventListener('click', (e) => { 
                e.preventDefault(); 
                const view = document.getElementById('link-pendukung-view');
                showView(view); 
                loadLinkPendukung(); 
            });
        }

        const modalSubmitButton = document.getElementById('modalSubmitButton');

        if (modalSubmitButton) {
            modalSubmitButton.addEventListener('click', async () => {
                if (!activeTask) return;
        
                const payload = {
                    id: activeTask.id,
                    status: modalUpdateStatus.value,
                    link: modalUpdateLink.value,
                    catatan: modalUpdateCatatan.value
                };

                const result = await callGasApi('updateTugas', 'POST', payload);
                if (result && result.success) {
                    tugasModal.hide();
                    loadTugas(); 
                    loadDashboard(); 
                } else {
                    alert('Gagal memperbarui tugas.');
                }
            });
        }
        mainContentLoaded = true;
    }

    // --- Memuat Data ---
    async function loadDashboard() {
        showLoader(true);
        const userString = sessionStorage.getItem('zi_user');
        if (!userString) {
            console.error("Tidak dapat memuat dashboard, user tidak ditemukan di session.");
            hideLoader();
            return;
        }
        const user = JSON.parse(userString);

        const response = await callGasApi('getDashboardData', 'POST', { username: user.username });
        const tableBody = document.getElementById('dashboard-table-body');

        if (!tableBody) {
            hideLoader();
            return;
        }

        tableBody.innerHTML = ''; // Kosongkan tabel sebelum mengisi

        if (response.success && response.data) {
            // Fungsi untuk memberi warna pada status
            const getStatusBadge = (status) => {
                let color = 'grey'; // Default
                if (status.toLowerCase().includes('setuju') || status.toLowerCase().includes('sudah')) color = 'green';
                if (status.toLowerCase().includes('revisi')) color = 'orange';
                if (status.toLowerCase().includes('belum') || status.toLowerCase().includes('n/a')) color = 'red';
                return `<span class="new badge ${color}" data-badge-caption="${status}"></span>`;
            };

            response.data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item['Kode']}</td>
                    <td>${item['Pilar']}</td>
                    <td>${item['Nama Tugas']}</td>
                    <td>${item['PIC']}</td>
                    <td>${getStatusBadge(item['Status Pengerjaan'])}</td>
                    <td>${getStatusBadge(item['Status Ketua Pilar'])}</td>
                    <td>${getStatusBadge(item['Status Admin'])}</td>
                    <td><a class="waves-effect waves-light btn-small">Detail</a></td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="8" class="center-align">Gagal memuat data atau tidak ada data.</td></tr>';
        }
        hideLoader();
    }

    async function loadTugas() {
        const userString = sessionStorage.getItem('zi_user');
        const user = JSON.parse(userString);
        const result = await callGasApi('getTugas', 'GET', { username: user.username, role: user.role, pilar: user.pilar });

        const tugasTableBody = document.getElementById('tugas-table-body');
        tugasTableBody.innerHTML = '';
        if (result && result.success) {
            result.data.forEach(tugas => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${tugas.pilar}</td>
                    <td>${tugas.tugas}</td>
                    <td>${tugas.pic}</td>
                    <td>${new Date(tugas.deadline).toLocaleDateString('id-ID')}</td>
                    <td><span class="badge bg-${getStatusColor(tugas.status)}">${tugas.status}</span></td>
                    <td><button class="btn btn-primary btn-sm btn-lihat" data-id="${tugas.id}">Lihat</button></td>
                `;
                tugasTableBody.appendChild(row);
            });

            document.querySelectorAll('.btn-lihat').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const detailResult = await callGasApi('getTugasDetail', 'GET', { id: id });
                    if (detailResult && detailResult.success) {
                        activeTask = detailResult.data;
                        openTugasModal(activeTask);
                    }
                });
            });
        }
    }

    async function loadLinkPendukung() {
        const result = await callGasApi('getLinkPendukung', 'GET');
        const linkPendukungTableBody = document.getElementById('link-pendukung-table-body');
        linkPendukungTableBody.innerHTML = '';
        if (result && result.success) {
            result.data.forEach(link => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${link.deskripsi}</td>
                    <td><a href="${link.link}" target="_blank">Buka Link</a></td>
                `;
                linkPendukungTableBody.appendChild(row);
            });
        }
    }

    // --- Fungsi Utilitas ---
    function showLoader() {
        const loader = document.getElementById('loader-overlay');
        if (loader) loader.classList.remove('d-none');
    }

    function hideLoader() {
        const loader = document.getElementById('loader-overlay');
        if (loader) loader.classList.add('d-none');
    }

    // --- Modal Tugas ---
    function openTugasModal(tugas) {
        const userString = sessionStorage.getItem('zi_user');
        const user = JSON.parse(userString);

        // Dapatkan instance modal Materialize
        const modalElement = document.getElementById('detailModal');
        const modalInstance = M.Modal.getInstance(modalElement);

        // Mengisi data umum
        document.getElementById('modal-kode').textContent = tugas.Kode || '-';
        document.getElementById('modal-nama-tugas').textContent = tugas['Nama Tugas'] || '-';
        document.getElementById('modal-pic').textContent = tugas.PIC || '-';

        const linkReferensi = document.getElementById('modal-link-referensi');
        if (tugas.linkReferensi) {
            linkReferensi.href = tugas.linkReferensi;
            linkReferensi.textContent = 'Lihat Referensi';
        } else {
            linkReferensi.href = '#';
            linkReferensi.textContent = 'Tidak tersedia';
        }

        const linkGDrive = document.getElementById('modal-link-gdrive');
        if (tugas.linkGDrive) {
            linkGDrive.href = tugas.linkGDrive;
            linkGDrive.textContent = 'Lihat Bukti';
        } else {
            linkGDrive.href = '#';
            linkGDrive.textContent = 'Belum diunggah';
        }

        // Reset dan tampilkan/sembunyikan section berdasarkan peran
        const anggotaSection = document.getElementById('anggota-form-section');
        const ketuaSection = document.getElementById('ketua-pilar-section');
        const adminSection = document.getElementById('admin-section');

        anggotaSection.style.display = 'none';
        ketuaSection.style.display = 'none';
        adminSection.style.display = 'none';

        const userRole = (user.role || '').toLowerCase();

        if (userRole === 'anggota' && user.username === tugas.tugasUsername) {
            anggotaSection.style.display = 'block';
            // Reset form
            document.getElementById('bukti-jenis').value = "";
            document.getElementById('bukti-nilai').value = "";
            M.FormSelect.init(document.getElementById('bukti-jenis')); // Re-init select
        }

        if (userRole === 'ketua pilar' && user.pilar === tugas.Pilar) {
            ketuaSection.style.display = 'block';
            document.getElementById('modal-status-anggota').textContent = tugas['Status Pengerjaan'] || '-';
            document.getElementById('modal-bukti-detail').textContent = '...'; // Anda mungkin perlu menambahkan data ini
            document.getElementById('ketua-status').value = tugas['Status Ketua Pilar'] || "";
            document.getElementById('ketua-catatan').value = tugas.catatanKetua || '';
            M.FormSelect.init(document.getElementById('ketua-status')); // Re-init select
        }

        if (userRole === 'admin') {
            adminSection.style.display = 'block';
            document.getElementById('modal-status-ketua').textContent = tugas['Status Ketua Pilar'] || '-';
            document.getElementById('modal-catatan-ketua').textContent = tugas.catatanKetua || '-';
            document.getElementById('admin-status').value = tugas['Status Admin'] || "";
            document.getElementById('admin-catatan').value = tugas.catatanAdmin || '';
            M.FormSelect.init(document.getElementById('admin-status')); // Re-init select
        }

        // Buka modal
        modalInstance.open();
    }

    function getStatusColor(status) {
        switch (status) {
            case 'Selesai': return 'success';
            case 'Dalam Progress': return 'warning';
            case 'Belum Dikerjakan': return 'danger';
            default: return 'secondary';
        }
    }

    // --- Inisialisasi Aplikasi ---
    function init() {
        initMaterialize(); // Panggil inisialisasi di sini
        const userString = sessionStorage.getItem('zi_user');
        if (userString) {
            const user = JSON.parse(userString);
            showMainContent(user);
        } else {
            showLogin();
        }
    }

    init();
});
