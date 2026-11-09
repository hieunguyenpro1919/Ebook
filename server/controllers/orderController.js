import pool from '../config/db.js';

export const createOrder = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const {
      userId,
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

    // Chuẩn hóa danh sách items sang format SP mong muốn: [{"productId": 1, "quantity": 2}]
    const formattedItems = items.map(item => ({
      productId: item.productId || item.id,
      quantity: Number(item.quantity) || 1
    }));

    const uId = userId || (req.user ? req.user.id : 1);
    const pMethod = paymentMethod === 'VietQR' ? 'VietQR' : 'COD';
    const cCode = couponCode && couponCode.trim() ? couponCode.trim() : null;

    // Gọi Stored Procedure đặt hàng an toàn (nguyên tử)
    await connection.query('CALL sp_place_order(?, ?, ?, ?, ?, ?, ?, ?, ?, @o_id, @o_code, @o_total)', [
      uId,
      receiverName,
      receiverPhone,
      receiverAddress,
      receiverNote,
      pMethod,
      cCode,
      Number(shippingFee) || 0,
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
    const { userId, sellerId, status } = req.query;

    let query = `
      SELECT o.*, u.email AS user_email, u.name AS user_name
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      query += ' AND o.user_id = ?';
      params.push(userId);
    }

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    // Nếu seller lọc đơn, chỉ lấy các đơn có order_items thuộc shop của seller
    if (sellerId) {
      query += ` AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.store_id = ?)`;
      params.push(sellerId);
    }

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
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? OR order_code = ?', [id, id]);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    const order = orders[0];
    const [items] = await pool.query(`
      SELECT oi.*, s.store_name, p.image
      FROM order_items oi
      LEFT JOIN store_profiles s ON s.id = oi.store_id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
    `, [order.id]);

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
    const { status, paymentStatus } = req.body;

    const validStatuses = ['pending', 'processing', 'shipping', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ.' });
    }

    // Nếu cập nhật sang cancelled, gọi sp_cancel_order để tự động hoàn tồn kho!
    if (status === 'cancelled') {
      await pool.query('CALL sp_cancel_order(?)', [id]);
      return res.json({ id, message: 'Đã hủy đơn hàng và hoàn lại tồn kho thành công!' });
    }

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
