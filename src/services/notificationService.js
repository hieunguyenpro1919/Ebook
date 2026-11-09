import api from '../api/client.js';

const NOTIFICATIONS_LOCAL_KEY = 'user_notifications_local';

export const notificationService = {
    /**
     * Lấy danh sách thông báo của người dùng từ LocalStorage (dự phòng)
     */
    getLocalNotifications(userId) {
        try {
            const raw = localStorage.getItem(`${NOTIFICATIONS_LOCAL_KEY}_${userId}`);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    },

    /**
     * Lưu danh sách thông báo vào LocalStorage
     */
    setLocalNotifications(userId, list) {
        try {
            localStorage.setItem(`${NOTIFICATIONS_LOCAL_KEY}_${userId}`, JSON.stringify(list));
        } catch (e) {
            console.warn('Lỗi lưu LocalStorage Notifications:', e);
        }
    },

    /**
     * Lấy toàn bộ thông báo của người dùng từ API (sắp xếp mới nhất lên đầu)
     * @param {number|string} userId
     */
    async getUserNotifications(userId) {
        if (!userId) return [];
        try {
            const res = await api.get('/notifications', {
                params: {
                    userId,
                    _sort: 'createdAt',
                    _order: 'desc'
                }
            });
            const list = res.data || [];
            this.setLocalNotifications(userId, list);
            return list;
        } catch (error) {
            console.warn('Lỗi lấy Notifications từ API, dùng LocalStorage:', error);
            return this.getLocalNotifications(userId);
        }
    },

    /**
     * Đếm số lượng thông báo chưa đọc
     * @param {number|string} userId
     */
    async getUnreadCount(userId) {
        const list = await this.getUserNotifications(userId);
        return list.filter(item => !item.read).length;
    },

    /**
     * Đánh dấu 1 thông báo là đã đọc
     * @param {number|string} notificationId
     * @param {number|string} userId
     */
    async markAsRead(notificationId, userId) {
        try {
            await api.patch(`/notifications/${notificationId}`, { read: true });
        } catch (e) {
            console.warn('Lỗi cập nhật trạng thái thông báo qua API:', e);
        }

        if (userId) {
            const local = this.getLocalNotifications(userId).map(n => 
                String(n.id) === String(notificationId) ? { ...n, read: true } : n
            );
            this.setLocalNotifications(userId, local);
        }

        window.dispatchEvent(new CustomEvent('notifications:updated', { detail: { userId } }));
        return true;
    },

    /**
     * Đánh dấu tất cả thông báo của người dùng là đã đọc
     * @param {number|string} userId
     */
    async markAllAsRead(userId) {
        if (!userId) return;
        const list = await this.getUserNotifications(userId);
        const unread = list.filter(n => !n.read);

        for (const item of unread) {
            try {
                await api.patch(`/notifications/${item.id}`, { read: true });
            } catch (e) {
                console.warn(`Lỗi cập nhật thông báo #${item.id}:`, e);
            }
        }

        const local = list.map(n => ({ ...n, read: true }));
        this.setLocalNotifications(userId, local);

        window.dispatchEvent(new CustomEvent('notifications:updated', { detail: { userId } }));
        return true;
    },

    /**
     * Tạo mới một thông báo trong hệ thống
     * @param {Object} data { userId, orderId, title, message, type, link }
     */
    async createNotification(data) {
        const item = {
            userId: data.userId,
            orderId: data.orderId || null,
            title: data.title || 'Thông báo hệ thống',
            message: data.message || '',
            type: data.type || 'info', // 'order', 'promo', 'system'
            read: false,
            link: data.link || (data.orderId ? `./pages/orders.html?search=${data.orderId}` : ''),
            createdAt: new Date().toISOString()
        };

        try {
            const res = await api.post('/notifications', item);
            const saved = res.data;

            // Cập nhật local
            if (data.userId) {
                const local = this.getLocalNotifications(data.userId);
                local.unshift(saved);
                this.setLocalNotifications(data.userId, local);
            }

            window.dispatchEvent(new CustomEvent('notifications:new', { detail: saved }));
            window.dispatchEvent(new CustomEvent('notifications:updated', { detail: { userId: data.userId } }));
            return saved;
        } catch (e) {
            console.warn('Lỗi tạo notification trên server:', e);
            // Lưu tạm vào local nếu máy chủ tạm thời không kết nối được
            item.id = Date.now();
            if (data.userId) {
                const local = this.getLocalNotifications(data.userId);
                local.unshift(item);
                this.setLocalNotifications(data.userId, local);
            }
            window.dispatchEvent(new CustomEvent('notifications:new', { detail: item }));
            return item;
        }
    },

    /**
     * Tự động sinh thông báo khi đơn hàng thay đổi trạng thái
     * @param {Object} order
     * @param {string} newStatus
     */
    async createOrderStatusNotification(order, newStatus) {
        if (!order) return null;

        let targetUserId = order.userId;
        if (!targetUserId && order.userEmail) {
            try {
                const userRes = await api.get('/user', { params: { email: order.userEmail } });
                if (userRes.data && userRes.data.length > 0) {
                    targetUserId = userRes.data[0].id;
                }
            } catch (err) {
                console.warn('Lỗi tra cứu userId theo email:', err);
            }
        }

        if (!targetUserId) return null;

        const orderCode = order.orderCode || `DH${order.id}`;
        let title = '';
        let message = '';
        let type = 'order';

        switch (newStatus) {
            case 'Đã xác nhận':
            case 'Xác nhận':
                title = '📦 Đơn hàng đã được xác nhận';
                message = `Đơn hàng #${orderCode} của bạn đã được đối tác người bán duyệt và đang tiến hành đóng gói.`;
                break;
            case 'Đang giao':
            case 'Đang vận chuyển':
                title = '🚚 Đơn hàng đang được vận chuyển';
                message = `Đơn hàng #${orderCode} đã được bàn giao cho đơn vị chuyển phát và đang trên đường giao tới bạn.`;
                break;
            case 'Hoàn thành':
            case 'Đã giao':
                title = '🎉 Giao hàng thành công!';
                message = `Đơn hàng #${orderCode} đã được giao thành công. Hãy chia sẻ cảm nhận và đánh giá cuốn sách bạn nhé!`;
                break;
            case 'Đã hủy':
            case 'Hủy':
                title = '❌ Đơn hàng đã bị hủy';
                message = `Đơn hàng #${orderCode} của bạn đã bị hủy. Vui lòng liên hệ hỗ trợ nếu cần thêm thông tin.`;
                break;
            default:
                title = `Cập nhật đơn hàng #${orderCode}`;
                message = `Trạng thái đơn hàng của bạn đã chuyển sang: "${newStatus}".`;
        }

        return this.createNotification({
            userId: order.userId,
            orderId: orderCode,
            title,
            message,
            type,
            link: `./orders.html?search=${encodeURIComponent(orderCode)}`
        });
    }
};
