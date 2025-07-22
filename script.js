document.addEventListener('DOMContentLoaded', function() {
{{ ... }}
    let activeTask = null; // Menyimpan data tugas yang sedang aktif di modal

    // --- Fungsi Helper untuk API Call via Proxy ---
    async function callGasApi(action, method = 'GET', payload = {}) {
        // Kembalikan ke URL proxy yang seharusnya
        let url = `/api/proxy`;
        const options = {
            method: method,
            headers: {}
{{ ... }}
