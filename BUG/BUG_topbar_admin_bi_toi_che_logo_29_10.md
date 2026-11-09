# BÁO CÁO GHI NHẬN BUG: TOPBAR TRANG ADMIN BỊ TỐI CHE KHUẤT CHỮ TRÍ TUỆ TRÊN LOGO

- **Ngày ghi nhận:** 29/10/2026
- **Người phát hiện / kiểm thử:** CEO Hiếu
- **Phạm vi ảnh hưởng:** Thanh điều hướng trên cùng (Header Topbar) của Trang Quản trị (`pages/admin.html`), ở chế độ Giao diện Sáng (Light Mode).

---

## 1. Mô tả chi tiết lỗi (Symptom)
Khi truy cập trang Quản trị (`pages/admin.html`) ở chế độ Giao diện Sáng (Light Mode), thanh Header Topbar hiển thị nền màu tối (`#0f172a`), trong khi hệ thống đang áp dụng logo dành cho nền sáng (`logo-light.svg`). Do chữ "TRÍ TUỆ" trong `logo-light.svg` có màu xanh đen tối (`fill="#0F172A"`), dòng chữ này bị chìm hoàn toàn vào nền đen của topbar, người dùng chỉ nhìn thấy biểu tượng mặt trời, chữ "BOOK" và slogan, gây mất thẩm mỹ và che khuất nhận diện thương hiệu.

## 2. Nguyên nhân kỹ thuật (Root Cause)
- **File gây lỗi:** `src/css/admin.css`.
- **Chi tiết sai lệch:**
  1. Trong file `src/css/admin.css`, lớp `.admin-topbar` được khai báo cố định:
     ```css
     .admin-topbar {
       background: var(--dark); /* var(--dark) là #0f172a */
       color: var(--white);
     ```
  2. Ở chế độ Giao diện Sáng (Light Mode), toàn bộ trang Admin mang tone sáng (`#f1f5f9`), và bộ chuyển đổi logo (`src/css/logo.css`) tự động hiển thị `logo-light.svg`.
  3. `logo-light.svg` được thiết kế chuẩn cho nền sáng với chữ "TRÍ TUỆ" có mã màu `#0F172A`. Việc thanh Topbar bị ép màu nền tối `#0F172A` khiến chữ cùng màu với nền, tạo ra hiệu ứng che khuất chữ.

## 3. Biện pháp xử lý (Fix)
- **Chuẩn hóa CSS Topbar Admin ở chế độ Sáng (`src/css/admin.css`):**
  - Chuyển `background` của `.admin-topbar` sang `var(--white)` (nền trắng cao cấp).
  - Bổ sung viền dưới thanh lịch: `border-bottom: 1px solid var(--gray-200); box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);`.
  - Đổi màu nhãn `.admin-badge` sang tone xanh nhạt thanh thoát: `background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd;`.
  - Đổi màu link `.btn-store-link` sang màu xám đậm (`var(--gray-600)`), hover chuyển màu primary (`#4f46e5`) và có nền sáng êm ái.
- **Đồng bộ với Dark Mode (`src/css/dark-theme.css`):**
  - Giữ nguyên topbar tối màu Obsidian `#070b14 !important` khi bật Dark Mode (khi đó hệ thống tự động hoán đổi sang `logo-dark.svg` có chữ "TRÍ TUỆ" màu trắng tinh khôi `#F8FAFC`).
  - Tối ưu màu sắc cho `.admin-badge` và `.btn-store-link` trong Dark Mode để đảm bảo độ tương phản cao.
- **Kiểm thử:**
  - Chạy `npm run build` thành công 100% không phát sinh lỗi.
  - Trên chế độ Sáng: Nền topbar trắng sáng, logo "TRÍ TUỆ BOOK" và slogan "HÀO QUANG KHAI SÁNG" hiển thị sắc nét 100%, không còn bị chìm hay che khuất.
  - Trên chế độ Tối: Hoán đổi sang nền tối vũ trụ và logo phát quang hoàn hảo.

---

TRẠNG THÁI: <ĐÃ SỬA>
