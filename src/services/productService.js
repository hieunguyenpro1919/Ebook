import api from '../api/client.js';

export const productService = {
    /**
     * Lấy danh sách toàn bộ sản phẩm
     */
    async getAll() {
        const response = await api.get('/products');
        return response.data;
    },

    /**
     * Lấy thông tin chi tiết một sản phẩm theo ID
     * @param {number|string} id 
     */
    async getById(id) {
        const response = await api.get(`/products/${id}`);
        return response.data;
    },

    /**
     * Thêm sản phẩm mới vào kho (dành cho Admin)
     * @param {Object} productData 
     */
    async create(productData) {
        const response = await api.post('/products', productData);
        return response.data;
    },

    /**
     * Cập nhật thông tin sản phẩm (dành cho Admin)
     * @param {number|string} id 
     * @param {Object} productData 
     */
    async update(id, productData) {
        const response = await api.put(`/products/${id}`, productData);
        return response.data;
    },

    /**
     * Xóa một sản phẩm khỏi kho (dành cho Admin)
     * @param {number|string} id 
     */
    async delete(id) {
        const response = await api.delete(`/products/${id}`);
        return response.data;
    },

    /**
     * Cập nhật số lượng tồn kho của một sản phẩm
     * @param {number|string} id
     * @param {number} newStock Số lượng còn lại sau khi bán
     */
    async updateStock(id, newStock) {
        const response = await api.patch(`/products/${id}`, { stock: newStock });
        return response.data;
    },

    /**
     * Tăng số lượng đã bán của sản phẩm
     * @param {number|string} id 
     * @param {number} amount 
     */
    async increaseSoldCount(id, amount = 1) {
        try {
            const product = await this.getById(id);
            const currentSold = Number(product.soldCount) || 0;
            const response = await api.patch(`/products/${id}`, { soldCount: currentSold + Number(amount) });
            return response.data;
        } catch (error) {
            console.warn(`Không thể cập nhật soldCount cho sản phẩm #${id}:`, error);
        }
    }
};
