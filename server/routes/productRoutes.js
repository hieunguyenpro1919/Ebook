import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Công khai cho khách xem sản phẩm
router.get('/', getProducts);
router.get('/:id', getProductById);

// Thao tác thay đổi yêu cầu đăng nhập và có quyền Người bán hoặc Admin
router.post('/', verifyToken, requireRole('admin', 'seller'), createProduct);
router.put('/:id', verifyToken, requireRole('admin', 'seller'), updateProduct);
router.patch('/:id', verifyToken, requireRole('admin', 'seller'), updateProduct);
router.delete('/:id', verifyToken, requireRole('admin', 'seller'), deleteProduct);

export default router;
