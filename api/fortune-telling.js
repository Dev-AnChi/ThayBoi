import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

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
3. Dự đoán phải kèm theo emoji trái tim ❤️.
4. Giải thích ngắn gọn tại sao chỉ tay/tướng tay này hợp với ngành đó (bịa một cách logic và hài hước).
5. Phần bói vu vơ còn lại có thể nói về tình duyên, tiền bạc nhưng phải ngắn.
6. Ở cuối cùng phải có một câu chốt mang tính bói toán hoặc chúc may mắn thú vị.

ĐỊNH DẠNG JSON:
{
"fortune": "Nội dung bói (khoảng 150-200 từ). Sử dụng thẻ <br> để xuống dòng. KHÔNG được tách đoạn bằng khoảng trắng lớn, chỉ xuống dòng đơn."
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

// Usage logging functions
function logUsage(masterType) {
    try {
        const logFile = path.join(process.cwd(), 'usage_log.json');
        let usageData = { total: 0, byMaster: {} };
        
        // Read existing data
        if (fs.existsSync(logFile)) {
            const data = fs.readFileSync(logFile, 'utf8');
            usageData = JSON.parse(data);
        }
        
        // Update counts
        usageData.total += 1;
        usageData.byMaster[masterType] = (usageData.byMaster[masterType] || 0) + 1;
        usageData.lastUsed = new Date().toISOString();
        
        // Write back to file
        fs.writeFileSync(logFile, JSON.stringify(usageData, null, 2));
        
        console.log(`📊 Usage logged: Total=${usageData.total}, ${masterType}=${usageData.byMaster[masterType]}`);
    } catch (error) {
        console.error('Error logging usage:', error);
    }
}

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
    
    // Try to parse using a more robust method
    let imageData = null;
    let imageType = null;
    let masterType = 'funny'; // Default fortune master type
    
    // First, try to extract masterType from the raw buffer
    const bufferStr = buffer.toString('binary');
    
    // Look for masterType in the buffer
    const masterTypeMatch = bufferStr.match(/name="masterType"[^\r\n]*\r\n\r\n([^\r\n]+)/);
    if (masterTypeMatch) {
      masterType = masterTypeMatch[1].trim();
    }
    
    // Parse multipart data for image
    const parts = buffer.toString('binary').split(`--${boundary}`);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Parse image
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
    // Use gemini-2.5-flash as it is the latest stable version
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Validate and get appropriate prompt based on master type
    const validMasters = Object.keys(fortuneMasterPrompts);
    if (!validMasters.includes(masterType)) {
      masterType = 'funny';
    }
    
    const prompt = getFortuneMasterPrompt(masterType);

    // Log usage
    logUsage(masterType);

    // Call Gemini API
    const result = await model.generateContent([
      prompt,
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
      fortuneData = {
        fortune: sanitizePlainText(rawResponse)
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