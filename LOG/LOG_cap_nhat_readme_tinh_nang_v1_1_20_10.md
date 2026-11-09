# LOG PHIÊN LÀM VIỆC: CẬP NHẬT README - TÀI LIỆU HƯỚNG DẪN ĐỒ ÁN V1.1

- **Ngày thực hiện:** 20/10/2026
- **Phiên bám theo:** `LOG/RULE_LOG_PROJECT.md`
- **Người thực hiện:** Agent (theo yêu cầu của CEO Hiếu)

---

## 1. Mục tiêu phiên làm việc

Cập nhật file `README.md` - tài liệu hướng dẫn đồ án - để phản ánh đầy đủ trạng thái mới nhất của dự án sau phiên triển khai phiên bản 1.1 (Lazy Render / Xem thêm / Phân trang Admin), đồng thời đưa quy trình ghi nhận `LOG/` và `BUG/` vào tài liệu để người đọc dự án nắm được cách tra cứu lịch sử làm việc.

**Không thay đổi mã nguồn ứng dụng** - phiên này chỉ tác động tới tài liệu.

---

## 2. Bảng tổng quan thay đổi

| # | Nội dung thay đổi | File thay đổi | Dòng tương ứng |
|---|---|---|---|
| 1 | Thêm `src/utils/pagination.js` và cập nhật mô tả `src/utils/format.js` trong cây thư mục | `README.md` | 37-38 |
| 2 | Cập nhật mô tả `home.js` (thêm lazy render) và `admin.js` (thêm phân trang bảng dữ liệu) | `README.md` | 51, 55 |
| 3 | Thêm khối `LOG/` và `BUG/` vào cây thư mục dự án | `README.md` | 61-67 |
| 4 | Bổ sung Lazy Render vào mục 9 (Kệ Sách Carousel) + mô tả lại hành vi cuộn chuột sau khi fix bug | `README.md` | 166-170 |
| 5 | Bổ sung nút "Xem thêm" + escape HTML vào mục 10 (Tìm Kiếm) | `README.md` | 172-176 |
| 6 | Sửa "4 chỉ số" thành "5 chỉ số" và thêm dòng dẫn chiếu tới mục 16 trong mục 15 (Admin) | `README.md` | 200, 206 |
| 7 | Thêm mục 16 mới: Tối ưu hiệu năng hiển thị danh sách lớn (Lazy Render / Xem thêm / Phân trang) | `README.md` | 208-220 |
| 8 | Thêm mục 6 mới: Quy trình ghi nhận LOG & BUG của dự án | `README.md` | 259-280 |

Tổng số dòng `README.md`: **228 → 281**.

---

## 3. Chi tiết kỹ thuật từng phần

### 3.1. Bổ sung `src/utils/pagination.js` vào cây thư mục

- **Nội dung thay đổi:** Module phân trang mới (file dùng chung cho 4 bảng dữ liệu Admin) chưa có trong cây thư mục nên được bổ sung; đồng thời mô tả `format.js` được viết lại vì nay có thêm hàm `escapeHtml`.
- **File thay đổi:** `README.md`
- **Chi tiết thay đổi ở các dòng từ 37 đến 38**

```
│   │   ├── format.js         # Hàm định dạng tiền tệ (formatPrice) & escape HTML (escapeHtml)
│   │   ├── pagination.js     # Tiện ích phân trang client-side dùng chung cho các bảng Admin
│   │   └── storage.js        # Quản lý localStorage (session người dùng)
```

### 3.2. Cập nhật mô tả `home.js` và `admin.js`

- **Nội dung thay đổi:** Bổ sung trách nhiệm mới của hai controller vào phần mô tả trong cây thư mục.
- **File thay đổi:** `README.md`
- **Chi tiết thay đổi ở dòng 51 và dòng 55**

- Dòng 51 (`home.js`): thêm `, lazy render` vào cuối phần mô tả.
- Dòng 55 (`admin.js`): thêm `, phân trang bảng dữ liệu` vào cuối phần mô tả.

### 3.3. Thêm khối `LOG/` và `BUG/` vào cây thư mục dự án

- **Nội dung thay đổi:** Hai thư mục quản lý vết làm việc mới được phản ánh trong cây thư mục, kèm mô tả ý nghĩa từng file quy tắc.
- **File thay đổi:** `README.md`
- **Chi tiết thay đổi ở các dòng từ 61 đến 67**

```
├── LOG/                      # Nhật ký tiến độ dự án (cuốn nhật ký bất biến - Audit Trail)
│   ├── RULE_LOG_PROJECT.md   # Quy tắc soạn file LOG
│   └── LOG_*.md              # Nhật ký từng phiên làm việc (đọc file mới nhất để nắm tình hình)
│
├── BUG/                      # Ghi nhận lỗi phát sinh trong quá trình thực hiện
│   ├── RULE_LOG_BUG.md       # Quy tắc soạn file BUG
│   └── BUG_*.md              # Báo cáo từng lỗi: triệu chứng, nguyên nhân, cách khắc phục
```

### 3.4. Cập nhật mục 9 - Kệ Sách Carousel Độc Lập Theo Thể Loại

- **Nội dung thay đổi:** Thêm đặc tính Lazy Render; làm rõ hành vi cuộn chuột sau khi đã gỡ bỏ xử lý `wheel` thủ công (xem `BUG/BUG_cuon_trang_chu_giat_lag_20_10.md`).
- **File thay đổi:** `README.md`
- **Chi tiết thay đổi ở các dòng từ 166 đến 170**

- Dòng 169 (thay thế dòng cũ): mô tả lại cuộn dọc bằng chuột - "hoàn toàn tự nhiên, không bị giật hay vướng (đã gỡ bỏ xử lý `wheel` thủ công, để trình duyệt tự tính quán tính)".
- Dòng 170 (thêm mới): đưa thêm đặc tính **Lazy Render** - mỗi kệ chỉ render 5 cuốn đầu tiên vào DOM, phần còn lại nạp thêm khi cuộn tới gần cuối hàng.

### 3.5. Cập nhật mục 10 - Tìm Kiếm Thông Minh & Bộ Lọc Thể Loại

- **Nội dung thay đổi:** Bổ sung cơ chế hiển thị theo lô + nút "Xem thêm" và việc escape từ khóa tìm kiếm.
- **File thay đổi:** `README.md`
- **Chi tiết thay đổi ở các dòng từ 172 đến 176**

- Dòng 175 (thêm mới): kết quả hiển thị theo lô **8 cuốn**, kèm nút **"⬇️ Xem thêm"** hiện ra khi còn kết quả chưa hiển thị, nhãn nút cập nhật động.
- Dòng 176 (thêm mới): từ khóa tìm kiếm do người dùng nhập được **escape HTML** trước khi chèn vào giao diện.

### 3.6. Cập nhật mục 15 - Trang Quản Trị Nhà Sách Toàn Diện Admin

- **Nội dung thay đổi:** Sửa lỗi mô tả sai số lượng chỉ số thống kê (ghi "4 chỉ số" trong khi liệt kê 5 chỉ số) và thêm dòng dẫn chiếu tới mục 16 mới.
- **File thay đổi:** `README.md`
- **Chi tiết thay đổi ở dòng 200 và dòng 206**

- Dòng 200 (sửa): đổi `**4 chỉ số thống kê tổng quan:**` thành `**5 chỉ số thống kê tổng quan:**` cho khớp với 5 chỉ số liệt kê ngay bên dưới.
- Dòng 206 (thêm mới): thêm dòng dẫn chiếu "Thanh phân trang trên 4 bảng dữ liệu lớn (Kho sách, Đơn hàng, Người dùng, Quản lý Sale) — xem chi tiết ở mục 16."

### 3.7. Thêm mục 16 - Tối Ưu Hiệu Năng Hiển Thị Danh Sách Lớn

- **Nội dung thay đổi:** Thêm tính năng mới của phiên bản 1.1 vào danh sách tính năng hoàn thiện, trình bày theo bảng "Ngữ cảnh - Kỹ thuật - Hành vi" để thể hiện rõ điểm mấu chốt: **không phân trang áp dụng đại trà**, mỗi ngữ cảnh dùng một kỹ thuật phù hợp.
- **File thay đổi:** `README.md`
- **Chi tiết thay đổi ở các dòng từ 208 đến 220**

Cấu trúc nội dung:
- Dòng 209: nêu vấn đề gốc (render toàn bộ danh sách vào DOM một lần) và hướng giải quyết.
- Dòng 211-215: bảng 3 ngữ cảnh - Kệ sách (Lazy Render), Kết quả tìm kiếm (Xem thêm), 4 bảng Admin (Phân trang client-side).
- Dòng 217: hành vi thông minh khi đổi bộ lọc (về trang 1) và khi thao tác tại chỗ (giữ nguyên trang).
- Dòng 218: nhấn mạnh tính tái lập - toàn bộ logic nằm trong `src/utils/pagination.js` dưới dạng hàm thuần không phụ thuộc DOM.
- Dòng 219: số liệu hiệu quả thực tế với 50 cuốn hiện có (50→40 thẻ sản phẩm, 50→10 dòng bảng).
- Dòng 220: đồng bộ giao diện Sáng/Tối cho cả thanh phân trang lẫn nút "Xem thêm".

### 3.8. Thêm mục 6 - Quy trình ghi nhận LOG & BUG của dự án

- **Nội dung thay đổi:** Bổ sung mục mới ở cuối tài liệu, giới thiệu quy trình quản lý vết làm việc của dự án cho người đọc tài liệu lần đầu.
- **File thay đổi:** `README.md`
- **Chi tiết thay đổi ở các dòng từ 259 đến 280**

- Dòng 259: tiêu đề mục 6.
- Dòng 263-269: mô tả thư mục `LOG/` - tên file, nguyên tắc "làm xong mới soạn LOG", nội dung bắt buộc, hai trạng thái cuối file, nguyên tắc bất biến không sửa đè.
- Dòng 271-276: mô tả thư mục `BUG/` - tên file, cấu trúc nội dung, ba trạng thái cuối file, nguyên tắc ghi nhận ngay khi phát hiện.
- Dòng 278-280: mục "Cách dùng nhanh" - đọc file LOG gần nhất để nắm tình hình, lệnh `/GHI_LOG` để chốt phiên.

---

## 4. Kết quả kiểm thử / nghiệm thu

| Hạng mục | Cách kiểm tra | Kết quả |
|---|---|---|
| Tính hợp lệ cấu trúc Markdown | Đọc lại toàn bộ `README.md` sau khi sửa, đối chiếu thứ tự heading | Đạt - 6 mục cấp 2 (`##`), 16 mục tính năng cấp 3 (`###`), các bảng Markdown đóng mở đúng |
| Số dòng tham chiếu trong file LOG này | Đối chiếu từng mốc dòng với nội dung thực tế của `README.md` | Đạt - các mốc 37-38, 51, 55, 61-67, 166-170, 172-176, 200, 206, 208-220, 259-280 đều khớp |
| Không ảnh hưởng mã nguồn | `git status` không khả dụng (dự án không phải git repo) - đối chiếu danh mục file | Đạt - chỉ có `README.md` và file LOG mới được tạo; `src/`, `pages/`, `db.json` không bị đụng tới |
| Tính nhất quán nội dung với mã nguồn | Đối chiếu số liệu trong README với code thực tế | Đạt - `CAROUSEL_CHUNK_SIZE = 5` (home.js dòng 13), `SEARCH_PAGE_SIZE = 8` (home.js dòng 15), `DEFAULT_PAGE_SIZE = 10` (pagination.js dòng 17) khớp với mô tả trong tài liệu |

**Không chạy `npm run build`** trong phiên này: thay đổi chỉ nằm trong file tài liệu Markdown, không tác động tới mã nguồn nên không cần build lại.

---

## 5. Những việc cần làm tiếp theo

1. **~~Tạo file BUG cho vụ "cổng 3000 bị `json-server` của dự án khác chiếm"~~ → Đã đánh giá: KHÔNG phải BUG của dự án, không tạo file BUG.**
   - Lý do: mã nguồn nhasach hoàn toàn đúng (`package.json` và `src/api/client.js` đều trỏ đúng cổng 3000); nguyên nhân là tiến trình của *dự án khác* còn sót trên máy; cách khắc phục là thao tác vận hành (tắt tiến trình cũ) chứ không phải sửa code; và sự cố **đã tự hết** (đã kiểm tra lại: cổng 3000 hiện do chính `json-server` của nhasach phục vụ, API trả đúng 50 sản phẩm).
   - Nếu muốn cải thiện để tránh rủi ro "hiển thị sai dữ liệu một cách âm thầm", đó là **cải tiến tính năng** (không phải BUG): cho `src/api/client.js` đọc `import.meta.env.VITE_API_URL` với fallback `http://localhost:3000`, và cho `start.bat` kiểm tra cổng 3000 trước khi khởi động. Khi thực hiện sẽ ghi nhận vào **file LOG mới** của phiên đó.
2. **Trang lịch sử đơn hàng `pages/orders.html`** vẫn render toàn bộ đơn của người dùng, chưa áp dụng phân trang (hiện chỉ có 8 đơn trong `db.json`) - có thể cân nhắc khi dữ liệu lớn lên.
3. **Bảng Thể loại (Tab 3 trong Admin)** chưa phân trang - hiện chỉ 8 bản ghi nên chưa cần thiết.

---

TRẠNG THÁI: <KHÔNG CÒN VẤN ĐỀ>
