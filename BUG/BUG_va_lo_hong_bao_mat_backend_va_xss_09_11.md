# BÁO CÁO GHI NHẬN BUG: CÁC LỖ HỔNG BẢO MẬT BACKEND (PHÂN QUYỀN, TỰ PHONG ADMIN, LỘ THÔNG TIN USER) VÀ XSS FRONTEND

- **Ngày ghi nhận:** 09/11/2026
- **Người phát hiện / kiểm thử:** CEO Hiếu (kết hợp báo cáo đánh giá an toàn chuyên sâu)
- **Phạm vi ảnh hưởng:** Toàn bộ hệ thống Backend API (`server/`) và hiển thị đánh giá sản phẩm (`src/js/detail.js`).

---

## 1. Mô tả chi tiết các lỗ hổng (Symptom & Vulnerabilities)
1. **Lỗ hổng leo thang đặc quyền (Privilege Escalation):** Tại `POST /api/auth/register`, người dùng có thể tự gán `{"role": "admin"}` trong request để chiếm quyền Quản trị viên tối cao của hệ thống.
2. **Thiếu vắng phân quyền truy cập (Broken Access Control):**
   - Các thao tác nhạy cảm trên sản phẩm (`POST/PUT/PATCH/DELETE /products`) không yêu cầu token và không kiểm tra vai trò người bán.
   - Route `GET /orders` và `GET /orders/:id` cho phép bất kỳ ai đọc trộm toàn bộ đơn hàng (tên, SĐT, địa chỉ, email).
   - Route `PATCH /orders/:id` cho phép sửa/hủy đơn của người khác để kích hoạt hoàn kho.
   - Route `GET /user`, `/users` công khai toàn bộ danh sách tài khoản cùng thông tin cá nhân.
   - Route `POST /orders` và `POST /reviews` nhận `userId` từ body, cho phép mạo danh bất kỳ ai.
3. **Lỗ hổng Stored XSS:** `src/js/detail.js` đưa trực tiếp nội dung đánh giá (`r.comment`), tên người dùng (`r.userName`) vào `innerHTML` mà không qua `escapeHtml()`, nguy cơ bị chèn script đánh cắp JWT Token.
4. **Lỗi tiềm ẩn trong Stored Procedure `sp_place_order`:** Mã đơn tạm `CONCAT('TMP', UUID_SHORT())` có thể vượt quá độ dài `VARCHAR(20)` gây lỗi `Data too long` và làm sập giao dịch đặt hàng.

---

## 2. Kế hoạch và Chi tiết khắc phục (Fix)
1. **Khóa chặt đăng ký tài khoản (`server/controllers/authController.js`):**
   - Ép buộc vai trò khi đăng ký chỉ được phép là `seller` hoặc `customer`: `const validRole = role === 'seller' ? 'seller' : 'customer';`. Cấm tuyệt đối đăng ký tài khoản `admin`.
   - Bổ sung kiểm tra format email hợp lệ (Regex) và độ dài mật khẩu tối thiểu (>= 6 ký tự).
   - Yêu cầu xác thực `oldPassword` với `bcrypt.compare` khi cập nhật hồ sơ/mật khẩu trong `updateProfile`.
2. **Thiết lập rào chắn Middleware bảo vệ & Kiểm soát quyền truy cập:**
   - **Sản phẩm (`server/routes/productRoutes.js`, `server/controllers/productController.js`):**
     - Mặc định truy vấn công khai chỉ lấy sách có `status = 'active'`.
     - Bảo vệ các thao tác `POST, PUT, PATCH, DELETE /products` bằng `verifyToken, requireRole('admin', 'seller')`.
     - Kiểm tra quyền sở hữu gian hàng (Ownership Check): Seller chỉ được phép sửa/xóa sách thuộc `store_id` của chính mình.
   - **Đơn hàng (`server/routes/orderRoutes.js`, `server/controllers/orderController.js`):**
     - Đặt hàng `POST /orders`: Ép buộc lấy `userId = req.user.id` từ token, bỏ qua `userId` do client gửi lên.
     - Danh sách và chi tiết đơn hàng `GET /orders`, `GET /orders/:id`: Khách chỉ xem được đơn hàng của chính mình; Người bán chỉ xem đơn hàng có chứa sản phẩm thuộc gian hàng của mình; Admin xem được toàn bộ.
     - Cập nhật đơn hàng `PATCH /orders/:id`: Khách hàng chỉ được phép yêu cầu hủy (`status = 'cancelled'`) đơn hàng đang chờ duyệt của mình, gọi Stored Procedure `sp_cancel_order` để hoàn trả tồn kho an toàn.
   - **Đánh giá (`server/routes/reviewRoutes.js`, `server/controllers/reviewController.js`):**
     - Bảo vệ `POST /reviews` bằng `verifyToken`, lấy `userId = req.user.id` từ token.
   - **Thông tin người dùng & Error Handler (`server/index.js`, `server/middlewares/errorHandler.js`):**
     - Đặt rào bảo vệ `GET /user`, `GET /users` chỉ dành riêng cho Quản trị viên (`verifyToken, requireRole('admin')`).
     - Ẩn toàn bộ `err.stack` và chi tiết lỗi SQL thô ở Error Handler để chống rò rỉ cấu trúc database.
3. **Triệt phá lỗ hổng Stored XSS (`src/js/detail.js`):**
   - Áp dụng `escapeHtml` cho toàn bộ nội dung đánh giá (`r.userName`, `r.comment`, `rep.userName`, `rep.comment`) trước khi render ra DOM.
   - Chuyển hàm countdown `startDetailSaleCountdown` ra phạm vi module cấp cao, xóa bỏ rác hàm lồng nhau.
4. **Sửa Stored Procedure `sp_place_order` & Mở rộng cột `order_code`:**
   - Mở rộng cột `order_code VARCHAR(32)` trong MySQL (`db/init/01_schema.sql`).
   - Sửa Stored Procedure `sp_place_order` sử dụng `CONCAT('T', LEFT(REPLACE(UUID(),'-',''), 15))` đảm bảo mã đơn không bao giờ vượt quá độ dài cột.
5. **Dọn dẹp Importmap CDN:**
   - Gỡ bỏ importmap `esm.sh/axios` tại `index.html` và tất cả các file `pages/*.html`, đảm bảo đồ án chạy 100% offline nội bộ thông qua Vite bundler.

---

TRẠNG THÁI: <ĐÃ SỬA>
