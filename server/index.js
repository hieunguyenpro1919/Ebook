import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import pool from './config/db.js';
import { errorHandler } from './middlewares/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware cấu hình
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Logging đơn giản mỗi request
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Root & Healthcheck
app.get('/', (req, res) => {
  res.json({
    name: 'nhasach RESTful API Server',
    version: '1.0.0',
    status: 'online',
    database: 'MySQL 8.0 (Docker)',
    timestamp: new Date()
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS health');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// ============ MOUNT CÁC ROUTES CHÍNH ============
// Hỗ trợ cả đường dẫn có prefix /api/ và không có prefix để tương thích tuyệt đối với json-server
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/categories', categoryRoutes);
app.use('/categories', categoryRoutes);

app.use('/api/products', productRoutes);
app.use('/products', productRoutes);

app.use('/api/orders', orderRoutes);
app.use('/orders', orderRoutes);

app.use('/api/coupons', couponRoutes);
app.use('/coupons', couponRoutes);

app.use('/api/reviews', reviewRoutes);
app.use('/reviews', reviewRoutes);

// Endpoint tương thích ngược cho các query user từ json-server cũ (GET /user?email=...&password=...)
app.get(['/user', '/users'], async (req, res, next) => {
  try {
    const { email } = req.query;
    let query = 'SELECT id, name, email, role, phone, address, avatar, status FROM users WHERE 1=1';
    const params = [];

    if (email) {
      query += ' AND email = ?';
      params.push(email);
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Middleware xử lý lỗi tập trung
app.use(errorHandler);

// Khởi chạy Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 NHASACH BACKEND REST API SERVER IS RUNNING`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📦 Database: MySQL 8.0 (Docker nhasach-mysql:3306)`);
  console.log(`======================================================\n`);
});
