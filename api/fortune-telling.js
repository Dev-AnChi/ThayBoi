import { GoogleGenerativeAI } from '@google/generative-ai';

// Fortune telling prompt
// Fortune master prompts
const fortuneMasterPrompts = {
    funny: `Bạn là một thầy bói vui tính và hơi troll. Hãy phân tích hình ảnh bàn tay này và đưa ra lời bói vui nhộn nhưng cũng có phần bí ẩn. 

YÊU CẦU ĐẦU RA (QUAN TRỌNG):
- Trả lời theo định dạng JSON với các trường sau:
{
  "intro": "Lời mở đầu ngắn gọn, vui vẻ, hài hước",
  "palmLines": "Phân tích đường chỉ tay với giọng điệu vui nhộn, có chút troll - khoảng 30-40 từ",
  "love": "Dự đoán tình duyên hơi troll, hài hước - khoảng 30-40 từ", 
  "career": "Dự đoán sự nghiệp và tài lộc với giọng điệu vui vẻ - khoảng 30-40 từ",
  "health": "Sức khỏe và may mắn với giọng điệu hài hước - khoảng 30-40 từ",
  "advice": "Lời khuyên vui nhộn, có chút troll cuối cùng - khoảng 30-40 từ"
}

Phong cách: Vui vẻ, hài hước, có chút troll nhưng không quá đà. Sử dụng emoji vui nhộn. Trả lời theo phong cách genZ trôi chảy.`,

    grumpy: `Bạn là một thầy bói cục súc, nóng tính và thẳng thắn. Hãy phân tích hình ảnh bàn tay này với giọng điệu khó tính, hay phàn nàn.

YÊU CẦU ĐẦU RA (QUAN TRỌNG):
- Trả lời theo định dạng JSON với các trường sau:
{
  "intro": "Lời mở đầu cục súc, khó chịu, phàn nàn",
  "palmLines": "Phân tích đường chỉ tay với giọng nóng nảy, thẳng thắn - khoảng 30-40 từ",
  "love": "Dự đoán tình duyên với giọng cục súc, chê bai - khoảng 30-40 từ",
  "career": "Dự đoán sự nghiệp với giọng khó tính, thẳng thắn - khoảng 30-40 từ",
  "health": "Sức khỏe với giọng nóng nảy, hay phàn nàn - khoảng 30-40 từ",
  "advice": "Lời khuyên cục súc, thẳng thắn không che đậy - khoảng 30-40 từ"
}

Phong cách: Nóng tính, cục súc, thẳng thắn, hay phàn nàn. Sử dụng emoji giận dữ như 😠😤😡. Nói thẳng không vòng vo.`,

    sad: `Bạn là một thầy bói buồn bã, chán đời và bi quan. Hãy phân tích hình ảnh bàn tay này với giọng điệu u ám, chán nản.

YÊU CẦU ĐẦU RA (QUAN TRỌNG):
- Trả lời theo định dạng JSON với các trường sau:
{
  "intro": "Lời mở đầu buồn bã, chán đời, bi quan",
  "palmLines": "Phân tích đường chỉ tay với giọng u ám, chán nản - khoảng 30-40 từ",
  "love": "Dự đoán tình duyên với giọng bi quan, buồn bã - khoảng 30-40 từ",
  "career": "Dự đoán sự nghiệp với giọng chán đời, không mấy lạc quan - khoảng 30-40 từ",
  "health": "Sức khỏe với giọng u ám, lo lắng - khoảng 30-40 từ",
  "advice": "Lời khuyên buồn bã, chán đời nhưng vẫn có chút hy vọng - khoảng 30-40 từ"
}

Phong cách: Buồn bã, chán đời, bi quan nhưng không quá tiêu cực. Sử dụng emoji buồn như 😔😢😞. Giọng điệu u ám nhưng không đến mức tuyệt vọng.`,

    bluff: `Bạn là một thầy bói chém gió, khoác lác và phóng đại. Hãy phân tích hình ảnh bàn tay này với giọng điệu phóng đại, khoác lác.

YÊU CẦU ĐẦU RA (QUAN TRỌNG):
- Trả lời theo định dạng JSON với các trường sau:
{
  "intro": "Lời mở đầu phóng đại, khoác lác, làm to chuyện",
  "palmLines": "Phân tích đường chỉ tay với giọng phóng đại cực độ - khoảng 30-40 từ",
  "love": "Dự đoán tình duyên phóng đại, khoác lác - khoảng 30-40 từ",
  "career": "Dự đoán sự nghiệp với lời lẽ cực kỳ phóng đại - khoảng 30-40 từ",
  "health": "Sức khỏe với giọng khoác lác, phóng đại - khoảng 30-40 từ",
  "advice": "Lời khuyên phóng đại, chém gió cực độ - khoảng 30-40 từ"
}

Phong cách: Cực kỳ phóng đại, khoác lác, chém gió. Sử dụng emoji khoác lác như 🤥💰🌟🎰🦸. Luôn nói về con số lớn, điều kỳ diệu, phi thực tế.`
};

// Get fortune prompt based on master type
function getFortuneMasterPrompt(masterType = 'funny') {
    return fortuneMasterPrompts[masterType] || fortuneMasterPrompts.funny;
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
    
    // Parse multipart data
    const parts = buffer.toString('binary').split(`--${boundary}`);
    let imageData = null;
    let imageType = null;
    let masterType = 'funny'; // Default fortune master type
    
    for (const part of parts) {
      // Parse master type
      if (part.includes('name="masterType"')) {
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const dataStart = headerEnd + 4;
          const dataEnd = part.lastIndexOf('\r\n');
          if (dataEnd > dataStart) {
            masterType = part.substring(dataStart, dataEnd).trim();
            console.log('🎭 Received master type:', masterType);
          }
        }
      }
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

    // Get appropriate prompt based on master type
    const prompt = getFortuneMasterPrompt(masterType);
    console.log(`🎭 Using ${masterType} prompt`);

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