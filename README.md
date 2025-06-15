# Web Trend - AI Video Topic Generator

## Cấu hình môi trường

Để sử dụng ứng dụng, bạn cần thiết lập các cấu hình trong file `.env`:

```
# Cấu hình API key cho Youtube (cho tính năng tìm kiếm xu hướng)
YOUTUBE_API_KEY=your_youtube_api_key

# Cấu hình session
SESSION_SECRET=your_session_secret
```

Đặc biệt, ứng dụng sẽ sử dụng **Google Vertex AI** với mô hình Gemini 2.5 Pro qua file credentials `gemini.json`:

## Chuẩn bị cho Vertex AI

1. Tạo một service account trong Google Cloud Console
2. Gán quyền "Vertex AI User" cho service account này
3. Tạo và tải xuống key JSON cho service account
4. Đổi tên key JSON thành `gemini.json` và đặt trong thư mục gốc của dự án

Tài liệu về Vertex AI: https://cloud.google.com/vertex-ai/docs/generative-ai/start/quickstarts/api-quickstart

## Cài đặt

```bash
npm install
```

## Chạy ứng dụng

```bash
npm start
```

Ứng dụng sẽ chạy tại http://localhost:3000 