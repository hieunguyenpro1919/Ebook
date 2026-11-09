# 🏗️ Software Architecture Design — Nhà Sách Trí Tuệ Book

> [!NOTE]
> **Tài liệu Thiết Kế Kiến Trúc Phần Mềm (Software Architecture Design Document)** cho hệ thống Website Thương mại điện tử Nhà sách Trí Tuệ Book.
> 
> **Sinh viên thực hiện:** Nguyễn Văn Hiếu — **MSSV:** 501250367  
> **Học phần:** Lập trình JavaScript (JavaScript Programming)  
> **Hình thức:** Đồ án cá nhân (Individual Project)  
> **Mô hình kiến trúc:** Modular Layered Architecture (Multi-Page App + Modern ES6+ & RESTful Service Layer)

---

## 1. 🌐 High-Level System Architecture (Kiến Trúc Tổng Quan)

Hệ thống được thiết kế theo mô hình **Kiến trúc phân tầng hướng dịch vụ (Modular Layered Architecture)** nhằm đảm bảo tính độc lập, dễ kiểm thử và sẵn sàng tích hợp với bất kỳ nền tảng Backend nào (Node.js, Express, Docker, MySQL):

```mermaid
flowchart TD
    USER["👤 Khách hàng\n(Web Browser)"]
    SELLER["🏪 Đối tác bán hàng\n(Seller Portal)"]
    ADMIN["👑 Quản trị viên\n(Admin Portal)"]

    subgraph PRESENTATION["🖥️ Presentation Layer (UI Pages)"]
        PUB_PAGES["Public Pages\n(index, detail, cart, wishlist)"]
        AUTH_PAGES["Auth Pages\n(login, dangky, profile)"]
        DASH_PAGES["Dashboard Pages\n(admin.html, seller.html, orders.html)"]
    end

    subgraph CONTROLLER["🎮 Controller Layer (Page Controllers)"]
        PAGE_CTRLS["src/js/*.js\n(home, detail, cart, orders, admin, seller)"]
        WIDGET_CTRLS["Interactive Widgets\n(chatbot.js, internalChat.js, themeToggle.js)"]
    end

    subgraph SERVICE["⚙️ Service Layer (Business Logic)"]
        PROD_SVC["productService.js"]
        ORDER_SVC["orderService.js"]
        CART_SVC["cartService.js"]
        REV_SVC["reviewService.js"]
        COUP_SVC["couponService.js"]
        WISH_SVC["wishlistService.js"]
        AUTH_SVC["authService.js"]
        IMG_SVC["imageUpload.js"]
        EXCEL_SVC["excelImport.js"]
        NOTIF_SVC["notificationBell.js"]
        CHAT_SVC["internalChatService.js"]
    end

    subgraph INFRASTRUCTURE["📡 Data & Infrastructure Layer"]
        AXIOS["Axios Client Instance\n(src/api/client.js :3000)"]
        STORAGE["Web Storage\n(LocalStorage / Session)"]
        SERVER["RESTful API Server\n(Node.js / json-server)"]
        DB[("Database\ndb.json / MySQL")]
    end

    USER --> PUB_PAGES
    USER --> AUTH_PAGES
    SELLER --> DASH_PAGES
    ADMIN --> DASH_PAGES

    PUB_PAGES --> PAGE_CTRLS
    AUTH_PAGES --> PAGE_CTRLS
    DASH_PAGES --> PAGE_CTRLS
    PUB_PAGES --> WIDGET_CTRLS

    PAGE_CTRLS --> SERVICE
    WIDGET_CTRLS --> SERVICE

    SERVICE --> AXIOS
    SERVICE <--> STORAGE
    AXIOS --> SERVER
    SERVER --> DB
```

---

## 2. 📂 Project Directory Structure (Cấu Trúc Thư Mục Dự Án)

```text
nhasach/
├── pages/                          # Các trang giao diện con (Multi-Page Application)
│   ├── product-detail.html         # Trang Chi tiết sách & Luồng bình luận lồng nhau
│   ├── cart.html                   # Trang Giỏ hàng, Voucher & Thanh toán VietQR
│   ├── orders.html                 # Trang Lịch sử đơn hàng, Đánh giá nhận hàng & In PDF
│   ├── wishlist.html               # Trang Danh sách sách yêu thích (Thả tim)
│   ├── profile.html                # Trang Hồ sơ cá nhân & Upload ảnh đại diện
│   ├── seller.html                 # Kênh Người bán (Quản lý kho sách & đơn hàng Shop)
│   ├── admin.html                  # Dashboard Quản trị toàn sàn (5 Tabs quản trị)
│   ├── login.html                  # Đăng nhập phân quyền 3 vai trò & OTP Gmail
│   └── dangky.html                 # Đăng ký tài khoản người mua / gian hàng
│
├── src/                            # Mã nguồn ứng dụng (Core Source Code)
│   ├── api/                        # Tầng kết nối mạng
│   │   ├── client.js               # Cấu hình Axios instance tập trung (Port 3000)
│   │   └── auth.js                 # API xác thực tài khoản
│   ├── assets/                     # Tài nguyên hình ảnh, Logo SVG đối ngẫu Sáng/Tối
│   ├── css/                        # Tầng stylesheet theo mô-đun
│   │   ├── style.css               # Phong cách trang chủ & layout dùng chung
│   │   ├── dark-theme.css          # Giao diện tối Cosmic Obsidian toàn diện
│   │   ├── detail.css              # Giao diện trang chi tiết & tương tác bình luận
│   │   ├── cart.css                # Giao diện giỏ hàng & modal VietQR
│   │   ├── orders.css              # Giao diện đơn hàng & mẫu hóa đơn PDF
│   │   ├── wishlist.css            # Giao diện trang sách yêu thích
│   │   ├── profile.css             # Giao diện hồ sơ & avatar
│   │   ├── admin.css               # Giao diện bảng điều khiển Admin
│   │   ├── seller.css              # Giao diện Kênh Người Bán
│   │   ├── auth.css                # Giao diện đăng nhập, đăng ký & OTP
│   │   ├── chatbot.css             # Khung chat AI tư vấn sách thông minh
│   │   ├── internalChat.css        # Khung chat nội bộ giữa các thành viên
│   │   ├── notificationBell.css    # Chuông thông báo đơn hàng
│   │   └── excelImport.css         # Modal xem trước & nhập Excel
│   ├── services/                   # Tầng Dịch vụ (Business Logic & Data Access)
│   │   ├── productService.js       # CRUD sách, tồn kho, lọc sách, phân trang
│   │   ├── orderService.js         # Tạo đơn, cập nhật trạng thái đơn, hủy đơn
│   │   ├── cartService.js          # Quản lý giỏ hàng trên LocalStorage
│   │   ├── reviewService.js        # Đánh giá sao, bình luận tự do, like, reply
│   │   ├── wishlistService.js      # Lưu/xóa sách yêu thích theo tài khoản
│   │   ├── couponService.js        # Kiểm tra điều kiện & áp dụng mã giảm giá
│   │   ├── authService.js          # Đăng nhập, đăng ký, phân quyền, đổi mật khẩu
│   │   ├── imageUpload.js          # Chọn file ảnh, live preview & nén Base64
│   │   ├── excelImport.js          # Phân tích & nhập sách hàng loạt từ file .xlsx
│   │   ├── notificationBell.js     # Lắng nghe biến động đơn & đẩy thông báo chuông
│   │   ├── internalChatService.js  # Tải & lưu lịch sử hội thoại nội bộ
│   │   ├── saleService.js          # Quản lý chiến dịch Flash Sale & đếm ngược
│   │   └── categoryService.js      # Lấy danh mục thể loại sách
│   ├── utils/                      # Tầng tiện ích dùng chung
│   │   ├── format.js               # Định dạng tiền tệ VND, thời gian, escapeHtml
│   │   └── pagination.js           # Phân trang client-side dùng chung cho các bảng
│   └── js/                         # Tầng điều khiển giao diện (Page Controllers)
│       ├── home.js                 # Điều khiển trang chủ (Filter, Kệ sách, Sale)
│       ├── detail.js               # Điều khiển trang chi tiết, Like & Reply bình luận
│       ├── cart.js                 # Điều khiển giỏ hàng, Coupon & VietQR
│       ├── orders.js               # Điều khiển lịch sử đơn & xuất hóa đơn PDF
│       ├── wishlist.js             # Điều khiển danh sách sách yêu thích
│       ├── profile.js              # Điều khiển trang hồ sơ & avatar
│       ├── admin.js                # Điều khiển trang Admin, xuất Excel, quản lý Sale
│       ├── seller.js               # Điều khiển trang Seller & Import Excel
│       ├── chatbot.js              # Điều khiển Trợ lý AI tư vấn sách
│       ├── internalChat.js         # Điều khiển drawer chat trao đổi giữa các thành viên
│       └── themeToggle.js          # Chuyển đổi giao diện Sáng/Tối & chống chớp FOUC
│
├── index.html                      # Trang chủ (Entry Point)
├── db.json                         # Cơ sở dữ liệu REST API (Mock / Seed Database)
├── vite.config.js                  # Cấu hình đa trang (Multi-page App) của Vite
├── package.json                    # Khai báo thư viện & kịch bản chạy dự án
└── start.bat                       # Script 1-Click khởi động cả Backend và Frontend
```

---

## 3. 🧱 Layer Responsibility (Trách Nhiệm Từng Tầng Kiến Trúc)

```mermaid
flowchart LR
    subgraph PRESENTATION["🖥️ View Layer"]
        HTML["HTML5 Templates\n(pages/*.html)"]
        CSS["Modular CSS\n(src/css/*.css)"]
    end

    subgraph CONTROLLER["🎮 Controller Layer"]
        JS_PAGE["Page Controllers\n(src/js/*.js)"]
    end

    subgraph SERVICE["⚙️ Service Layer"]
        SERVICES["Business Services\n(src/services/*.js)"]
        UTILS["Shared Utilities\n(src/utils/*.js)"]
    end

    subgraph INFRA["🗄️ Infrastructure Layer"]
        AXIOS["Axios Client\n(src/api/client.js)"]
        STORAGE["LocalStorage\n(Session / Cart)"]
        REST_API["Backend REST API\n(:3000)"]
    end

    HTML -->|"DOM Events (click, submit)"| JS_PAGE
    JS_PAGE -->|"Calls business methods"| SERVICES
    SERVICES -->|"Uses helpers"| UTILS
    SERVICES -->|"HTTP Requests"| AXIOS
    SERVICES <-->|"Cache / Session"| STORAGE
    AXIOS -->|"JSON Response"| REST_API
    JS_PAGE -->|"Render DOM updates"| HTML
```

| Tầng kiến trúc | Thành phần đại diện | Nhiệm vụ chính |
|:---|:---|:---|
| **View Layer** | HTML5, Modern CSS, Dark Theme | Hiển thị giao diện người dùng, cấu trúc trang, hiệu ứng chuyển động và hỗ trợ đa thiết bị Responsive. |
| **Controller Layer** | `src/js/*.js` | Bắt các sự kiện DOM từ người dùng, gọi Service tương ứng, nhận dữ liệu và thực hiện Render giao diện DOM động. |
| **Service Layer** | `src/services/*.js` | Đóng gói toàn bộ logic nghiệp vụ (tính tiền, áp voucher, tính sao trung bình, nén ảnh, xử lý Excel). |
| **Infrastructure Layer** | `api/client.js`, `storage.js` | Giao tiếp mạng qua HTTP Axios tới Backend `:3000`, quản lý bộ nhớ đệm `localStorage` (phiên đăng nhập, giỏ hàng). |

---

## 4. 🔄 Request-Response Workflow (Chu Trình Xử Lý Dữ Liệu)

Sơ đồ mô tả quy trình tuần tự chuẩn khi người dùng thực hiện bất kỳ hành động nào trên hệ thống:

```mermaid
sequenceDiagram
    actor User as 👤 Người dùng
    participant View as 🖥️ HTML / DOM
    participant Ctrl as 🎮 Controller (src/js/)
    participant Svc as ⚙️ Service (src/services/)
    participant API as 📡 Axios Client (:3000)
    participant DB as 🗄️ Database (db.json)

    User->>View: Tương tác (Click, Nhập form, Submit)
    View->>Ctrl: Phát sự kiện DOM (Event Trigger)
    Ctrl->>Ctrl: Validate dữ liệu đầu vào phía Client
    Ctrl->>Svc: Gọi hàm Service nghiệp vụ tương ứng
    Svc->>API: HTTP Request (GET, POST, PUT, PATCH, DELETE)
    API->>DB: Thực thi truy vấn / Ghi dữ liệu
    DB-->>API: Trả kết quả dữ liệu
    API-->>Svc: JSON Response chuẩn REST
    Svc->>Svc: Xử lý dữ liệu thô (Tính toán, Enrich data)
    Svc-->>Ctrl: Dữ liệu đã xử lý sạch
    Ctrl->>View: Render DOM / Hiển thị Toast thông báo
    View-->>User: Giao diện cập nhật tức thì (UX mượt mà)
```

---

## 5. 🔐 Multi-Role Authentication & Route Guard Flow (Xác Thực & Phân Quyền)

Hệ thống bảo vệ phân quyền 3 cấp độ (`customer`, `seller`, `admin`) và ngăn chặn truy cập trái phép vào các trang nhạy cảm:

```mermaid
flowchart TD
    A["👤 Người dùng mở một trang\n(admin.html / seller.html / profile.html)"] --> B["authService.getCurrentUser()"]
    B --> C{"Đã đăng nhập chưa?"}

    C -- "Chưa" --> REDIR_LOGIN["⚠️ Chặn truy cập\nRedirect -> pages/login.html"]
    C -- "Đã đăng nhập" --> D{"Kiểm tra vai trò (Role)"}

    D -- "Trang Admin nhưng role != admin" --> FORBID1["⛔ Chặn truy cập (403)\nAlert: Bạn không có quyền Admin\nRedirect -> index.html"]
    D -- "Trang Seller nhưng role != seller" --> FORBID2["⛔ Chặn truy cập (403)\nAlert: Bạn không có quyền Người bán\nRedirect -> index.html"]
    D -- "Vai trò hợp lệ" --> ALLOW["✅ Cho phép tải trang\nRender Dashboard & Dữ liệu"]

    style REDIR_LOGIN fill:#ffa94d,color:#fff
    style FORBID1 fill:#ff6b6b,color:#fff
    style FORBID2 fill:#ff6b6b,color:#fff
    style ALLOW fill:#51cf66,color:#fff
```

---

## 6. 🛒 Shopping Cart, Coupon & VietQR Checkout Workflow

```mermaid
flowchart TD
    A["👤 Khách hàng chọn sách"] --> B["Bấm 'Thêm vào giỏ hàng'"]
    B --> C["cartService.addToCart(product, qty)\nLưu vào LocalStorage"]
    C --> D["Cập nhật số đếm badge giỏ hàng"]

    D --> E["👤 Vào trang Giỏ hàng\n(pages/cart.html)"]
    E --> F["Hiển thị danh sách sách & tính tạm tính"]
    F --> G{"Nhập mã giảm giá (Coupon)?"}

    G -- "Có" --> H["couponService.verifyCoupon(code, subTotal)"]
    H --> I{"Mã hợp lệ & đủ điều kiện?"}
    I -- "Không" --> ERR_COUP["❌ Báo lỗi voucher"]
    I -- "Hợp lệ" --> APPLY_COUP["✅ Áp dụng giảm giá\nTrừ tiền trực tiếp vào Total"]
    G -- "Không" --> J["Giữ nguyên tiền hàng"]

    APPLY_COUP --> K["Chọn phương thức thanh toán"]
    J --> K
    K --> L{"Phương thức?"}
    L -- "COD" --> COD_FLOW["Thanh toán khi nhận hàng"]
    L -- "VietQR" --> QR_FLOW["Tự động sinh mã VietQR\nkèm cú pháp & số tiền chính xác"]

    COD_FLOW --> SUBMIT["Bấm 'Xác Nhận Đặt Hàng'"]
    QR_FLOW --> SUBMIT
    SUBMIT --> ORDER_SVC["orderService.create(orderPayload)"]
    ORDER_SVC --> REDUCE_STOCK["Trừ số lượng tồn kho sách\n(PATCH /products/:id)"]
    REDUCE_STOCK --> CLEAR_CART["Xóa sạch giỏ hàng\n(cartService.clearCart)"]
    CLEAR_CART --> SUCCESS_ORDER["✅ Chuyển hướng -> pages/orders.html\n(Kích hoạt chuông thông báo mới)"]

    style ERR_COUP fill:#ff6b6b,color:#fff
    style APPLY_COUP fill:#51cf66,color:#fff
    style SUCCESS_ORDER fill:#51cf66,color:#fff
```

---

## 7. 🤖 Dual Chat Architecture (Hệ Thống Kênh Chat Kép)

Dự án sở hữu hai kênh chat phục vụ hai mục đích chuyên biệt:
1. **AI Chatbot:** Trợ lý tư vấn chọn sách thông minh 24/7 (Phân tích từ khóa tìm sách).
2. **Internal Member Chat:** Khung chat nội bộ giữa khách hàng và các gian hàng đối tác / Quản trị viên (Lưu trữ bền vững).

```mermaid
flowchart TD
    USER_CHAT["👤 Khách hàng muốn trò chuyện"] --> CHOOSE{"Chọn kênh trò chuyện?"}

    %% Kênh 1: AI Chatbot
    CHOOSE -- "Hỏi gợi ý / Tìm sách" --> AI_BOT["🤖 Mở Widget AI Chatbot\n(chatbot.js)"]
    AI_BOT --> NLP["Bộ phân tích từ khóa thông minh\n(Thể loại, Tác giả, Mức giá, Hot, Sale)"]
    NLP --> SEARCH_PRODS["productService.getAll()\nLọc sách phù hợp trong kho"]
    SEARCH_PRODS --> BOT_REPLY["Tự động phản hồi kèm thẻ sách\n(Ảnh + Giá + Link chi tiết sách)"]

    %% Kênh 2: Internal Member Chat
    CHOOSE -- "Nhắn tin hỏi Shop / Admin" --> INT_CHAT["💬 Mở Drawer Chat Nội Bộ\n(internalChat.js)"]
    INT_CHAT --> LOAD_CONTACTS["Tải danh bạ đối tác\n(internalChatService.getAvailableContacts)"]
    LOAD_CONTACTS --> SELECT_SHOP["Chọn gian hàng / Admin cần trao đổi"]
    SELECT_SHOP --> GET_CONVO["GET /chatMessages\n(Lấy lịch sử hội thoại 2 chiều)"]
    GET_CONVO --> SEND_MSG["Gửi tin nhắn mới -> POST /chatMessages"]
    SEND_MSG --> SYNC_DRAW["Cập nhật tức thì bong bóng chat\n(Lưu bền vững vào CSDL)"]

    style BOT_REPLY fill:#51cf66,color:#fff
    style SYNC_DRAW fill:#51cf66,color:#fff
```

---

## 8. 🗺️ Page Navigation Map (Bản Đồ Điều Hướng Trang)

```mermaid
flowchart TD
    HOME["🏠 Trang Chủ\n(index.html)"]
    DETAIL["📖 Chi Tiết Sách\n(product-detail.html)"]
    CART["🛒 Giỏ Hàng & Checkout\n(cart.html)"]
    ORDERS["📦 Lịch Sử Đơn Hàng\n(orders.html)"]
    WISHLIST["❤️ Sách Yêu Thích\n(wishlist.html)"]
    PROFILE["👤 Hồ Sơ Cá Nhân\n(profile.html)"]
    LOGIN["🔑 Đăng Nhập & OTP\n(login.html)"]
    REGISTER["📝 Đăng Ký Tài Khoản\n(dangky.html)"]
    ADMIN["👑 Dashboard Admin\n(admin.html)"]
    SELLER["🏪 Kênh Người Bán\n(seller.html)"]

    HOME <--> DETAIL
    HOME <--> CART
    HOME <--> WISHLIST
    HOME <--> ORDERS
    HOME <--> PROFILE
    HOME <--> LOGIN
    LOGIN <--> REGISTER

    DETAIL --> CART
    CART --> ORDERS
    ORDERS --> DETAIL

    LOGIN -- "Role Admin" --> ADMIN
    LOGIN -- "Role Seller" --> SELLER
    ADMIN <--> HOME
    SELLER <--> HOME
```

---

## 9. ⚡ Cross-Cutting Concerns & Technical Highlights (Các Điểm Nhấn Kỹ Thuật)

### 9.1. Chống chớp trắng màn hình (Anti-FOUC Mechanism)
- **Vấn đề:** Trình duyệt tải trang mặc định nền trắng, sau khi file CSS/JS ngoài nạp xong mới chuyển sang theme Tối $\rightarrow$ Gây chớp lóa mắt khó chịu.
- **Giải pháp kiến trúc:** Nhúng một đoạn mã JavaScript inline siêu ngắn ngay trong thẻ `<head>` của tất cả 9 trang HTML:
  ```javascript
  (function() {
      var m = localStorage.getItem('theme_mode');
      if (m === 'dark' || (!m && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
      }
  })();
  ```
  Nhờ đó theme Tối được kích hoạt ngay trước khi DOM bắt đầu render lần đầu tiên.

### 9.2. Tối ưu hóa hiệu năng DOM (Performance & Lazy Rendering)
- **Carousel Kệ sách trang chủ:** Áp dụng **Lazy Chunking** chỉ nạp 5 thẻ sách đầu tiên vào DOM mỗi kệ; phần còn lại chỉ được render khi người dùng cuộn ngang tới gần cuối hàng.
- **Tìm kiếm:** Áp dụng mô hình **Xem thêm (Load More)** hiển thị theo từng đợt 8 cuốn.
- **Bảng Quản trị Admin/Seller:** Áp dụng phân trang client-side độc lập (`src/utils/pagination.js`) cố định 10 bản ghi/trang, giúp bảng dữ liệu luôn mượt mà kể cả khi có hàng trăm đầu sách.

### 9.3. Xử lý xuất nhập dữ liệu hiện đại
- **Xuất PDF hóa đơn (`html2pdf.js`):** Định dạng A4 chuyên nghiệp, có logo nhà sách, bảng kê chi tiết và mã đơn hàng.
- **Xuất & Nhập Excel (`xlsx` - SheetJS):** 
  - Xuất toàn bộ báo cáo doanh thu và kho sách ra file `.xlsx`.
  - Đọc file Excel tải lên, kiểm tra tính hợp lệ dữ liệu (validate giá bán, tồn kho, thể loại) và xem trước bảng Preview trước khi cho phép nạp hàng loạt vào CSDL.

---

## 10. 🎯 Kết Luận

Tài liệu thiết kế kiến trúc phần mềm này:
1. Khẳng định tính chuẩn mực, sạch sẽ và có tổ chức cao của đồ án **Trí Tuệ Book**.
2. Chứng minh đầy đủ năng lực làm chủ kiến trúc phần mềm, tư duy phân tách tầng độc lập và làm chủ các công nghệ JavaScript hiện đại nhất.
3. Là tài liệu trung tâm hoàn hảo phục vụ cho việc thuyết trình, bảo vệ đồ án tốt nghiệp và bàn giao hệ thống!

