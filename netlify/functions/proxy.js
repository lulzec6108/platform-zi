// proxy.js (UPDATED with API_KEY support)
const fetch = require('node-fetch');

// Fungsi untuk meneruskan request ke GAS
async function forwardRequest(event, targetUrl) {
    try {
        const response = await fetch(targetUrl, {
            method: event.httpMethod,
            headers: {
                'Content-Type': 'application/json',
                ...(event.headers['x-api-key'] && { 'x-api-key': event.headers['x-api-key'] })
            },
            body: event.body
        });

        const data = await response.text();
        
        return {
            statusCode: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
            },
            body: data
        };
    } catch (error) {
        console.error('Forward request error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: false,
                message: 'Internal server error' 
            })
        };
    }
}

exports.handler = async (event) => {
    // Log request untuk debugging
    console.log('Received event:', {
        httpMethod: event.httpMethod,
        path: event.path,
        queryStringParameters: event.queryStringParameters,
        headers: event.headers,
        body: event.body ? JSON.parse(event.body) : null
    });

    // Validasi environment variables
    const GAS_APP_URL = process.env.GAS_APP_URL;
    const REQUIRED_API_KEY = process.env.API_KEY;
    
    if (!GAS_APP_URL || !REQUIRED_API_KEY) {
        console.error('Missing required environment variables');
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: false,
                message: 'Server configuration error' 
            })
        };
    }

    try {
        // Parse request body
        let requestBody = {};
        if (event.body) {
            try {
                requestBody = JSON.parse(event.body);
            } catch (e) {
                console.error('Error parsing request body:', e);
                return {
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        success: false,
                        message: 'Invalid request body' 
                    })
                };
            }
        }

        // Handle preflight request
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                },
                body: ''
            };
        }

        // Skip API key check for login request
        if (requestBody.action === 'login') {
            console.log('Processing login request, skipping API key check');
            return forwardRequest(event, GAS_APP_URL);
        }

        // Validasi API key untuk request selain login
        const apiKey = event.headers['x-api-key'] || (requestBody && requestBody.apiKey);
        
        if (!apiKey || apiKey !== REQUIRED_API_KEY) {
            console.warn('Invalid or missing API key');
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    success: false,
                    message: 'Unauthorized: Invalid API key' 
                })
            };
        }

        // Hapus apiKey dari body sebelum diteruskan ke GAS
        if (requestBody && requestBody.apiKey) {
            delete requestBody.apiKey;
            event.body = JSON.stringify(requestBody);
        }

        // Teruskan request ke GAS
        return forwardRequest(event, GAS_APP_URL);

    } catch (error) {
        console.error('Proxy error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: false,
                message: 'Internal server error',
                error: error.message 
            })
        };
    }
};
