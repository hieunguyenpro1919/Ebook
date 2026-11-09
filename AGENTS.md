# AGENTS.md — Hướng dẫn agent coder cho đồ án JavaScript `nhasach`

## Mục đích

Đây là đồ án môn học JavaScript, thể hiện khả năng xây dựng ứng dụng web thương mại điện tử hoàn chỉnh. Tệp này hướng dẫn agent được giao đọc, review hoặc thay đổi dự án. Hãy làm theo yêu cầu cụ thể của CEO Hiếu trong từng nhiệm vụ; không coi các tiêu chí/barem trong tài liệu cũ là yêu cầu hiện hành nếu CEO Hiếu chưa xác nhận.

**Cập nhật quan trọng về kiến trúc Backend (Theo chỉ đạo mới từ Giảng viên):**
- Trước đây, đồ án chỉ tập trung vào phía Frontend và dùng `json-server` làm mock API giả lập tạm thời.
- **Hiện tại, giảng viên đã chính thức cho phép và định hướng phát triển Backend thực tế, cụ thể là sử dụng Node.js.**
- Đồ án sẽ từng bước hoàn thiện thành một hệ thống **Fullstack JavaScript** hoàn chỉnh: Frontend sử dụng HTML5, CSS3, Vanilla JS (ES Modules) trên Vite; Backend sử dụng **Node.js** (xây dựng RESTful API server, xử lý nghiệp vụ xác thực, đơn hàng, giỏ hàng, kho sách và quản trị dữ liệu thực tế).
- Trong giai đoạn chuyển giao, hệ thống vẫn duy trì khả năng tương thích với mock API `json-server` (hoặc chuyển đổi liền mạch sang Node.js server khi CEO Hiếu chỉ đạo).

## Công nghệ và cấu trúc hiện tại

- Frontend dùng HTML, CSS và JavaScript ES modules thuần, không dùng framework UI.
- Vite phục vụ ứng dụng nhiều trang. Trang chủ ở `index.html`; các trang khác nằm trong `pages/`.
- Mã ứng dụng nằm trong `src/`: `js/` chứa controller theo trang, `services/` chứa nghiệp vụ và truy cập dữ liệu, `api/` cấu hình HTTP client, `utils/` chứa tiện ích, `css/` chứa stylesheet.
- Thư mục `BUG/`: Chứa quy tắc `RULE_LOG_BUG.md` và các file ghi nhận lỗi phát sinh (`BUG_tên_bug_ngày_tháng.md`).
- Thư mục `LOG/`: Chứa quy tắc `RULE_LOG_PROJECT.md` và các file ghi nhận tiến độ/nhiệm vụ độc lập (`LOG_tên_nhiệm_vụ_ngày_tháng.md`).
- Backend & API: Đồ án đang sử dụng mock API `json-server` đọc/ghi dữ liệu trong `db.json` (port 3000) với các collection: `categories`, `products`, `user`, `orders`, `menu`, `reviews`, `saleConfig`. Theo định hướng mới của giảng viên, dự án được phép mở rộng xây dựng Backend bằng Node.js (RESTful API server). Khi triển khai Backend Node.js, đảm bảo cấu trúc module rõ ràng và tương thích hoàn toàn với các endpoint frontend đang kết nối.
- `src/api/client.js` cấu hình Axios với API mặc định tại `http://localhost:3000`.
- LocalStorage hiện được dùng cho một số trạng thái phía trình duyệt như giỏ hàng, phiên người dùng và cấu hình chatbot. Không giả định toàn bộ dữ liệu nghiệp vụ được lưu trong LocalStorage.
- Dependency hiện có: Axios và `html2pdf.js`; dev dependency có Vite và json-server. Khi triển khai Node.js backend, cài đặt các package backend theo chỉ đạo của CEO Hiếu.

## Quy tắc quản lý LOG và ghi nhận BUG (Chỉ đạo của CEO Hiếu)

1. **Về quy trình ghi nhận LOG (Thư mục `LOG/` theo `RULE_LOG_PROJECT.md`):**
   - **Nguyên tắc cốt lõi:** **LÀM XONG RỒI MỚI SOẠN LOG.** Chỉ tạo file LOG khi công việc đã thực sự hoàn thành và kiểm thử xong. Tuyệt đối không vừa làm vừa tạo/xóa/sửa file nháp dở dang trong thư mục `LOG/`.
   - **Bản chất file LOG:** Là cuốn nhật ký dự án bất biến (Audit Trail) ghi nhận những gì ĐÃ LÀM để sau này có thể truy vết thời điểm phát sinh lỗi.
   - **Tên file:** Luôn đặt theo định dạng `LOG_tên_nhiệm_vụ_ngày_tháng.md` (hoặc `LOG_phiên_bản_nội_dung_ngày_tháng.md`).
   - **Nội dung:** Ghi nhận đầy đủ: Mục tiêu phiên làm việc, Bảng tổng quan, Chi tiết kỹ thuật từng phần `<nội dung thay đổi> / <file thay đổi> / <chi tiết thay đổi ở các dòng từ... đến...>`, Kết quả kiểm thử, Những việc còn tồn đọng/cần làm tiếp.
   - **Trạng thái:** Dòng cuối file bắt buộc ghi một trong hai trạng thái: `<KHÔNG CÒN VẤN ĐỀ>` (mọi thứ xong xuôi không còn vướng mắc) hoặc `<CÒN VẤN ĐỀ>` (liệt kê cụ thể vấn đề hoặc việc cần làm tiếp ở phiên sau).
   - **Cấm sửa đè file LOG cũ:** Không tự tiện sửa các file LOG đã tạo. Nếu cần bổ sung hay làm tiếp, phải tạo 1 file LOG mới.
   - **Lệnh `/GHI_LOG`:** Mỗi khi CEO Hiếu kết thúc một phiên làm việc (chuẩn bị nghỉ ngơi hoặc chuyển sang dự án khác) và gõ lệnh `/GHI_LOG`, Agent sẽ tự động tổng hợp toàn bộ những gì đã làm trong phiên và tạo 1 file LOG mới chốt hạ vào thư mục `LOG/`. Khi mở lại dự án, CEO Hiếu đọc file LOG gần nhất là nắm được ngay tình hình hiện tại.

2. **Về quy trình ghi nhận BUG (Thư mục `BUG/` theo `RULE_LOG_BUG.md`):**
   - **Tên file:** Luôn đặt theo định dạng `BUG_tên_bug_ngày_tháng.md` (ví dụ: `BUG_cuon_trang_chu_giat_lag_20_10.md`).
   - **Nội dung:** Phải mô tả đầy đủ triệu chứng (Symptom), nguyên nhân kỹ thuật (Root Cause), giải pháp khắc phục (Fix) và người phát hiện/kiểm thử (mặc định là CEO Hiếu khi được phản ánh).
   - **Trạng thái:** Dòng cuối file luôn bắt buộc ghi một trong ba trạng thái: `<ĐÃ SỬA>`, `<CHƯA SỬA>`, `<ĐANG SỬA>`.
   - **Cấm sửa đè file BUG cũ:** Không tự tiện sửa nội dung file BUG đã tạo trước đó. Nếu cần cập nhật hoặc bug tái diễn, phải soạn thêm 1 file BUG mới để ghi nhận và chuyển trạng thái file cũ sang `<ĐÃ SỬA>`.
   - **Quy trình bắt buộc:** Luôn ghi nhận BUG ngay khi tự phát hiện hoặc khi được CEO Hiếu thông báo trong quá trình làm việc.
   - **Cảnh báo khẩn:** Nếu 1 BUG xuất hiện quá nhiều lần, phải soạn file `<CẢNH BÁO KHẨN>` để ưu tiên xử lý dứt điểm.

## Quy tắc khi thực hiện nhiệm vụ

1. Đọc luồng hiện có và các trang/service liên quan trước khi sửa; ưu tiên sửa đúng phạm vi thay vì tái cấu trúc rộng.
2. Giữ JavaScript ES modules và phong cách HTML/CSS hiện tại. Không đưa framework hoặc thư viện mới vào dự án nếu CEO Hiếu chưa yêu cầu.
3. Tách trách nhiệm theo cấu trúc hiện hữu: controller xử lý DOM/sự kiện; service xử lý nghiệp vụ và gọi API/storage; utility giữ hàm dùng chung.
4. Giữ tương thích giữa URL trang trong `pages/`, đường dẫn tài nguyên, cấu hình Vite và các API trong json-server.
5. Không đưa bí mật thật (API key riêng tư, mật khẩu, token) vào mã frontend, `db.json`, log hoặc tài liệu được commit. Với demo frontend, giải thích rõ dữ liệu giả lập và dữ liệu LocalStorage chỉ phục vụ bài tập, không phải cơ chế bảo mật hay lưu trữ production.
6. Khi render dữ liệu động, tránh đưa dữ liệu người dùng trực tiếp vào `innerHTML`; ưu tiên `textContent`, DOM APIs hoặc escape/validate phù hợp với ngữ cảnh.
7. Với thao tác thay đổi dữ liệu, xử lý lỗi API rõ ràng; không báo thành công hoặc xóa trạng thái người dùng khi thao tác lưu thất bại.
8. Về phần Backend Node.js: Giảng viên đã cho phép làm Backend chính thức bằng Node.js. Khi được CEO Hiếu giao nhiệm vụ triển khai hoặc kết nối Backend Node.js, cần thiết kế theo kiến trúc chuẩn (modular routing, controllers, models, validate đầu vào, xử lý lỗi thống nhất) và giữ tính tương thích với các API endpoint hiện tại để frontend hoạt động trơn tru. Không tự ý thay đổi schema dữ liệu hay logic nghiệp vụ ngoài phạm vi nhiệm vụ được giao.
9. Chỉ chạy build, kiểm thử hoặc công cụ xác minh khi CEO Hiếu yêu cầu hoặc nhiệm vụ yêu cầu rõ việc xác minh. Nêu chính xác những gì đã chạy và kết quả.
10. Sau khi hoàn thành, tóm tắt tệp đã đổi, hành vi thay đổi và các giới hạn/cần xác minh còn lại. Khi review, báo cáo phát hiện theo mức độ ưu tiên kèm vị trí cụ thể.

## Lệnh phát triển

- `npm run dev` — chạy Vite.
- `npm run server` — chạy json-server tại `http://localhost:3000`.
- `npm run build` — tạo bản build Vite.

Thông thường cần chạy cả frontend và json-server để các tính năng dùng API hoạt động.
