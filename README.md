# Family Album - Next.js & Supabase Storage

Website Album nhật ký gia đình lưu trữ trên **Supabase Storage** (thay vì Vercel Blob) với khả năng mở rộng mạnh mẽ, hỗ trợ cả hình ảnh và video (.mp4, .webm, .mov).

## Tính năng nổi bật
- Giữ nguyên 100% giao diện masonry grid, hiệu ứng chuyển cảnh mượt mà và modal/lightbox xem ảnh/video toàn màn hình với framer-motion.
- Gỡ bỏ hoàn toàn `@vercel/blob`, tích hợp trực tiếp Supabase Storage thông qua `@supabase/supabase-js`.
- Hỗ trợ đầy đủ tệp Video (`.mp4`, `.webm`, `.mov`) và Ảnh (`.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.gif`).
- Tự động tạo ảnh làm mờ (blur placeholder) bằng `sharp` cho hình ảnh để tải trang siêu tốc.
- Hỗ trợ tải về trực tiếp hình ảnh và video.
- Sẵn sàng các hàm API / tiện ích phục vụ Upload, Fetch danh sách file, Xóa file trong Supabase Storage.
- Sẵn sàng build và deploy mượt mà lên Vercel.

## Cấu hình Biến môi trường (.env.local)

Sao chép `.env.local.example` thành `.env.local`:
```bash
cp .env.local.example .env.local
```

Điền các thông tin từ Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Sử dụng cho các thao tác server-side nếu cần
NEXT_PUBLIC_SUPABASE_BUCKET=family-media
```

> **Lưu ý**: Hãy đảm bảo bucket `family-media` trên Supabase đã được bật chế độ **Public bucket** (hoặc cấu hình Storage Policies phù hợp để cho phép đọc file công khai).

## Chạy dự án ở môi trường cục bộ (Local Development)

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt để trải nghiệm.

## Build dự án

```bash
npm run build
```
