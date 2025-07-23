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
  const actionPath = event.path.replace('/proxy/', '');

  try {
    let response;

    const method = event.httpMethod;
    const headers = { 'Content-Type': 'application/json' };

    if (method === 'POST') {
      // FIX: Membuat struktur payload yang benar yang diharapkan oleh GAS
      const finalPayload = {
        action: actionPath, // 'login', 'getDashboardTugasStatus', etc.
        payload: JSON.parse(event.body), // { username, password }
        apiKey: GAS_API_KEY
      };

      response = await fetch(GAS_APP_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(finalPayload)
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
