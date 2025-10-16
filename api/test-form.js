export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📋 Headers:', req.headers);
    console.log('📋 Content-Type:', req.headers['content-type']);
    console.log('📋 Body type:', typeof req.body);
    console.log('📋 Body keys:', Object.keys(req.body || {}));

    res.json({
      success: true,
      message: 'Form data test successful',
      headers: req.headers,
      bodyType: typeof req.body,
      bodyKeys: Object.keys(req.body || {}),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error.message
    });
  }
}
