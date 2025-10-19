import { get } from '@vercel/edge-config';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    try {
        const count = await get('usage_count') || 0;
        
        return new Response(
            JSON.stringify({ 
                success: true, 
                count: parseInt(count) 
            }),
            { status: 200, headers }
        );
    } catch (error) {
        console.error('Error getting usage:', error);
        return new Response(
            JSON.stringify({ 
                success: false, 
                error: error.message,
                count: 0
            }),
            { status: 200, headers }
        );
    }
}

