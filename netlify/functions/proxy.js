// proxy.js (FINAL)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const gasAppUrl = process.env.GAS_APP_URL;
  const apiKey = process.env.API_KEY;

  if (!gasAppUrl || !apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Konfigurasi server tidak lengkap.' })
    };
  }

  try {
    const method = event.httpMethod;
    let url = `${gasAppUrl}?apiKey=${apiKey}`;

    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      redirect: 'follow'
    };

    if (method === 'POST' && event.body) {
      options.body = event.body;
    } else if (method === 'GET') {
      const queryString = new URLSearchParams(event.queryStringParameters).toString();
      if (queryString) {
        url += `&${queryString}`;
      }
    }

    const response = await fetch(url, options);
    const data = await response.text();

    // Coba parse sebagai JSON, jika gagal, kirim sebagai teks biasa (untuk error HTML dari GAS)
    try {
      JSON.parse(data);
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: data
      };
    } catch (error) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'text/html' },
        body: data
      };
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error pada fungsi proxy.', details: error.message })
    };
  }
};
