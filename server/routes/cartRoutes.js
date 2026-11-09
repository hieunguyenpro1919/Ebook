import express from 'express';
import {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  syncCart
} from '../controllers/cartController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Tất cả các routes giỏ hàng yêu cầu xác thực JWT
router.use(verifyToken);

router.get('/', getCart);
router.post('/', addItem);
router.put('/:productId', updateItem);
router.delete('/:productId', removeItem);
router.delete('/', clearCart);
router.post('/sync', syncCart);

export default router;

