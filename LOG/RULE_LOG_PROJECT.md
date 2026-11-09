# QUY TẮC KHI GHI NHẬN LOG TIẾN ĐỘ & CÔNG VIỆC TRONG QUÁ TRÌNH THỰC HIỆN DỰ ÁN
1. **Làm xong mới soạn LOG:** Chỉ khởi tạo và viết file LOG sau khi công việc, tính năng hoặc bản sửa lỗi trong phiên làm việc đã **thực sự hoàn thiện và được kiểm thử thành công**. Tuyệt đối không vừa làm vừa tạo file nháp, sửa xóa lung tung trong thư mục `LOG/`.
2. Mỗi một phiên làm việc / nhiệm vụ / tính năng đều phải có 1 file tương ứng để ghi nhận. Tên file luôn là `LOG_tên_nhiệm_vụ_ngày_tháng.md` (hoặc `LOG_phiên_bản_nội_dung_ngày_tháng.md`).
3. Trong file ghi nhận LOG phải ghi đầy đủ các thông tin chi tiết:
   - Mục tiêu phiên làm việc
   - Bảng tổng quan thay đổi (Nội dung thay đổi, File thay đổi, Dòng tương ứng)
   - Chi tiết kỹ thuật từng phần theo định dạng: `<nội dung thay đổi> / <file thay đổi> / <chi tiết thay đổi ở các dòng từ... đến...>`
   - Kết quả kiểm thử / nghiệm thu
   - Những việc cần làm tiếp theo (nếu phiên làm việc còn việc dang dở)
4. **Quy định về trạng thái cuối file:** Cuối mỗi file LOG **chỉ ghi nhận một trong hai trạng thái**:
   - `TRẠNG THÁI: <KHÔNG CÒN VẤN ĐỀ>` (Nếu mọi thứ trong phiên đã xong xuôi trọn vẹn, không còn lỗi hay việc tồn đọng).
   - `TRẠNG THÁI: <CÒN VẤN ĐỀ>` (Nếu còn lỗi chưa xử lý dứt điểm, hoặc có việc dang dở cần làm tiếp ở phiên sau - bắt buộc phải liệt kê rõ vấn đề là gì).
5. Nếu cùng một tính năng được nâng cấp, sửa đổi hoặc làm tiếp ở phiên sau, không ghi nhận đè lại vào file LOG cũ mà phải soạn thêm 1 file LOG mới cho phiên đó.
6. **Chu trình `/GHI_LOG`:** Mỗi lần CEO Hiếu mở dự án lên làm việc, sau khi làm xong phiên làm việc đó và chuẩn bị nghỉ ngơi hoặc chuyển sang dự án khác, CEO Hiếu sẽ gõ `/GHI_LOG`. Agent lập tức tổng hợp toàn bộ những gì đã làm trong phiên và tạo một file LOG mới chốt hạ vào thư mục `LOG/`.

## CẤM
- **CẤM vừa làm vừa tạo/xóa/sửa file nháp dở dang trong thư mục `LOG/`.**
- **CẤM tự tiện sửa file LOG đã được tạo ra.** Nếu cần bổ sung hay chỉnh sửa thì phải ghi nhận thêm 1 file LOG mới để bổ sung cho file LOG cũ.

## NGUYÊN TẮC CỐT LÕI & LƯU Ý
- File LOG đóng vai trò như **cuốn nhật ký hành trình bất biến (Session Audit Trail)**. Mục đích tối thượng là: **Mỗi khi mở lại dự án, CEO Hiếu chỉ cần đọc lướt file LOG gần nhất là nắm được ngay: mình đang ở đâu, phiên trước đã làm được gì và phiên này cần làm tiếp cái gì.**

