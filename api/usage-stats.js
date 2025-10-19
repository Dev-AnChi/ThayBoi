import { get } from './lib/kv.js';

export default async function handler(req, res) {
  // Enable CORS
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
    // Use KV store for persistent counter
    const count = await get('usage_count') || 0;
    
    res.json({
      success: true,
      stats: { 
        total: count 
      }
    });

  } catch (error) {
    console.error('Error reading usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read usage statistics'
    });
  }
}
