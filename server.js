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
// Fortune master prompts
const commonInstruction = `
YÊU CẦU QUAN TRỌNG VỀ NỘI DUNG (TUÂN THỦ 100%):
1. Tỷ lệ nội dung: 70-80% tập trung vào tư vấn tuyển sinh và dự đoán ngành học phù hợp, 20-30% còn lại là lời bói vui vẻ, hài hước về tính cách/vận mệnh.
2. PHẢI dự đoán người dùng hợp với MỘT trong 6 ngành/chuyên ngành sau (CHỈ NÊU TÊN NGÀNH, KHÔNG NÊU TÊN TRƯỜNG):
   - Kỹ thuật cơ khí
   - Cơ khí thủy sản thông minh - Minh Phú
   - Chuyên ngành Thiết kế & Chế tạo số
   - Công nghệ chế tạo máy
   - Kỹ thuật điện tử
   - Chuyên ngành Hệ thống nhúng & IoT
   Tên ngành BẮT BUỘC phải được đặt trong thẻ <b class="highlight">...</b> để làm nổi bật.
3. Dự đoán phải kèm theo emoji trái tim ❤️.
4. Giải thích ngắn gọn tại sao chỉ tay/tướng tay này hợp với ngành đó (bịa một cách logic và hài hước).
5. Phần bói vu vơ còn lại có thể nói về tình duyên, tiền bạc nhưng phải cực kỳ ngắn gọn.
6. Ở cuối cùng phải có một câu chốt mang tính bói toán hoặc chúc may mắn thú vị.

ĐỊNH DẠNG JSON:
{
"fortune": "Nội dung bói NGẮN GỌN (tối đa 100-110 từ). Tuyệt đối không viết dài dòng để tránh tràn khung hình hiển thị trên điện thoại. BẮT BUỘC sử dụng thẻ <br> để xuống dòng giữa các ý chính. Viết súc tích, đi thẳng vào vấn đề."
}`;

const fortuneMasterPrompts = {
  funny: `Bạn là một thầy bói vui tính, genZ.
${commonInstruction}
Phong cách: Vui vẻ, hài hước, troll nhẹ, dùng emoji.`,

  grumpy: `Bạn là một thầy bói cục súc, khó tính.
${commonInstruction}
Phong cách: Cục súc, phàn nàn nhưng vẫn chốt vào việc học ngành nào.`,

  sad: `Bạn là một thầy bói bi quan.
${commonInstruction}
Phong cách: Buồn bã, than thở nhưng vẫn khuyên đi học ngành phù hợp.`,

  bluff: `Bạn là một thầy bói chém gió thần sầu.
${commonInstruction}
Phong cách: Phóng đại, chém gió về tương lai huy hoàng nếu học đúng ngành.`,

  dark: `Bạn là một thầy bói dark humor.
${commonInstruction}
Phong cách: Châm biếm, mỉa mai nhưng vẫn hướng nghiệp đúng đắn.`,

  poetic: `Bạn là một thầy bói hệ văn thơ.
${commonInstruction}
Phong cách: Thơ ca, lãng mạn, ví von ngành học với thiên nhiên/vũ trụ.`
};

// Get fortune prompt based on master type
function getFortuneMasterPrompt(masterType = 'funny') {
    return fortuneMasterPrompts[masterType] || fortuneMasterPrompts.funny;
}

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

async function generateFortuneFromImage(base64Image, mimeType, masterType = 'funny') {
  const prompt = getFortuneMasterPrompt(masterType);
  // Use all available models, prioritizing Flash (high quota) -> Pro -> Experimental -> Gemma
  const modelCandidates = [
    // --- High Priority (Flash / High Quota) ---
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-lite-preview-02-05',
    'gemini-2.0-flash-lite-preview',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash-preview-09-2025',
    'gemini-2.5-flash-lite-preview-09-2025',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',

    // --- Medium Priority (Pro / Standard) ---
    'gemini-2.5-pro',
    'gemini-pro-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',

    // --- Experimental / Preview ---
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-2.0-flash-exp',
    'gemini-exp-1206',
    
    // --- Gemma 3 (Multimodal) ---
    'gemma-3-27b-it',
    'gemma-3-12b-it',
    'gemma-3-4b-it',
    'gemma-3-1b-it'
  ];
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

    // Get fortune master type from request body (default to 'funny')
    const masterType = req.body.masterType || 'funny';

    // Read the uploaded image
    const imagePath = req.file.path;
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    // Call Gemini with retries and fallbacks
    const gen = await generateFortuneFromImage(base64Image, req.file.mimetype, masterType);
    if (!gen.ok) {
      const msg = String(gen.error && gen.error.message || 'Model error');
      const overloaded = /\b(503|overloaded|exhausted)\b/i.test(msg);
      throw Object.assign(new Error(msg), { statusCode: overloaded ? 503 : 500, overloaded });
    }

    const rawResponse = gen.text;
    
    // Try to parse JSON response
    let fortuneData;
    try {
      // Find JSON object boundaries
      const firstBrace = rawResponse.indexOf('{');
      const lastBrace = rawResponse.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonString = rawResponse.substring(firstBrace, lastBrace + 1);
        const parsedData = JSON.parse(jsonString);
        
        // Check if we have the single fortune field
        if (parsedData.fortune) {
          fortuneData = { fortune: parsedData.fortune };
        } else {
          // Fallback to old structure if needed
          fortuneData = {
            fortune: parsedData.intro + " " + 
                    (parsedData.palmLines || "") + " " + 
                    (parsedData.love || "") + " " + 
                    (parsedData.career || "") + " " + 
                    (parsedData.health || "") + " " + 
                    (parsedData.advice || "")
          };
        }
      } else {
        throw new Error("No JSON structure found");
      }
    } catch (parseError) {
      // If JSON parsing fails, try regex extraction first
      const fortuneMatch = rawResponse.match(/"fortune"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      if (fortuneMatch) {
          fortuneData = { fortune: fortuneMatch[1].replace(/\\"/g, '"') };
      } else {
        // If JSON parsing fails, fallback to plain text
        console.log('JSON parse failed, using plain text fallback');
        
        let cleanText = rawResponse.replace(/```json|```/g, '').trim();
        // Remove potential "json" prefix or similar artifacts
        if (cleanText.toLowerCase().startsWith('json')) {
          cleanText = cleanText.substring(4).trim();
        }

        // Remove "json {" pattern if it appears
        cleanText = cleanText.replace(/json\s*\{/gi, '').trim();

        // Remove leading brace if it remains
        if (cleanText.startsWith('{')) {
          cleanText = cleanText.substring(1).trim();
        }
         // Remove trailing brace if it remains
        if (cleanText.endsWith('}')) {
          cleanText = cleanText.substring(0, cleanText.length - 1).trim();
        }
  
        fortuneData = {
          fortune: cleanText
        };
      }
    }

    // Clean up uploaded file after processing
    fs.unlinkSync(imagePath);

    // Final cleanup of the fortune text to ensure no artifacts remain
    if (fortuneData && fortuneData.fortune && typeof fortuneData.fortune === 'string') {
       // Remove "json {" or "json" prefix if it somehow got into the content
       fortuneData.fortune = fortuneData.fortune.replace(/^json\s*\{/i, '').trim();
       // Remove potential starting quote if previous regex failed to strip it clean
       if (fortuneData.fortune.startsWith('"') && fortuneData.fortune.endsWith('"')) {
           fortuneData.fortune = fortuneData.fortune.substring(1, fortuneData.fortune.length - 1);
       }
    }

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
      const parsedData = JSON.parse(cleanedResponse);
      
       // Check if we have the single fortune field
       if (parsedData.fortune) {
         fortuneData = { fortune: parsedData.fortune };
       } else {
         // Fallback to old structure if needed
         fortuneData = {
           fortune: parsedData.intro + " " + 
                   (parsedData.palmLines || "") + " " + 
                   (parsedData.love || "") + " " + 
                   (parsedData.career || "") + " " + 
                   (parsedData.health || "") + " " + 
                   (parsedData.advice || "")
         };
       }
    } catch (parseError) {
      // If JSON parsing fails, fallback to plain text
      console.log('JSON parse failed, using plain text fallback');
      fortuneData = {
        fortune: sanitizePlainText(rawResponse)
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

