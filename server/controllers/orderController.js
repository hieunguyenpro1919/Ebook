import pool from '../config/db.js';

export const createOrder = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const {
      receiverName,
      receiverPhone,
      receiverAddress,
      receiverNote = '',
      paymentMethod = 'COD',
      couponCode = null,
      shippingFee = 0,
      items = []
    } = req.body;

    if (!receiverName || !receiverPhone || !receiverAddress) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin người nhận (tên, số điện thoại, địa chỉ).'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Giỏ hàng của bạn đang trống.'
      });
    }

    // BẢO MẬT: Bắt buộc lấy userId từ JWT Token đã xác thực
    const uId = req.user.id;

    // Chuẩn hóa danh sách items sang format SP: [{"productId": 1, "quantity": 2}]
    const formattedItems = items.map(item => ({
      productId: item.productId || item.id,
      quantity: Math.min(100, Math.max(1, parseInt(item.quantity, 10) || 1))
    }));

    const pMethod = paymentMethod === 'VIETQR' ? 'VietQR' : 'COD';
    const cCode = couponCode && couponCode.trim() ? couponCode.trim() : null;

    // Gọi Stored Procedure đặt hàng an toàn (nguyên tử)
    await connection.query('CALL sp_place_order(?, ?, ?, ?, ?, ?, ?, ?, ?, @o_id, @o_code, @o_total)', [
      uId,
      receiverName.trim(),
      receiverPhone.trim(),
      receiverAddress.trim(),
      receiverNote.trim(),
      pMethod,
      cCode,
      Math.max(0, Number(shippingFee) || 0),
      JSON.stringify(formattedItems)
    ]);

    // Đọc kết quả từ biến OUT
    const [outRows] = await connection.query('SELECT @o_id AS orderId, @o_code AS orderCode, @o_total AS totalAmount');
    const result = outRows[0];

    res.status(201).json({
      success: true,
      id: result.orderId,
      orderCode: result.orderCode,
      totalAmount: Number(result.totalAmount),
      message: 'Đặt hàng thành công!'
    });
  } catch (err) {
    next(err);
  } finally {
    connection.release();
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const user = req.user;
    let query = `
      SELECT o.*, u.email AS user_email, u.name AS user_name
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE 1=1
    `;
    const params = [];

    // BẢO MẬT PHÂN QUYỀN TRUY XUẤT ĐƠN HÀNG:
    if (user.role === 'customer') {
      // Khách hàng thông thường: CHỈ ĐƯỢC XEM ĐƠN CỦA CHÍNH MÌNH
      query += ' AND o.user_id = ?';
      params.push(user.id);
    } else if (user.role === 'seller') {
      // Người bán: CHỈ ĐƯỢC XEM ĐƠN CÓ MÓN THUỘC GIAN HÀNG CỦA MÌNH
      const [stores] = await pool.query('SELECT id FROM store_profiles WHERE user_id = ?', [user.id]);
      if (stores.length === 0) {
        return res.json([]);
      }
      query += ` AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.store_id = ?)`;
      params.push(stores[0].id);
    }
    // Nếu là admin: được phép xem toàn bộ đơn hàng

    query += ' ORDER BY o.id DESC';

    const [orders] = await pool.query(query, params);

    // Lấy chi tiết items cho từng order
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const [items] = await pool.query(`
        SELECT oi.*, s.store_name, p.image
        FROM order_items oi
        LEFT JOIN store_profiles s ON s.id = oi.store_id
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id IN (?)
      `, [orderIds]);

      const itemsByOrderId = {};
      items.forEach(item => {
        if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
        itemsByOrderId[item.order_id].push({
          id: item.product_id,
          name: item.product_name,
          price: Number(item.unit_price),
          quantity: item.quantity,
          lineTotal: Number(item.line_total),
          storeId: item.store_id,
          storeName: item.store_name,
          image: item.image,
          status: item.status
        });
      });

      orders.forEach(o => {
        o.items = itemsByOrderId[o.id] || [];
        o.subTotal = Number(o.sub_total);
        o.shippingFee = Number(o.shipping_fee);
        o.discountAmount = Number(o.discount_amount);
        o.totalAmount = Number(o.total_amount);
      });
    }

    res.json(orders);
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const user = req.user;

    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? OR order_code = ?', [id, id]);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    const order = orders[0];

    // BẢO MẬT: Khách hàng không được xem đơn của người khác
    if (user.role === 'customer' && order.user_id !== user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xem đơn hàng này.' });
    }

    const [items] = await pool.query(`
      SELECT oi.*, s.store_name, p.image
      FROM order_items oi
      LEFT JOIN store_profiles s ON s.id = oi.store_id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
    `, [order.id]);

    // Nếu là seller, kiểm tra xem đơn hàng có mặt hàng nào thuộc shop mình không
    if (user.role === 'seller') {
      const [stores] = await pool.query('SELECT id FROM store_profiles WHERE user_id = ?', [user.id]);
      const myStoreId = stores.length > 0 ? stores[0].id : -1;
      const hasMyProduct = items.some(item => item.store_id === myStoreId);
      if (!hasMyProduct) {
        return res.status(403).json({ message: 'Bạn không có quyền xem đơn hàng không thuộc gian hàng của mình.' });
      }
    }

    order.items = items.map(item => ({
      id: item.product_id,
      name: item.product_name,
      price: Number(item.unit_price),
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
      storeId: item.store_id,
      storeName: item.store_name,
      image: item.image,
      status: item.status
    }));

    order.subTotal = Number(order.sub_total);
    order.shippingFee = Number(order.shipping_fee);
    order.discountAmount = Number(order.discount_amount);
    order.totalAmount = Number(order.total_amount);

    res.json(order);
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const id = req.params.id;
    const user = req.user;
    const { status, paymentStatus } = req.body;

    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    const order = orders[0];

    // BẢO MẬT: Khách hàng chỉ được phép HỦY đơn của chính mình khi đơn đang ở trạng thái 'pending'
    if (user.role === 'customer') {
      if (order.user_id !== user.id) {
        return res.status(403).json({ message: 'Bạn không có quyền sửa đơn hàng này.' });
      }
      if (status !== 'cancelled') {
        return res.status(403).json({ message: 'Khách hàng chỉ có quyền yêu cầu hủy đơn hàng.' });
      }
      if (order.status !== 'pending') {
        return res.status(400).json({ message: 'Đơn hàng đã được xử lý hoặc đang giao, không thể hủy.' });
      }
    }

    // Nếu hủy đơn, gọi Stored Procedure hoàn kho an toàn
    if (status === 'cancelled') {
      await pool.query('CALL sp_cancel_order(?)', [id]);
      return res.json({ id, message: 'Đã hủy đơn hàng và hoàn lại tồn kho thành công!' });
    }

    // Người bán và Admin cập nhật trạng thái
    await pool.query(`
      UPDATE orders SET
        status = COALESCE(?, status),
        payment_status = COALESCE(?, payment_status)
      WHERE id = ?
    `, [status || null, paymentStatus || null, id]);

    res.json({ id, message: 'Cập nhật trạng thái đơn hàng thành công!' });
  } catch (err) {
    next(err);
  }
};
