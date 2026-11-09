import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const dbPath = path.resolve(process.cwd(), 'db.json');
const rawData = fs.readFileSync(dbPath, 'utf8');
const data = JSON.parse(rawData);

async function runMigration() {
  console.log('🔄 Đang kết nối tới MySQL...');
  
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root_secret_123',
    database: 'nhasach',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const [test] = await pool.query('SELECT 1 + 1 AS result');
    console.log('✅ Kết nối MySQL thành công!');

    // 1. Migrate Users & Store Profiles
    console.log('👥 Đang migrate Users & Store Profiles...');
    const users = data.user || [];
    for (const u of users) {
      const password = u.password ? String(u.password) : '123456';
      const hash = await bcrypt.hash(password, 10);
      const role = u.role || 'customer';
      const status = 'active';
      const phone = u.phone || u.shopPhone || null;
      const address = u.address || u.shopAddress || null;
      const avatar = u.avatar || null;

      await pool.query(`
        INSERT INTO users (id, name, email, password_hash, role, phone, address, avatar, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          password_hash = VALUES(password_hash),
          role = VALUES(role),
          phone = VALUES(phone),
          address = VALUES(address),
          avatar = VALUES(avatar)
      `, [u.id, u.name, u.email, hash, role, phone, address, avatar, status]);

      // Nếu là seller, tạo luôn store_profile với id = u.id để khớp với sellerId trong products
      if (role === 'seller') {
        const storeName = u.shopName || u.name || `Gian hàng ${u.id}`;
        await pool.query(`
          INSERT INTO store_profiles (id, user_id, store_name, description)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE store_name = VALUES(store_name)
        `, [u.id, u.id, storeName, u.shopAddress || '']);
      }
    }
    console.log(`✅ Đã migrate ${users.length} users.`);

    // 2. Migrate Categories
    console.log('📚 Đang migrate Categories...');
    const categories = data.categories || [];
    for (const c of categories) {
      await pool.query(`
        INSERT INTO categories (id, name, icon)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), icon = VALUES(icon)
      `, [c.id, c.name, c.icon || '📖']);
    }
    console.log(`✅ Đã migrate ${categories.length} categories.`);

    // 3. Migrate Products
    console.log('📦 Đang migrate Products...');
    const products = data.products || [];
    for (const p of products) {
      // Đảm bảo store_id hợp lệ
      const storeId = p.sellerId || 101;
      const categoryId = p.categoryId || 1;
      const price = p.price || 0;
      const discountPercent = p.discountPercent || 0;
      const onSale = p.onSale ? 1 : 0;
      const stock = typeof p.stock === 'number' ? p.stock : 100;
      const soldCount = p.soldCount || 0;
      const status = p.status === 'inactive' ? 'inactive' : 'active';
      let importDate = null;
      if (p.importDate) {
        try {
          importDate = new Date(p.importDate).toISOString().slice(0, 10);
        } catch {
          importDate = null;
        }
      }

      await pool.query(`
        INSERT INTO products (id, store_id, category_id, name, author, description, image, price, discount_percent, on_sale, stock, sold_count, status, import_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          store_id = VALUES(store_id),
          category_id = VALUES(category_id),
          name = VALUES(name),
          author = VALUES(author),
          description = VALUES(description),
          image = VALUES(image),
          price = VALUES(price),
          discount_percent = VALUES(discount_percent),
          on_sale = VALUES(on_sale),
          stock = VALUES(stock),
          sold_count = VALUES(sold_count),
          status = VALUES(status),
          import_date = VALUES(import_date)
      `, [
        p.id, storeId, categoryId, p.name, p.author || '', p.description || '',
        p.image || '', price, discountPercent, onSale, stock, soldCount, status, importDate
      ]);
    }
    console.log(`✅ Đã migrate ${products.length} products.`);

    // 4. Migrate Coupons
    console.log('🎟️ Đang migrate Coupons...');
    const coupons = data.coupons || [];
    for (const cp of coupons) {
      const type = cp.discountType === 'percent' ? 'percent' : (cp.discountType === 'fixed' ? 'fixed' : 'free_ship');
      await pool.query(`
        INSERT INTO coupons (id, code, description, discount_type, discount_value, min_order_value, max_discount, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          description = VALUES(description),
          discount_type = VALUES(discount_type),
          discount_value = VALUES(discount_value),
          min_order_value = VALUES(min_order_value),
          max_discount = VALUES(max_discount),
          active = VALUES(active)
      `, [
        cp.id, cp.code, cp.description || '', type, cp.discountValue || 0,
        cp.minOrderValue || 0, cp.maxDiscount || null, cp.active ? 1 : 0
      ]);
    }
    console.log(`✅ Đã migrate ${coupons.length} coupons.`);

    // 5. Migrate Reviews
    console.log('⭐ Đang migrate Reviews...');
    const reviews = data.reviews || [];
    for (const r of reviews) {
      const rating = r.rating && r.rating >= 1 && r.rating <= 5 ? r.rating : 5;
      const createdAt = r.createdAt ? new Date(r.createdAt) : new Date();
      await pool.query(`
        INSERT INTO reviews (id, product_id, user_id, rating, comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          comment = VALUES(comment),
          rating = VALUES(rating)
      `, [r.id, r.productId, r.userId || 1, rating, r.comment || '', createdAt]);
    }
    console.log(`✅ Đã migrate ${reviews.length} reviews.`);

    // 6. Migrate Orders & Order Items
    console.log('📦 Đang migrate Orders & Order Items...');
    const orders = data.orders || [];
    const statusMap = {
      'Hoàn thành': 'completed',
      'completed': 'completed',
      'Đang xử lý': 'processing',
      'processing': 'processing',
      'Đang giao': 'shipping',
      'shipping': 'shipping',
      'Đã hủy': 'cancelled',
      'cancelled': 'cancelled',
      'Chờ xác nhận': 'pending',
      'pending': 'pending'
    };

    for (const o of orders) {
      const mappedStatus = statusMap[o.status] || 'pending';
      const paymentMethod = o.paymentMethod === 'VietQR' ? 'VietQR' : 'COD';
      const createdAt = o.createdAt ? new Date(o.createdAt) : new Date();
      const subTotal = o.subTotal || 0;
      const shippingFee = o.shippingFee || 0;
      const totalAmount = o.totalAmount || subTotal + shippingFee;

      await pool.query(`
        INSERT INTO orders (id, order_code, user_id, receiver_name, receiver_phone, receiver_address, receiver_note, sub_total, shipping_fee, total_amount, payment_method, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          receiver_name = VALUES(receiver_name),
          receiver_phone = VALUES(receiver_phone),
          receiver_address = VALUES(receiver_address),
          total_amount = VALUES(total_amount),
          status = VALUES(status)
      `, [
        o.id, o.orderCode || `DH${String(o.id).padStart(6, '0')}`, o.userId || 1,
        o.receiverName || '', o.receiverPhone || '', o.receiverAddress || '',
        o.receiverNote || '', subTotal, shippingFee, totalAmount, paymentMethod,
        mappedStatus, createdAt
      ]);

      if (Array.isArray(o.items)) {
        for (const item of o.items) {
          const storeId = item.sellerId || 101;
          await pool.query(`
            INSERT INTO order_items (order_id, product_id, store_id, product_name, unit_price, quantity, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            o.id, item.id || 1, storeId, item.name || 'Sách',
            item.price || 0, item.quantity || 1, mappedStatus
          ]);
        }
      }
    }
    console.log(`✅ Đã migrate ${orders.length} orders kèm chi tiết đơn hàng.`);

    console.log('\n🎉 TOÀN BỘ DỮ LIỆU ĐÃ ĐƯỢC MIGRATE SANG MYSQL THÀNH CÔNG!');
  } catch (err) {
    console.error('❌ Lỗi khi migrate:', err);
  } finally {
    await pool.end();
  }
}

runMigration();

