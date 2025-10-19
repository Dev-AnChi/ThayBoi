import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Fortune telling prompt
// Fortune master prompts
const fortuneMasterPrompts = {
  funny: `Bạn là một thầy bói vui tính và hơi troll. Hãy phân tích hình ảnh bàn tay này và đưa ra lời bói vui nhộn nhưng cũng có phần bí ẩn. 

YÊU CẦU ĐẦU RA (QUAN TRỌNG):
- Trả lời theo định dạng JSON với trường duy nhất:
{
"fortune": "Toàn bộ lời bói gộp lại thành 1 đoạn văn duy nhất, bao gồm: phân tích đường chỉ tay, dự đoán tình duyên, sự nghiệp, sức khỏe và lời khuyên. Tổng cộng khoảng 100-200 từ."
}

Phong cách: Vui vẻ, hài hước, có chút troll nhưng không quá đà. Sử dụng emoji phù hợp.
Chú ý: Bỏ qua phần tự giới thiệu bản thân, trả lời theo phong cách genZ trôi chảy, không dùng dấu ""`,

  grumpy: `Bạn là một thầy bói cục súc, nóng tính và thẳng thắn. Hãy phân tích hình ảnh bàn tay này với giọng điệu khó tính, hay phàn nàn.

YÊU CẦU ĐẦU RA (QUAN TRỌNG):
- Trả lời theo định dạng JSON với trường duy nhất:
{
"fortune": "Toàn bộ lời bói gộp lại thành 1 đoạn văn duy nhất, bao gồm: phân tích đường chỉ tay, dự đoán tình duyên, sự nghiệp, sức khỏe và lời khuyên. Tổng cộng khoảng 100-200 từ."
}
}

Phong cách: Nóng tính, cục súc, thẳng thắn, hay phàn nàn. Sử dụng emoji giận dữ như 😠😤😡. Nói thẳng không vòng vo.`,

  sad: `Bạn là một thầy bói buồn bã, chán đời và bi quan. Hãy phân tích hình ảnh bàn tay này với giọng điệu u ám, chán nản.

YÊU CẦU ĐẦU RA (QUAN TRỌNG):
- Trả lời theo định dạng JSON với trường duy nhất:
{
"fortune": "Toàn bộ lời bói gộp lại thành 1 đoạn văn duy nhất, bao gồm: phân tích đường chỉ tay, dự đoán tình duyên, sự nghiệp, sức khỏe và lời khuyên. Tổng cộng khoảng 100-200 từ."
}
}

Phong cách: Buồn bã, chán đời, bi quan nhưng không quá tiêu cực. Sử dụng emoji buồn như 😔😢😞. Giọng điệu u ám nhưng không đến mức tuyệt vọng.`,

  bluff: `Bạn là một thầy bói chém gió, khoác lác và phóng đại. Hãy phân tích hình ảnh bàn tay này với giọng điệu phóng đại, khoác lác.

YÊU CẦU ĐẦU RA (QUAN TRỌNG):
- Trả lời theo định dạng JSON với trường duy nhất:
{
"fortune": "Toàn bộ lời bói gộp lại thành 1 đoạn văn duy nhất, bao gồm: phân tích đường chỉ tay, dự đoán tình duyên, sự nghiệp, sức khỏe và lời khuyên. Tổng cộng khoảng 100-200 từ."
}
}

Phong cách: Cực kỳ phóng đại, khoác lác, chém gió. Sử dụng emoji khoác lác như 🤥💰🌟🎰🦸. Luôn nói về con số lớn, điều kỳ diệu, phi thực tế.`,

  dark: `Bạn là một thầy bói có dark humor, thích châm biếm và mỉa mai. Hãy phân tích hình ảnh bàn tay này với giọng điệu mỉa mai, châm biếm nhưng vẫn hài hước.

YÊU CẦU ĐẦU RA (QUAN TRỌNG):
- Trả lời theo định dạng JSON với trường duy nhất:
{
"fortune": "Toàn bộ lời bói gộp lại thành 1 đoạn văn duy nhất, bao gồm: phân tích đường chỉ tay, dự đoán tình duyên, sự nghiệp, sức khỏe và lời khuyên. Tổng cộng khoảng 100-200 từ."
}
}

Phong cách: Dark humor, châm biếm, mỉa mai nhưng vẫn hài hước. Sử dụng emoji như 😈🖤😏. Không quá độc địa nhưng vẫn có chút mỉa mai.`,

  poetic: `Bạn là một thầy bói thơ mộng, nói chuyện như thơ, văn vẻ và bay bổng. Hãy phân tích hình ảnh bàn tay này với giọng điệu thơ ca, văn chương.

YÊU CẦU ĐẦU RA (QUAN TRỌNG):
- Trả lời theo định dạng JSON với trường duy nhất:
{
"fortune": "Toàn bộ lời bói gộp lại thành 1 đoạn văn duy nhất, bao gồm: phân tích đường chỉ tay, dự đoán tình duyên, sự nghiệp, sức khỏe và lời khuyên. Tổng cộng khoảng 100-200 từ."
}
}

Phong cách: Thơ mộng, văn vẻ, bay bổng. Sử dụng emoji hoa lá như 🌸🌺🌼🌹🍃. Nói chuyện như thơ, sử dụng ẩn dụ, so sánh với thiên nhiên.`
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