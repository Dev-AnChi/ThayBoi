import { GoogleGenerativeAI } from '@google/generative-ai';

// Fortune telling prompt
const fortunePrompt = `Bạn là một thầy bói vui tính và hơi troll. Hãy phân tích hình ảnh bàn tay này và đưa ra lời bói vui nhộn nhưng cũng có phần bí ẩn. 

YÊU CẦU ĐẦU RA (QUAN TRỌNG):
- Trả lời theo định dạng JSON với các trường sau:
{
  "intro": "Lời mở đầu ngắn gọn, không tự giới thiệu",
  "palmLines": "Phân tích đường chỉ tay (tim, trí tuệ, đời) - khoảng 80-100 từ",
  "love": "Dự đoán tình duyên hơi troll - khoảng 60-80 từ", 
  "career": "Dự đoán sự nghiệp và tài lộc - khoảng 60-80 từ",
  "health": "Sức khỏe và may mắn - khoảng 60-80 từ",
  "advice": "Lời khuyên vui nhộn cuối cùng - khoảng 40-60 từ"
}

Phong cách: Vui vẻ, hài hước, có chút troll nhưng không quá đà. Sử dụng emoji phù hợp.
Chú ý: Bỏ qua phần tự giới thiệu bản thân, trả lời theo phong cách genZ trôi chảy, không dùng dấu ""`;

// Sanitize AI text to remove common markdown formatting
function sanitizePlainText(text) {
  if (!text || typeof text !== 'string') return text;
  let t = text;
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  t = t.replace(/^\s{0,3}[-*+]\s+/gm, '');
  t = t.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  t = t.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');
  t = t.replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

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

    // Parse multipart form data using Vercel's built-in support
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    // For now, return a test response until we fix the form parsing
    console.log('📸 Form data received, processing...');
    
    // Test response
    const fortuneData = {
      intro: "Chào bạn! 🔮",
      palmLines: "Đây là test response từ Vercel API! Tôi đã nhận được request của bạn.",
      love: "Tình duyên sẽ tốt đẹp! 💕",
      career: "Sự nghiệp thăng tiến! 💼", 
      health: "Sức khỏe dồi dào! 💪",
      advice: "Hãy luôn tích cực! ✨"
    };

    console.log('✅ Test fortune generated successfully');

    res.json({
      success: true,
      fortune: fortuneData
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