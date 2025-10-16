require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'palm-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
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
  "palmLines": "Phân tích đường chỉ tay (tim, trí tuệ, đời) - khoảng 20-30 từ",
  "love": "Dự đoán tình duyên hơi troll - khoảng 20-30 từ", 
  "career": "Dự đoán sự nghiệp và tài lộc - khoảng 20-30 từ",
  "health": "Sức khỏe và may mắn - khoảng 20-30 từ",
  "advice": "Lời khuyên vui nhộn cuối cùng - khoảng 20-30 từ"
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

async function generateFortuneFromImage(base64Image, mimeType) {
  const prompt = fortunePrompt;
  const modelCandidates = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro-vision'];
  const maxRetries = 3;

  let lastError = null;
  for (const modelName of modelCandidates) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          prompt,
          { inlineData: { mimeType, data: base64Image } }
        ]);
        return { ok: true, text: result.response.text(), model: modelName };
      } catch (err) {
        lastError = err;
        // If overloaded (503) or rate limited (429), backoff then retry
        const msg = String(err && err.message || '');
        const isRetryable = /\b(503|429|overloaded|exhausted)\b/i.test(msg);
        if (isRetryable && attempt < maxRetries - 1) {
          const delay = 500 * Math.pow(2, attempt); // 500ms, 1000ms, 2000ms
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        break; // non-retryable or out of retries → try next model
      }
    }
  }
  return { ok: false, error: lastError };
}

// API endpoint for fortune telling (Vercel compatibility)
app.post('/api/fortune-telling', upload.single('palmImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Read the uploaded image
    const imagePath = req.file.path;
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    // Call Gemini with retries and fallbacks
    const gen = await generateFortuneFromImage(base64Image, req.file.mimetype);
    if (!gen.ok) {
      const msg = String(gen.error && gen.error.message || 'Model error');
      const overloaded = /\b(503|overloaded|exhausted)\b/i.test(msg);
      throw Object.assign(new Error(msg), { statusCode: overloaded ? 503 : 500, overloaded });
    }

    const rawResponse = gen.text;
    
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

    // Clean up uploaded file after processing
    fs.unlinkSync(imagePath);

    res.json({
      success: true,
      fortune: fortuneData
    });

  } catch (error) {
    console.error('Fortune telling error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const statusCode = error.statusCode || 500;
    const payload = {
      success: false,
      error: statusCode === 503 ? 'MODEL_OVERLOADED' : 'Failed to generate fortune',
      message: statusCode === 503 ? 'Dịch vụ AI đang quá tải. Vui lòng thử lại sau ít phút.' : error.message
    };
    res.status(statusCode).json(payload);
  }
});

// API endpoint for fortune telling (legacy)
app.post('/api/fortune', upload.single('palmImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Read the uploaded image
    const imagePath = req.file.path;
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const gen = await generateFortuneFromImage(base64Image, req.file.mimetype);
    if (!gen.ok) {
      const msg = String(gen.error && gen.error.message || 'Model error');
      const overloaded = /\b(503|overloaded|exhausted)\b/i.test(msg);
      throw Object.assign(new Error(msg), { statusCode: overloaded ? 503 : 500, overloaded });
    }

    const rawResponse = gen.text;
    
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

    // Clean up uploaded file after processing
    fs.unlinkSync(imagePath);

    res.json({
      success: true,
      fortune: fortuneData
    });

  } catch (error) {
    console.error('Fortune telling error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const statusCode = error.statusCode || 500;
    const payload = {
      success: false,
      error: statusCode === 503 ? 'MODEL_OVERLOADED' : 'Failed to generate fortune',
      message: statusCode === 503 ? 'Dịch vụ AI đang quá tải. Vui lòng thử lại sau ít phút.' : error.message
    };
    res.status(statusCode).json(payload);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Fortune telling server is running!' });
});

app.listen(PORT, () => {
  console.log(`🔮 Mystical Fortune Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});

