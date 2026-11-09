import express from 'express';
import { getReviews, createReview } from '../controllers/reviewController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getReviews);
router.post('/', verifyToken, createReview);

export default router;
