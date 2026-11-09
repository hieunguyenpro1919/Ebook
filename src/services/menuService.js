import api from '../api/client.js';

export const menuService = {
    /**
     * Lấy danh sách menu điều hướng từ database (json-server)
     */
    async getAll() {
        try {
            const response = await api.get('/menu');
            return response.data;
        } catch (error) {
            console.warn('Không thể tải menu từ API, sử dụng menu dự phòng:', error);
            // Dữ liệu dự phòng nếu server tạm thời chưa có endpoint /menu
            return [
                { id: 1, title: 'Trang chủ', url: './index.html', isHome: true },
                { id: 2, title: 'Sách mới', url: '#newProductsSection' },
                { id: 3, title: 'Thể loại sách', url: '#products', hasDropdown: true },
                { id: 4, title: 'Đơn hàng', url: './pages/orders.html', requireAuth: true },
                { id: 5, title: 'Giới thiệu', url: '#about' },
                { id: 6, title: 'Liên hệ', url: '#contact' }
            ];
        }
    }
};
