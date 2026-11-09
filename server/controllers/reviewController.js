import pool from '../config/db.js';

export const getReviews = async (req, res, next) => {
  try {
    const { productId } = req.query;
    let query = `
      SELECT r.*, u.name AS user_name, u.avatar AS user_avatar
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE 1=1
    `;
    const params = [];

    if (productId) {
      query += ' AND r.product_id = ?';
      params.push(productId);
    }

    query += ' ORDER BY r.id DESC';

    const [rows] = await pool.query(query, params);

    const formatted = rows.map(r => ({
      id: r.id,
      productId: r.product_id,
      userId: r.user_id,
      userName: r.user_name,
      userAvatar: r.user_avatar,
      parentId: r.parent_id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
};

export const createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment, parentId = null } = req.body;

    if (!productId || !comment) {
      return res.status(400).json({ message: 'Vui lòng cung cấp mã sản phẩm và nội dung đánh giá.' });
    }

    // BẢO MẬT: Bắt buộc lấy userId từ JWT Token (chống mạo danh user khác)
    const uId = req.user.id;

    const [result] = await pool.query(`
      INSERT INTO reviews (product_id, user_id, parent_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `, [productId, uId, parentId || null, parentId ? null : Math.min(5, Math.max(1, parseInt(rating, 10) || 5)), comment.trim()]);

    res.status(201).json({
      id: result.insertId,
      productId,
      userId: uId,
      rating: parentId ? null : (rating || 5),
      comment: comment.trim(),
      message: 'Gửi đánh giá thành công!'
    });
  } catch (err) {
    next(err);
  }
};
