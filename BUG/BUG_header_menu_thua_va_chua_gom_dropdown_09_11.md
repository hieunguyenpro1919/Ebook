# BÁO CÁO GHI NHẬN BUG: THANH HEADER DƯ THỪA MENU VÀ NÚT QUẢN TRỊ/NGƯỜI BÁN CHƯA GOM VÀO DROPDOWN

- **Ngày ghi nhận:** 09/11/2026
- **Người phát hiện / kiểm thử:** CEO Hiếu
- **Phạm vi ảnh hưởng:** Thanh điều hướng chính (Header Navbar) trên trang chủ (`index.html`).

---

## 1. Mô tả chi tiết lỗi (Symptom)
1. **Dư thừa menu không có trang riêng:** Thanh Menu chính đang hiển thị 2 liên kết `Giới thiệu` (`#about`) và `Liên hệ` (`#contact`). Hai liên kết này không có trang đích riêng biệt, gây loãng nội dung và chiếm dụng diện tích hiển thị trên thanh Header.
2. **Cụm tài khoản bị dồn nút thô cứng, thiếu thẩm mỹ:** Khi đăng nhập với vai trò Seller hoặc Admin:
   - Nút lớn nổi bật `🏪 Kênh Người Bán` (hoặc `👑 Quản trị Admin`) nằm trần trụi bên ngoài Header.
   - Nút thông tin tài khoản và nút `Đăng xuất` màu đỏ nằm dàn hàng ngang liền kề, làm thanh Header bị kéo dài, chật chội và không đạt chuẩn trải nghiệm người dùng (UX) của các sàn thương mại điện tử hiện đại.

## 2. Nguyên nhân kỹ thuật (Root Cause)
1. Trong `db.json` (mảng `menu`) và hàm fallback của `src/services/menuService.js`, các item `Giới thiệu` (id: 5) và `Liên hệ` (id: 6) được cấu hình mặc định.
2. Trong `index.html` và `src/js/home.js`:
   - Các phần tử `#adminLink`, `#userText`, `#logoutBtn` được khai báo dạng các nút độc lập (`inline-flex` / `inline-block`) đặt trực tiếp trong `#userStatus`.
   - Hàm `setupCurrentUser()` trong `home.js` chỉ thực hiện `display: inline-flex` cho các nút riêng lẻ này thay vì quản lý theo một component Avatar Dropdown thống nhất.

## 3. Biện pháp xử lý (Fix)
1. **Lược bỏ menu thừa:**
   - Cập nhật `src/services/menuService.js` và `db.json`: Xóa bỏ 2 mục `Giới thiệu` và `Liên hệ`, chỉ giữ lại: *Trang chủ*, *Sách mới*, *Thể loại sách ▾*, *Đơn hàng*.
   - Bổ sung route `/menu` trong backend `server/index.js` trả về danh sách 4 menu chuẩn.
2. **Thiết kế Avatar Dropdown Component:**
   - Tái cấu trúc `#userStatus` trong `index.html`: Gom toàn bộ thành container `#userDropdownWrap` gồm 1 nút kích hoạt (Avatar tròn + Tên người dùng + icon mũi tên `▾`) và menu thả xuống `#userDropdownMenu`.
   - Trong `#userDropdownMenu` tích hợp đầy đủ các mục:
     - Huy hiệu vai trò người dùng (Admin / Người bán / Khách hàng).
     - Link `👤 Thông tin tài khoản` (`profile.html`).
     - Link `📦 Đơn mua của tôi` (`orders.html`).
     - Link `❤️ Sách yêu thích` (`wishlist.html`).
     - Link `🏪 Kênh Người Bán` (`seller.html` - chỉ hiển thị nếu role là `seller` hoặc `admin`).
     - Link `🛠️ Kênh Quản Trị` (`admin.html` - chỉ hiển thị nếu role là `admin`).
     - Đường kẻ phân cách và nút `🚪 Đăng xuất`.
3. **Cập nhật Logic JS & CSS:**
   - Bổ sung logic toggle mở/đóng menu và click-outside trong `src/js/home.js`.
   - Viết CSS hoàn chỉnh hỗ trợ hiệu ứng xổ xuống mượt mà, đổ bóng, bo góc và tương thích cả giao diện Dark/Light theme.

---

TRẠNG THÁI: <ĐÃ SỬA>
