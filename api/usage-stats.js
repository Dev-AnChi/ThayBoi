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
    const logFile = path.join(process.cwd(), 'usage_count.txt');
    let count = 0;

    if (fs.existsSync(logFile)) {
      const data = fs.readFileSync(logFile, 'utf8');
      count = parseInt(data.trim()) || 0;
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
