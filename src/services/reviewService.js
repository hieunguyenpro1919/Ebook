import api from '../api/client.js';

export const reviewService = {
    /**
     * Lấy toàn bộ danh sách đánh giá
     */
    async getAll() {
        try {
            const response = await api.get('/reviews');
            return response.data || [];
        } catch (error) {
            console.warn('Không thể tải toàn bộ đánh giá:', error);
            return [];
        }
    },

    /**
     * Lấy danh sách đánh giá cho một sản phẩm cụ thể
     * @param {number|string} productId 
     */
    async getByProductId(productId) {
        try {
            const response = await api.get(`/reviews?productId=${productId}`);
            return response.data || [];
        } catch (error) {
            console.warn(`Không thể tải đánh giá của sản phẩm #${productId}:`, error);
            return [];
        }
    },

    /**
     * Kiểm tra xem người dùng đã đánh giá sản phẩm này chưa
     * @param {Array} reviews Danh sách đánh giá của sản phẩm
     * @param {Object} user Thông tin người dùng hiện tại
     */
    hasUserReviewed(reviews, user) {
        if (!user || !Array.isArray(reviews)) return false;
        const uid = Number(user.id);
        const email = (user.email || '').toLowerCase().trim();
        const name = (user.name || '').toLowerCase().trim();

        return reviews.some(r => {
            if (uid && Number(r.userId) === uid) return true;
            if (email && (r.userEmail || '').toLowerCase().trim() === email) return true;
            if (!uid && !email && name && (r.userName || '').toLowerCase().trim() === name) return true;
            return false;
        });
    },

    /**
     * Lấy đánh giá của một người dùng cụ thể đối với sản phẩm (nếu có)
     * @param {Array} reviews 
     * @param {Object} user 
     */
    getUserReview(reviews, user) {
        if (!user || !Array.isArray(reviews)) return null;
        const uid = Number(user.id);
        const email = (user.email || '').toLowerCase().trim();
        const name = (user.name || '').toLowerCase().trim();

        return reviews.find(r => {
            if (uid && Number(r.userId) === uid) return true;
            if (email && (r.userEmail || '').toLowerCase().trim() === email) return true;
            if (!uid && !email && name && (r.userName || '').toLowerCase().trim() === name) return true;
            return false;
        }) || null;
    },

    /**
     * Gửi đánh giá / bình luận mới lên hệ thống (Không giới hạn - người dùng có thể bình luận nhiều lần)
     * @param {Object} reviewData { productId, userId, userName, userEmail, rating, comment, createdAt }
     */
    async create(reviewData) {
        const payload = {
            ...reviewData,
            likes: Array.isArray(reviewData.likes) ? reviewData.likes : [],
            replies: Array.isArray(reviewData.replies) ? reviewData.replies : [],
            createdAt: reviewData.createdAt || new Date().toISOString()
        };
        const response = await api.post('/reviews', payload);
        return response.data;
    },

    /**
     * Thích / Bỏ thích một bình luận
     * @param {number|string} reviewId 
     * @param {number|string} userId 
     */
    async toggleLike(reviewId, userId) {
        try {
            const response = await api.get(`/reviews/${reviewId}`);
            const review = response.data;
            const likes = Array.isArray(review.likes) ? [...review.likes] : [];
            const uid = String(userId);
            const index = likes.findIndex(id => String(id) === uid);
            
            if (index > -1) {
                likes.splice(index, 1);
            } else {
                likes.push(userId);
            }

            const patchRes = await api.patch(`/reviews/${reviewId}`, { likes });
            return patchRes.data;
        } catch (error) {
            console.warn('Lỗi khi toggleLike bình luận:', error);
            return null;
        }
    },

    /**
     * Thêm phản hồi / trả lời cho một bình luận
     * @param {number|string} reviewId 
     * @param {Object} replyData { userId, userName, userAvatar, comment }
     */
    async addReply(reviewId, replyData) {
        try {
            const response = await api.get(`/reviews/${reviewId}`);
            const review = response.data;
            const replies = Array.isArray(review.replies) ? [...review.replies] : [];

            const newReply = {
                id: Date.now(),
                userId: replyData.userId,
                userName: replyData.userName || 'Bạn đọc',
                userAvatar: replyData.userAvatar || '',
                comment: replyData.comment,
                createdAt: new Date().toISOString()
            };

            replies.push(newReply);
            const patchRes = await api.patch(`/reviews/${reviewId}`, { replies });
            return patchRes.data;
        } catch (error) {
            console.warn('Lỗi khi addReply bình luận:', error);
            return null;
        }
    },

    /**
     * Tính toán số sao trung bình và thống kê đánh giá
     * @param {Array} reviews Danh sách đánh giá
     */
    calcStats(reviews = []) {
        if (!Array.isArray(reviews) || reviews.length === 0) {
            return {
                average: 5.0,
                total: 0,
                counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            };
        }

        let sum = 0;
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        reviews.forEach(r => {
            const star = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
            counts[star] = (counts[star] || 0) + 1;
            sum += Number(r.rating) || 5;
        });

        const average = Number((sum / reviews.length).toFixed(1));

        return {
            average,
            total: reviews.length,
            counts
        };
    }
};
