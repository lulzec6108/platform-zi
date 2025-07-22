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
        sessionStorage.removeItem('user');
        setupLoginListeners();
    }

    function showMainContent() {
        try {
            const loginView = document.getElementById('login-page');
            const mainContentView = document.getElementById('main-content');
            const userInfo = document.getElementById('user-info');

            const user = JSON.parse(sessionStorage.getItem('user'));
            if (!user) {
                showLogin();
                return;
            }

            if (userInfo) userInfo.textContent = `${user.nama} (${user.pilar})`;

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

                if (result && result.success) {
                    sessionStorage.setItem('user', JSON.stringify(result));
                    showMainContent();
                } else {
                    if (loginError) {
                        loginError.textContent = result ? result.message : 'Login gagal!';
                    }
                }
            });
            loginListenerAttached = true;
        }
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
        const response = await callGasApi('getDashboardData', 'GET');
        const tableBody = document.getElementById('dashboard-table-body'); // Asumsi dari HTML baru

        if (!tableBody) return;
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
    }

    async function loadTugas() {
        const user = JSON.parse(sessionStorage.getItem('user'));
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
        const user = JSON.parse(sessionStorage.getItem('user'));

        const modalTugasJudul = document.getElementById('modalTugasJudul');
        const modalTugasDeskripsi = document.getElementById('modalTugasDeskripsi');
        const modalTugasDeadline = document.getElementById('modalTugasDeadline');
        const modalTugasStatus = document.getElementById('modalTugasStatus');
        const modalTugasLink = document.getElementById('modalTugasLink');
        const modalTugasPilar = document.getElementById('modalTugasPilar');
        const modalTugasPIC = document.getElementById('modalTugasPIC');
        const modalCatatanPIC = document.getElementById('modalCatatanPIC');
        const modalUpdateForm = document.getElementById('modal-update-form');
        const modalUpdateStatus = document.getElementById('modalUpdateStatus');
        const modalUpdateLink = document.getElementById('modalUpdateLink');
        const modalUpdateCatatan = document.getElementById('modalUpdateCatatan');

        modalTugasJudul.textContent = tugas.tugas;
        modalTugasDeskripsi.textContent = tugas.deskripsi;
        modalTugasDeadline.textContent = new Date(tugas.deadline).toLocaleDateString('id-ID');
        modalTugasStatus.innerHTML = `<span class="badge bg-${getStatusColor(tugas.status)}">${tugas.status}</span>`;
        modalTugasLink.innerHTML = tugas.link ? `<a href="${tugas.link}" target="_blank">Buka Link</a>` : 'Tidak ada';
        modalTugasPilar.textContent = tugas.pilar;
        modalTugasPIC.textContent = tugas.pic;
        modalCatatanPIC.textContent = tugas.catatan || 'Tidak ada catatan.';

        // Tampilkan form update hanya jika user adalah PIC dari tugas tersebut
        if (user.username === tugas.pic) {
            modalUpdateForm.style.display = 'block';
            modalUpdateStatus.value = tugas.status;
            modalUpdateLink.value = tugas.link || '';
            modalUpdateCatatan.value = tugas.catatan || '';
        } else {
            modalUpdateForm.style.display = 'none';
        }

        if (!tugasModal) { 
            tugasModal = new bootstrap.Modal(document.getElementById('tugasModal'));
        }
        tugasModal.show();
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
        const user = sessionStorage.getItem('user');
        if (user) {
            showMainContent();
        } else {
            showLogin();
        }
    }

    init();
});
