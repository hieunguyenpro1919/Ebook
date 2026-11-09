# 🔄 Software Workflow & Architecture Design — Đánh Giá & Bình Luận

> [!NOTE]
> Tài liệu thiết kế luồng nghiệp vụ (Workflow Design) và kiến trúc tương tác cho hệ thống **Đánh giá sao (Rating)** & **Bình luận đa cấp (Threaded Comments, Likes & Replies)** của dự án Nhà sách Trí Tuệ Book.
> 
> **Sinh viên thực hiện:** Nguyễn Văn Hiếu — **MSSV:** 501250367  
> **Môn học:** Lập trình JavaScript (JavaScript Programming)

---

## 1. 🌐 High-Level System Overview (Kiến Trúc Tổng Quan)

```mermaid
flowchart TD
    USER["👤 Khách hàng\n(Browser)"]
    ADMIN["🛠️ Admin / Seller\n(Browser)"]

    subgraph FRONTEND["🖥️ Frontend Layer (Vite + Vanilla JS)"]
        DETAIL_UI["📖 Trang Chi tiết sách\n(product-detail.html)"]
        ORDERS_UI["📦 Trang Đơn hàng\n(orders.html)"]
        DETAIL_CTRL["🎮 detail.js\n(Page Controller)"]
        ORDERS_CTRL["🎮 orders.js\n(Order Controller)"]
    end

    subgraph SERVICE["⚙️ Service Layer"]
        REVIEW_SVC["⭐ reviewService.js\n(Rating & Comment Logic)"]
        AUTH_SVC["🔑 authService.js\n(User Session)"]
        API_CLIENT["📡 Axios Client\n(api/client.js)"]
    end

    subgraph DATABASE["🗄️ Data Layer (:3000)"]
        DB[("JSON Database\n(db.json /reviews)")]
        LOCALSTORAGE["🗃️ LocalStorage\n(User Token & State)"]
    end

    USER --> DETAIL_UI
    USER --> ORDERS_UI
    ADMIN --> DETAIL_UI

    DETAIL_UI --> DETAIL_CTRL
    ORDERS_UI --> ORDERS_CTRL

    DETAIL_CTRL --> REVIEW_SVC
    ORDERS_CTRL --> REVIEW_SVC
    DETAIL_CTRL --> AUTH_SVC

    REVIEW_SVC --> API_CLIENT
    API_CLIENT -- "HTTP / REST" --> DB
    AUTH_SVC <-.-> LOCALSTORAGE
```

---

## 2. ⭐ Product Rating Workflow (Quy Trình Đánh Giá 1 - 5 Sao)

Quy trình đánh giá sản phẩm hỗ trợ 2 kịch bản:
- **Kịch bản A:** Đánh giá trực tiếp tại trang Chi tiết sách (`product-detail.html`).
- **Kịch bản B:** Đánh giá nhanh sau khi bấm *"Xác nhận đã nhận hàng"* tại trang Lịch sử đơn hàng (`orders.html`).

```mermaid
flowchart TD
    A["👤 Khách hàng muốn\nđánh giá sách"] --> B{"Đã đăng nhập?"}
    B -- "Chưa" --> LOGIN["🔑 Yêu cầu đăng nhập\n(login.html)"]
    B -- "Rồi" --> C{"Chọn kịch bản?"}

    C -- "Tại trang Chi tiết" --> D["⭐ Chọn số sao\n(1 - 5 sao tại Star Picker)"]
    D --> E["✍️ Nhập nhận xét\nvào textarea"]
    E --> F["Bấm 'Gửi Bình Luận'"]

    C -- "Sau khi nhận hàng" --> G["📦 Bấm 'Xác nhận nhận hàng'\ntại orders.html"]
    G --> H["Mở Modal đánh giá nhanh\n(Tự động +1 soldCount)"]
    H --> I["⭐ Chọn số sao\n& nhập cảm nhận"]
    I --> F

    F --> J{"Kiểm tra nội dung"}
    J -- "Để trống" --> ERR1["❌ Báo lỗi: Vui lòng\nnhập cảm nhận"]
    J -- "Hợp lệ" --> K["POST /reviews\n(reviewService.create)"]

    K --> L["Lưu vào CSDL\n(db.json / MySQL)"]
    L --> M["reviewService.calcStats\n(Tính lại điểm trung bình)"]
    M --> N["Cập nhật DOM:\nĐiểm số, sao & danh sách"]
    N --> SUCCESS["✅ Thông báo thành công\n(Form mở sẵn cho bình luận tiếp)"]

    style LOGIN fill:#ffa94d,color:#fff
    style ERR1 fill:#ff6b6b,color:#fff
    style SUCCESS fill:#51cf66,color:#fff
```

---

## 3. 💬 Product Comment Workflow (Bình Luận Tự Do Không Chặn Spam)

Độc giả có thể gửi nhiều bình luận, nhận xét hoặc đặt câu hỏi về sách tùy thích mà không bị khóa form như phiên bản cũ.

```mermaid
flowchart TD
    A["👤 Độc giả xem\nChi tiết sách"] --> B{"Kiểm tra đăng nhập"}
    B -- "Chưa đăng nhập" --> LOCK["🔒 Hiện banner nhắc\nđăng nhập để bình luận"]
    B -- "Đã đăng nhập" --> FORM["✍️ Form bình luận\nluôn mở sẵn (Không khóa)"]

    FORM --> C["Gõ cảm nhận / câu hỏi\nvào ô textarea"]
    C --> D["Bấm 'Gửi Bình Luận'"]
    D --> E{"Nội dung hợp lệ?"}

    E -- "Rỗng" --> ERR["❌ Vui lòng nhập nội dung"]
    E -- "Hợp lệ" --> F["Đóng gói payload:\nproductId, userId, rating, comment"]
    F --> G["POST /reviews\n(reviewService.create)"]
    G --> H["currentReviews.unshift(newReview)\n(Đưa lên đầu danh sách)"]
    H --> I["Render lại HTML danh sách\n& Tăng số lượng bình luận"]
    I --> J["Làm trống ô textarea\n(Sẵn sàng gửi tiếp)"]
    J --> DONE["✅ Toast: Đăng bình luận\nthành công!"]

    style LOCK fill:#ffa94d,color:#fff
    style ERR fill:#ff6b6b,color:#fff
    style DONE fill:#51cf66,color:#fff
```

---

## 4. ❤️ Like & Unlike Comment Workflow (Thích Bình Luận Realtime)

Mỗi bình luận có nút tương tác Thích kèm bộ đếm số lượt thích tức thì.

```mermaid
flowchart TD
    A["👤 Bấm nút ❤️ Thích\ntrên 1 bình luận"] --> B{"Đã đăng nhập?"}
    B -- "Chưa" --> ALERT["⚠️ Alert: Vui lòng đăng nhập\n→ Chuyển login.html"]
    B -- "Rồi" --> C["Lấy reviewId\ntrong currentReviews"]
    C --> D{"Đã thích bình luận này?"}

    D -- "Đã thích" --> E["Xóa userId khỏi mảng likes[]"]
    E --> F["UI: Trái tim trắng 🤍\nGiảm -1 lượt thích"]

    D -- "Chưa thích" --> G["Thêm userId vào mảng likes[]"]
    G --> H["UI: Trái tim đỏ ❤️\nTăng +1 lượt thích"]

    F --> I["Gửi ngầm bất đồng bộ:\nPATCH /reviews/:id { likes }"]
    H --> I
    I --> SYNC["✅ CSDL đồng bộ\nhoàn tất"]

    style ALERT fill:#ffa94d,color:#fff
    style SYNC fill:#51cf66,color:#fff
```

---

## 5. ↪️ Threaded Reply Workflow (Trả Lời Bình Luận Lồng Nhau)

Hỗ trợ phản hồi trực tiếp dưới bất kỳ bình luận nào. Câu trả lời hiển thị lồng nhau với avatar và thời gian.

```mermaid
flowchart TD
    A["👤 Độc giả bấm nút\n💬 Trả lời (Reply)"] --> B["Trượt mở ô input\nphản hồi con tương ứng"]
    B --> C["Tự động focus con trỏ\nvào ô nhập"]
    C --> D["Gõ nội dung câu trả lời"]
    D --> E{"Hành động gửi?"}

    E -- "Bấm nút Gửi" --> F["Bắt sự kiện submit"]
    E -- "Nhấn phím Enter" --> F

    F --> G{"Đã đăng nhập?"}
    G -- "Chưa" --> WARN["⚠️ Yêu cầu đăng nhập"]
    G -- "Rồi" --> H{"Nội dung có rỗng?"}

    H -- "Rỗng" --> FOCUS["Focus lại ô input"]
    H -- "Hợp lệ" --> I["reviewService.addReply(reviewId, data)"]
    I --> J["PATCH /reviews/:id\n(Cập nhật mảng replies[])"]
    J --> K["Đẩy câu trả lời con\nvào mảng replies local"]
    K --> L["Render lại UI lồng thụt lề\n(Nested Thread)"]
    L --> M["Làm sạch ô input\n& Cập nhật số đếm trên nút"]
    M --> OK["✅ Hoàn tất trả lời"]

    style WARN fill:#ffa94d,color:#fff
    style OK fill:#51cf66,color:#fff
```

---

## 6. 🔄 Request-Response Sequence Diagram (Sơ Đồ Tuần Tự)

Sơ đồ mô tả chi tiết dòng chảy dữ liệu giữa Trình duyệt người dùng, Controller JavaScript, Service Layer và Backend Server:

```mermaid
sequenceDiagram
    actor User as 👤 Khách hàng
    participant View as 🖥️ detail.js (View)
    participant Svc as ⚙️ reviewService.js
    participant API as 📡 Axios Client
    participant DB as 🗄️ Database (db.json)

    %% Tải dữ liệu ban đầu
    Note over User, DB: 1. Tải chi tiết sách & danh sách đánh giá
    User->>View: Mở trang product-detail.html?id=1
    View->>Svc: getByProductId(productId)
    Svc->>API: GET /reviews?productId=1
    API->>DB: Query reviews
    DB-->>API: JSON reviews list (likes, replies)
    API-->>Svc: reviewsData
    Svc->>Svc: calcStats() (Tính sao TB)
    Svc-->>View: Trả về danh sách & điểm TB
    View-->>User: Render giao diện điểm sao & danh sách bình luận

    %% Gửi bình luận mới
    Note over User, DB: 2. Người dùng gửi bình luận mới
    User->>View: Nhập bình luận & bấm Gửi
    View->>Svc: create(reviewData)
    Svc->>API: POST /reviews
    API->>DB: Ghi bản ghi mới
    DB-->>API: 201 Created (newReview)
    API-->>Svc: newReview
    Svc-->>View: newReview
    View->>View: unshift(newReview) & calcStats()
    View-->>User: Cập nhật DOM tức thì & reset form

    %% Like bình luận
    Note over User, DB: 3. Bấm Thích / Trả lời bình luận
    User->>View: Bấm Thích / Trả lời
    View->>View: Cập nhật UI ngay lập tức (Optimistic UI)
    View->>Svc: toggleLike() / addReply()
    Svc->>API: PATCH /reviews/:id
    API->>DB: Cập nhật likes[] / replies[]
    DB-->>API: 200 OK
```

---

## 7. 🗄️ Database Schema & Entities (Cấu Trúc Dữ Liệu Thực Tế)

Lược đồ mô tả quan hệ và các trường dữ liệu được lưu trữ trong `db.json`:

```mermaid
erDiagram
    PRODUCT ||--o{ REVIEW : has
    USER ||--o{ REVIEW : writes
    REVIEW ||--o{ REVIEW_REPLY : contains
    USER ||--o{ REVIEW_REPLY : replies

    PRODUCT {
        int id
        string title
        int price
        float rating
    }
    USER {
        int id
        string name
        string email
        string role
        string avatar
    }
    REVIEW {
        int id
        int productId
        int userId
        string userName
        int rating
        string comment
        array likes
        array replies
        string createdAt
    }
    REVIEW_REPLY {
        int id
        int reviewId
        int userId
        string userName
        string comment
        string createdAt
    }
```
