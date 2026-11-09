import api from '../api/client.js';
import { notificationService } from './notificationService.js';

export const orderService = {
    /**
     * Gửi đơn hàng mới lên json-server
     * @param {Object} orderData 
     */
    async createOrder(orderData) {
        const response = await api.post('/orders', orderData);
        const newOrder = response.data;
        try {
            if (newOrder && newOrder.userId) {
                await notificationService.createNotification({
                    userId: newOrder.userId,
                    orderId: newOrder.orderCode || `DH${newOrder.id}`,
                    title: '🎉 Đặt hàng thành công!',
                    message: `Đơn hàng #${newOrder.orderCode || `DH${newOrder.id}`} đã được khởi tạo thành công và đang chờ xác nhận.`,
                    type: 'order'
                });
            }
        } catch (e) {
            console.warn('Lỗi tạo thông báo đặt hàng:', e);
        }
        return newOrder;
    },

    /**
     * Lấy toàn bộ danh sách đơn hàng
     */
    async getAllOrders() {
        const response = await api.get('/orders');
        return response.data;
    },

    /**
     * Cập nhật trạng thái đơn hàng (dành cho Admin & Seller)
     * @param {number|string} orderId 
     * @param {string} status 
     */
    async updateStatus(orderId, status) {
        const response = await api.patch(`/orders/${orderId}`, { status });
        const updatedOrder = response.data;
        try {
            if (updatedOrder) {
                await notificationService.createOrderStatusNotification(updatedOrder, status);
            }
        } catch (e) {
            console.warn('Lỗi gửi thông báo đổi trạng thái đơn:', e);
        }
        return updatedOrder;
    },

    /**
     * Xóa đơn hàng (dành cho Admin)
     * @param {number|string} orderId 
     */
    async deleteOrder(orderId) {
        const response = await api.delete(`/orders/${orderId}`);
        return response.data;
    }
};
