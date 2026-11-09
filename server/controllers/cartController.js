import pool from '../config/db.js';

// Lấy danh sách sản phẩm trong giỏ hàng của user
export const getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(`
      SELECT c.product_id AS id, c.quantity,
             p.name, p.price, p.discount_percent, p.on_sale, p.stock, p.image,
             s.id AS seller_id, s.store_name AS seller_name
      FROM cart_items c
      JOIN products p ON p.id = c.product_id
      LEFT JOIN store_profiles s ON s.id = p.store_id
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
    `, [userId]);

    const formatted = rows.map(r => ({
      id: r.id,
      name: r.name,
      price: Number(r.price),
      discountPercent: r.discount_percent,
      onSale: Boolean(r.on_sale),
      stock: r.stock,
      image: r.image,
      sellerId: r.seller_id,
      sellerName: r.seller_name,
      quantity: r.quantity
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
};

// Thêm hoặc tăng số lượng sản phẩm vào giỏ
export const addItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Vui lòng cung cấp productId.' });
    }

    const qty = Math.max(1, parseInt(quantity, 10));

    // Kiểm tra sản phẩm có tồn tại và tồn kho
    const [products] = await pool.query('SELECT id, stock, status FROM products WHERE id = ?', [productId]);
    if (products.length === 0 || products[0].status === 'inactive') {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại hoặc đã ngừng bán.' });
    }

    await pool.query(`
      INSERT INTO cart_items (user_id, product_id, quantity)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `, [userId, productId, qty]);

    res.json({ success: true, message: 'Đã thêm sản phẩm vào giỏ hàng thành công!' });
  } catch (err) {
    next(err);
  }
};

// Cập nhật số lượng sản phẩm
export const updateItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;
    const { quantity } = req.body;

    const qty = parseInt(quantity, 10);

    if (qty <= 0) {
      // Nếu số lượng <= 0 thì xóa khỏi giỏ
      await pool.query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
      return res.json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng.' });
    }

    await pool.query(`
      UPDATE cart_items SET quantity = ?
      WHERE user_id = ? AND product_id = ?
    `, [qty, userId, productId]);

    res.json({ success: true, message: 'Đã cập nhật số lượng thành công!' });
  } catch (err) {
    next(err);
  }
};

// Xóa 1 sản phẩm khỏi giỏ
export const removeItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;

    await pool.query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
    res.json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng.' });
  } catch (err) {
    next(err);
  }
};

// Xóa sạch giỏ hàng
export const clearCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await pool.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    res.json({ success: true, message: 'Đã xóa sạch giỏ hàng.' });
  } catch (err) {
    next(err);
  }
};

// Đồng bộ gộp giỏ hàng từ localStorage lên server khi user đăng nhập
export const syncCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { items = [] } = req.body;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const pId = item.id || item.productId;
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        if (pId) {
          await pool.query(`
            INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = GREATEST(cart_items.quantity, VALUES(quantity))
          `, [userId, pId, qty]);
        }
      }
    }

    // Trả về danh sách giỏ hàng sau khi đã gộp
    const [rows] = await pool.query(`
      SELECT c.product_id AS id, c.quantity,
             p.name, p.price, p.discount_percent, p.on_sale, p.stock, p.image,
             s.id AS seller_id, s.store_name AS seller_name
      FROM cart_items c
      JOIN products p ON p.id = c.product_id
      LEFT JOIN store_profiles s ON s.id = p.store_id
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
    `, [userId]);

    const formatted = rows.map(r => ({
      id: r.id,
      name: r.name,
      price: Number(r.price),
      discountPercent: r.discount_percent,
      onSale: Boolean(r.on_sale),
      stock: r.stock,
      image: r.image,
      sellerId: r.seller_id,
      sellerName: r.seller_name,
      quantity: r.quantity
    }));

    res.json({
      success: true,
      message: 'Đồng bộ giỏ hàng thành công!',
      cart: formatted
    });
  } catch (err) {
    next(err);
  }
};

