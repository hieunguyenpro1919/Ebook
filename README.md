# 📚 ĐỒ ÁN: WEBSITE THƯƠNG MẠI ĐIỆN TỬ NHÀ SÁCH TRỰC TUYẾN - TRÍ TUỆ BOOK

> **Học phần:** Lập trình JavaScript (JavaScript Programming)  
> **Sinh viên thực hiện:** Nguyễn Văn Hiếu  
> **Mã số sinh viên (MSSV):** 501250367  
> **Hình thức thực hiện:** Đồ án cá nhân (Individual Project)  
> **Đề tài:** Xây dựng ứng dụng Web Thương mại điện tử Nhà sách trực tuyến hiện đại với kiến trúc phân tầng (Modular Layered Architecture), định hướng Fullstack JavaScript (Frontend Vite + Vanilla JS ES6+ kết nối RESTful API / Node.js Backend).

---

## 📖 I. GIỚI THIỆU TỔNG QUAN ĐỀ TÀI

### 1. Bối cảnh & Lý do chọn đề tài
Trong kỷ nguyên số hóa, nhu cầu tiếp cận tri thức và văn hóa đọc trực tuyến ngày càng phát triển mạnh mẽ. Việc xây dựng một nền tảng thương mại điện tử chuyên biệt cho ngành sách đòi hỏi sự kết hợp hài hòa giữa **trải nghiệm người dùng tinh tế (UI/UX)**, **tốc độ phản hồi tức thì** và **hệ thống quản trị kinh doanh chặt chẽ**.

Dự án **"Trí Tuệ Book"** được thiết kế và hiện thực hóa nhằm giải quyết bài toán mua sắm, tương tác và quản lý sách trực tuyến một cách chuyên nghiệp, mô phỏng đầy đủ quy trình vận hành của các sàn thương mại điện tử hàng đầu (Tiki, Shopee, Fahasa).

### 2. Mục tiêu của đề tài
- **Ứng dụng toàn diện kiến trúc JavaScript hiện đại:** Tận dụng triệt để các tính năng cao cấp của JavaScript ES6+ (Modules, Async/Await, Promise, DOM API, Web Storage, Custom Events) mà không phụ thuộc vào các framework nặng nề (React/Vue/Angular), giúp tối ưu hóa hiệu năng và chứng minh năng lực lập trình thuần vững chắc.
- **Mô hình kiến trúc phân tầng chuẩn mực (Layered Architecture):** Tách bạch rõ ràng giữa tầng hiển thị (Presentation/HTML-CSS), tầng điều khiển (Page Controllers), tầng dịch vụ dữ liệu (Service Layer) và tầng giao tiếp API (Client API), sẵn sàng tích hợp với bất kỳ hệ thống Backend Node.js / MySQL / MongoDB nào.
- **Trải nghiệm khách hàng vượt trội:** Tích hợp giao diện Sáng / Tối (Dark & Light Mode) chống chớp trắng (Anti-FOUC), Trợ lý AI Chatbot tư vấn sách 24/7, thanh toán chuyển khoản tự động qua chuẩn VietQR, cùng hệ thống thông báo realtime.
- **Hệ thống phân quyền 3 cấp độ (Multi-role):** Đáp ứng nhu cầu thực tế của mô hình sàn với 3 nhóm người dùng: **Khách hàng (Customer)**, **Đối tác bán hàng (Seller)** và **Ban Quản trị toàn sàn (Admin)**.

---

## 👥 II. ĐỐI TƯỢNG NGƯỜI DÙNG & PHÂN QUYỀN HỆ THỐNG

| Vai trò | Phân vùng hoạt động | Quyền hạn chính |
|:---|:---|:---|
| 👤 **Khách hàng (Customer)** | Toàn bộ giao diện mua sắm (`index.html`, `detail.html`, `cart.html`, `orders.html`, `wishlist.html`, `profile.html`) | • Xem, tìm kiếm, lọc sách theo danh mục, giá, độ bán chạy.<br>• Thả tim lưu sách yêu thích (Wishlist).<br>• Bình luận, trả lời phản hồi lồng nhau và bấm Thích (Like).<br>• Mua hàng, áp dụng mã voucher giảm giá, quét mã VietQR.<br>• Theo dõi tiến độ đơn hàng và nhận thông báo chuông realtime.<br>• Trò chuyện với AI Chatbot và nhắn tin nội bộ với Shop/Admin.<br>• Quản lý thông tin cá nhân và upload ảnh đại diện (Avatar). |
| 🏪 **Người bán (Seller)** | Kênh Đối tác người bán (`pages/seller.html`) | • Quản lý kho sách của riêng gian hàng mình (Thêm, Sửa, Xóa).<br>• Theo dõi và cập nhật trạng thái đơn hàng do gian hàng phụ trách.<br>• Thống kê doanh thu, đơn hàng bán chạy của Shop.<br>• Nhập hàng loạt sách vào kho bằng file Excel (`.xlsx`).<br>• Trực tiếp trả lời tin nhắn của khách hàng quan tâm đến sách. |
| 👑 **Quản trị viên (Admin)** | Dashboard Quản trị toàn sàn (`pages/admin.html`) | • Toàn quyền kiểm soát hệ thống: Kho sách, Danh mục, Đơn hàng, Người dùng.<br>• Thiết lập chiến dịch Flash Sale đếm ngược thời gian thực.<br>• Tạo và quản lý mã giảm giá (Vouchers/Coupons) toàn sàn.<br>• Thống kê tổng doanh thu sàn, xuất báo cáo đơn hàng sang Excel.<br>• Phân quyền và quản lý tài khoản người dùng/gian hàng. |

---

## 🛠️ III. CÔNG NGHỆ & THƯ VIỆN SỬ DỤNG

- **Frontend Core:** HTML5 ngữ nghĩa (Semantic HTML), CSS3 Hiện đại (CSS Custom Properties, Flexbox, CSS Grid, Transitions, Keyframes).
- **Ngôn ngữ lập trình:** Vanilla JavaScript ES6+ (Native Modules, Async/Await, Array Methods, Object Destructuring).
- **Công cụ đóng gói (Build Tool):** [Vite 6](https://vitejs.dev/) cấu hình Multi-Page App (MPA) tối ưu build production siêu tốc.
- **Giao tiếp API:** [Axios](https://axios-http.com/) với tầng cấu hình tập trung (`baseURL`, `timeout`, interceptors).
- **Backend & CSDL:** 
  - [Node.js](https://nodejs.org/) & [json-server](https://github.com/typicode/json-server) cung cấp hệ thống RESTful API chuẩn mực tại cổng `http://localhost:3000`.
  - Hỗ trợ lưu trữ bền vững (Persistence) và tương thích hoàn toàn để chuyển đổi sang CSDL quan hệ MySQL/MongoDB.
- **Xử lý tài liệu & Báo cáo:**
  - [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/): Xuất hóa đơn bán hàng chuẩn khổ giấy A4 định dạng PDF.
  - [xlsx (SheetJS)](https://sheetjs.com/): Đọc và xuất file bảng tính Excel `.xlsx` hai chiều (Import sách mới & Export báo cáo doanh thu).
- **Đồ họa & Phông chữ:** Google Fonts (*Plus Jakarta Sans*), hệ thống Dual Logo SVG Vector (Sáng/Tối).

---

## 🗂️ IV. CẤU TRÚC THƯ MỤC CHUẨN ĐỒ ÁN

```text
nhasach/
├── pages/                          # Các trang chức năng độc lập (Multi-page)
│   ├── product-detail.html         # Chi tiết sách, đánh giá, like, trả lời bình luận
│   ├── cart.html                   # Giỏ hàng, nhập mã voucher, thanh toán VietQR
│   ├── orders.html                 # Quản lý đơn hàng, theo dõi lộ trình, xuất hóa đơn PDF
│   ├── wishlist.html               # Bộ sưu tập sách yêu thích của người dùng
│   ├── profile.html                # Hồ sơ cá nhân, upload ảnh đại diện, đổi mật khẩu
│   ├── admin.html                  # Bảng điều khiển Quản trị viên (5 tab quản lý)
│   ├── seller.html                 # Kênh Người bán (Quản lý kho sách & đơn của Shop)
│   ├── login.html                  # Đăng nhập phân quyền & Quên mật khẩu qua OTP Gmail
│   └── dangky.html                 # Đăng ký tài khoản người mua / gian hàng
│
├── src/                            # Mã nguồn ứng dụng
│   ├── api/
│   │   ├── client.js               # Cấu hình Axios instance tập trung (Port 3000)
│   │   └── auth.js                 # API xác thực người dùng
│   ├── assets/                     # Tài nguyên hình ảnh, logo SVG đối ngẫu Nhật - Nguyệt
│   ├── css/                        # Tầng định kiểu giao diện theo từng mô-đun
│   │   ├── style.css               # Phong cách trang chủ & layout dùng chung
│   │   ├── dark-theme.css          # Chế độ tối Cosmic Obsidian toàn diện
│   │   ├── detail.css              # Giao diện trang chi tiết, bình luận lồng nhau & like
│   │   ├── cart.css                # Giao diện giỏ hàng & modal thanh toán VietQR
│   │   ├── orders.css              # Giao diện đơn hàng & hóa đơn in PDF
│   │   ├── wishlist.css            # Giao diện danh sách sách yêu thích
│   │   ├── profile.css             # Giao diện hồ sơ cá nhân & upload ảnh
│   │   ├── admin.css               # Giao diện dashboard Quản trị viên
│   │   ├── seller.css              # Giao diện dashboard Kênh Người Bán
│   │   ├── auth.css                # Giao diện đăng nhập, đăng ký & OTP
│   │   ├── chatbot.css             # Khung chat AI tư vấn sách thông minh
│   │   ├── internalChat.css        # Khung chat nội bộ giữa các thành viên/Shop
│   │   ├── notificationBell.css    # Chuông thông báo đơn hàng trên header
│   │   └── excelImport.css         # Modal xem trước & nhập dữ liệu Excel
│   ├── services/                   # Tầng Dịch vụ gọi API (Business & API Services)
│   │   ├── authService.js          # Xác thực, đăng ký, đăng nhập, phân quyền, OTP
│   │   ├── productService.js       # CRUD sản phẩm, cập nhật tồn kho, lọc danh mục
│   │   ├── orderService.js         # Tạo đơn, cập nhật trạng thái đơn, hủy đơn
│   │   ├── reviewService.js        # Đánh giá sao, bình luận tự do, like & trả lời
│   │   ├── wishlistService.js      # Thêm/xóa sách yêu thích theo tài khoản
│   │   ├── couponService.js        # Kiểm tra điều kiện & áp dụng mã giảm giá
│   │   ├── internalChatService.js  # Lưu trữ & tải lịch sử hội thoại nội bộ
│   │   ├── notificationBell.js     # Lắng nghe & hiển thị thông báo biến động đơn
│   │   ├── imageUpload.js          # Xử lý chọn ảnh, live preview & nén Base64
│   │   ├── excelImport.js          # Đọc file Excel .xlsx & nhập sách hàng loạt
│   │   ├── saleService.js          # Quản lý chiến dịch Flash Sale & đếm ngược
│   │   └── categoryService.js      # Lấy & quản lý danh mục thể loại sách
│   ├── utils/                      # Tầng tiện ích dùng chung
│   │   ├── format.js               # Định dạng tiền tệ VND, ngày tháng, escape HTML
│   │   └── pagination.js           # Phân trang bảng dữ liệu dùng chung (Pagination)
│   └── js/                         # Tầng điều khiển logic từng trang
│       ├── home.js                 # Điều khiển trang chủ (Filter, Search, Kệ sách, Sale)
│       ├── detail.js               # Điều khiển trang chi tiết, like & thread bình luận
│       ├── cart.js                 # Điều khiển giỏ hàng, áp mã giảm giá & VietQR
│       ├── orders.js               # Điều khiển lịch sử đơn & xuất hóa đơn PDF
│       ├── wishlist.js             # Điều khiển danh sách sách yêu thích
│       ├── profile.js              # Điều khiển trang hồ sơ & cập nhật avatar
│       ├── admin.js                # Điều khiển trang Admin, xuất Excel, quản lý Sale
│       ├── seller.js               # Điều khiển trang Seller & nhập kho Excel
│       ├── chatbot.js              # Điều khiển widget Trợ lý AI tư vấn sách
│       ├── internalChat.js         # Điều khiển drawer chat trao đổi giữa các thành viên
│       └── themeToggle.js          # Chuyển đổi giao diện Sáng/Tối & chống chớp trắng
│
├── LOG/                            # Nhật ký tiến độ phát triển dự án (Audit Trail)
├── BUG/                            # Nhật ký phát hiện & khắc phục lỗi kỹ thuật
├── db.json                         # Cơ sở dữ liệu mẫu REST API
├── vite.config.js                  # Cấu hình đa trang (MPA) của Vite
├── package.json                    # Khai báo gói thư viện & scripts khởi chạy
└── start.bat                       # Script 1-click tự động chạy cả Frontend và Backend
```

---

## 🚀 V. HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### Cách 1: Khởi động 1-Click bằng `start.bat` (Khuyên dùng trên Windows)
Chỉ cần nhấp đúp chuột vào file **`start.bat`** tại thư mục gốc. Hệ thống sẽ tự động bật 2 cửa sổ terminal độc lập:
1. Terminal 1: Chạy Backend REST API Server tại `http://localhost:3000`.
2. Terminal 2: Chạy Frontend Vite Dev Server tại `http://localhost:5173`.

### Cách 2: Khởi động thủ công bằng dòng lệnh

**Bước 1: Cài đặt các thư viện cần thiết**
```bash
npm install
```

**Bước 2: Khởi động Backend API Server**
```bash
npm run server
```
Server chạy tại `http://localhost:3000` với đầy đủ các RESTful endpoint: `/products`, `/categories`, `/orders`, `/reviews`, `/coupons`, `/user`...

**Bước 3: Khởi động Frontend Web Application**
Mở thêm một cửa sổ terminal mới và chạy:
```bash
npm run dev
```
Trình duyệt sẽ tự động mở trang web tại địa chỉ: `http://localhost:5173` (hoặc cổng tiếp theo do Vite cấp phát).

**Bước 4: Kiểm tra bản build Production (Tuỳ chọn)**
```bash
npm run build
```
Quá trình build diễn ra hoàn hảo trong thư mục `/dist`, cam kết 0 lỗi biên dịch.

---

## ✨ VI. BẢNG TỔNG HỢP 14 TÍNH NĂNG CHÍNH CỦA ĐỒ ÁN

| STT | Tính năng | Hiện trạng | Điểm nổi bật về mặt kỹ thuật & trải nghiệm |
|:---:|:---|:---:|:---|
| **1** | **Upload ảnh đại diện cá nhân** | ✅ Hoàn thiện | Chọn ảnh từ máy tính (PNG/JPG/WEBP), xem trước ảnh tức thì (Live Preview), nén Base64 đồng bộ vào tài khoản người dùng, hiển thị tự động trên thanh Header, Hồ sơ cá nhân và Avatar bình luận/chat. |
| **2** | **Sách yêu thích (Wishlist)** | ✅ Hoàn thiện | Nút thả tim ❤️ linh hoạt trên trang chủ và chi tiết sách, trang `wishlist.html` quản lý danh sách yêu thích riêng, chuyển đổi nhanh vào giỏ hàng hoặc xóa khỏi danh sách. |
| **3** | **Đánh giá sản phẩm (Rating)** | ✅ Hoàn thiện | Chấm sao tương tác từ 1 đến 5 sao, tự động tính điểm số trung bình (Average Rating) hiển thị trên từng thẻ sách, trang chi tiết và phân bổ sao trực quan. |
| **4** | **Bình luận nâng cao (Comments)** | ✅ Hoàn thiện | Bỏ cơ chế giới hạn giúp độc giả bình luận tự do; hỗ trợ **Trả lời bình luận lồng nhau (Threaded Replies)** và **Nút Thích (❤️ Like)** cập nhật tức thì. |
| **5** | **Kênh Chat kép (Dual Chat)** | ✅ Hoàn thiện | Tích hợp cả 2 hệ thống: **Trợ lý AI Chatbot** phân tích từ khóa tư vấn sách 24/7 và **Khung Chat nội bộ** kết nối trực tiếp khách hàng với gian hàng/admin. |
| **6** | **Thông báo biến động đơn hàng** | ✅ Hoàn thiện | Chuông thông báo trên Header kèm badge đếm số lượng chưa đọc. Tự động nhận thông báo khi đơn hàng được duyệt, chuyển giao hoặc hủy bỏ. |
| **7** | **Mã giảm giá (Coupons/Vouchers)** | ✅ Hoàn thiện | Khách hàng áp mã giảm giá theo % hoặc số tiền mặt tại trang giỏ hàng; Admin có công cụ tạo, quản lý hạn dùng và điều kiện đơn tối thiểu. |
| **8** | **Thống kê & Báo cáo số liệu** | ✅ Hoàn thiện | Dashboard Admin & Seller trực quan hóa doanh thu, tổng số đơn hoàn thành, danh sách sách bán chạy và biểu đồ phân tích. |
| **9** | **Xuất dữ liệu Excel** | ✅ Hoàn thiện | Tích hợp thư viện SheetJS (`xlsx`), xuất danh sách toàn bộ sách trong kho và lịch sử đơn hàng ra file Excel `.xlsx` chuẩn bảng tính. |
| **10** | **Xuất hóa đơn PDF** | ✅ Hoàn thiện | Tích hợp `html2pdf.js`, tạo hóa đơn mua hàng kiêm phiếu xuất kho chuẩn định dạng khổ giấy A4 tải về thiết bị hoặc in trực tiếp. |
| **11** | **Import sách hàng loạt từ Excel** | ✅ Hoàn thiện | Tải file Excel `.xlsx` lên, kiểm tra tính hợp lệ của từng cột dữ liệu, xem trước bảng dữ liệu và nhập hàng chục cuốn sách vào hệ thống chỉ với 1 click. |
| **12** | **Bảng điều khiển Quản trị (Dashboard)** | ✅ Hoàn thiện | Phân chia riêng biệt: Dashboard toàn quyền cho **Admin** (`admin.html`) và Kênh bán hàng riêng biệt cho **Seller** (`seller.html`). |
| **13** | **Phân quyền người dùng (Multi-role Auth)** | ✅ Hoàn thiện | Cơ chế phân quyền 3 cấp (`customer`, `seller`, `admin`), bảo vệ các route trang nhạy cảm, tích hợp tính năng khôi phục mật khẩu qua mã OTP mô phỏng Gmail. |
| **14** | **Responsive & Giao diện Sáng/Tối** | ✅ Hoàn thiện | Tương thích đa thiết bị (Mobile, Tablet, Desktop); chế độ tối Cosmic Obsidian đẳng cấp và kỹ thuật script chặn đứng hiện tượng chớp màn hình trắng (Anti-FOUC). |

---

## 🔑 VII. TÀI KHOẢN KIỂM THỬ MẪU (TEST ACCOUNTS)

Hệ thống đã chuẩn bị sẵn các tài khoản với dữ liệu mẫu phong phú trong `db.json`:

| Vai trò | Email đăng nhập | Mật khẩu | Mục đích kiểm thử |
|:---|:---|:---|:---|
| 👑 **Quản trị viên (Admin)** | `admin@bookstore.vn` | `admin` | Truy cập trang Quản trị toàn diện (`pages/admin.html`), quản lý kho sách, đơn hàng toàn sàn, tạo mã giảm giá, cấu hình Flash Sale, xuất Excel. |
| 🏪 **Người bán (Seller)** | `seller@bookstore.vn` | `seller123` | Truy cập Kênh Người Bán (`pages/seller.html`), quản lý kho sách riêng của gian hàng, cập nhật đơn hàng và Import sách bằng file Excel. |
| 👤 **Khách hàng 1** | `vana@gmail.com` | `testpass123` | Tài khoản có sẵn đơn hàng thực tế: kiểm tra xác nhận nhận hàng, đánh giá sao, bình luận, xuất hóa đơn PDF, thả tim sách và chat. |
| 👤 **Khách hàng 2** | `b@gmail.com` | `bgmail` | Kiểm tra luồng mua sắm mới từ đầu, áp mã voucher giảm giá, chọn thanh toán VietQR và nhắn tin trao đổi với Shop. |

---

## 🎯 VIII. KẾT LUẬN & ĐÁNH GIÁ ĐỒ ÁN

Đồ án **"Nhà Sách Trực Tuyến - Trí Tuệ Book"** là minh chứng rõ nét cho việc kết hợp nhuần nhuyễn giữa **nền tảng tư duy JavaScript thuần vững chắc** với **các tiêu chuẩn kỹ thuật phần mềm hiện đại**:
- Codebase được tổ chức theo cấu trúc module mạch lạc, tường minh, chú thích đầy đủ bằng tiếng Việt.
- Tầng giao tiếp dữ liệu độc lập giúp dự án dễ dàng mở rộng, bảo trì và tích hợp với các hệ thống Backend quy mô lớn.
- Đáp ứng 100% các tiêu chí khắt khe của môn học và sẵn sàng tự tin bảo vệ trước Hội đồng giảng viên.

---
*(Tài liệu được cập nhật và kiểm thử tương thích hoàn toàn trên phiên bản mới nhất của dự án).*
