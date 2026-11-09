# BÁO CÁO GHI NHẬN BUG: MENU DROPDOWN ADMIN HIỂN THỊ SAI KÊNH NGƯỜI BÁN

- **Ngày ghi nhận:** 09/11/2026
- **Người phát hiện / kiểm thử:** CEO Hiếu
- **Phạm vi ảnh hưởng:** Menu thả xuống của tài khoản người dùng (`#userDropdownMenu`) trên Header (`src/js/home.js`).

---

## 1. Mô tả chi tiết lỗi (Symptom)
Khi đăng nhập bằng tài khoản Quản trị viên (`role: 'admin'`, ví dụ tài khoản `admin@bookstore.vn`), trong menu Avatar xổ xuống xuất hiện cả 2 mục:
1. `🏪 Kênh Người Bán`
2. `👑 Trang Quản Trị`

Khi Admin click vào `Kênh Người Bán`, hệ thống chuyển sang `pages/seller.html` và bật thông báo chặn truy cập, yêu cầu phải đăng nhập tài khoản Người bán (`role: 'seller'`). Trải nghiệm này gây khó hiểu và vi phạm nguyên tắc phân quyền rõ ràng của hệ thống.

## 2. Nguyên nhân kỹ thuật (Root Cause)
- **Vị trí file:** `src/js/home.js`, hàm `setupCurrentUser()`.
- **Đoạn mã gây lỗi:**
  ```javascript
  if (sellerPortalLink) {
      sellerPortalLink.style.display = (user.role === 'seller' || user.role === 'admin') ? 'flex' : 'none';
  }
  ```
  Logic gán cờ hiển thị cho `sellerPortalLink` đang gộp cả `user.role === 'admin'`, trong khi trang `pages/seller.html` (`src/js/seller.js`) kiểm tra nghiêm ngặt chỉ chấp nhận `currentUser.role === 'seller'`.

## 3. Biện pháp xử lý (Fix)
- **Tách bạch phân quyền độc lập 1-1:**
  - **Tài khoản Admin (`role === 'admin'`):** Chỉ hiển thị duy nhất `👑 Trang Quản Trị` (`pages/admin.html`). Ẩn hoàn toàn `Kênh Người Bán`.
  - **Tài khoản Seller (`role === 'seller'`):** Chỉ hiển thị duy nhất `🏪 Kênh Người Bán` (`pages/seller.html`). Ẩn hoàn toàn `Trang Quản Trị`.
  - **Tài khoản Khách hàng thông thường:** Ẩn cả 2 mục trên.
- **Sửa mã nguồn `src/js/home.js`:**
  ```javascript
  if (sellerPortalLink) {
      sellerPortalLink.style.display = user.role === 'seller' ? 'flex' : 'none';
  }
  if (adminPortalLink) {
      adminPortalLink.style.display = user.role === 'admin' ? 'flex' : 'none';
  }
  ```

---

TRẠNG THÁI: <ĐÃ SỬA>
