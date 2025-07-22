const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Ambil URL dan API Key dari environment variables di Netlify
  const gasAppUrl = process.env.GAS_APP_URL;
  const apiKey = process.env.API_KEY;

  // Log untuk debugging - JANGAN GUNAKAN DI PRODUKSI
  console.log(`Proxying to: ${gasAppUrl}`);
  console.log(`API Key loaded: ${apiKey ? apiKey.substring(0, 4) + '...' : 'NOT FOUND'}`);

  // Cek apakah variabel lingkungan sudah diatur
  if (!gasAppUrl || !apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Konfigurasi server (environment variables) tidak lengkap.' })
    };
  }

  try {
    const method = event.httpMethod;
    let url = gasAppUrl;

    const options = {
      method: method,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        'x-api-key': apiKey
      },
      redirect: 'follow'
    };

    if (method === 'POST') {
      // Netlify Functions otomatis mem-parse body jika Content-Type adalah application/json.
      // Kita perlu mengubahnya kembali menjadi string agar GAS bisa membacanya dari e.postData.contents.
      options.body = typeof event.body === 'string' ? event.body : JSON.stringify(event.body);
    } else if (method === 'GET') {
      // Gabungkan query string dari request asli ke URL GAS
      const queryString = new URLSearchParams(event.queryStringParameters).toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    console.log('Sending request to GAS...');
    const response = await fetch(url, options);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Error in proxy function:', error);
    return {
      statusCode: 502, // Bad Gateway
      body: JSON.stringify({ message: 'Gagal menghubungi server backend.', error: error.message })
    };
  }
};
