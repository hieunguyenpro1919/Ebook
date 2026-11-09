import api from '../api/client.js';

export const categoryService = {
    /**
     * Lấy danh sách danh mục thể loại sách
     */
    async getAll() {
        const response = await api.get('/categories');
        return response.data;
    },

    /**
     * Thêm thể loại mới
     */
    async create(categoryData) {
        const response = await api.post('/categories', categoryData);
        return response.data;
    },

    /**
     * Cập nhật thể loại
     */
    async update(id, categoryData) {
        const response = await api.put(`/categories/${id}`, categoryData);
        return response.data;
    },

    /**
     * Xóa thể loại
     */
    async delete(id) {
        const response = await api.delete(`/categories/${id}`);
        return response.data;
    }
};
