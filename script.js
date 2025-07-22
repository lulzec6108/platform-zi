document.addEventListener('DOMContentLoaded', function() {
{{ ... }}
    let activeTask = null; // Menyimpan data tugas yang sedang aktif di modal

    // --- Fungsi Helper untuk API Call via Proxy ---
    async function callGasApi(action, method = 'GET', payload = {}) {
        // DEBUG: Memanggil fungsi secara langsung untuk melewati redirect
        let url = `/.netlify/functions/proxy`;
        const options = {
            method: method,
            headers: {}
{{ ... }}
