// proxy.js (UPDATED with enhanced API_KEY validation)
const fetch = require('node-fetch');

// Fungsi untuk meneruskan request ke GAS
async function forwardRequest(event, targetUrl) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': event.headers['x-api-key'] || ''
        };

        const response = await fetch(targetUrl, {
            method: 'POST', // Selalu gunakan POST untuk GAS
            headers: headers,
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
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
            },
            body: JSON.stringify({ 
                success: false,
                message: 'Internal server error',
                error: error.message
            })
        };
    }
}

exports.handler = async (event) => {
    // Log request untuk debugging (tanpa menampilkan API key)
    console.log('Received event:', {
        httpMethod: event.httpMethod,
        path: event.path,
        queryStringParameters: event.queryStringParameters,
        headers: {
            ...event.headers,
            'x-api-key': event.headers['x-api-key'] ? '***' + event.headers['x-api-key'].slice(-4) : 'not set'
        },
        body: event.body ? JSON.parse(event.body) : null
    });

    // Validasi environment variables
    const GAS_APP_URL = process.env.GAS_APP_URL;
    const REQUIRED_API_KEY = process.env.API_KEY || 'semoga_bisa_wbk_aamiin';
    
    if (!GAS_APP_URL) {
        console.error('Missing required environment variable: GAS_APP_URL');
        return {
            statusCode: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
            },
            body: JSON.stringify({ 
                success: false,
                message: 'Server configuration error: Missing GAS_APP_URL' 
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
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
                    },
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

        // Validasi API key untuk semua request kecuali login
        const clientApiKey = event.headers['x-api-key'];
        if (!clientApiKey) {
            console.error('API key is required');
            return {
                statusCode: 401,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
                },
                body: JSON.stringify({ 
                    success: false,
                    message: 'API key is required' 
                })
            };
        }

        if (clientApiKey !== REQUIRED_API_KEY) {
            console.error('Invalid API key');
            return {
                statusCode: 403,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
                },
                body: JSON.stringify({ 
                    success: false,
                    message: 'Invalid API key' 
                })
            };
        }

        // Teruskan request ke GAS
        return await forwardRequest(event, GAS_APP_URL);

    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
            },
            body: JSON.stringify({ 
                success: false,
                message: 'Internal server error',
                error: error.message
            })
        };
    }
};
