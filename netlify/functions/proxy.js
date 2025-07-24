const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  const { GAS_APP_URL, GAS_API_KEY } = process.env;

  if (!GAS_APP_URL || !GAS_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Konfigurasi environment variable di server belum lengkap.' }),
    };
  }

  try {
    const method = event.httpMethod;
    let finalUrl = GAS_APP_URL;
    const options = {
        method: method,
        redirect: 'follow',
    };

    if (method === 'POST') {
        options.headers = { 'Content-Type': 'application/json' };
        // Ambil body dari frontend
        const frontendBody = JSON.parse(event.body || '{}');
        // Tambahkan apiKey ke level atas body, sesuai harapan backend
        frontendBody.apiKey = GAS_API_KEY;
        // Kirim body yang sudah dimodifikasi
        options.body = JSON.stringify(frontendBody); 

    } else if (method === 'GET') {
        // Ambil semua parameter dari request asli (cth: action=...&username=...)
        const params = new URLSearchParams(event.rawQuery || '');
        // Tambahkan apiKey ke parameter yang sudah ada
        params.set('apiKey', GAS_API_KEY);
        // Gabungkan dengan URL dasar
        finalUrl += '?' + params.toString();
    }

    const gasResponse = await fetch(finalUrl, options);
    const data = await gasResponse.json();

    return {
      statusCode: gasResponse.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('Proxy Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: `Error pada proxy server: ${error.message}` }),
    };
  }
};
