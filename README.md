# TikTok Video Downloader

Dự án gồm Chrome Extension và local download server. Server dùng `yt-dlp` xử lý CDN, token và stream video về Chrome.

## Cài vào Chrome

1. Mở `chrome://extensions`.
2. Bật **Developer mode**.
3. Chọn **Load unpacked**.
4. Chọn thư mục `ChromeExtension/Tiktok Video Downloader`.
5. Mở PowerShell tại thư mục root và chạy server:

```powershell
npm start
```

6. Mở TikTok và dùng nút **Tải** trên card video.

## Cấu trúc

- `ChromeExtension/Tiktok Video Downloader/`: mã Chrome Extension.
- `server.js`: local bridge dùng `yt-dlp` để tải video.
- `server-README.md`: hướng dẫn server.

## Giới hạn

Server local cần chạy trước khi bấm tải. Chỉ tải nội dung bạn có quyền sử dụng và tuân thủ điều khoản của TikTok.
