import { get } from '@vercel/edge-config';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get current usage count from Edge Config
        const usageCount = await get('usage_count') || 0;
        
        console.log(`📊 Current usage count: ${usageCount}`);
        
        res.status(200).json({ 
            success: true, 
            usage_count: usageCount 
        });
        
    } catch (error) {
        console.error('❌ Error getting usage count:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get usage count' 
        });
    }
}
