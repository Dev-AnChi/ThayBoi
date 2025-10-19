# Environment Variables cần thiết

Tạo file `.env` trong thư mục root với nội dung:

```env
# Google Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Vercel Edge Config (for production only)
EDGE_CONFIG=https://edge-config.vercel.com/ecfg_xxxxx?token=yyy
EDGE_CONFIG_ID=ecfg_xxxxx
VERCEL_TOKEN=your_vercel_access_token_here

# Port for local development (optional)
PORT=3000
```

## Lấy các giá trị:

### GEMINI_API_KEY
- Vào https://aistudio.google.com/app/apikey
- Tạo API key mới
- Copy và paste vào

### EDGE_CONFIG
- Vào Vercel Dashboard → Project → Storage
- Click vào `thay-boi-config`
- Copy **Connection String**

### EDGE_CONFIG_ID
- Từ URL của Edge Config page
- Ví dụ: `ecfg_xxxxx`

### VERCEL_TOKEN
- Vào https://vercel.com/account/tokens
- Tạo token mới với Full Access
- Copy và lưu lại (chỉ hiển thị 1 lần!)

## Lưu ý
- File `.env` không được commit lên Git (đã có trong .gitignore)
- Trên Vercel, thêm các biến này vào **Settings → Environment Variables**

