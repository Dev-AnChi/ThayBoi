# Hướng dẫn cấu hình Vercel Edge Config

## Bước 1: Tạo Vercel Access Token

1. Vào https://vercel.com/account/tokens
2. Click "Create Token"
3. Nhập tên: `thay-boi-api-token`
4. Chọn Scope: **Full Access** (hoặc ít nhất có quyền write Edge Config)
5. Chọn Expiration: **No Expiration** (để không bao giờ hết hạn)
6. Click "Create"
7. **Copy token này** - bạn sẽ không thấy lại được!

## Bước 2: Lấy Edge Config ID

1. Vào project của bạn trên Vercel
2. Vào tab **Storage**
3. Click vào `thay-boi-config`
4. Ở URL sẽ có dạng: `https://vercel.com/.../storage/edge-config/ecfg_xxxxx`
5. Copy phần `ecfg_xxxxx` - đây là **EDGE_CONFIG_ID**

## Bước 3: Thêm Environment Variables trên Vercel

1. Vào project **thay-boi** trên Vercel
2. Vào **Settings** → **Environment Variables**
3. Thêm các biến sau:

### Biến 1: EDGE_CONFIG
- **Name**: `EDGE_CONFIG`
- **Value**: (Lấy từ Storage → thay-boi-config → Connection String)
  - Dạng: `https://edge-config.vercel.com/ecfg_xxxxx?token=yyy`
- **Environment**: Production, Preview, Development (chọn tất cả)

### Biến 2: EDGE_CONFIG_ID  
- **Name**: `EDGE_CONFIG_ID`
- **Value**: `ecfg_xxxxx` (ID bạn copy ở Bước 2)
- **Environment**: Production, Preview, Development (chọn tất cả)

### Biến 3: VERCEL_TOKEN
- **Name**: `VERCEL_TOKEN`
- **Value**: (Token bạn tạo ở Bước 1)
- **Environment**: Production, Preview, Development (chọn tất cả)

### Biến 4: GEMINI_API_KEY (nếu chưa có)
- **Name**: `GEMINI_API_KEY`
- **Value**: (API key của bạn từ Google AI Studio)
- **Environment**: Production, Preview, Development (chọn tất cả)

## Bước 4: Khởi tạo giá trị trong Edge Config

1. Vào **Storage** → `thay-boi-config`
2. Click **"Add Item"** hoặc edit existing
3. Thêm key-value:
   - **Key**: `usage_count`
   - **Value**: `0` (số 0)
4. Click **Save**

## Bước 5: Deploy lên Vercel

Sau khi thêm tất cả environment variables:

```bash
# Commit code
git add .
git commit -m "Add Edge Config for usage counter"
git push

# Hoặc deploy trực tiếp
vercel --prod
```

## Bước 6: Test

1. Mở website của bạn
2. Kiểm tra góc dưới bên trái xem có hiển thị "Số lượng sử dụng: 0" không
3. Thử xem bói 1 lần
4. Số lượng phải tăng lên 1

## Troubleshooting

### Nếu counter không hiển thị:
1. Mở DevTools Console (F12)
2. Xem có lỗi gì không
3. Check xem API `/api/get-usage` có chạy không

### Nếu counter không tăng:
1. Check API `/api/increment-usage` có lỗi không
2. Kiểm tra VERCEL_TOKEN có đúng không
3. Kiểm tra EDGE_CONFIG_ID có đúng không

### Xem logs:
- Vào Vercel Dashboard
- Click project → **Logs** tab
- Filter theo `/api/increment-usage` hoặc `/api/get-usage`

## Cấu trúc API

### GET /api/get-usage
Trả về số lượt sử dụng hiện tại

### POST /api/increment-usage  
Tăng counter lên 1 và trả về giá trị mới

## Lưu ý

- Edge Config có giới hạn: 512KB storage
- Mỗi update qua API có rate limit
- Counter này đếm số lần **xem bói thành công** (không đếm lượt truy cập trang)
- Dữ liệu lưu trên Vercel Edge Config nên rất nhanh và reliable

## Support

Nếu gặp vấn đề, check:
1. Environment variables đã set đúng chưa
2. Edge Config có key `usage_count` chưa
3. Token có quyền write Edge Config chưa

