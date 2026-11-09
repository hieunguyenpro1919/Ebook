import api from '../api/client.js';

export const couponService = {
    /**
     * Lấy toàn bộ danh sách mã giảm giá từ server
     */
    async getAllCoupons() {
        try {
            const res = await api.get('/coupons');
            return res.data || [];
        } catch (e) {
            console.warn('Lỗi lấy danh sách coupon từ API:', e);
            return [];
        }
    },

    /**
     * Lấy danh sách mã giảm giá khả dụng cho khách hàng
     */
    async getActiveCoupons() {
        const all = await this.getAllCoupons();
        const now = new Date().getTime();
        return all.filter(c => {
            if (c.active === false) return false;
            if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return false;
            return true;
        });
    },

    /**
     * Tìm thông tin mã giảm giá theo Code
     * @param {string} code
     */
    async findCouponByCode(code) {
        if (!code) return null;
        const normalized = code.trim().toUpperCase();
        try {
            const res = await api.get('/coupons', {
                params: { code: normalized }
            });
            if (res.data && res.data.length > 0) {
                return res.data[0];
            }
        } catch {
            // fallback
        }
        const activeList = await this.getActiveCoupons();
        return activeList.find(c => c.code.toUpperCase() === normalized) || null;
    },

    /**
     * Kiểm tra và tính toán số tiền giảm giá của mã Coupon
     * @param {string} code Mã giảm giá do khách nhập
     * @param {number} subTotal Tổng tiền hàng trước giảm giá
     * @param {number} shippingFee Phí vận chuyển hiện tại
     * @returns {Promise<{ isValid: boolean, message?: string, coupon?: Object, discountAmount: number }>}
     */
    async applyCoupon(code, subTotal = 0, shippingFee = 0) {
        if (!code || !code.trim()) {
            return { isValid: false, message: 'Vui lòng nhập mã giảm giá.', discountAmount: 0 };
        }

        const coupon = await this.findCouponByCode(code);
        if (!coupon) {
            return { isValid: false, message: 'Mã giảm giá không tồn tại hoặc đã hết hạn sử dụng.', discountAmount: 0 };
        }

        if (coupon.active === false) {
            return { isValid: false, message: 'Mã giảm giá này hiện đang tạm ngưng áp dụng.', discountAmount: 0 };
        }

        if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
            return { isValid: false, message: 'Mã giảm giá đã quá hạn sử dụng.', discountAmount: 0 };
        }

        const minOrder = Number(coupon.minOrderValue) || 0;
        if (subTotal < minOrder) {
            return {
                isValid: false,
                message: `Mã này chỉ áp dụng cho đơn hàng từ ${minOrder.toLocaleString('vi-VN')} đ trở lên (hiện tại: ${subTotal.toLocaleString('vi-VN')} đ).`,
                discountAmount: 0
            };
        }

        let discountAmount = 0;

        if (coupon.discountType === 'percent') {
            const pct = Number(coupon.discountValue) || 0;
            let calculated = Math.round(subTotal * (pct / 100));
            const maxCap = Number(coupon.maxDiscount);
            if (Number.isFinite(maxCap) && maxCap > 0 && calculated > maxCap) {
                calculated = maxCap;
            }
            discountAmount = calculated;
        } else if (coupon.discountType === 'fixed') {
            const fixedVal = Number(coupon.discountValue) || 0;
            discountAmount = Math.min(fixedVal, subTotal);
        } else if (coupon.discountType === 'shipping') {
            const shipDiscount = Number(coupon.discountValue) || 30000;
            discountAmount = Math.min(shipDiscount, shippingFee > 0 ? shippingFee : 30000);
        }

        return {
            isValid: true,
            message: `Áp dụng thành công mã "${coupon.code}"!`,
            coupon,
            discountAmount
        };
    }
};

