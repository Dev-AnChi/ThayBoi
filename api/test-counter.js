import { get, set, incr } from './lib/kv.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'GET') {
            // Get current count
            const count = await get('usage_count');
            return res.json({ 
                success: true, 
                count: count,
                message: 'Current count retrieved'
            });
        }
        
        if (req.method === 'POST') {
            // Increment count
            const newCount = await incr('usage_count');
            return res.json({ 
                success: true, 
                count: newCount,
                message: 'Count incremented'
            });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Test counter error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
