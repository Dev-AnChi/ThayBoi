import fs from 'fs';
import path from 'path';

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
    // Try to read from /tmp directory (persists during cold starts)
    const tmpFile = '/tmp/usage_count.txt';
    let count = 0;
    
    try {
      if (fs.existsSync(tmpFile)) {
        const data = fs.readFileSync(tmpFile, 'utf8');
        count = parseInt(data.trim()) || 0;
      }
    } catch (fileError) {
      console.log('Could not read from /tmp, using 0:', fileError.message);
    }
    
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
