import pool from '../config/db.js';

// Helper map từ SQL row sang object tương thích frontend
const mapProduct = (row) => ({
  id: row.id,
  name: row.name,
  author: row.author,
  price: Number(row.price),
  discountPercent: row.discount_percent,
  onSale: Boolean(row.on_sale),
  stock: row.stock,
  soldCount: row.sold_count,
  categoryId: row.category_id,
  categoryName: row.category_name || '',
  sellerId: row.store_id,
  sellerName: row.seller_name || '',
  image: row.image,
  description: row.description,
  status: row.status,
  importDate: row.import_date,
  rating: row.avg_rating ? Number(row.avg_rating) : 5,
  reviewCount: row.review_count || 0
});

export const getProducts = async (req, res, next) => {
  try {
    const {
      categoryId,
      sellerId,
      onSale,
      status,
      q,
      search,
      name_like,
      _sort,
      _order = 'ASC',
      _limit,
      _page = 1
    } = req.query;

    let query = `
      SELECT p.*, c.name AS category_name, s.store_name AS seller_name,
             vr.avg_rating, vr.review_count
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN store_profiles s ON s.id = p.store_id
      LEFT JOIN v_product_ratings vr ON vr.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    // BẢO MẬT: Mặc định chỉ hiển thị sản phẩm 'active' cho khách mua hàng
    // Chỉ khi có role admin hoặc seller mới được chỉ định lọc theo status khác
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    } else {
      query += ' AND p.status = "active"';
    }

    if (categoryId) {
      query += ' AND p.category_id = ?';
      params.push(categoryId);
    }

    if (sellerId) {
      query += ' AND p.store_id = ?';
      params.push(sellerId);
    }

    if (onSale === 'true' || onSale === '1') {
      query += ' AND p.on_sale = 1';
    }

    // Tìm kiếm từ khóa
    const keyword = q || search || name_like;
    if (keyword) {
      query += ' AND (p.name LIKE ? OR p.author LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // Sắp xếp
    const validSortFields = {
      price: 'p.price',
      soldCount: 'p.sold_count',
      id: 'p.id',
      created_at: 'p.created_at',
      importDate: 'p.import_date'
    };
    const sortField = validSortFields[_sort] || 'p.id';
    const sortOrder = _order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortField} ${sortOrder}`;

    // Phân trang
    if (_limit) {
      const limit = Math.min(Math.max(1, parseInt(_limit, 10) || 10), 100);
      const page = Math.max(parseInt(_page, 10) || 1, 1);
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [rows] = await pool.query(query, params);
    res.json(rows.map(mapProduct));
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.name AS category_name, s.store_name AS seller_name,
             vr.avg_rating, vr.review_count
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN store_profiles s ON s.id = p.store_id
      LEFT JOIN v_product_ratings vr ON vr.product_id = p.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    }

    res.json(mapProduct(rows[0]));
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      author,
      price,
      categoryId,
      image,
      description,
      stock = 100,
      discountPercent = 0,
      onSale = false,
      status = 'active'
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: 'Tên sách và giá là bắt buộc.' });
    }

    let storeId = null;

    // BẢO MẬT: Tra đúng store_id từ user_id của Seller
    if (req.user.role === 'seller') {
      const [stores] = await pool.query('SELECT id FROM store_profiles WHERE user_id = ?', [req.user.id]);
      if (stores.length === 0) {
        return res.status(400).json({ message: 'Tài khoản người bán chưa được kích hoạt gian hàng.' });
      }
      storeId = stores[0].id;
    } else if (req.user.role === 'admin') {
      // Admin có thể gán gian hàng hoặc lấy gian hàng mặc định 101
      storeId = req.body.sellerId || req.body.storeId || 101;
    } else {
      return res.status(403).json({ message: 'Chỉ Người bán hoặc Quản trị viên mới có quyền đăng sách.' });
    }

    const catId = categoryId || 1;

    const [result] = await pool.query(`
      INSERT INTO products (store_id, category_id, name, author, description, image, price, discount_percent, on_sale, stock, status, import_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
    `, [
      storeId, catId, name.trim(), author ? author.trim() : '', description || '', image || '',
      Math.max(0, Number(price)), Math.min(100, Math.max(0, Number(discountPercent))),
      onSale ? 1 : 0, Math.max(0, parseInt(stock, 10) || 0), status
    ]);

    const newId = result.insertId;
    res.status(201).json({
      id: newId,
      message: 'Thêm sản phẩm thành công!'
    });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const id = req.params.id;

    // BẢO MẬT: Kiểm tra quyền sở hữu sản phẩm
    const [existing] = await pool.query('SELECT store_id FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    }

    if (req.user.role === 'seller') {
      const [stores] = await pool.query('SELECT id FROM store_profiles WHERE user_id = ?', [req.user.id]);
      if (stores.length === 0 || stores[0].id !== existing[0].store_id) {
        return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa sản phẩm của gian hàng khác.' });
      }
    }

    const {
      name,
      author,
      price,
      categoryId,
      image,
      description,
      stock,
      discountPercent,
      onSale,
      status
    } = req.body;

    const [result] = await pool.query(`
      UPDATE products SET
        name = COALESCE(?, name),
        author = COALESCE(?, author),
        price = COALESCE(?, price),
        category_id = COALESCE(?, category_id),
        image = COALESCE(?, image),
        description = COALESCE(?, description),
        stock = COALESCE(?, stock),
        discount_percent = COALESCE(?, discount_percent),
        on_sale = COALESCE(?, on_sale),
        status = COALESCE(?, status)
      WHERE id = ?
    `, [
      name ?? null, author ?? null, price !== undefined ? Math.max(0, Number(price)) : null,
      categoryId ?? null, image ?? null, description ?? null,
      stock !== undefined ? Math.max(0, parseInt(stock, 10)) : null,
      discountPercent !== undefined ? Math.min(100, Math.max(0, Number(discountPercent))) : null,
      onSale !== undefined ? (onSale ? 1 : 0) : null,
      status ?? null, id
    ]);

    res.json({ id, message: 'Cập nhật sản phẩm thành công!' });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const id = req.params.id;

    // BẢO MẬT: Kiểm tra quyền sở hữu
    const [existing] = await pool.query('SELECT store_id FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    }

    if (req.user.role === 'seller') {
      const [stores] = await pool.query('SELECT id FROM store_profiles WHERE user_id = ?', [req.user.id]);
      if (stores.length === 0 || stores[0].id !== existing[0].store_id) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa sản phẩm của gian hàng khác.' });
      }
    }

    // Xóa mềm: chuyển status = 'inactive' để bảo toàn lịch sử đơn hàng
    await pool.query('UPDATE products SET status = "inactive" WHERE id = ?', [id]);
    res.json({ id, message: 'Đã ngừng kinh doanh sản phẩm thành công!' });
  } catch (err) {
    next(err);
  }
};
