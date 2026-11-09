import express from 'express';
import { createOrder, getOrders, getOrderById, updateOrderStatus } from '../controllers/orderController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// BẢO MẬT: Mọi thao tác truy xuất và xử lý đơn hàng bắt buộc phải có JWT Token
router.use(verifyToken);

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.patch('/:id', updateOrderStatus);
router.put('/:id', updateOrderStatus);

export default router;
