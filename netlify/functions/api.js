const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  // Ambil URL GAS dan API Key dari environment variables Netlify
  const { GAS_APP_URL, GAS_API_KEY } = process.env;

  if (!GAS_APP_URL || !GAS_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Konfigurasi server tidak lengkap.' }),
    };
  }

  // Dapatkan path dari permintaan asli (misal: /login, /getDashboardData)
  const actionPath = event.path.replace('/api/', '');

  try {
    let response;

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      // Gabungkan action, payload, dan API Key untuk dikirim ke GAS
      const requestBody = {
        action: actionPath,
        payload: body,
        apiKey: GAS_API_KEY, // Tambahkan API Key ke body
      };

      response = await fetch(GAS_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        redirect: 'follow',
      });

    } else { // Asumsikan GET
      // Bangun URL dengan parameter query
      const url = new URL(GAS_APP_URL);
      url.searchParams.append('action', actionPath);
      url.searchParams.append('apiKey', GAS_API_KEY);

      // Tambahkan parameter query lain dari request asli
      for (const key in event.queryStringParameters) {
        if (key !== 'action') { // hindari duplikasi
          url.searchParams.append(key, event.queryStringParameters[key]);
        }
      }

      response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
      });
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: `Error proxying to GAS: ${error.message}` }),
    };
  }
};
