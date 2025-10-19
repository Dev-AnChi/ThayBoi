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
        console.log('🔢 Increment usage API called');
        
        // Get current count from Edge Config
        const currentCount = await get('usage_count') || 0;
        console.log('📊 Current count from Edge Config:', currentCount);
        
        // Note: Edge Config is read-only from the edge function
        // We need to use Vercel API to update it
        const edgeConfigId = process.env.EDGE_CONFIG_ID;
        const vercelToken = process.env.VERCEL_TOKEN;
        
        console.log('🔑 Config check:', {
            hasEdgeConfigId: !!edgeConfigId,
            hasVercelToken: !!vercelToken,
            edgeConfigId: edgeConfigId
        });
        
        if (!edgeConfigId || !vercelToken) {
            console.error('❌ Missing EDGE_CONFIG_ID or VERCEL_TOKEN');
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    count: currentCount,
                    error: 'Configuration missing',
                    debug: {
                        hasEdgeConfigId: !!edgeConfigId,
                        hasVercelToken: !!vercelToken
                    }
                }),
                { status: 200, headers }
            );
        }

        // Increment count via Vercel API
        const newCount = parseInt(currentCount) + 1;
        console.log('➕ Incrementing to:', newCount);
        
        const apiUrl = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`;
        console.log('📡 API URL:', apiUrl);
        
        const updateResponse = await fetch(apiUrl, {
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
        });

        console.log('📥 Update response status:', updateResponse.status);

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('❌ Failed to update Edge Config:', errorText);
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    count: currentCount,
                    error: 'Failed to update',
                    details: errorText
                }),
                { status: 200, headers }
            );
        }

        console.log('✅ Successfully incremented to:', newCount);

        return new Response(
            JSON.stringify({ 
                success: true, 
                count: newCount 
            }),
            { status: 200, headers }
        );
    } catch (error) {
        console.error('💥 Error incrementing usage:', error);
        return new Response(
            JSON.stringify({ 
                success: false, 
                error: error.message,
                stack: error.stack,
                count: 0
            }),
            { status: 500, headers }
        );
    }
}
