SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS nhasach
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nhasach;

-- ============ CATEGORIES ============
CREATE TABLE categories (
  id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(100) NOT NULL,
  icon  VARCHAR(16)  NULL,              -- emoji cần utf8mb4
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB;

-- ============ USERS ============
CREATE TABLE users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt/argon2, KHÔNG lưu plain text
  role          ENUM('admin','seller','customer') NOT NULL DEFAULT 'customer',
  phone         VARCHAR(20)  NULL,
  address       VARCHAR(500) NULL,
  avatar        MEDIUMTEXT   NULL,
  status        ENUM('active','banned') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB;

-- ============ STORE PROFILES (gian hàng của seller) ============
CREATE TABLE store_profiles (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  store_name  VARCHAR(150) NOT NULL,
  description TEXT NULL,
  logo        MEDIUMTEXT   NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_store_user (user_id),            -- 1 seller = 1 gian hàng
  UNIQUE KEY uq_store_name (store_name),
  CONSTRAINT fk_store_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============ PRODUCTS ============
CREATE TABLE products (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id         INT UNSIGNED NOT NULL,
  category_id      INT UNSIGNED NOT NULL,
  name             VARCHAR(255) NOT NULL,
  author           VARCHAR(150) NULL,
  description      TEXT NULL,
  image            MEDIUMTEXT   NULL,
  price            DECIMAL(12,2) NOT NULL,
  discount_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
  on_sale          BOOLEAN NOT NULL DEFAULT FALSE,
  stock            INT NOT NULL DEFAULT 0,
  sold_count       INT UNSIGNED NOT NULL DEFAULT 0,
  status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
  import_date      DATE NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_category (category_id, status),
  KEY idx_products_store (store_id, status),
  KEY idx_products_onsale (on_sale, status),
  KEY idx_products_created (created_at),
  FULLTEXT KEY ft_products_search (name, author),
  CONSTRAINT chk_products_price    CHECK (price >= 0),
  CONSTRAINT chk_products_discount CHECK (discount_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_products_stock    CHECK (stock >= 0),  -- chốt chặn cuối chống âm kho
  CONSTRAINT fk_products_store FOREIGN KEY (store_id)
    REFERENCES store_profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============ FLASH SALE ============
CREATE TABLE flash_sale_campaigns (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(150) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time   DATETIME NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  KEY idx_flash_time (is_active, start_time, end_time),
  CONSTRAINT chk_flash_time CHECK (end_time > start_time)
) ENGINE=InnoDB;

CREATE TABLE flash_sale_items (
  campaign_id      INT UNSIGNED NOT NULL,
  product_id       INT UNSIGNED NOT NULL,
  discount_percent TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (campaign_id, product_id),
  KEY idx_fsi_product (product_id),
  CONSTRAINT chk_fsi_discount CHECK (discount_percent BETWEEN 1 AND 100),
  CONSTRAINT fk_fsi_campaign FOREIGN KEY (campaign_id)
    REFERENCES flash_sale_campaigns(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_fsi_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============ COUPONS ============
CREATE TABLE coupons (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(50) NOT NULL,
  description     VARCHAR(255) NULL,
  discount_type   ENUM('percent','fixed','free_ship') NOT NULL,
  discount_value  DECIMAL(12,2) NOT NULL DEFAULT 0,
  min_order_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_discount    DECIMAL(12,2) NULL,              -- trần giảm khi type = percent
  usage_limit     INT UNSIGNED NULL,               -- NULL = không giới hạn
  used_count      INT UNSIGNED NOT NULL DEFAULT 0,
  start_at        DATETIME NULL,
  end_at          DATETIME NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupons_code (code),
  CONSTRAINT chk_coupon_value CHECK (discount_value >= 0)
) ENGINE=InnoDB;

-- ============ ORDERS ============
CREATE TABLE orders (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_code       VARCHAR(20) NOT NULL,           -- VD: DH000123
  user_id          INT UNSIGNED NOT NULL,
  coupon_id        INT UNSIGNED NULL,
  coupon_code      VARCHAR(50) NULL,               -- snapshot
  receiver_name    VARCHAR(100) NOT NULL,
  receiver_phone   VARCHAR(20)  NOT NULL,
  receiver_address VARCHAR(500) NOT NULL,
  receiver_note    VARCHAR(500) NULL,
  sub_total        DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping_fee     DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method   ENUM('COD','VietQR') NOT NULL DEFAULT 'COD',
  payment_status   ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
  status           ENUM('pending','processing','shipping','completed','cancelled')
                   NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_code (order_code),
  KEY idx_orders_user_created (user_id, created_at),
  KEY idx_orders_status_created (status, created_at),
  CONSTRAINT chk_orders_amounts CHECK (sub_total >= 0 AND shipping_fee >= 0
                                       AND discount_amount >= 0 AND total_amount >= 0),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_orders_coupon FOREIGN KEY (coupon_id)
    REFERENCES coupons(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id     BIGINT UNSIGNED NOT NULL,
  product_id   INT UNSIGNED NOT NULL,
  store_id     INT UNSIGNED NOT NULL,              -- snapshot để seller lọc đơn của shop
  product_name VARCHAR(255) NOT NULL,              -- snapshot
  unit_price   DECIMAL(12,2) NOT NULL,             -- giá tại thời điểm mua
  quantity     INT UNSIGNED NOT NULL,
  line_total   DECIMAL(14,2) AS (unit_price * quantity) STORED,
  status       ENUM('pending','processing','shipping','completed','cancelled')
               NOT NULL DEFAULT 'pending',         -- seller cập nhật theo từng shop
  PRIMARY KEY (id),
  KEY idx_oi_order (order_id),
  KEY idx_oi_store_status (store_id, status),
  KEY idx_oi_product (product_id),
  CONSTRAINT chk_oi_qty CHECK (quantity > 0),
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_oi_store FOREIGN KEY (store_id)
    REFERENCES store_profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============ CART & WISHLIST ============
CREATE TABLE cart_items (
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity   INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  KEY idx_cart_product (product_id),
  CONSTRAINT chk_cart_qty CHECK (quantity > 0),
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cart_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE wishlists (
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  KEY idx_wish_product (product_id),
  CONSTRAINT fk_wish_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_wish_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============ REVIEWS (cây lồng nhau) ============
CREATE TABLE reviews (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  parent_id  BIGINT UNSIGNED NULL,                 -- NULL = review gốc, có giá trị = reply
  rating     TINYINT UNSIGNED NULL,                -- chỉ review gốc mới có sao
  comment    TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_product (product_id, created_at),
  KEY idx_reviews_parent (parent_id),
  KEY idx_reviews_user (user_id),
  CONSTRAINT chk_reviews_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_parent FOREIGN KEY (parent_id)
    REFERENCES reviews(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- View điểm trung bình (chỉ tính review gốc)
CREATE VIEW v_product_ratings AS
SELECT product_id, COUNT(*) AS review_count, ROUND(AVG(rating), 1) AS avg_rating
FROM reviews
WHERE parent_id IS NULL
GROUP BY product_id;

-- Trigger ràng buộc nghiệp vụ review/reply
DELIMITER $$
CREATE TRIGGER trg_reviews_bi BEFORE INSERT ON reviews
FOR EACH ROW
BEGIN
  DECLARE v_parent_product INT UNSIGNED;
  IF NEW.parent_id IS NULL THEN
    IF NEW.rating IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Review gốc bắt buộc có rating 1-5';
    END IF;
  ELSE
    SELECT product_id INTO v_parent_product FROM reviews WHERE id = NEW.parent_id;
    IF v_parent_product IS NULL OR v_parent_product <> NEW.product_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reply phải cùng sản phẩm với review cha';
    END IF;
    SET NEW.rating = NULL;  -- reply không có sao
  END IF;
END$$
DELIMITER ;

-- ============ SEED CƠ BẢN (8 danh mục chuẩn từ db.json) ============
INSERT INTO categories (id, name, icon) VALUES
  (1, 'Văn học - Tiểu thuyết', '📖'),
  (2, 'Kỹ năng sống & Phát triển', '🌱'),
  (3, 'Công nghệ & Lập trình', '💻'),
  (4, 'Kinh tế - Khởi nghiệp', '📈'),
  (5, 'Tâm lý & Thiền định', '🧘'),
  (6, 'Lịch sử - Triết học', '🏛️'),
  (7, 'Khoa học - Vũ trụ', '🔭'),
  (8, 'Thiếu nhi - Giáo dục', '🎨')
ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon);

INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, max_discount) VALUES
  ('CHAOMUNG', 'Giảm 10% cho đơn hàng từ 150.000 đ', 'percent', 10, 150000, 50000),
  ('GIAM30K',  'Giảm 30.000đ cho đơn từ 200.000 đ',   'fixed',   30000, 200000, NULL),
  ('FREESHIP', 'Miễn phí vận chuyển cho đơn từ 250k', 'free_ship', 0, 250000, NULL)
ON DUPLICATE KEY UPDATE description=VALUES(description);

