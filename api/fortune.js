import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';

// Configure multer for memory storage (Vercel doesn't support disk storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// Sanitize AI text to remove common markdown formatting just in case
function sanitizePlainText(text) {
  if (!text || typeof text !== 'string') return text;
  let t = text;
  // Remove markdown headings and leading bullet markers
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  t = t.replace(/^\s{0,3}[-*+]\s+/gm, '');
  // Remove bold/italic markers
  t = t.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  t = t.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');
  // Strip inline/backtick code markers
  t = t.replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1');
  // Collapse multiple blank lines
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

export const config = {
  maxDuration: 30,
};

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

    // Parse multipart form data
    await new Promise((resolve, reject) => {
      upload.single('palmImage')(req, res, (err) => {
        if (err) {
          console.error('❌ Upload error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    console.log('📸 Image received:', req.file.originalname, 'Size:', req.file.size);

    // Convert buffer to base64
    const base64Image = req.file.buffer.toString('base64');

    // Use Gemini Vision model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      fortunePrompt,
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: base64Image
        }
      }
    ]);

    const rawResponse = result.response.text();
    console.log('🤖 Raw AI response:', rawResponse.substring(0, 200) + '...');
    
    // Try to parse JSON response
    let fortuneData;
    try {
      // Clean the response first
      const cleanedResponse = rawResponse.replace(/```json|```/g, '').trim();
      fortuneData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // If JSON parsing fails, fallback to plain text
      console.log('JSON parse failed, using plain text fallback');
      fortuneData = {
        intro: "Chào bạn! 🔮",
        palmLines: sanitizePlainText(rawResponse),
        love: "",
        career: "",
        health: "",
        advice: ""
      };
    }

    console.log('✅ Fortune generated successfully');

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
