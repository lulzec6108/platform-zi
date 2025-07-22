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
        // UBAH: Menggunakan application/json agar GAS mengurai header dengan benar
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      redirect: 'follow'
    };

    // Body request diambil langsung dari event yang diterima dari frontend
    if (method === 'POST' && event.body) {
      options.body = event.body;
    }

    if (method === 'GET') {
      // Gabungkan query string dari request asli ke URL GAS
      const queryString = new URLSearchParams(event.queryStringParameters).toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    console.log('Sending request to GAS...');
    const response = await fetch(url, options);
    const data = await response.text(); // Baca sebagai teks dulu untuk debug

    try {
      // Coba parse sebagai JSON
      const jsonData = JSON.parse(data);
      return {
        statusCode: response.status,
        body: JSON.stringify(jsonData)
      };
    } catch (error) {
      // Jika gagal, berarti GAS mengembalikan HTML (halaman error)
      console.error("Failed to parse GAS response as JSON. Response was:", data);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Server GAS merespons dengan format yang tidak terduga.', details: data })
      };
    }

  } catch (error) {
    console.error('Error in proxy function:', error);
    return {
      statusCode: 502, // Bad Gateway
      body: JSON.stringify({ message: 'Gagal menghubungi server backend.', error: error.message })
    };
  }
};
