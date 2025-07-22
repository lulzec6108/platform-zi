// script.js (FINAL)

document.addEventListener('DOMContentLoaded', function() {
    // --- Variabel Global & State ---
    const loginView = document.getElementById('login-section');
    const mainContentView = document.getElementById('main-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const namaUser = document.getElementById('nama-user');
    const pilarUser = document.getElementById('pilar-user');
    const logoutButton = document.getElementById('logout-button');

    const dashboardView = document.getElementById('dashboard-view');
    const tugasView = document.getElementById('tugas-view');
    const linkPendukungView = document.getElementById('link-pendukung-view');

    const navDashboard = document.getElementById('nav-dashboard');
    const navTugas = document.getElementById('nav-tugas');
    const navLinkPendukung = document.getElementById('nav-link-pendukung');

    const tugasTableBody = document.getElementById('tugas-table-body');
    const linkPendukungTableBody = document.getElementById('link-pendukung-table-body');
    
    let tugasModal; 
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
    const modalSubmitButton = document.getElementById('modalSubmitButton');

    let activeTask = null; 

    let loginListenerAttached = false;
    let mainContentLoaded = false;

    // --- Fungsi API Call ---
    async function callGasApi(action, method = 'GET', payload = {}) {
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
        }
    }

    // --- Fungsi UI & Kontrol State ---
    function showLogin() {
        if (loginView) loginView.style.display = 'block';
        if (mainContentView) mainContentView.style.display = 'none';
        sessionStorage.removeItem('user');
        setupLoginListeners();
    }

    function showMainContent() {
        try {
            const user = JSON.parse(sessionStorage.getItem('user'));
            if (!user) {
                showLogin();
                return;
            }

            // PENTING: Update UI dengan info user
            if (namaUser) namaUser.textContent = user.nama;
            if (pilarUser) pilarUser.textContent = user.pilar;

            if (loginView) loginView.style.display = 'none';
            if (mainContentView) mainContentView.style.display = 'block';
            
            setupMainContentListeners();
            loadDashboard();
        } catch (error) {
            // Tampilkan error apapun yang terjadi ke layar!
            if(loginError) {
                loginError.textContent = `Terjadi error setelah login: ${error.message}`;
            }
            // Tampilkan kembali form login jika terjadi error fatal
            showLogin();
        }
    }

    // --- Navigasi & Tampilan ---
    function showView(view) {
        [dashboardView, tugasView, linkPendukungView].forEach(v => v.style.display = 'none');
        view.style.display = 'block';
    }

    // --- Setup Event Listeners ---
    function setupLoginListeners() {
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

        if (logoutButton) {
            logoutButton.addEventListener('click', function() {
                showLogin();
            });
        }

        if (navDashboard) {
            navDashboard.addEventListener('click', (e) => { e.preventDefault(); showView(dashboardView); loadDashboard(); });
        }
        if (navTugas) {
            navTugas.addEventListener('click', (e) => { e.preventDefault(); showView(tugasView); loadTugas(); });
        }
        if (navLinkPendukung) {
            navLinkPendukung.addEventListener('click', (e) => { e.preventDefault(); showView(linkPendukungView); loadLinkPendukung(); });
        }

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
        const user = JSON.parse(sessionStorage.getItem('user'));
        const result = await callGasApi('getDashboardTugasStatus', 'GET', { username: user.username });
        if (result && result.success) {
            document.getElementById('total-tugas').textContent = result.data.total;
            document.getElementById('belum-dikerjakan').textContent = result.data.belumDikerjakan;
            document.getElementById('dalam-progress').textContent = result.data.dalamProgress;
            document.getElementById('selesai').textContent = result.data.selesai;
        }
    }

    async function loadTugas() {
        const user = JSON.parse(sessionStorage.getItem('user'));
        const result = await callGasApi('getTugas', 'GET', { username: user.username, role: user.role, pilar: user.pilar });

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

    // --- Modal Tugas ---
    function openTugasModal(tugas) {
        const user = JSON.parse(sessionStorage.getItem('user'));

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
        const user = sessionStorage.getItem('user');
        if (user) {
            showMainContent();
        } else {
            showLogin();
        }
    }

    init();
});
