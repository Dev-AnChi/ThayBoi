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
    // Use a simple in-memory counter that persists during the session
    if (!global.usageCount) {
      global.usageCount = 0;
    }
    
    res.json({
      success: true,
      stats: { 
        total: global.usageCount 
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
