const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  // Menggunakan nama environment variable yang benar: GAS_APP_URL
  const { GAS_APP_URL } = process.env;

  if (!GAS_APP_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Konfigurasi GAS_APP_URL di server tidak ditemukan.' }),
    };
  }

  try {
    const method = event.httpMethod;
    let finalUrl = GAS_APP_URL;
    const options = {
        method: method,
        redirect: 'follow', // Penting untuk Google Apps Script
    };

    if (method === 'POST') {
        options.headers = { 'Content-Type': 'application/json' };
        // Teruskan body dari frontend apa adanya, karena sudah diformat dengan benar
        options.body = event.body; 
    } else if (method === 'GET') {
        // Ambil seluruh query string asli dari request frontend
        const queryString = event.rawQuery || '';
        if (queryString) {
            finalUrl += '?' + queryString;
        }
    }

    const gasResponse = await fetch(finalUrl, options);
    const data = await gasResponse.json();

    // Teruskan response dari Google Apps Script kembali ke frontend
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
