# BÁO CÁO GHI NHẬN BUG: CUỘN TRANG CHỦ BỊ KHỰNG GIẬT (WHEEL SCROLL CONFLICT)

- **Ngày ghi nhận:** 20/10/2026
- **Người phát hiện / kiểm thử:** CEO Hiếu
- **Phạm vi ảnh hưởng:** Trang chủ (`index.html`), trải nghiệm người dùng khi dùng chuột cuộn hoặc touchpad.

---

## 1. Mô tả chi tiết lỗi (Symptom)
Khi người dùng cuộn trang chủ bằng con lăn chuột (mouse wheel) hoặc vuốt 2 ngón trên bàn di chuột (touchpad), trang web xảy ra hiện tượng cuộn bị khựng, giật cục (stutter/jitter), tốc độ cuộn không đều và mất hoàn toàn quán tính mượt mà khi con trỏ chuột di chuyển qua khu vực các kệ sách (Carousel).

## 2. Nguyên nhân kỹ thuật (Root Cause)
- File gây lỗi: `src/js/home.js`
- Chi tiết: Có đoạn mã bắt sự kiện `wheel` gắn vào `window`:
  ```javascript
  window.addEventListener('wheel', (e) => {
      const track = e.target.closest('.carousel-track');
      if (!track) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) {
          window.scrollBy({ top: e.deltaY, behavior: 'auto' });
      }
  }, { passive: true });
  ```
- **Xung đột 1 (Double Scroll):** Phần tử `.carousel-track` chỉ có cuộn ngang `overflow-x: auto`, trình duyệt hiện đại đã tự động chuyển tiếp (bubble) thao tác cuộn dọc lên `window`. Việc JS gọi thêm `window.scrollBy(e.deltaY)` làm trang bị ép cuộn gấp đôi quãng đường.
- **Xung đột 2 (Phá vỡ quán tính Touchpad):** Luồng GPU Compositor đang tính toán gia tốc quán tính (inertia) cho touchpad thì bị hàm `window.scrollBy` từ main thread can thiệp liên tục, dẫn đến hiện tượng gãy khung hình và giật cục.
- **Xung đột 3 (Thay đổi tốc độ đột ngột):** Khi trỏ chuột nằm trên `.carousel-track`, tốc độ cuộn vọt lên 2x; khi trỏ chuột ra ngoài thì tụt về 1x, gây cảm giác cuộn bị vấp/khựng.

## 3. Biện pháp xử lý (Fix)
- Gỡ bỏ hoàn toàn sự kiện `window.addEventListener('wheel')` trong file `src/js/home.js`.
- Để trình duyệt xử lý cuộn dọc tự nhiên 100% bằng Compositor Thread gốc.
- Kiểm tra build `npm run build` thành công, thao tác cuộn bằng chuột và touchpad trên trang chủ đã mượt mà 60/120fps.

---

TRẠNG THÁI: <ĐÃ SỬA>
