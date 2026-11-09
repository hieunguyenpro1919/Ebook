USE nhasach;
SET NAMES utf8mb4;

DELIMITER $$

-- ============ ĐẶT HÀNG VÀ TRỪ TỒN KHO AN TOÀN (TRANSACTION + ROW LOCKING) ============
CREATE PROCEDURE sp_place_order(
  IN  p_user_id          INT UNSIGNED,
  IN  p_receiver_name    VARCHAR(100),
  IN  p_receiver_phone   VARCHAR(20),
  IN  p_receiver_address VARCHAR(500),
  IN  p_receiver_note    VARCHAR(500),
  IN  p_payment_method   VARCHAR(10),      -- 'COD' | 'VietQR'
  IN  p_coupon_code      VARCHAR(50),      -- NULL hoặc '' nếu không dùng
  IN  p_shipping_fee     DECIMAL(12,2),    -- backend tự tính
  IN  p_items            JSON,             -- [{"productId":1,"quantity":2}, ...]
  OUT o_order_id         BIGINT UNSIGNED,
  OUT o_order_code       VARCHAR(20),
  OUT o_total_amount     DECIMAL(12,2)
)
BEGIN
  DECLARE v_item_cnt  INT DEFAULT 0;
  DECLARE v_updated   INT DEFAULT 0;
  DECLARE v_sub       DECIMAL(12,2) DEFAULT 0;
  DECLARE v_discount  DECIMAL(12,2) DEFAULT 0;
  DECLARE v_ship      DECIMAL(12,2) DEFAULT 0;
  DECLARE v_coupon_id INT UNSIGNED DEFAULT NULL;
  DECLARE v_type      VARCHAR(20);
  DECLARE v_value     DECIMAL(12,2);
  DECLARE v_min       DECIMAL(12,2);
  DECLARE v_max       DECIMAL(12,2);
  DECLARE v_limit     INT UNSIGNED;
  DECLARE v_used      INT UNSIGNED;
  DECLARE v_active    TINYINT;
  DECLARE v_start     DATETIME;
  DECLARE v_end       DATETIME;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;   -- ném lỗi gốc lên backend
  END;

  SET v_ship = IFNULL(p_shipping_fee, 0);

  -- 1) Gom item (cộng dồn nếu trùng productId) và validate
  DROP TEMPORARY TABLE IF EXISTS tmp_order_items;
  CREATE TEMPORARY TABLE tmp_order_items (
    product_id INT UNSIGNED NOT NULL PRIMARY KEY,
    qty        INT UNSIGNED NOT NULL
  ) ENGINE=InnoDB;

  INSERT INTO tmp_order_items (product_id, qty)
  SELECT jt.product_id, SUM(jt.qty)
  FROM JSON_TABLE(p_items, '$[*]' COLUMNS (
         product_id INT UNSIGNED PATH '$.productId',
         qty        INT          PATH '$.quantity')) AS jt
  WHERE jt.qty > 0
  GROUP BY jt.product_id;

  SELECT COUNT(*) INTO v_item_cnt FROM tmp_order_items;
  IF v_item_cnt = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn hàng không có sản phẩm hợp lệ';
  END IF;

  START TRANSACTION;

  -- 2) Trừ kho nguyên tử: chỉ trừ khi còn đủ hàng và sách đang bán
  UPDATE products p
  JOIN tmp_order_items t ON t.product_id = p.id
  SET p.stock      = p.stock - t.qty,
      p.sold_count = p.sold_count + t.qty
  WHERE p.status = 'active' AND p.stock >= t.qty;

  SET v_updated = ROW_COUNT();
  IF v_updated <> v_item_cnt THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Có sản phẩm không tồn tại, ngừng bán hoặc không đủ tồn kho';
  END IF;

  -- 3) Tạo đơn (mã tạm, cập nhật sau khi có id)
  INSERT INTO orders (order_code, user_id, receiver_name, receiver_phone,
                      receiver_address, receiver_note, payment_method, shipping_fee)
  VALUES (CONCAT('TMP', UUID_SHORT()), p_user_id, p_receiver_name, p_receiver_phone,
          p_receiver_address, p_receiver_note, p_payment_method, v_ship);
  SET o_order_id   = LAST_INSERT_ID();
  SET o_order_code = CONCAT('DH', LPAD(o_order_id, 6, '0'));
  UPDATE orders SET order_code = o_order_code WHERE id = o_order_id;

  -- 4) Chi tiết đơn: chốt giá (flash sale đang chạy hoặc giảm giá sản phẩm, lấy mức cao hơn)
  INSERT INTO order_items (order_id, product_id, store_id, product_name, unit_price, quantity)
  SELECT o_order_id, p.id, p.store_id, p.name,
         ROUND(p.price * (100 - GREATEST(COALESCE(fs.dp, 0),
                                         IF(p.on_sale, p.discount_percent, 0))) / 100, 0),
         t.qty
  FROM products p
  JOIN tmp_order_items t ON t.product_id = p.id
  LEFT JOIN (
      SELECT fi.product_id, MAX(fi.discount_percent) AS dp
      FROM flash_sale_items fi
      JOIN flash_sale_campaigns c ON c.id = fi.campaign_id
      WHERE c.is_active = 1 AND NOW() BETWEEN c.start_time AND c.end_time
      GROUP BY fi.product_id
  ) fs ON fs.product_id = p.id;

  SELECT SUM(unit_price * quantity) INTO v_sub FROM order_items WHERE order_id = o_order_id;

  -- 5) Coupon (khóa dòng để used_count không bị race condition)
  IF p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN
    SELECT id, discount_type, discount_value, min_order_value, max_discount,
           usage_limit, used_count, active, start_at, end_at
      INTO v_coupon_id, v_type, v_value, v_min, v_max,
           v_limit, v_used, v_active, v_start, v_end
    FROM coupons WHERE code = p_coupon_code FOR UPDATE;

    IF v_coupon_id IS NULL OR v_active = 0
       OR (v_start IS NOT NULL AND NOW() < v_start)
       OR (v_end   IS NOT NULL AND NOW() > v_end)
       OR (v_limit IS NOT NULL AND v_used >= v_limit)
       OR v_sub < v_min THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện';
    END IF;

    IF v_type = 'percent' THEN
      SET v_discount = LEAST(ROUND(v_sub * v_value / 100, 0), IFNULL(v_max, v_sub));
    ELSEIF v_type = 'fixed' THEN
      SET v_discount = LEAST(v_value, v_sub);
    ELSE
      SET v_ship = 0;   -- free_ship
    END IF;

    UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon_id;
  END IF;

  SET o_total_amount = GREATEST(v_sub - v_discount, 0) + v_ship;

  UPDATE orders
  SET sub_total = v_sub, shipping_fee = v_ship, discount_amount = v_discount,
      total_amount = o_total_amount,
      coupon_id = v_coupon_id,
      coupon_code = NULLIF(p_coupon_code, '')
  WHERE id = o_order_id;

  -- 6) Xóa các món đã đặt khỏi giỏ hàng DB
  DELETE c FROM cart_items c
  JOIN tmp_order_items t ON t.product_id = c.product_id
  WHERE c.user_id = p_user_id;

  COMMIT;
  DROP TEMPORARY TABLE IF EXISTS tmp_order_items;
END$$

-- ============ HỦY ĐƠN: HOÀN KHO (CHỈ KHI ĐƠN CHƯA GIAO) ============
CREATE PROCEDURE sp_cancel_order(IN p_order_id BIGINT UNSIGNED)
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_coupon INT UNSIGNED;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT status, coupon_id INTO v_status, v_coupon
  FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_status IS NULL OR v_status NOT IN ('pending','processing') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Đơn không tồn tại hoặc không thể hủy';
  END IF;

  UPDATE products p
  JOIN order_items oi ON oi.product_id = p.id AND oi.order_id = p_order_id
  SET p.stock = p.stock + oi.quantity,
      p.sold_count = GREATEST(p.sold_count - oi.quantity, 0);

  IF v_coupon IS NOT NULL THEN
    UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE id = v_coupon;
  END IF;

  UPDATE order_items SET status = 'cancelled' WHERE order_id = p_order_id;
  UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;

  COMMIT;
END$$

DELIMITER ;

