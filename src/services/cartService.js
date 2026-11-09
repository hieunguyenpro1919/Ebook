const CART_STORAGE_KEY = 'nhasach_cart';

export const cartService = {
    /**
     * Lấy toàn bộ danh sách sản phẩm trong giỏ hàng
     * @returns {Array} Mảng các sản phẩm [{ id, name, price, image, quantity }]
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
     * Lưu giỏ hàng vào localStorage
     * @param {Array} cart 
     */
    saveCart(cart) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        // Kích hoạt custom event để các component khác đồng bộ badge
        window.dispatchEvent(new Event('cartUpdated'));
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
     * Sản phẩm cũ (đã lưu trước khi có field stock) được coi như còn hàng
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
     * @param {Object} product Sản phẩm cần thêm (có thể kèm field stock)
     * @param {number} quantity Số lượng thêm (mặc định 1)
     * @returns {Object} { cart, added, maxQuantity } - kết quả thêm vào giỏ
     */
    addToCart(product, quantity = 1) {
        if (!product || !product.id) return { cart: this.getCart(), added: 0, maxQuantity: 0 };

        const cart = this.getCart();
        const existingIndex = cart.findIndex(item => Number(item.id) === Number(product.id));

        // Số lượng tồn kho (mặc định không giới hạn nếu thiếu dữ liệu)
        const stock = product.stock === undefined || product.stock === null ? Infinity : Number(product.stock);
        const currentQty = existingIndex > -1 ? cart[existingIndex].quantity : 0;
        const maxQuantity = Math.max(0, stock - currentQty);

        // Không vượt quá tồn kho
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
                quantity: allowed
            };
            if (stock !== Infinity) newItem.stock = stock;
            cart.push(newItem);
        }

        this.saveCart(cart);
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
            // Nếu số lượng <= 0 thì xóa khỏi giỏ
            return this.removeFromCart(productId);
        }

        const target = cart.find(item => Number(item.id) === Number(productId));
        if (target) {
            // Không cho vượt quá số lượng tồn kho
            if (target.stock !== undefined && target.stock !== null) {
                quantity = Math.min(quantity, Number(target.stock));
            }
            target.quantity = quantity;
            this.saveCart(cart);
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
        return cart;
    },

    /**
     * Xóa sạch toàn bộ giỏ hàng
     */
    clearCart() {
        this.saveCart([]);
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
