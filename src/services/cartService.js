import api from '../api/client.js';
import { storage } from '../utils/storage.js';

const CART_STORAGE_KEY = 'nhasach_cart';

export const cartService = {
    /**
     * Lấy toàn bộ danh sách sản phẩm trong giỏ hàng từ LocalStorage
     * @returns {Array} Mảng các sản phẩm [{ id, name, price, image, quantity, stock, sellerId, sellerName }]
     */
    getCart() {
        try {
            const raw = localStorage.getItem(CART_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Lỗi khi đọc giỏ hàng từ localStorage:', e);
            return [];
        }
    },

    /**
     * Lưu giỏ hàng vào localStorage và kích hoạt event cập nhật UI
     * @param {Array} cart 
     */
    saveCart(cart) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
    },

    /**
     * Đồng bộ giỏ hàng với MySQL Server khi người dùng đã đăng nhập
     */
    async syncWithServer() {
        const token = storage.getToken();
        if (!token) return;

        try {
            const localCart = this.getCart();
            // Gửi giỏ hàng local lên để gộp vào MySQL
            const response = await api.post('/api/cart/sync', {
                items: localCart.map(item => ({
                    id: item.id,
                    quantity: item.quantity
                }))
            });

            if (response.data && response.data.success && Array.isArray(response.data.cart)) {
                // Cập nhật lại giỏ hàng local bằng dữ liệu đã gộp từ MySQL
                this.saveCart(response.data.cart);
            }
        } catch (err) {
            console.warn('Không thể đồng bộ giỏ hàng với server (dùng dữ liệu offline):', err.message);
        }
    },

    /**
     * Lấy số lượng của một sản phẩm đang có trong giỏ hàng
     * @param {number|string} productId
     * @returns {number}
     */
    getItemQuantity(productId) {
        const cart = this.getCart();
        const target = cart.find(item => Number(item.id) === Number(productId));
        return target ? Number(target.quantity || 0) : 0;
    },

    /**
     * Lấy số lượng tồn kho của một sản phẩm trong giỏ
     * @param {number|string} productId
     * @returns {number}
     */
    getStock(productId) {
        const cart = this.getCart();
        const target = cart.find(item => Number(item.id) === Number(productId));
        if (!target || target.stock === undefined || target.stock === null) return Infinity;
        return Number(target.stock);
    },

    /**
     * Thêm một sản phẩm vào giỏ hàng
     * @param {Object} product Sản phẩm cần thêm
     * @param {number} quantity Số lượng thêm (mặc định 1)
     * @returns {Object} { cart, added, maxQuantity }
     */
    addToCart(product, quantity = 1) {
        if (!product || !product.id) return { cart: this.getCart(), added: 0, maxQuantity: 0 };

        const cart = this.getCart();
        const existingIndex = cart.findIndex(item => Number(item.id) === Number(product.id));

        const stock = product.stock === undefined || product.stock === null ? Infinity : Number(product.stock);
        const currentQty = existingIndex > -1 ? cart[existingIndex].quantity : 0;
        const maxQuantity = Math.max(0, stock - currentQty);

        const allowed = Math.min(Number(quantity), maxQuantity);
        if (allowed <= 0) {
            return { cart, added: 0, maxQuantity };
        }

        if (existingIndex > -1) {
            cart[existingIndex].quantity += allowed;
            cart[existingIndex].stock = stock === Infinity ? undefined : stock;
        } else {
            const newItem = {
                id: Number(product.id),
                name: product.name,
                price: Number(product.price),
                image: product.image,
                quantity: allowed,
                sellerId: product.sellerId || 101,
                sellerName: product.sellerName || ''
            };
            if (stock !== Infinity) newItem.stock = stock;
            cart.push(newItem);
        }

        this.saveCart(cart);

        // Bắn request ngầm đồng bộ lên MySQL nếu đã đăng nhập
        if (storage.getToken()) {
            api.post('/api/cart', { productId: product.id, quantity: allowed })
                .catch(err => console.warn('Lỗi lưu giỏ hàng lên server:', err.message));
        }

        return { cart, added: allowed, maxQuantity };
    },

    /**
     * Cập nhật số lượng của một sản phẩm
     * @param {number|string} productId
     * @param {number} newQuantity
     */
    updateQuantity(productId, newQuantity) {
        let cart = this.getCart();
        let quantity = Number(newQuantity);

        if (quantity <= 0) {
            return this.removeFromCart(productId);
        }

        const target = cart.find(item => Number(item.id) === Number(productId));
        if (target) {
            if (target.stock !== undefined && target.stock !== null) {
                quantity = Math.min(quantity, Number(target.stock));
            }
            target.quantity = quantity;
            this.saveCart(cart);

            // Bắn request ngầm lên MySQL nếu đã đăng nhập
            if (storage.getToken()) {
                api.put(`/api/cart/${productId}`, { quantity })
                    .catch(err => console.warn('Lỗi cập nhật số lượng lên server:', err.message));
            }
        }
        return cart;
    },

    /**
     * Xóa một sản phẩm khỏi giỏ hàng
     * @param {number|string} productId 
     */
    removeFromCart(productId) {
        let cart = this.getCart();
        cart = cart.filter(item => Number(item.id) !== Number(productId));
        this.saveCart(cart);

        // Bắn request ngầm xóa trên MySQL nếu đã đăng nhập
        if (storage.getToken()) {
            api.delete(`/api/cart/${productId}`)
                .catch(err => console.warn('Lỗi xóa sản phẩm trên server:', err.message));
        }

        return cart;
    },

    /**
     * Xóa sạch toàn bộ giỏ hàng
     */
    clearCart() {
        this.saveCart([]);

        // Xóa trên MySQL nếu đã đăng nhập
        if (storage.getToken()) {
            api.delete('/api/cart')
                .catch(err => console.warn('Lỗi xóa sạch giỏ trên server:', err.message));
        }
    },

    /**
     * Tính tổng số lượng cuốn sách có trong giỏ
     * @returns {number}
     */
    getTotalCount() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
    },

    /**
     * Tính tổng tiền hàng (chưa bao gồm phí ship)
     * @returns {number}
     */
    getTotalPrice() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
    }
};
