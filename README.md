# 🔮 Thầy Bói Mystical Fortune

Hệ thống bói toán bằng hình ảnh bàn tay sử dụng AI Gemini và MediaPipe.

## 🚀 Deploy lên Vercel

### 1. Chuẩn bị Environment Variables

Trong Vercel Dashboard → Project Settings → Environment Variables, thêm:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Lấy API key từ: https://makersuite.google.com/app/apikey

### 2. Deploy từ GitHub

1. Push code lên GitHub repository
2. Truy cập [vercel.com](https://vercel.com/)
3. Import project từ GitHub
4. Vercel sẽ tự động detect và deploy

### 3. Cấu trúc API

- `POST /api/fortune-telling` - Bói toán từ hình ảnh bàn tay

### 4. Test API

```bash
# Test fortune endpoint
curl -X POST https://your-app.vercel.app/api/fortune-telling \
  -F "palmImage=@hand.jpg"
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## 📱 Features

- ✅ Camera real-time với MediaPipe hand detection
- ✅ AI phân tích bàn tay bằng Gemini Vision
- ✅ Responsive design
- ✅ Fallback mode khi MediaPipe lỗi
- ✅ HTTPS support cho camera access

## 🔧 Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **AI**: Google Gemini API
- **ML**: MediaPipe Hands
- **Deploy**: Vercel