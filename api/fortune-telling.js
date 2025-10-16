import { GoogleGenerativeAI } from '@google/generative-ai';

// Fortune telling prompt
const fortunePrompt = `Bạn là một thầy bói vui tính và hơi troll. Hãy phân tích hình ảnh bàn tay này và đưa ra lời bói vui nhộn nhưng cũng có phần bí ẩn. 

YÊU CẦU ĐẦU RA (QUAN TRỌNG):
- Trả lời theo định dạng JSON với các trường sau:
{
  "intro": "Lời mở đầu ngắn gọn, không tự giới thiệu",
  "palmLines": "Phân tích đường chỉ tay (tim, trí tuệ, đời) - khoảng 20-30 từ",
  "love": "Dự đoán tình duyên hơi troll - khoảng 20-30 từ", 
  "career": "Dự đoán sự nghiệp và tài lộc - khoảng 20-30 từ",
  "health": "Sức khỏe và may mắn - khoảng 20-30 từ",
  "advice": "Lời khuyên vui nhộn cuối cùng - khoảng 20-30 từ"
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

    
    // Parse the request body manually
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: 'No boundary found in multipart data' });
    }

    // Read the raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    // Parse multipart data
    const parts = buffer.toString('binary').split(`--${boundary}`);
    let imageData = null;
    let imageType = null;
    
    for (const part of parts) {
      if (part.includes('name="palmImage"')) {
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const header = part.substring(0, headerEnd);
          const content = part.substring(headerEnd + 4);
          
          // Extract content type
          const contentTypeMatch = header.match(/Content-Type:\s*([^\r\n]+)/);
          if (contentTypeMatch) {
            imageType = contentTypeMatch[1].trim();
          }
          
          // Get image data (remove trailing boundary markers)
          imageData = content.replace(/\r\n--$/, '');
          break;
        }
      }
    }
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image found in request' });
    }


    // Convert to base64
    const base64Image = Buffer.from(imageData, 'binary').toString('base64');

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Call Gemini API
    const result = await model.generateContent([
      fortunePrompt,
      {
        inlineData: {
          mimeType: imageType || 'image/jpeg',
          data: base64Image
        }
      }
    ]);

    const rawResponse = result.response.text();
    
    // Try to parse JSON response
    let fortuneData;
    try {
      const cleanedResponse = rawResponse.replace(/```json|```/g, '').trim();
      fortuneData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // If JSON parsing fails, fallback to plain text
      fortuneData = {
        intro: "Chào bạn! 🔮",
        palmLines: sanitizePlainText(rawResponse),
        love: "",
        career: "",
        health: "",
        advice: ""
      };
    }


    res.json({
      success: true,
      fortune: fortuneData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate fortune',
      message: error.message
    });
  }
}