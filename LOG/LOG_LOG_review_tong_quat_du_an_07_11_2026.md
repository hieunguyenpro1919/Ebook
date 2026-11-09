# LOG REVIEW TỔNG QUÁT DỰ ÁN `nhasach`

## 1. Mục tiêu phiên làm việc
Review toàn bộ dự án đồ án JavaScript `nhasach` (thương mại điện tử bán sách online) để nắm bắt tình trạng hiện tại, tính năng đã triển khai, điểm mạnh, điểm cần cải thiện và các lỗi/rủi ro bảo mật. Ghi nhận dưới dạng cuốn nhật ký phiên làm việc theo `RULE_LOG_PROJECT.md`.

## 2. Bảng tổng quan thay đổi (phiên review)
Không có thay đổi mã nguồn trong phiên này. Phiên chỉ thực hiện review và ghi nhận tình trạng hiện tại.

| STT | Nội dung review | File / Vị trí liên quan | Ghi chú |
|-----|----------------|------------------------|---------|
| 1 | Cấu trúc dự án & công nghệ | `package.json`, `vite.config.js`, `AGENTS.md` | Frontend Vite + ES Modules, mock API json-server (port 3000), chưa có Backend Node.js thực tế |
| 2 | Cấu hình API | `src/api/client.js` | `baseURL = http://localhost:3000`, axios, timeout 5000ms |
| 3 | Dịch vụ nghiệp vụ | `src/services/` (14 module) | auth, product, cart, order, review, wishlist, coupon, sale, category, menu, notification, internalChat, ai, bot |
| 4 | Controller theo trang | `src/js/` (14 module) | home, detail, cart, login, register, admin, seller, profile, orders, wishlist, notificationBell, internalChat, chatWidget, themeToggle |
| 5 | Trang HTML | `pages/` (9 trang) | admin, cart, dangky, login, orders, product-detail, profile, seller, wishlist |
| 6 | CSS | `src/css/` (15 stylesheet) | style, dark-theme, auth, cart, detail, admin, seller, profile, orders, wishlist, chatbot, internalChat, notifications, logo, excelImport |
| 7 | Dữ liệu mẫu | `db.json` | categories, products (52 mục), user (admin/seller/customer), orders, saleConfig, ... |
| 8 | Ghi nhận BUG | `BUG/` (5 file) | Tất cả đánh dấu `<ĐÃ SỬA>` (scroll trang chủ, sách mới, topbar admin, modal seller, header seller) |
| 9 | Ghi nhận LOG | `LOG/` (4 file + rule) | Tuân thủ `RULE_LOG_PROJECT.md` |

## 3. Chi tiết kỹ thuật từng phần

### 3.1. Khách hàng (Frontend)
- **Trang chủ:** Hero slider tự động (3.5s/slide), Flash Sale với đếm ngược real-time (giây), mục Sách Mới Nhập Kho, Sách Nổi Bật, carousels phân thể loại (lazy render khi cuộn, chunk 5 cuốn), tìm kiếm thời gian thực với nút "Xem thêm" (8 cuốn/lượt).
- **Chi tiết sản phẩm:** Xem tồn kho, giá sale/gốc, sao đánh giá, bình luận & trả lời lồng nhau, Like bình luận, thêm giỏ hàng, mua ngay, yêu thích, chat với shop.
- **Giỏ hàng & Thanh toán:** Thêm/sửa số lượng/xóa, kiểm tra tồn kho, phí ship (miễn phí trên 250k), mã giảm giá (coupon: percent/fixed/shipping), thanh toán COD và VietQR (giả lập đối soát 5 giây), xuất đơn hàng, modal thành công.
- **Tài khoản:** Đăng nhập/đăng ký, khôi phục mật khẩu qua OTP demo (3 bước), hồ sơ cá nhân, lịch sử đơn hàng, danh sách yêu thích.
- **Giao diện:** Chế độ Sáng/Tố (localStorage), notification bell, chatbot AI, dark mode toggle.

### 3.2. Quản trị viên (Admin)
- Kiểm tra quyền `role === 'admin'` trước khi vào trang.
- Dashboard thống kê (số sách, tồn kho, đơn hàng, doanh thu, cảnh báo kho).
- Quản lý sách (thêm/sửa/xóa, nhập kho nhanh, upload ảnh, xuất Excel), đơn hàng (xem chi tiết, cập nhật trạng thái, xóa), thể loại, người dùng.
- Cấu hình Flash Sale (bắt đầu/dừng đợt sale nhanh, chỉnh campaign).

### 3.3. Người bán (Seller)
- Kiểm tra quyền `role === 'seller'`.
- Quản lý sách của gian hàng riêng, đơn hàng liên quan đến shop, chuyển trạng thái đơn (Đóng gói / Giao hàng), cập nhật hồ sơ gian hàng, nhập sách từ file Excel.

## 4. Điểm mạnh
- Cấu trúc module rõ ràng: tách controller (DOM/sự kiện), service (nghiên cứu & gọi API), utility (tiện ích dùng chung).
- Tính năng đầy đủ cho đồ án học tập: khách hàng–người bán–quản trị, thanh toán giả lập, đánh giá, khuyến mãi, xuất Excel, dark mode.
- Xử lý UX chi tiết: đếm ngược real-time, lazy render carousel, kiểm tra tồn kho trước khi thêm giỏ, feedback thành công/lỗi, quick-fill tài khoản demo.
- Tuân thủ quy tắc ghi nhận: có thư mục `BUG/` và `LOG/` với quy tắc rõ ràng.

## 5. Điểm cần cải thiện & rủi ro (ưu tiên cao → thấp)

### Bảo mật (ưu tiên cao nhất khi xây Backend Node.js thực tế)
- Mật khẩu lưu dạng plaintext trong `db.json` và truyền qua query params `GET /user?email=&password=` (`src/services/authService.js`, dòng 11-13).
- Không có bảo vệ CSRF/XSS token cho các yêu cầu thay đổi dữ liệu (POST/PATCH/DELETE).
- Quyền truy cập chỉ kiểm tra ở client (`admin.js`, `seller.js` kiểm tra `localStorage` rồi `alert` quay về login); backend json-server không có middleware auth.
- Khóa VietQR cứng trong code (`src/js/cart.js`, dòng 293) — chỉ dùng demo.

### Vạch trữ dữ liệu & tính nhất quán
- Giỏ hàng chỉ lưu LocalStorage (`src/services/cartService.js`) — không đồng bộ server, mất khi đổi thiết bị.
- Wishlist nửa server nửa localStorage (`src/services/wishlistService.js`) — có endpoint `/wishlist` nhưng vẫn fallback LocalStorage.
- Trừ tồn kho sau khi tạo đơn và xóa giỏ (`src/js/cart.js`, `completeOrder` dòng 327-339): nếu API trừ kho thất bại, đơn đã lưu và giỏ đã xóa → khó khôi phục.
- Mã đơn hàng ngẫu nhiên `DH` + 6 số (`src/js/cart.js`, dòng 261) có khả năng trùng lặp khi nhiều đơn đặt cùng lúc.

### Chất lượng code & bảo trì
- Sử dụng `innerHTML` nhiều lần với dữ liệu động (`createProductCardHtml`, `renderReviewsListHtml`, bảng admin). Có hàm `escapeHtml` (`src/utils/format.js`) nhưng chưa áp dụng đồng nhất → rủi ro XSS.
- `src/js/detail.js`: khai báo `detailSaleCountdownTimer` và `startDetailSaleCountdown` bên trong khối `try` của `getProductDetail()` (dòng 260-291) — hợp lệ JS nhưng không chuẩn, khó đọc.
- Không có bài kiểm thử tự động (unit/integration test). Chỉ kiểm thử thủ công qua `npm run build`.
- Importmap axios từ CDN `esm.sh` (`index.html`, dòng 20) — yêu cầu internet để chạy.

### Triển khai thực tế (theo định hướng AGENTS.md)
- Chưa có Backend Node.js: vẫn dùng `json-server`. Khi chuyển sang Node.js, cần xây dựng Express/Koa server, middleware xác thực (JWT), validation đầu vào, xử lý lỗi thống nhất, giữ tương thích endpoint với frontend.

## 6. Tình trạng ghi nhận BUG & LOG
- `BUG/`: 5 file, tất cả `<ĐÃ SỬA>`.
  - `BUG_cuon_trang_chu_giat_lag_20_10.md` — lỗi cuộn trang chủ giật.
  - `BUG_tinh_nang_sach_moi_bi_fail_29_10.md` — tính năng sách mới bị fail.
  - `BUG_topbar_admin_bi_toi_che_logo_29_10.md` — logo admin bị che chữ.
  - `BUG_lo_modal_day_trang_seller_portal_27_10.md` — modal seller lộ giao diện.
  - `BUG_header_seller_portal_bi_don_cuc_27_10.md` — header seller bị dồn một cụm.
- `LOG/`: Có 4 file tiến độ. Cần kiểm tra lại để đảm bảo dòng cuối mỗi file có trạng thái `<KHÔNG CÒN VẤN ĐỀ>` hoặc `<CÒN VẤN ĐỀ>` theo `RULE_LOG_PROJECT.md`.

## 7. Kết quả kiểm thử / nghiệm thu
- Chạy `npm run build` (Vite) thành công (dựa trên ghi chú trong các file BUG đã sửa).
- Chưa chạy kiểm thử tự động vì dự án không có bộ test.
- Chưa chạy cả `json-server` và `vite` cùng lúc để kiểm thử tích hợp toàn diện trong phiên này.

## 8. Những việc còn tồn đọng / cần làm tiếp
1. Nâng cấp bảo mật: băm mật khẩu (bcrypt), middleware JWT/Session, CSRF token, không lưu mật khẩu plaintext.
2. Đồng bộ giỏ hàng & wishlist lên server.
3. Sửa luồng đặt hàng: trừ tồn kho trước khi xác nhận đơn, xử lý rollback nếu thất bại; dùng UUID/timestamp cho `orderCode`.
4. Xây Backend Node.js (Express) theo định hướng AGENTS.md, giữ tương thích endpoint frontend.
5. Áp dụng `escapeHtml` đồng nhất khi chèn dữ liệu người dùng vào `innerHTML`; hoặc dùng `textContent` / DOM API.
6. Bổ sung kiểm thử tự động (Vitest/Jest) cho service quan trọng (auth, cart, order, coupon).
7. Cập nhật file LOG: đảm bảo mỗi file kết thúc bằng trạng thái `<KHÔNG CÒN VẤN ĐỀ>` hoặc `<CÒN VẤN ĐỀ>`.

---

TRẠNG THÁI: `<CÒN VẤN ĐỀ>`
