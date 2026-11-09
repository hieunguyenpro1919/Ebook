import api from '../api/client.js';

export const internalChatService = {
    /**
     * Lấy toàn bộ lịch sử trò chuyện giữa 2 người dùng
     * @param {number|string} userAId
     * @param {number|string} userBId
     */
    async getConversation(userAId, userBId) {
        if (!userAId || !userBId) return [];
        try {
            const [sentRes, receivedRes] = await Promise.all([
                api.get('/chatMessages', {
                    params: { senderId: Number(userAId), receiverId: Number(userBId) }
                }),
                api.get('/chatMessages', {
                    params: { senderId: Number(userBId), receiverId: Number(userAId) }
                })
            ]);

            const all = [...(sentRes.data || []), ...(receivedRes.data || [])];
            // Sắp xếp theo thời gian tăng dần
            return all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        } catch (error) {
            console.warn('Lỗi lấy hội thoại chat:', error);
            return [];
        }
    },

    /**
     * Gửi tin nhắn mới tới người dùng / gian hàng
     * @param {Object} messageData
     */
    async sendMessage(messageData) {
        const payload = {
            senderId: Number(messageData.senderId),
            senderName: messageData.senderName || 'Người dùng',
            senderRole: messageData.senderRole || 'customer',
            senderAvatar: messageData.senderAvatar || '',
            receiverId: Number(messageData.receiverId),
            receiverName: messageData.receiverName || 'Đối tác',
            message: messageData.message.trim(),
            timestamp: new Date().toISOString(),
            read: false
        };

        try {
            const res = await api.post('/chatMessages', payload);
            const saved = res.data;
            window.dispatchEvent(new CustomEvent('internal-chat:message', { detail: saved }));
            return saved;
        } catch (e) {
            console.error('Lỗi gửi tin nhắn nội bộ:', e);
            throw e;
        }
    },

    /**
     * Lấy danh sách danh bạ có thể nhắn tin cho người dùng hiện tại
     * @param {Object} currentUser
     */
    async getAvailableContacts(currentUser) {
        try {
            const res = await api.get('/user');
            const allUsers = res.data || [];

            // Loại trừ chính mình
            const others = allUsers.filter(u => Number(u.id) !== Number(currentUser.id));

            return others.map(u => ({
                id: u.id,
                name: u.shopName || u.name || u.email,
                role: u.role,
                avatar: u.avatar || '',
                subtitle: u.role === 'seller' ? 'Gian hàng đối tác' : (u.role === 'admin' ? 'Ban Quản Trị Hệ Thống' : 'Khách hàng')
            }));
        } catch (e) {
            console.warn('Lỗi lấy danh bạ chat:', e);
            return [];
        }
    },

    /**
     * Đánh dấu các tin nhắn từ người gửi là đã đọc
     * @param {number|string} senderId 
     * @param {number|string} currentUserId 
     */
    async markAsRead(senderId, currentUserId) {
        try {
            const res = await api.get('/chatMessages', {
                params: { senderId: Number(senderId), receiverId: Number(currentUserId), read: false }
            });
            const unread = res.data || [];
            for (const msg of unread) {
                await api.patch(`/chatMessages/${msg.id}`, { read: true });
            }
        } catch (e) {
            console.warn('Lỗi đánh dấu đã đọc chat:', e);
        }
    }
};

