import pool from '../config/db.js';

export const getCoupons = async (req, res, next) => {
  try {
    const { code, active } = req.query;
    let query = 'SELECT * FROM coupons WHERE 1=1';
    const params = [];

    if (code) {
      query += ' AND code = ?';
      params.push(code.toUpperCase().trim());
    }

    if (active !== undefined) {
      query += ' AND active = ?';
      params.push(active === 'true' || active === '1' ? 1 : 0);
    }

    const [rows] = await pool.query(query, params);

    const formatted = rows.map(c => ({
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discount_type,
      discountValue: Number(c.discount_value),
      minOrderValue: Number(c.min_order_value),
      maxDiscount: c.max_discount ? Number(c.max_discount) : null,
      active: Boolean(c.active)
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
};

