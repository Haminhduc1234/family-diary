# YÊU CẦU: CHUYỂN ĐỔI STORAGE TỪ VERCEL BLOB SANG SUPABASE STORAGE CHO REPO IMAGE-GALLERY-STARTER

## 1. MỤC TIÊU DỰ ÁN
Dự án được clone từ mẫu `image-gallery-starter` của Vercel (Next.js App Router).
Nhiệm vụ của bạn là:
- Loại bỏ hoàn toàn sự phụ thuộc vào `@vercel/blob`.
- Thay thế toàn bộ logic lưu trữ (Upload, Fetch danh sách file, Xóa file) sang **Supabase Storage** (sử dụng thư viện `@supabase/supabase-js`).
- Giữ nguyên 100% giao diện Masonry grid, hiệu ứng chuyển cảnh và modal/lightbox xem ảnh toàn màn hình đẹp mắt sẵn có của repo.
- Bổ sung khả năng hỗ trợ hiển thị và phát các tệp **Video** (`.mp4`, `.webm`, `.mov`) bên cạnh hình ảnh.
- Đảm bảo mã nguồn sẵn sàng build và deploy mượt mà lên Vercel.

---

## 2. BIẾN MÔI TRƯỜNG CẦN CẤU HÌNH (.env.local)
Vui lòng tạo hoặc cập nhật file `.env.local.example` và `.env.local` với các biến sau:
```env
NEXT_PUBLIC_SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Sử dụng cho các thao tác server-side nếu cần
NEXT_PUBLIC_SUPABASE_BUCKET=family-media