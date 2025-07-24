const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  // Baca KEDUA environment variable yang penting
  const { GAS_APP_URL, GAS_API_KEY } = process.env;

  if (!GAS_APP_URL || !GAS_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Konfigurasi GAS_APP_URL atau GAS_API_KEY di server tidak lengkap.' }),
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
        // Ambil body asli, lalu suntikkan apiKey di dalamnya
        const requestBody = JSON.parse(event.body);
        requestBody.apiKey = GAS_API_KEY; // Tambahkan API Key
        options.body = JSON.stringify(requestBody); 

    } else if (method === 'GET') {
        // Bangun parameter dari request asli, lalu tambahkan apiKey
        const params = new URLSearchParams(event.rawQuery || '');
        params.append('apiKey', GAS_API_KEY);
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
