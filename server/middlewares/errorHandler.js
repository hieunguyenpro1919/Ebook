export const errorHandler = (err, req, res, next) => {
  console.error('❌ Server Error:', err);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  // Xử lý lỗi trùng lặp dữ liệu MySQL
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Dữ liệu đã tồn tại trong hệ thống (trùng email, mã đơn hoặc tên).'
    });
  }

  // Lỗi nghiệp vụ từ Trigger hoặc Stored Procedure (ví dụ hết hàng, coupon hết hạn)
  if (err.sqlState === '45000') {
    return res.status(400).json({
      success: false,
      message: err.sqlMessage || 'Lỗi nghiệp vụ cơ sở dữ liệu.'
    });
  }

  // Trả thông báo lỗi an toàn, không rò rỉ stack trace
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ.'
  });
};
