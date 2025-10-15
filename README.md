# 🔮 Thầy Bói Thần Thánh - Mystical Fortune Teller

Một hệ thống xem bói vui nhộn và hơi troll sử dụng AI để phân tích đường chỉ tay và đưa ra lời bói về vận mệnh của bạn!

A fun and slightly trolling fortune telling system that uses AI to analyze palm lines and provide mystical destiny readings!

## ✨ Tính Năng / Features

- 🖐️ **Quét hình ảnh bàn tay** - Upload và phân tích hình ảnh bàn tay với vân tay
- 🤖 **AI Gemini** - Sử dụng Google Gemini AI để tạo lời bói thông minh và vui nhộn
- 🎨 **Hiệu ứng đẹp mắt** - Giao diện mystical với animations mượt mà
- 😄 **Phong cách vui & troll** - Lời bói hài hước, bí ẩn và có chút troll
- 🌍 **Đa ngôn ngữ** - Hỗ trợ Tiếng Việt, English, và 日本語
- 📱 **Responsive** - Hoạt động tốt trên mọi thiết bị

## 🚀 Cài Đặt / Installation

### 1. Clone repository

```bash
git clone <your-repo-url>
cd ThayBoi
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình API Key

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Mở file `.env` và thêm Gemini API key của bạn:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

**Lấy Gemini API Key:**
1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Đăng nhập với Google account
3. Tạo API key mới
4. Copy và paste vào file `.env`

### 4. Chạy ứng dụng

**Development mode (với nodemon):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## 📖 Hướng Dẫn Sử Dụng / Usage

1. **Mở trình duyệt** và truy cập `http://localhost:3000`
2. **Chọn ngôn ngữ** yêu thích của bạn (🇻🇳/🇬🇧/🇯🇵)
3. **Tải lên ảnh bàn tay** - Chụp ảnh bàn tay với đường chỉ tay rõ ràng
4. **Nhấn "Bắt đầu xem bói"** và chờ đợi...
5. **Đọc vận mệnh** của bạn! 
6. **Chia sẻ** kết quả với bạn bè (nếu muốn)

## 🎯 Công Nghệ / Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Multer** - File upload handling
- **Google Generative AI** - Gemini API integration
- **dotenv** - Environment variables

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with animations
- **JavaScript (Vanilla)** - Interactivity
- **Google Fonts** - Cinzel & Poppins fonts

## 📁 Cấu Trúc Project / Project Structure

```
ThayBoi/
├── public/
│   ├── index.html      # Frontend HTML
│   ├── styles.css      # CSS với animations
│   └── app.js          # JavaScript logic
├── uploads/            # Thư mục tạm cho ảnh upload
├── server.js           # Express server + Gemini AI
├── package.json        # Dependencies
├── .env.example        # Mẫu cấu hình
├── .gitignore         # Git ignore rules
└── README.md          # Tài liệu này
```

## 🎨 Tính Năng Đặc Biệt / Special Features

### Animations
- ⭐ Animated starry background
- 🔮 Rotating crystal ball loading animation
- ✨ Gradient text effects
- 💫 Smooth transitions và hover effects

### Easter Egg
Thử nhập **Konami Code** (↑ ↑ ↓ ↓ ← → ← → B A) để khám phá bí mật! 🎉

### Keyboard Shortcuts
- `Enter` - Bắt đầu xem bói (khi đã có ảnh)
- `Escape` - Quay lại và xem bói mới

## 🛠️ Development

### Scripts
```bash
npm start      # Chạy server (production)
npm run dev    # Chạy server với nodemon (development)
```

### Environment Variables
```env
GEMINI_API_KEY=<your-api-key>  # Required: Gemini API key
PORT=3000                       # Optional: Server port (default: 3000)
```

## 🔒 Bảo Mật / Security

- ✅ File upload validation (type & size)
- ✅ Tự động xóa ảnh sau khi xử lý
- ✅ CORS enabled
- ✅ Environment variables cho sensitive data
- ⚠️ **Lưu ý:** Đừng commit file `.env` vào Git!

## 📝 License

MIT License - Feel free to use and modify!

## 🙏 Credits

- **Google Gemini AI** - For the amazing AI capabilities
- **Google Fonts** - Cinzel & Poppins fonts
- **You** - For believing in mystical AI fortune telling! 😄

## ⚠️ Disclaimer

Ứng dụng này chỉ để giải trí và vui chơi! Đừng quá nghiêm túc với lời bói nhé! 😉

This app is for entertainment purposes only! Don't take the fortune readings too seriously! 😉

---

Made with ❤️ and ✨ AI Magic

🔮 **May the stars guide your path!** 🔮

