// proxy.js (UPDATED)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const GAS_URL = process.env.GAS_URL;
  
  if (!GAS_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        message: 'GAS_URL environment variable is not set' 
      })
    };
  }

  try {
    const { httpMethod, body, queryStringParameters } = event;
    const action = queryStringParameters?.action || JSON.parse(body || '{}')?.action;
    
    if (!action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          message: 'Action parameter is required' 
        })
      };
    }

    console.log(`Proxying ${httpMethod} ${action} to GAS`);
    
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...JSON.parse(body || '{}'),
        action: action
      })
    });

    const responseData = await response.text();
    
    // Coba parse JSON, jika gagal kembalikan sebagai teks biasa
    try {
      const jsonData = JSON.parse(responseData);
      return {
        statusCode: response.status,
        body: JSON.stringify(jsonData)
      };
    } catch (e) {
      return {
        statusCode: response.status,
        body: responseData
      };
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      })
    };
  }
};
