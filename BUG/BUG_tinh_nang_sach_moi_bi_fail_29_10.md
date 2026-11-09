# BÁO CÁO GHI NHẬN BUG: TÍNH NĂNG SÁCH MỚI BỊ FAIL, DỮ LIỆU GIẢ VÀ THIẾU QUYỀN CẬP NHẬT

- **Ngày ghi nhận:** 29/10/2026
- **Người phát hiện / kiểm thử:** CEO Hiếu
- **Phạm vi ảnh hưởng:**
  - Trang chủ (`index.html` & `src/js/home.js`): Mục "Sách Mới Nhập Kho" và huy hiệu `NEW!`.
  - Cổng Quản trị Admin (`pages/admin.html` & `src/js/admin.js`): Form Thêm/Sửa sách thiếu trường ngày nhập kho và toggle Sách mới.
  - Kênh Người Bán (`pages/seller.html` & `src/js/seller.js`): Form Đăng bán/Sửa sách thiếu quyền điều chỉnh ngày nhập kho và toggle Sách mới.
  - Cơ sở dữ liệu (`db.json`): Các sách thêm mới qua Admin không được gán `importDate` hoặc `isNew`, dẫn đến không bao giờ lọt vào danh sách Sách Mới.

---

## 1. Mô tả chi tiết lỗi (Symptom)
- Khi thêm sách mới qua trang Admin hoặc Seller, sách không xuất hiện ở mục "Sách Mới Nhập Kho" trên Trang chủ.
- Dữ liệu mục "Sách Mới" trên trang chủ chỉ lấy cố định Top 4 theo `importDate` cũ trong `db.json`, nếu sách cũ cách đây nhiều tháng nhưng nằm trong Top 4 thì vẫn bị gắn mác "Sách Mới", trong khi sách mới tạo không có ngày nhập nên bị coi là thời gian = 0.
- Cả Admin lẫn Người Bán đều không có quyền kiểm soát, tùy chỉnh hoặc gán trạng thái Sách Mới (`isNew`) hay thay đổi ngày nhập kho (`importDate`).

## 2. Nguyên nhân kỹ thuật (Root Cause)
1. **Thiếu trường dữ liệu trong Form Admin & Seller:**
   - Trong `pages/admin.html` và `pages/seller.html`, form nhập liệu không có ô chọn `importDate` và không có checkbox đánh dấu `isNew` (Sách Mới).
2. **Xử lý lưu dữ liệu chưa đồng bộ:**
   - Trong `src/js/admin.js`, khi tạo/sửa sách không lưu `importDate` và `isNew`.
   - Trong `src/js/seller.js`, `importDate` luôn bị gán cứng bằng `new Date().toISOString()` mà không cho người bán chỉnh sửa hay cài đặt.
3. **Thuật toán xác định Sách Mới tại `src/js/home.js`:**
   - Hàm `renderNewProducts` chỉ lấy cứng 4 sản phẩm theo ngày nhập cũ, không hỗ trợ cờ `isNew: true` do Admin/Seller chỉ định, và không tự động tính toán thời hạn hợp lệ (ví dụ: trong vòng 30 ngày nhập kho gần nhất).

## 3. Biện pháp xử lý (Fix)
1. **Bổ sung giao diện Form Thêm / Sửa Sách (Admin & Seller):**
   - Thêm ô chọn ngày nhập kho: `<input type="date" id="bookImportDate">` / `<input type="date" id="sellerBookImportDate">` (mặc định lấy ngày hiện tại khi thêm mới).
   - Thêm checkbox tùy chọn: `✨ Đặt làm Sách Mới (Huy hiệu NEW!)` (`#bookIsNew` / `#sellerBookIsNew`).
2. **Cập nhật Logic Lưu Sách trong JS (`admin.js` & `seller.js`):**
   - Lưu trữ đầy đủ `importDate` (chuẩn ISO / YYYY-MM-DD) và `isNew` (boolean) vào cơ sở dữ liệu.
   - Khi chỉnh sửa sách, nạp đúng ngày nhập và trạng thái `isNew` lên form.
   - Hiển thị nhãn `✨ Sách mới` và ngày nhập trên bảng quản lý kho sách của cả Admin lẫn Seller.
3. **Nâng cấp Logic Trang Chủ (`src/js/home.js`):**
   - Một cuốn sách được xác định là Sách Mới nếu:
     - Được Admin/Seller gán trực tiếp `isNew: true` HOẶC
     - Có ngày nhập `importDate` trong vòng 30 ngày gần nhất (tính từ thời điểm hiện tại).
   - Danh sách "Sách Mới Nhập Kho" ưu tiên hiển thị các cuốn sách mới thực tế này theo thứ tự thời gian nhập kho giảm dần.
4. **Kiểm thử & Xác nhận:**
   - Chạy `npm run build` đạt 0 lỗi.
   - Kiểm tra tính năng thêm, sửa ngày nhập, bật/tắt Sách Mới ở cả Admin và Seller, hiển thị chính xác trên Trang Chủ.

---

TRẠNG THÁI: <ĐÃ SỬA>
