# LOG TRIỂN KHAI MYSQL DOCKER & XÂY DỰNG BACKEND NODE.JS REST API

## 1. Mục tiêu phiên làm việc
1. Chuyển đổi toàn bộ hệ thống từ Mock API (`json-server` với `db.json`) sang Cơ sở dữ liệu quan hệ **MySQL 8.0** chạy trong môi trường **Docker (Docker Compose)** cùng công cụ quản trị trực quan **phpMyAdmin**.
2. Thiết kế và triển khai Schema SQL chuẩn 3NF: hỗ trợ đa gian hàng (Seller Stores), bảng quan hệ nhiều-nhiều, Stored Procedure `sp_place_order` trừ tồn kho nguyên tử chống race condition và `sp_cancel_order` hoàn kho an toàn.
3. Viết script di chuyển (migration) dữ liệu tự động: băm mật khẩu tài khoản demo bằng `bcrypt`, chuyển 52 cuốn sách, danh mục, mã giảm giá, đánh giá và 10 đơn hàng cũ từ `db.json` sang MySQL.
4. Thiết lập Git version control, bảo mật biến môi trường qua `.gitignore` và đẩy toàn bộ mã nguồn lên GitHub: `https://github.com/hieunguyenpro1919/Ebook.git`.
5. Xây dựng Backend Node.js (Express.js) RESTful API thay thế hoàn toàn `json-server`, hỗ trợ xác thực JWT và tương thích ngược 100% với Frontend hiện có.
6. Cập nhật script khởi động `start.bat` để bật 1-click toàn bộ hệ thống (Docker MySQL + Backend Express + Frontend Vite).

---

## 2. Bảng tổng quan thay đổi

| STT | Nội dung thay đổi | File liên quan | Chi tiết ghi chú |
|:---:|-------------------|----------------|-------------------|
| 1 | Cấu hình Docker Compose cho MySQL & phpMyAdmin | `docker-compose.yml`, `.env`, `.env.example` | MySQL 8.0 (cổng 3306, utf8mb4) + phpMyAdmin (cổng 8080) |
| 2 | Thiết kế Schema DDL & Procedure | `db/init/01_schema.sql`, `db/init/02_procedures.sql` | 11 bảng chuẩn 3NF, Trigger kiểm soát review, 2 Stored Procedures |
| 3 | Script Migration dữ liệu tự động | `scripts/migrate_data.js` | Đọc `db.json`, băm bcrypt mật khẩu, nạp toàn bộ vào MySQL |
| 4 | Cấu hình Git & bảo mật file nhạy cảm | `.gitignore`, `package.json` | Loại trừ `node_modules/`, `.env`; khởi tạo branch `main` trên GitHub |
| 5 | Kết nối MySQL Connection Pool | `server/config/db.js` | Dùng `mysql2/promise` kết nối pool tự động |
| 6 | Middleware xử lý lỗi & xác thực JWT | `server/middlewares/errorHandler.js`, `server/middlewares/authMiddleware.js` | Bắt lỗi tập trung (mã 45000, ER_DUP_ENTRY), verify JWT & role |
| 7 | Controllers & Routes hệ thống API | `server/controllers/`, `server/routes/` | 6 module: Auth, Categories, Products, Orders, Coupons, Reviews |
| 8 | Server Entry Point | `server/index.js` | Express app port 3000, CORS, logging, mount router, healthcheck |
| 9 | Bộ kiểm thử tự động API Server | `scripts/test_server.js` | Test healthcheck, 5 endpoint CRUD và login JWT token |
| 10 | Script khởi động 1-click | `start.bat` | Tự động chạy `docker-compose up -d`, backend và frontend |

---

## 3. Chi tiết kỹ thuật từng phần

### 3.1. Cơ sở dữ liệu MySQL trên Docker
- **`docker-compose.yml`**:
  - Dịch vụ `mysql`: Image `mysql:8.0`, cấu hình `--character-set-server=utf8mb4`, `--default-time-zone=+07:00`, mount volume `mysql_data` và mount script khởi tạo `./db/init` vào `/docker-entrypoint-initdb.d`.
  - Dịch vụ `phpmyadmin`: Image `phpmyadmin:latest`, chạy trên cổng 8080, phụ thuộc `mysql` với điều kiện `service_healthy`.
- **`db/init/01_schema.sql`**:
  - Bảng `users`: trường `password_hash` (VARCHAR 255), `role` ENUM('admin','seller','customer'), `avatar` (MEDIUMTEXT hỗ trợ ảnh base64).
  - Bảng `store_profiles`: tách riêng 1 Seller = 1 Gian hàng chuẩn 3NF.
  - Bảng `products`: liên kết `store_id` và `category_id`, cột `image` MEDIUMTEXT, ràng buộc `CHECK (stock >= 0)` chống âm kho.
  - Bảng `orders` & `order_items`: lưu snapshot giá mua `unit_price`, tên sách, `store_id` và trạng thái `status` theo từng shop.
  - Bảng `reviews`: cấu trúc cây lồng nhau qua `parent_id` tự trỏ vào chính nó; trigger `trg_reviews_bi` bắt buộc review gốc có số sao (1-5), reply không có sao.
  - View `v_product_ratings`: tính điểm trung bình sản phẩm thời gian thực.
- **`db/init/02_procedures.sql`**:
  - `sp_place_order`: thực hiện trừ kho nguyên tử bằng `UPDATE products ... WHERE status='active' AND stock >= qty`, kiểm tra `ROW_COUNT()`, khóa dòng coupon `FOR UPDATE`, commit/rollback an toàn tuyệt đối.
  - `sp_cancel_order`: hoàn lại số lượng tồn kho tự động khi đơn hàng bị hủy.

### 3.2. Script Migration (`scripts/migrate_data.js`)
- Đọc `db.json`, sử dụng thư viện `bcryptjs` để hash toàn bộ mật khẩu người dùng (`123456`, `admin`, `seller123`).
- Nạp đầy đủ 8 users, 3 gian hàng sellers (`NXB Trẻ Official`, `Nhã Nam Books`, `Tiệm Sách Tri Thức`), 8 danh mục, 52 sản phẩm, 4 mã giảm giá, 11 đánh giá, 10 đơn hàng cũ và 11 chi tiết đơn hàng vào MySQL.

### 3.3. Quản lý mã nguồn với Git & GitHub
- Tạo `.gitignore` chuẩn cho Node.js/Vite: loại trừ `node_modules/`, `dist/`, `.env`.
- Tạo `.env.example` làm mẫu cấu hình kết nối.
- Khởi tạo Git repo, tạo commit và push toàn bộ lên: `https://github.com/hieunguyenpro1919/Ebook.git` tại branch `main`.

### 3.4. Xây dựng Backend Node.js Express REST API (`server/`)
- **`server/config/db.js`**: Tạo connection pool kết nối MySQL bằng `mysql2/promise`, hỗ trợ keepAlive.
- **`server/middlewares/`**:
  - `errorHandler.js`: Bắt lỗi SQL tập trung, map lỗi `ER_DUP_ENTRY` và lỗi nghiệp vụ từ Stored Procedure (`sqlState = '45000'`).
  - `authMiddleware.js`: Cung cấp hàm `verifyToken` và `requireRole('admin', 'seller')`.
- **`server/controllers/` & `server/routes/`**:
  - `auth`: `POST /api/auth/register`, `POST /api/auth/login` (cấp JWT token hạn 7 ngày), `GET /api/auth/profile`, `PUT /api/auth/profile`.
  - `categories`: `GET /categories` (trả về danh sách 8 danh mục).
  - `products`: `GET /products` (hỗ trợ tìm kiếm từ khóa `q`, lọc `categoryId`, `sellerId`, `onSale`, phân trang `_limit`, `_page`), `POST /products`, `PUT /products/:id`, `DELETE /products/:id`.
  - `orders`: `POST /orders` (gọi Stored Procedure `sp_place_order`), `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id` (cập nhật trạng thái hoặc hủy đơn tự động hoàn kho qua `sp_cancel_order`).
  - `coupons`: `GET /coupons` (lấy và kiểm tra mã giảm giá).
  - `reviews`: `GET /reviews?productId=...`, `POST /reviews`.
  - Tương thích ngược: Mount cả tiền tố `/api/...` lẫn đường dẫn gốc `/...`, cung cấp route `GET /user` để tương thích 100% với code frontend cũ.
- **`server/index.js`**: Chạy tại cổng 3000, cấu hình CORS, parser JSON 20MB.

### 3.5. Cập nhật khởi động `start.bat`
- Cập nhật script batch: tự động chạy `docker-compose up -d` kiểm tra MySQL container, sau đó mở 2 cửa sổ terminal chạy đồng thời `npm run server` (Node.js API) và `npm run dev` (Vite Frontend).

---

## 4. Kết quả kiểm thử / nghiệm thu
1. **Container Docker:** Cả 2 container `nhasach-mysql` (cổng 3306) và `nhasach-phpmyadmin` (cổng 8080) đều ở trạng thái `Up (healthy)`.
2. **Dữ liệu MySQL:** Query trực tiếp đếm số dòng:
   - `users`: 8
   - `store_profiles`: 3
   - `categories`: 8
   - `products`: 52
   - `orders`: 10
   - `order_items`: 11
   - `coupons`: 4
   - `reviews`: 11
3. **Bộ kiểm thử API (`scripts/test_server.js`):**
   - Healthcheck `GET /api/health`: trả về HTTP 200 `{ status: 'healthy', database: 'connected' }`.
   - `GET /categories`: lấy đủ 8 thể loại.
   - `GET /products`: lấy đủ 52 cuốn sách.
   - `GET /coupons`: lấy đủ 4 mã giảm giá.
   - `GET /orders`: lấy đủ 10 đơn hàng.
   - `POST /api/auth/login`: Đăng nhập thử nghiệm tài khoản admin `admin@bookstore.vn` / `admin` thành công, nhận JWT token hợp lệ.
4. **Git Version Control:** Toàn bộ commit đã được đồng bộ lên GitHub `origin/main` không có xung đột.

---

## 5. Những việc cần làm tiếp theo ở các phiên sau
1. Từng bước điều chỉnh các file service ở Frontend (`src/services/authService.js`, `cartService.js`) để tận dụng trực tiếp JWT token thay vì dựa hoàn toàn vào `localStorage`.
2. Bổ sung tính năng đồng bộ giỏ hàng DB (`cart_items`) khi người dùng đăng nhập trên nhiều thiết bị.
3. Hoàn thiện giao diện quản trị Admin / Seller kết nối tới các endpoint cập nhật sản phẩm và quản lý đơn hàng mới.

---

TRẠNG THÁI: `<KHÔNG CÒN VẤN ĐỀ>`

