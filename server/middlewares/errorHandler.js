export const errorHandler = (err, req, res, next) => {
  console.error('❌ Server Error:', err);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  // Xử lý lỗi MySQL đặc thù
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Dữ liệu đã tồn tại trong hệ thống (trùng email, mã đơn hoặc tên).',
      error: err.sqlMessage || err.message
    });
  }

  if (err.sqlState === '45000') {
    // Lỗi từ TRIGGER hoặc STORED PROCEDURE (ví dụ hết hàng, coupon hết hạn)
    return res.status(400).json({
      success: false,
      message: err.sqlMessage || 'Lỗi nghiệp vụ cơ sở dữ liệu.',
      error: err.sqlMessage
    });
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ.',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};
