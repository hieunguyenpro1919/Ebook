# LOG THAY ĐỔI - NHÀ SÁCH TRÍ TUỆ

Ghi lại toàn bộ thay đổi theo định dạng: **`<nội dung thay đổi>` / `<file thay đổi>` / `<chi tiết thay đổi ở các dòng từ... đến...>`**

---

## Phiên bản 1.1 - Tối ưu hiển thị danh sách lớn (Lazy Render + "Xem thêm" + Phân trang Admin)

**Ngày thực hiện:** 20/10/2026
**Mục tiêu:** Web hiện tại render **toàn bộ** danh sách sách vào DOM một lần (50 cuốn ở trang chủ, 50 dòng mỗi bảng ở Admin). Khi dữ liệu lớn lên, DOM nặng và bảng Admin khó sử dụng. Áp dụng 3 giải pháp phù hợp từng ngữ cảnh thay vì phân trang áp dụng đại trà.

### Tổng quan

| # | Nội dung thay đổi | File thay đổi | Dòng |
|---|---|---|---|
| 1 | Tạo mới tầng tiện ích phân trang dùng chung | `src/utils/pagination.js` | 1-162 (file mới) |
| 2 | Thêm hàm `escapeHtml` để escape dữ liệu người dùng trước khi chèn vào `innerHTML` | `src/utils/format.js` | 13-26 |
| 3 | Lazy render kệ Carousel thể loại (chỉ render 5 cuốn đầu, nạp thêm khi cuộn) | `src/js/home.js` | 8, 12-21, 57-59, 429-433, 449-451, 469-502 |
| 4 | Thêm nút "Xem thêm" cho kết quả tìm kiếm (hiển thị từng phần 8 cuốn) | `src/js/home.js` | 556-653 |
| 5 | Thêm container cho nút "Xem thêm" ở trang chủ | `index.html` | 227-233 |
| 6 | Thêm CSS cho nút "Xem thêm" | `src/css/style.css` | 1566-1597 |
| 7 | Thêm CSS chế độ tối cho nút "Xem thêm" | `src/css/dark-theme.css` | 431-448 |
| 8 | Phân trang client-side cho bảng Kho sách | `src/js/admin.js` | 7, 24-38, 63-67, 152-202, 268-335, 338-362, 368-375, 404, 469, 528 |
| 9 | Phân trang client-side cho bảng Đơn hàng | `src/js/admin.js` | 539-615, 617-638, 640-647, 660, 716, 735 |
| 10 | Phân trang client-side cho bảng Người dùng | `src/js/admin.js` | 890-932, 934-945, 947-954 |
| 11 | Phân trang client-side cho bảng Quản lý Sale | `src/js/admin.js` | 1091-1118, 1120-1205, 1207-1214 |
| 12 | Thêm 4 container thanh phân trang vào trang Admin | `pages/admin.html` | 167, 212, 277, 421 |
| 13 | Thêm CSS thanh phân trang cho bảng Admin | `src/css/admin.css` | 393-500 |
| 14 | Thêm CSS chế độ tối cho thanh phân trang Admin | `src/css/dark-theme.css` | 617-668 |

---

### 1. Tạo mới tầng tiện ích phân trang dùng chung

- **Nội dung thay đổi:** Thêm file mới `src/utils/pagination.js` chứa các hàm thuần (pure function) để cắt trang và dựng giao diện thanh phân trang, dùng chung cho 4 bảng trong trang Quản trị.
- **File thay đổi:** `src/utils/pagination.js`
- **Chi tiết thay đổi ở các dòng từ 1 đến 162** (file mới hoàn toàn)

Nội dung chính:
- Dòng 15-22: hằng `DEFAULT_PAGE_SIZE = 10` và `PAGE_SIZE_OPTIONS = [10, 20, 50]`.
- Dòng 24-54: hàm `paginate(items, currentPage, pageSize)` - cắt danh sách theo trang, tự kẹp trang hiện tại về khoảng hợp lệ, trả về `{ items, page, totalPages, totalItems, pageSize, from, to, hasPrev, hasNext }`.
- Dòng 56-86: hàm `getPageNumbers(currentPage, totalPages, maxButtons)` - tính danh sách số trang hiển thị, tự chèn dấu `...` khi có quá nhiều trang.
- Dòng 88-148: hàm `buildPaginationHtml(options)` - dựng HTML thanh phân trang gồm thông báo "Hiển thị x-y / tổng z", select đổi số bản ghi/trang, nút `‹` / `›` và các nút số trang.
- Dòng 150-162: hàm `renderPagination(container, options)` - ghi HTML vào container.

### 2. Thêm hàm `escapeHtml` vào tầng tiện ích

- **Nội dung thay đổi:** Thêm hàm `escapeHtml(text)` escape 5 ký tự đặc biệt HTML (`&`, `<`, `>`, `"`, `'`) để chèn an toàn dữ liệu do người dùng nhập (từ khóa tìm kiếm) vào `innerHTML`, theo nguyên tắc 6 của `AGENTS.md`.
- **File thay đổi:** `src/utils/format.js`
- **Chi tiết thay đổi ở các dòng từ 13 đến 26** (thêm sau hàm `formatPrice` cũ, dòng 1-11)

### 3. Lazy render kệ Carousel thể loại ở trang chủ

- **Nội dung thay đổi:** Trước đây `renderCategoryCarousels()` nốt toàn bộ sách của mỗi thể loại vào DOM (8 kể × 5-7 cuốn = 50 thẻ sản phẩm). Nay mỗi kệ chỉ render 5 cuốn đầu tiên, phần còn lại được nạp thêm bằng `insertAdjacentHTML` khi người dùng cuộn tới gần cuối hàng. UX (carousel cuộn ngang) giữ nguyên, DOM nhẹ hơn.
- **File thay đổi:** `src/js/home.js`
- **Chi tiết thay đổi ở các dòng từ 8 đến 21, từ 57 đến 59, từ 429 đến 433, từ 449 đến 451, từ 469 đến 502**

Chi tiết từng đoạn:
- Dòng 8: đổi import `import { formatPrice }` thành `import { formatPrice, escapeHtml }`.
- Dòng 12-21: thêm hằng `CAROUSEL_CHUNK_SIZE = 5`, `SEARCH_PAGE_SIZE = 8`, bản đồ `carouselRenderedCount` (lưu số thẻ đã render theo `categoryId`), biến `currentSearchResults` và `searchVisibleCount`.
- Dòng 57-59: thêm 2 DOM reference `searchLoadMoreWrap`, `btnLoadMoreSearch`.
- Dòng 429-433: trong `renderCategoryCarousels()`, tính `visibleCount` = số thẻ đã nhớ (tối thiểu `CAROUSEL_CHUNK_SIZE`, tối đa số sách của thể loại) và lưu vào `carouselRenderedCount`.
- Dòng 449-451: thay `booksInCat.map(createProductCardHtml)` bằng `booksInCat.slice(0, visibleCount).map(createProductCardHtml)`.
- Dòng 469-488: hàm mới `loadMoreCarouselItems(catId)` - lấy phần sách chưa render của thể loại, `insertAdjacentHTML('beforeend', ...)` nối thêm vào `#track-${catId}`, cập nhật bộ đếm.
- Dòng 490-502: sự kiện `scroll` lắng nghe trên `#categoryCarouselsContainer` (dùng `capture: true` vì sự kiện `scroll` không bubble lên phần tử cha) - khi còn cách cuối hàng ≤ 120px thì gọi `loadMoreCarouselItems()`.

### 4. Thêm nút "Xem thêm" cho kết quả tìm kiếm ở trang chủ

- **Nội dung thay đổi:** Kết quả tìm kiếm trước đây render toàn bộ. Nay hiển thị 8 cuốn đầu, có nút "Xem thêm" hiện ra khi còn kết quả chưa hiển thị; bấm thêm 8 cuốn/lần. Từ khóa tìm kiếm mới sẽ reset về 8 cuốn đầu.
- **File thay đổi:** `src/js/home.js`
- **Chi tiết thay đổi ở các dòng từ 556 đến 653**

Chi tiết từng đoạn:
- Dòng 556-598: `handleSearch()` được viết lại - khi không có từ khóa thì reset `currentSearchResults = []`, `searchVisibleCount = 0` và ẩn nút "Xem thêm"; khi có từ khóa thì lưu `currentSearchResults = filtered` và `searchVisibleCount = SEARCH_PAGE_SIZE` rồi gọi `renderSearchResults()`.
- Dòng 600-634: hàm mới `renderSearchResults()` - render `currentSearchResults.slice(0, searchVisibleCount)`, hiện/ẩn `#searchLoadMoreWrap` tuỳ số kết quả còn lại, cập nhật nhãn nút theo dạng `⬇️ Xem thêm N cuốn nữa (còn M cuốn)`.
- Dòng 611: thay chỗ chèn trực tiếp `${query}` bằng `${escapeHtml(searchInput.value.trim())}`.
- Dòng 648-653: sự kiện click `#btnLoadMoreSearch` tăng `searchVisibleCount` thêm `SEARCH_PAGE_SIZE` rồi render lại.

### 5. Thêm container cho nút "Xem thêm" ở trang chủ

- **Nội dung thay đổi:** Thêm khối `#searchLoadMoreWrap` chứa nút `#btnLoadMoreSearch`, đặt ngay sau lưới `#searchProductList`, mặc định `display: none`.
- **File thay đổi:** `index.html`
- **Chi tiết thay đổi ở các dòng từ 227 đến 233**

### 6. Thêm CSS cho nút "Xem thêm"

- **Nội dung thay đổi:** Thêm style `.search-load-more-wrap` (khối căn giữa, đường kẻ ngăn cách) và `.btn-load-more-search` (nút bo tròn viền tím, đổi màu khi hover).
- **File thay đổi:** `src/css/style.css`
- **Chi tiết thay đổi ở các dòng từ 1566 đến 1597**

### 7. Thêm CSS chế độ tối cho nút "Xem thêm"

- **Nội dung thay đổi:** Thêm override cho `html.dark` / `body.dark` áp dụng cho `.btn-load-more-search` (nền tối, chữ tím sáng, hover đổi nền tím) và đường kẻ của `.search-load-more-wrap`.
- **File thay đổi:** `src/css/dark-theme.css`
- **Chi tiết thay đổi ở các dòng từ 431 đến 448** (khối override `html.dark` / `body.dark` cho `.btn-load-more-search` nằm ở dòng 432-437, cho `.search-load-more-wrap` nằm ở dòng 445-448)

### 8. Phân trang client-side cho bảng Kho sách (Tab 1)

- **Nội dung thay đổi:** Bảng Kho sách chỉ hiển thị 10 cuốn/trang, có thanh phân trang (nút số trang, `‹`/`›`, chọn 10/20/50 bản ghi mỗi trang, thông báo "Hiển thị x-y / tổng z"). Khi người dùng đổi bộ lọc/tìm kiếm thì tự quay về trang 1; khi thao tác tại chỗ (nhập kho, sửa, xóa) thì giữ nguyên trang hiện tại.
- **File thay đổi:** `src/js/admin.js`
- **Chi tiết thay đổi ở các dòng từ 7 đến 7, từ 24 đến 38, từ 63 đến 67, từ 152 đến 202, từ 268 đến 335, từ 338 đến 362, từ 368 đến 375, dòng 404, dòng 469, dòng 528**

Chi tiết từng đoạn:
- Dòng 7: thêm `import { paginate, renderPagination, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../utils/pagination.js';`.
- Dòng 24-38: thêm state phân trang `booksPage`, `booksPageSize`, `ordersPage`, `ordersPageSize`, `usersPage`, `usersPageSize`, `salesPage`, `salesPageSize` và 4 mảng `filteredBooks`, `filteredOrders`, `filteredUsers`, `filteredSales` (lưu kết quả lọc hiện tại để phân trang gọi lại được).
- Dòng 63-67: thêm 4 DOM reference `#booksPagination`, `#ordersPagination`, `#usersPagination`, `#salesPagination`.
- Dòng 152-202: thêm 2 hàm dùng chung `setupPagination(container, handlers)` (gắn sự kiện click nút trang + change select kích thước trang) và `drawPagination(container, result, pageSize, unit)` (dựng thanh phân trang từ kết quả `paginate`).
- Dòng 268-335: `renderBooks()` lưu `filteredBooks`, gọi `paginate(filteredBooks, booksPage, booksPageSize)`, render `pageData.items` thay vì toàn bộ mảng, và gọi `drawPagination(booksPagination, ...)` ở cả nhánh rỗng lẫn nhánh có dữ liệu.
- Dòng 338-362: `applyBooksFilter(resetPage = true)` nhận tham số `resetPage`; khi `resetPage` mặc định thì reset `booksPage = 1` (áp dụng khi đổi bộ lọc/tìm kiếm).
- Dòng 368-375: `setupPagination(booksPagination, {...})` nối sự kiện với `renderBooks(filteredBooks)`.
- Dòng 404, 469, 528: đổi các lệnh gọi `applyBooksFilter()` (xoá sách, nhập kho, lưu sách) thành `applyBooksFilter(false)` để giữ nguyên trang hiện tại.
- Dòng 528-529: `applySaleBooksFilter()` cũng được đổi thành `applySaleBooksFilter(false)`.

### 9. Phân trang client-side cho bảng Đơn hàng (Tab 2)

- **Nội dung thay đổi:** Giống mục 8 nhưng cho bảng Đơn hàng (đơn vị hiển thị "đơn hàng"). Thứ tự sắp xếp đơn mới nhất lên đầu được giữ nguyên, việc phân trang áp dụng **sau** khi đảo thứ tự.
- **File thay đổi:** `src/js/admin.js`
- **Chi tiết thay đổi ở các dòng từ 539 đến 615, từ 617 đến 638, từ 640 đến 647, dòng 660, dòng 716, dòng 735**

Chi tiết từng đoạn:
- Dòng 539-615: `renderOrders()` lưu `filteredOrders`, đảo thứ tự `sorted = [...filteredOrders].reverse()`, gọi `paginate(sorted, ordersPage, ordersPageSize)`, render `pageData.items` và gọi `drawPagination(ordersPagination, ...)`.
- Dòng 617-638: `applyOrdersFilter(resetPage = true)` nhận tham số `resetPage`, reset `ordersPage = 1` khi đổi bộ lọc.
- Dòng 640-647: `setupPagination(ordersPagination, {...})`.
- Dòng 660, 716, 735: đổi `applyOrdersFilter()` thành `applyOrdersFilter(false)` tại các thao tác tại chỗ (đổi trạng thái đơn, xác nhận hoàn thành, xoá đơn).

### 10. Phân trang client-side cho bảng Người dùng (Tab 4)

- **Nội dung thay đổi:** Bảng Người dùng có thanh phân trang (đơn vị "người dùng"). Gõ từ khóa tìm kiếm sẽ quay về trang 1.
- **File thay đổi:** `src/js/admin.js`
- **Chi tiết thay đổi ở các dòng từ 890 đến 932, từ 934 đến 945, từ 947 đến 954**

Chi tiết từng đoạn:
- Dòng 890-932: `renderUsers()` lưu `filteredUsers`, gọi `paginate(filteredUsers, usersPage, usersPageSize)`, render `pageData.items` và gọi `drawPagination(usersPagination, ...)`.
- Dòng 934-945: handler `input` của `#searchUserInput` reset `usersPage = 1` trước khi render.
- Dòng 947-954: `setupPagination(usersPagination, {...})`.

### 11. Phân trang client-side cho bảng Quản lý Sale (Tab 5)

- **Nội dung thay đổi:** Bảng Quản lý Sale liệt kê toàn bộ đầu sách (50 cuốn) nên cũng được phân trang (đơn vị "cuốn sách"). Bộ lọc trạng thái Sale và tìm kiếm sẽ quay về trang 1.
- **File thay đổi:** `src/js/admin.js`
- **Chi tiết thay đổi ở các dòng từ 1091 đến 1118, từ 1120 đến 1205, từ 1207 đến 1214**

Chi tiết từng đoạn:
- Dòng 1091-1118: `applySaleBooksFilter(resetPage = true)` nhận tham số `resetPage`, reset `salesPage = 1` khi đổi bộ lọc.
- Dòng 1120-1205: `renderSalesTable()` lưu `filteredSales`, gọi `paginate(filteredSales, salesPage, salesPageSize)`, render `pageData.items` và gọi `drawPagination(salesPagination, ...)`.
- Dòng 1207-1214: `setupPagination(salesPagination, {...})`.

### 12. Thêm 4 container thanh phân trang vào trang Admin

- **Nội dung thay đổi:** Thêm 4 thẻ `<div class="pagination" id="...">` đặt ngay dưới mỗi bảng dữ liệu trong 4 tab, nội dung được `admin.js` render vào.
- **File thay đổi:** `pages/admin.html`
- **Chi tiết thay đổi ở các dòng 167 (bảng Kho sách), dòng 212 (bảng Đơn hàng), dòng 277 (bảng Người dùng), dòng 421 (bảng Quản lý Sale)**

### 13. Thêm CSS thanh phân trang cho bảng Admin

- **Nội dung thay đổi:** Thêm bộ style `.pagination`, `.pagination-bar`, `.pagination-meta`, `.pagination-info`, `.pagination-size-label`, `.pagination-size-select`, `.pagination-controls`, `.pagination-btn` (kèm trạng thái `.active`, `:hover`, `:disabled`) và `.pagination-ellipsis`.
- **File thay đổi:** `src/css/admin.css`
- **Chi tiết thay đổi ở các dòng từ 393 đến 500**

### 14. Thêm CSS chế độ tối cho thanh phân trang Admin

- **Nội dung thay đổi:** Override màu cho `html.dark` / `body.dark`: nền thanh phân trang `#0b1120`, nút nền `#0f172a`, nút active dùng `--primary`, chữ sáng tương phản.
- **File thay đổi:** `src/css/dark-theme.css`
- **Chi tiết thay đổi ở các dòng từ 617 đến 668** (khối override `html.dark` / `body.dark` cho `.pagination-bar` bắt đầu ở dòng 619, kết thúc ở dòng 668 với `.pagination-ellipsis`)

---

## Ghi chú kỹ thuật

1. **Vì sao phân trang client-side?** Dữ liệu trong trang Quản trị đã được nạp sẵn vào bộ nhớ (`allBooks`, `allOrders`, `allUsers`) để phục vụ các ô thống kê Dashboard, nên cắt trang ngay trên bộ nhớ là cách đơn giản nhất và không phụ thuộc header `X-Total-Count` của json-server (header này dễ bị chặn bởi CORS). Cách này cũng giữ nguyên được logic bộ lọc 3 lớp của bảng Kho sách mà không phải ánh xạ sang tham số query.

2. **Lazy render không thay thế phân trang.** Carousel cuộn ngang theo thể loại là mẫu UI chuẩn của cửa hàng sách trực tuyến, áp phân trang vào sẽ phá vỡ trải nghiệm. Vì vậy trang chủ dùng lazy render (render 5 cuốn đầu, nạp thêm khi cuộn) thay vì phân trang.

3. **"Xem thêm" thay vì phân trang cho kết quả tìm kiếm.** Kết quả tìm kiếm là lưới phẳng, "Xem thêm" là mẫu phổ biến của thương mại điện tử và nhẹ hơn phân trang.

4. **Ảnh hưởng hiệu năng (với `db.json` hiện tại: 50 cuốn, 8 thể loại):**
   - Trang chủ: DOM thẻ sản phẩm giảm từ **50 → 40** thẻ ngay khi tải trang (8 kệ × 5 cuốn), phần còn lại nạp khi cuộn.
   - Admin bảng Kho sách: giảm từ **50 → 10** dòng hiển thị; bảng Sale: **50 → 10** dòng.

5. **Không có thay đổi nào đụng tới `db.json`, `src/services/*` hay schema dữ liệu.**

---

## Đã kiểm tra

| Hạng mục | Cách kiểm tra | Kết quả |
|---|---|---|
| Cú pháp ES module của các file JS đã sửa | `node --check` trên bản sao `.mjs` | Đạt (`home.js`, `admin.js`, `pagination.js`, `format.js`) |
| Build production đa trang | `npm run build` | Đạt - 100 modules transformed, built in 17.26s (cảnh báo chunk >500kB là của `html2pdf.js`, có sẵn từ trước) |
| Logic hàm `paginate` / `getPageNumbers` / `buildPaginationHtml` | Script Node kiểm tra các ca biên (rỗng, vượt trang cuối, đổi pageSize, nhiều trang) | Đạt - kẹp trang đúng, số trang + dấu `...` đúng |
| Trang chủ - lazy render carousel | Chrome headless (CDP) | 8 kệ, mỗi kệ 5 thẻ, tổng 40 < 50 cuốn; cuộn tới cuối kệ số 1: **5 → 7 thẻ** |
| Trang chủ - nút "Xem thêm" | Chrome headless (CDP) | Render 8 kết quả đầu; bấm "Xem thêm": **8 → 16**; nút tự ẩn khi hết kết quả |
| Trang Admin - phân trang bảng Kho sách | Chrome headless (CDP) | 10 dòng/trang; có thanh phân trang "Hiển thị 1-10 / 50 cuốn sách"; bấm trang 2 → dữ liệu đổi sang mã #11, active = trang 2 |
| Trang Admin - lọc lại quay về trang 1 | Chrome headless (CDP) | Sau khi gõ từ khóa: trang active = 1 |
| Trang Admin - đổi số bản ghi/trang | Chrome headless (CDP) | Chọn 20 → hiển thị 20 dòng, quay về trang 1 |
| Trang Admin - các bảng còn lại | Chrome headless (CDP) | "1-8 / 8 đơn hàng", "1-5 / 5 người dùng", "1-10 / 50 cuốn sách" |
| Chế độ tối | Chrome headless (CDP) | Bật được dark mode, nút phân trang đổi nền sang màu tối |
| **Tổng** | | **23/23 test PASS** |

> Ghi chú: quá trình kiểm thử dùng json-server tạm trên cổng 3010 và Vite tạm trên cổng 5199; `src/api/client.js` đã được khôi phục về `http://localhost:3000` sau khi test. Không thay đổi nào trong `src/api/client.js` được giữ lại.

---

## Ngoài phạm vi lần này (ghi nhận để tham khảo)

- **Bảng Thể loại (Tab 3)** chưa phân trang vì chỉ có 8 bản ghi - không cần thiết.
- **Trang lịch sử đơn hàng `pages/orders.html`** vẫn render toàn bộ đơn của người dùng, chưa phân trang (hiện chỉ có 8 đơn trong `db.json`).
- **Port 3000 đang bị một tiến trình `json-server` khác chiếm** (thuộc dự án khác, trả về dữ liệu trà sữa). Khi chạy `npm run server` cho dự án này cần đảm bảo cổng 3000 trống, nếu không API sẽ trả về dữ liệu của dự án khác.

---

TRẠNG THÁI: <KHÔNG CÒN VẤN ĐỀ>
