import express from 'express';
import { getCoupons } from '../controllers/couponController.js';

const router = express.Router();

router.get('/', getCoupons);

export default router;

