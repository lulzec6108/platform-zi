// proxy.js (UPDATED with API_KEY support)
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Validasi environment variables
    const GAS_APP_URL = process.env.GAS_APP_URL;
    const REQUIRED_API_KEY = process.env.API_KEY;
    
    if (!GAS_APP_URL || !REQUIRED_API_KEY) {
        console.error('Missing required environment variables');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error' })
        };
    }

    try {
        // Dapatkan API key dari header atau body
        const apiKey = event.headers['x-api-key'] || 
                      (event.body && JSON.parse(event.body).apiKey);
        
        // Validasi API key
        if (!apiKey || apiKey !== REQUIRED_API_KEY) {
            console.warn('Unauthorized access attempt');
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized: Invalid API key' })
            };
        }

        // Log request untuk keperluan debugging
        console.log('Proxying request to:', GAS_APP_URL);
        
        // Ekstrak method dan headers
        const { httpMethod, body, headers } = event;
        
        // Filter headers yang akan diteruskan
        const forwardHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(headers['content-type'] && { 'Content-Type': headers['content-type'] })
        };

        // Buat request ke GAS
        const response = await fetch(GAS_APP_URL, {
            method: httpMethod,
            headers: forwardHeaders,
            body: httpMethod !== 'GET' && httpMethod !== 'HEAD' ? body : undefined,
            timeout: 10000 // 10 detik timeout
        });

        // Handle response
        const responseBody = await response.text();
        
        // Log response status untuk debugging
        console.log(`Response status: ${response.status}`);
        
        return {
            statusCode: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
            },
            body: responseBody
        };
        
    } catch (error) {
        console.error('Proxy error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
