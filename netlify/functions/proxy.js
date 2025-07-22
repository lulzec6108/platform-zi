// proxy.js (UPDATED with API_KEY support)
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const GAS_APP_URL = process.env.GAS_APP_URL;
  const API_KEY = process.env.API_KEY;
  
  if (!GAS_APP_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        message: 'GAS_APP_URL environment variable is not set' 
      })
    };
  }

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        message: 'API_KEY environment variable is not set' 
      })
    };
  }

  try {
    const { httpMethod, body, queryStringParameters, headers } = event;
    const requestBody = body ? JSON.parse(body) : {};
    const action = queryStringParameters?.action || requestBody?.action;
    
    if (!action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          message: 'Action parameter is required' 
        })
      };
    }

    // Verifikasi API_KEY dari header
    const clientApiKey = headers['x-api-key'] || requestBody.apiKey;
    if (clientApiKey !== API_KEY) {
      console.error('Invalid API key provided');
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          success: false, 
          message: 'Unauthorized: Invalid API key' 
        })
      };
    }

    console.log(`Proxying ${httpMethod} ${action} to GAS`);
    
    // Hapus apiKey dari body sebelum dikirim ke GAS
    if (requestBody.apiKey) {
      delete requestBody.apiKey;
    }
    
    const response = await fetch(GAS_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...requestBody,
        action: action
      })
    });

    const responseData = await response.text();
    
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
