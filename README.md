# KitaM

Pixel-fantasy AI Presentation Workshop.

## B1 hiện tại
- Giao diện pixel fantasy màu đậm theo reference.
- Trang chủ / Kho mẫu / Tạo bài / Dự án / Cài đặt.
- Upload template cục bộ: PPT/PPTX/PDF/DOC/DOCX/ảnh.
- Chọn thư mục bằng File System Access API nếu trình duyệt hỗ trợ.
- Lưu template + project bằng localStorage.
- PWA shell + Service Worker.
- Tự kiểm tra/cập nhật cache khi code được deploy lại trên GitHub Pages.

## Roadmap
B2: phân tích template PDF/PPTX.
B3: AI content planner + slide mapping.
B4: web search + nguồn tham khảo.
B5: AI image search/selection.
B6: slide editor.
B7: export PPTX/PDF.
B8: backend/API + cloud sync.

## Lưu ý
GitHub Pages không nên chứa API key AI/search. Khi nối AI thật, dùng backend/serverless proxy.
Trình duyệt không được tự ý truy cập thư mục máy tính; người dùng phải chọn và cấp quyền.
