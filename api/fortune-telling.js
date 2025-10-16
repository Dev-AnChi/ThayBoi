// Simple Vercel serverless function
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
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error',
        message: 'API key not configured'
      });
    }

    // For now, return a test response
    res.json({
      success: true,
      fortune: {
        intro: "Chào bạn! 🔮",
        palmLines: "Đây là test response từ Vercel API!",
        love: "Tình duyên sẽ tốt đẹp! 💕",
        career: "Sự nghiệp thăng tiến! 💼",
        health: "Sức khỏe dồi dào! 💪",
        advice: "Hãy luôn tích cực! ✨"
      }
    });

  } catch (error) {
    console.error('❌ Fortune telling error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate fortune',
      message: error.message
    });
  }
}