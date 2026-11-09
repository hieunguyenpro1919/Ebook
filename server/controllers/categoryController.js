import pool from '../config/db.js';

export const getCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name, icon FROM categories ORDER BY id ASC');
    // Trả về mảng trực tiếp để tương thích hoàn toàn với frontend hiện tại
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name, icon FROM categories WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

