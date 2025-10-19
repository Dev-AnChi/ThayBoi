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
    const logFile = path.join(process.cwd(), 'usage_log.json');
    
    if (!fs.existsSync(logFile)) {
      return res.json({
        success: true,
        stats: {
          total: 0,
          byMaster: {},
          lastUsed: null,
          message: 'Chưa có dữ liệu sử dụng'
        }
      });
    }

    const data = fs.readFileSync(logFile, 'utf8');
    const usageData = JSON.parse(data);

    res.json({
      success: true,
      stats: usageData
    });

  } catch (error) {
    console.error('Error reading usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read usage statistics'
    });
  }
}
