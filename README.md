# Web Trend - AI Video Topic Generator

## Cấu hình môi trường

Để sử dụng cả OpenAI và Gemini, bạn cần thiết lập các API key trong file `.env`:

```
# Cấu hình API key cho OpenAI
OPENAI_API_KEY=your_openai_api_key

# Cấu hình API key cho Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Cấu hình API key cho Youtube
YOUTUBE_API_KEY=your_youtube_api_key

# Cấu hình session
SESSION_SECRET=your_session_secret
```

## Cách lấy API key

### OpenAI API Key
1. Đăng nhập vào tài khoản OpenAI của bạn tại https://platform.openai.com/
2. Vào mục API Keys
3. Tạo một API key mới và sao chép vào file .env

### Gemini API Key
1. Truy cập Google AI Studio tại https://aistudio.google.com/
2. Đăng nhập bằng tài khoản Google của bạn
3. Vào mục "Get API key"
4. Tạo một API key mới và sao chép vào file .env

## Cài đặt

```bash
npm install
```

## Chạy ứng dụng

```bash
npm start
```

Ứng dụng sẽ chạy tại http://localhost:3000 