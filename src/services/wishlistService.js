import api from '../api/client.js';
import { productService } from './productService.js';

const WISHLIST_LOCAL_KEY = 'user_wishlist_local';

export const wishlistService = {
    /**
     * Lấy toàn bộ danh sách ID sách yêu thích của người dùng từ LocalStorage (dự phòng)
     */
    getLocalWishlist(userId) {
        try {
            const raw = localStorage.getItem(`${WISHLIST_LOCAL_KEY}_${userId}`);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    },

    /**
     * Lưu danh sách yêu thích vào LocalStorage
     */
    setLocalWishlist(userId, list) {
        try {
            localStorage.setItem(`${WISHLIST_LOCAL_KEY}_${userId}`, JSON.stringify(list));
        } catch (e) {
            console.warn('Lỗi ghi LocalStorage Wishlist:', e);
        }
    },

    /**
     * Lấy danh sách sách yêu thích của user từ server (kèm dữ liệu chi tiết sách)
     * @param {number|string} userId
     */
    async getUserWishlist(userId) {
        if (!userId) return [];
        try {
            const [resWishlist, allProducts] = await Promise.all([
                api.get('/wishlist', { params: { userId } }),
                productService.getAll()
            ]);

            const wishlistItems = resWishlist.data || [];
            const productMap = new Map((allProducts || []).map(p => [Number(p.id), p]));

            // Ghép dữ liệu chi tiết cuốn sách vào từng mục yêu thích
            const enriched = wishlistItems
                .map(item => {
                    const prod = productMap.get(Number(item.productId));
                    return prod ? { ...item, product: prod } : null;
                })
                .filter(Boolean);

            // Đồng bộ lại local IDs
            const productIds = enriched.map(i => Number(i.productId));
            this.setLocalWishlist(userId, productIds);

            return enriched;
        } catch (error) {
            console.warn('Lỗi lấy Wishlist từ API, sử dụng LocalStorage:', error);
            const localIds = this.getLocalWishlist(userId);
            try {
                const allProducts = await productService.getAll();
                const productMap = new Map((allProducts || []).map(p => [Number(p.id), p]));
                return localIds
                    .map(id => {
                        const prod = productMap.get(Number(id));
                        return prod ? { id: `local_${id}`, userId, productId: id, product: prod } : null;
                    })
                    .filter(Boolean);
            } catch {
                return [];
            }
        }
    },

    /**
     * Lấy danh sách các Product ID mà user đã yêu thích
     * @param {number|string} userId
     */
    async getUserWishlistProductIds(userId) {
        if (!userId) return new Set();
        try {
            const res = await api.get('/wishlist', { params: { userId } });
            const list = res.data || [];
            const ids = new Set(list.map(i => Number(i.productId)));
            this.setLocalWishlist(userId, Array.from(ids));
            return ids;
        } catch {
            return new Set(this.getLocalWishlist(userId).map(Number));
        }
    },

    /**
     * Thêm một cuốn sách vào danh sách yêu thích
     * @param {number|string} userId 
     * @param {number|string} productId 
     */
    async addToWishlist(userId, productId) {
        const prodIdNum = Number(productId);
        // Kiểm tra xem đã tồn tại chưa
        const res = await api.get('/wishlist', {
            params: { userId, productId: prodIdNum }
        });

        if (res.data && res.data.length > 0) {
            return res.data[0];
        }

        const newItem = {
            userId,
            productId: prodIdNum,
            createdAt: new Date().toISOString()
        };

        const postRes = await api.post('/wishlist', newItem);
        
        // Cập nhật local
        const local = this.getLocalWishlist(userId);
        if (!local.includes(prodIdNum)) {
            local.push(prodIdNum);
            this.setLocalWishlist(userId, local);
        }

        this.notifyUpdate(userId, prodIdNum, true);
        return postRes.data;
    },

    /**
     * Xóa một cuốn sách khỏi danh sách yêu thích
     * @param {number|string} userId 
     * @param {number|string} productId 
     */
    async removeFromWishlist(userId, productId) {
        const prodIdNum = Number(productId);
        const res = await api.get('/wishlist', {
            params: { userId, productId: prodIdNum }
        });

        const items = res.data || [];
        for (const item of items) {
            await api.delete(`/wishlist/${item.id}`);
        }

        // Cập nhật local
        const local = this.getLocalWishlist(userId).filter(id => id !== prodIdNum);
        this.setLocalWishlist(userId, local);

        this.notifyUpdate(userId, prodIdNum, false);
        return true;
    },

    /**
     * Bật / Tắt trạng thái yêu thích (Toggle)
     * @param {number|string} userId 
     * @param {number|string} productId 
     * @returns {Promise<{ isWishlisted: boolean, item?: Object }>}
     */
    async toggleWishlist(userId, productId) {
        const prodIdNum = Number(productId);
        const res = await api.get('/wishlist', {
            params: { userId, productId: prodIdNum }
        });

        const exists = res.data && res.data.length > 0;
        if (exists) {
            await this.removeFromWishlist(userId, prodIdNum);
            return { isWishlisted: false };
        } else {
            const item = await this.addToWishlist(userId, prodIdNum);
            return { isWishlisted: true, item };
        }
    },

    /**
     * Phát sự kiện cập nhật để toàn trang nhận biết và cập nhật giao diện
     */
    notifyUpdate(userId, productId, isWishlisted) {
        window.dispatchEvent(new CustomEvent('wishlist:changed', {
            detail: { userId, productId, isWishlisted }
        }));
    }
};

