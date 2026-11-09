import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nhasach_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = '7d';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'customer', phone, address, shopName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Họ tên, email và mật khẩu là bắt buộc.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ email không đúng định dạng.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải chứa ít nhất 6 ký tự.'
      });
    }

    // BẢO MẬT: Cấm tuyệt đối tự phong quyền 'admin' qua API đăng ký công khai
    // Admin chỉ được tạo thủ công hoặc qua script migration
    const validRole = role === 'seller' ? 'seller' : 'customer';

    // Kiểm tra email đã tồn tại chưa
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email này đã được sử dụng. Vui lòng chọn email khác.'
      });
    }

    // Băm mật khẩu
    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo user
    const [result] = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, phone, address, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `, [name.trim(), trimmedEmail, passwordHash, validRole, phone || null, address || null]);

    const newUserId = result.insertId;

    // Nếu đăng ký làm seller, tạo luôn store_profile
    let storeInfo = null;
    if (validRole === 'seller') {
      const storeName = shopName || `${name.trim()}'s Bookstore`;
      const [storeResult] = await pool.query(`
        INSERT INTO store_profiles (user_id, store_name, description)
        VALUES (?, ?, ?)
      `, [newUserId, storeName, address || '']);
      storeInfo = { id: storeResult.insertId, storeName };
    }

    // Cấp phát token
    const token = jwt.sign(
      { id: newUserId, email: trimmedEmail, role: validRole, name: name.trim() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      token,
      user: {
        id: newUserId,
        name: name.trim(),
        email: trimmedEmail,
        role: validRole,
        phone,
        address,
        store: storeInfo
      }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ email và mật khẩu.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Tìm user
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.password_hash, u.role, u.phone, u.address, u.avatar, u.status,
             s.id AS store_id, s.store_name, s.logo AS store_logo
      FROM users u
      LEFT JOIN store_profiles s ON s.user_id = u.id
      WHERE u.email = ?
    `, [trimmedEmail]);

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.'
      });
    }

    const user = rows[0];

    if (user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.'
      });
    }

    // Đối soát mật khẩu qua bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.'
      });
    }

    // Cấp phát JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        avatar: user.avatar,
        store: user.store_id ? {
          id: user.store_id,
          storeName: user.store_name,
          logo: user.store_logo
        } : null
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.address, u.avatar, u.status, u.created_at,
             s.id AS store_id, s.store_name, s.logo AS store_logo, s.description AS store_desc
      FROM users u
      LEFT JOIN store_profiles s ON s.user_id = u.id
      WHERE u.id = ?
    `, [req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    const u = rows[0];
    res.json({
      success: true,
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        address: u.address,
        avatar: u.avatar,
        createdAt: u.created_at,
        store: u.store_id ? {
          id: u.store_id,
          storeName: u.store_name,
          logo: u.store_logo,
          description: u.store_desc
        } : null
      }
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address, avatar, oldPassword, newPassword, password } = req.body;
    const userId = req.user.id;

    // Nếu muốn đổi mật khẩu, bắt buộc phải cung cấp mật khẩu cũ để đối soát
    const passToChange = newPassword || password;
    let passwordHash = null;

    if (passToChange) {
      if (!oldPassword) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mật khẩu hiện tại (oldPassword) để đổi mật khẩu mới.'
        });
      }

      if (passToChange.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự.'
        });
      }

      const [uRows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (uRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
      }

      const isOldMatch = await bcrypt.compare(oldPassword, uRows[0].password_hash);
      if (!isOldMatch) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu hiện tại không chính xác. Không thể đổi mật khẩu.'
        });
      }

      passwordHash = await bcrypt.hash(passToChange, 10);
    }

    let updateQuery = 'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address), avatar = COALESCE(?, avatar)';
    const params = [name || null, phone || null, address || null, avatar || null];

    if (passwordHash) {
      updateQuery += ', password_hash = ?';
      params.push(passwordHash);
    }

    updateQuery += ' WHERE id = ?';
    params.push(userId);

    await pool.query(updateQuery, params);

    res.json({
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công!'
    });
  } catch (err) {
    next(err);
  }
};
