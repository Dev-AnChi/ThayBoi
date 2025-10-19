import { get } from '@vercel/edge-config';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    try {
        const currentCount = await get('usage_count') || 0;
        const edgeConfigId = process.env.EDGE_CONFIG_ID;
        const vercelToken = process.env.VERCEL_TOKEN;
        
        if (!edgeConfigId || !vercelToken) {
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    count: currentCount,
                    error: 'Configuration missing'
                }),
                { status: 200, headers }
            );
        }

        const newCount = parseInt(currentCount) + 1;
        
        const updateResponse = await fetch(
            `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${vercelToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: [
                        {
                            operation: 'upsert',
                            key: 'usage_count',
                            value: newCount,
                        },
                    ],
                }),
            }
        );

        if (!updateResponse.ok) {
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    count: currentCount,
                    error: 'Failed to update'
                }),
                { status: 200, headers }
            );
        }

        return new Response(
            JSON.stringify({ 
                success: true, 
                count: newCount 
            }),
            { status: 200, headers }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ 
                success: false, 
                error: error.message,
                count: 0
            }),
            { status: 500, headers }
        );
    }
}
