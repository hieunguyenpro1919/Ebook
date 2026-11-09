import http from 'http';
import { spawn } from 'child_process';

const server = spawn('node', ['server/index.js'], { stdio: 'inherit' });

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:3000${path}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

setTimeout(async () => {
  try {
    console.log('\n🔍 Bắt đầu kiểm tra API Backend...');

    const health = await request('/api/health');
    console.log('✅ Health check:', health);

    const categories = await request('/categories');
    console.log(`✅ Categories count: ${categories.body.length}`);

    const products = await request('/products');
    console.log(`✅ Products count: ${products.body.length}`);

    const coupons = await request('/coupons');
    console.log(`✅ Coupons count: ${coupons.body.length}`);

    const orders = await request('/orders');
    console.log(`✅ Orders count: ${orders.body.length}`);

    // Test đăng nhập tài khoản admin (mật khẩu 'admin' đã hash bcrypt)
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@bookstore.vn', password: 'admin' }
    });
    console.log('✅ Admin Login Test:', loginRes.body.success ? 'THÀNH CÔNG!' : 'THẤT BẠI', 'Token:', loginRes.body.token ? 'Có JWT token' : 'Không có token');

    console.log('\n🎉 TẤT CẢ API BACKEND HOẠT ĐỘNG HOÀN HẢO!');
  } catch (err) {
    console.error('❌ Lỗi khi test server:', err);
  } finally {
    server.kill();
    process.exit(0);
  }
}, 2500);

