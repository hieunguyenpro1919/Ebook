# BÁO CÁO GHI NHẬN BUG: LỘ FORM POPUP MODAL Ở ĐÁY TRANG SELLER PORTAL

- **Ngày ghi nhận:** 27/10/2026
- **Người phát hiện / kiểm thử:** CEO Hiếu
- **Phạm vi ảnh hưởng:** Kênh Người Bán (`pages/seller.html`), giao diện người dùng khi truy cập Seller Portal.

---

## 1. Mô tả chi tiết lỗi (Symptom)
Khi truy cập trang Quản lý bán hàng dành cho Người Bán (`pages/seller.html`), ở phần cuối chân trang xuất hiện toàn bộ các form nhập liệu của Popup Modal (*Đăng bán sách mới*, *Bổ sung tồn kho*, *Chi tiết đơn hàng*) hiển thị trần trụi dưới dạng các thẻ HTML thô, không có lớp overlay che phủ, không được ẩn đi theo mặc định, làm vỡ bố cục chân trang và gây mất thẩm mỹ nghiêm trọng.

## 2. Nguyên nhân kỹ thuật (Root Cause)
- **File gây lỗi:** `pages/seller.html`, `src/css/seller.css`.
- **Chi tiết sai lệch:**
  1. Trong file `pages/seller.html`, thẻ bao ngoài của các modal bị đặt nhầm class là `class="admin-modal-overlay"` thay vì class chuẩn của hệ thống là `class="modal-overlay"`.
  2. Class `admin-modal-overlay` không hề tồn tại trong file CSS hệ thống (`admin.css`), dẫn tới việc các modal không nhận được các thuộc tính ẩn quan trọng:
     - `position: fixed; inset: 0;`
     - `opacity: 0; pointer-events: none;`
     - `visibility: hidden; display: flex;`
  3. Các class con bên trong như `admin-modal-card`, `admin-modal-form` cũng không đồng bộ với hệ thống class chuẩn (`modal-card`, `form-group-admin`, `modal-footer`), khiến trình duyệt render toàn bộ các form này dưới dạng khối `block` thông thường trôi nổi ở đáy trang.

## 3. Biện pháp xử lý (Fix)
- **Chuẩn hóa cấu trúc HTML (`pages/seller.html`):**
  - Đưa toàn bộ các modal về chuẩn class hệ thống: `.modal-overlay`, `.modal-card`, `.modal-title`, `.form-group-admin`, `.form-row-2`, `.modal-footer`, `.btn-modal-cancel`, `.btn-modal-submit`.
- **Khóa chặt CSS bảo vệ chống lộ giao diện (`src/css/seller.css`):**
  - Thiết lập thuộc tính `!important` cho `.modal-overlay`:
    - `position: fixed !important; inset: 0 !important; z-index: 9999 !important;`
    - `visibility: hidden !important; opacity: 0 !important; pointer-events: none !important;`
  - Chỉ khi có class `.active` thì modal mới hiển thị mượt mà với hiệu ứng blur và scale nhẹ.
  - Bổ sung đầy đủ Dark Theme cho toàn bộ modal gian hàng.
- **Tối ưu trải nghiệm đóng mở (`src/js/seller.js`):**
  - Bổ sung sự kiện click ra ngoài nền mờ để đóng modal nhanh chóng.
- **Kiểm thử:**
  - Chạy `npm run build` thành công 100% không phát sinh lỗi.
  - Giao diện chân trang đã sạch sẽ hoàn toàn, các modal bật/tắt đúng chuẩn popup chuyên nghiệp.

---

TRẠNG THÁI: <ĐÃ SỬA>
