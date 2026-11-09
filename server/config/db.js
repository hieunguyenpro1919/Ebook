import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'nhasach_user',
  password: process.env.MYSQL_PASSWORD || 'nhasach_pass_123',
  database: process.env.MYSQL_DATABASE || 'nhasach',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Test connection
pool.getConnection()
  .then(conn => {
    console.log('📦 Đã kết nối MySQL Connection Pool thành công!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối MySQL Connection Pool:', err.message);
  });

export default pool;

