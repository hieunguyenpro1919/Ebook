# BÁO CÁO GHI NHẬN BUG: HEADER SELLER PORTAL BỊ DỒN MỘT CỤC (LỖI LAYOUT THANH TOPBAR)

- **Ngày ghi nhận:** 27/10/2026
- **Người phát hiện / kiểm thử:** CEO Hiếu
- **Phạm vi ảnh hưởng:** Thanh điều hướng trên cùng (Header Topbar) của Kênh Người Bán (`pages/seller.html`).

---

## 1. Mô tả chi tiết lỗi (Symptom)
Khi truy cập trang Kênh Người Bán (`pages/seller.html`), thanh Header trên cùng hiển thị dị dạng: Logo, Badge tên Shop (`🏪 NXB TRẺ OFFICIAL`), Nút đổi giao diện Dark/Light, Link xem trang mua sắm và Nút Đăng xuất bị dồn dính thành một cụm ở góc trái màn hình, không tách sang hai đầu (Logo bên trái, cụm hành động bên phải) như tiêu chuẩn của trang Admin.

## 2. Nguyên nhân kỹ thuật (Root Cause)
- **File gây lỗi:** `pages/seller.html`.
- **Chi tiết sai lệch class:**
  1. Trong `pages/seller.html`, thanh Header được khai báo là:
     ```html
     <header class="admin-header seller-header">
         <div class="container admin-nav">
     ```
  2. Tuy nhiên, trong hệ thống CSS (`src/css/admin.css`), bộ quy tắc flexbox dàn đều hai đầu (`justify-content: space-between; align-items: center;`) được đặt tên chuẩn là:
     - Header: `.admin-topbar`
     - Container con: `.admin-topbar-inner`
  3. Class `.admin-nav` không tồn tại trong CSS, khiến container hoạt động như một khối `block` thông thường, không kích hoạt flexbox. Toàn bộ các phần tử con (`.admin-brand` và `.admin-actions`) bị đẩy dồn sang lề trái và rớt dòng dính vào nhau.

## 3. Biện pháp xử lý (Fix)
- **Chuẩn hóa cấu trúc HTML (`pages/seller.html`):**
  - Đổi thẻ header thành: `<header class="admin-topbar seller-header">`.
  - Đổi container con thành: `<div class="container admin-topbar-inner">`.
  - Cụm thương hiệu bên trái sử dụng flexbox chuẩn: `<div style="display: flex; align-items: center; gap: 12px;">`.
- **Bổ sung CSS bảo vệ trong `src/css/seller.css`:**
  - Bổ sung định nghĩa rõ ràng cho `.seller-header` và `.admin-topbar-inner` để bảo đảm luôn `display: flex; justify-content: space-between; align-items: center; width: 100%;`.
- **Kiểm thử:**
  - Chạy `npm run build` xác nhận build thành công với 0 lỗi.
  - Giao diện Header thanh thoát, logo và badge nằm gọn gàng bên trái, các nút điều khiển căn chuẩn lề phải.

---

TRẠNG THÁI: <ĐÃ SỬA>
