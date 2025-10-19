import { get, set } from '@vercel/edge-config';

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const value = await get('usage_count');
            return res.json({ success: true, value: value || 0 });
        }
        
        if (req.method === 'POST') {
            const current = await get('usage_count');
            const newValue = (parseInt(current) || 0) + 1;
            await set('usage_count', newValue);
            return res.json({ success: true, value: newValue });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Edge Config error:', error);
        return res.status(500).json({ error: error.message });
    }
}
