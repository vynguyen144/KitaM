# KitaM

Pixel-fantasy AI Presentation Workshop.

## B2 hiện tại — Template thật
- Upload PPT/PPTX/PDF/DOC/DOCX/ảnh.
- File gốc của template được lưu trong **IndexedDB** trên thiết bị, không chỉ lưu metadata.
- PDF: tạo preview trang bằng PDF.js và có màn hình xem nhiều trang.
- PPTX: đọc file OOXML trực tiếp trong trình duyệt, đếm slide và trích xuất text để tạo preview cấu trúc.
- DOCX: file được giữ an toàn để xử lý ở bước sau.
- Ảnh: preview trực tiếp.
- Nút **Chọn thư mục**: nếu trình duyệt hỗ trợ File System Access API, KitaM có thể đọc các file template phù hợp trong thư mục người dùng đã cấp quyền.
- Có thể chọn một template rồi chuyển sang màn hình Tạo bài; template đã chọn được ghi vào project.
- Có thể xóa từng template thật.
- Xóa dữ liệu cục bộ sẽ xóa cả file trong IndexedDB.
- Service Worker đã tăng version cache để nhận code B2 mới.

## B3 hiện tại — Content Planner
- Chọn template ngay trong màn hình tạo bài.
- Tự chia nội dung thành dàn ý slide dựa trên số slide yêu cầu.
- Tự gợi ý layout: COVER, TITLE + CONTENT, CARDS, IMAGE + TEXT, TIMELINE, SUMMARY.
- Dàn ý được lưu cùng project để B6 có thể dùng làm dữ liệu editor.
- Đây là planner cục bộ theo luật; chưa gọi AI/API thật. AI tìm web và tổng hợp nguồn sẽ ở B4, backend/API ở B8.

## Roadmap
B3: AI content planner + slide mapping.
B4: web search + nguồn tham khảo.
B5: AI image search/selection.
B6: slide editor.
B7: export PPTX/PDF.
B8: backend/API + cloud sync.

## Lưu ý kỹ thuật
- GitHub Pages chỉ phục vụ frontend. API key AI/search không được nhúng trực tiếp vào client; khi nối AI thật cần backend/serverless proxy.
- Browser không được tự ý đọc ổ đĩa. Người dùng phải chọn file hoặc cấp quyền cho thư mục.
- IndexedDB là bộ nhớ cục bộ của trình duyệt. Template chưa được đồng bộ lên cloud.
- PPTX preview hiện là **structural preview** (text + số slide), chưa phải renderer 100% giống PowerPoint. Việc render đầy đủ layout, font, hình, animation sẽ được xử lý ở các bước editor/export sau.
- PDF preview dùng thư viện PDF.js từ CDN nên lần đầu cần có Internet.

## B1 → B2
B1 chỉ lưu metadata template bằng localStorage. B2 chuyển file thật sang IndexedDB để kiến trúc phía sau có thể đọc file và phân tích nội dung.
