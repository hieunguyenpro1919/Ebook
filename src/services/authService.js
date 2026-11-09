import api from '../api/client.js';
import { storage } from '../utils/storage.js';

export const authService = {
    /**
     * Đăng nhập người dùng bằng email và mật khẩu (Bảo mật bằng POST + JWT)
     * @param {string} email 
     * @param {string} password 
     */
    async login(email, password) {
        try {
            // Gọi endpoint Node.js Express REST API với bcrypt + JWT
            const response = await api.post('/api/auth/login', { email, password });
            const data = response.data;
            if (data && data.success) {
                storage.setToken(data.token);
                storage.setUser(data.user);
                return data.user;
            }
            throw new Error(data.message || 'Đăng nhập không thành công.');
        } catch (error) {
            // Lấy message lỗi từ API trả về (nếu có)
            const msg = error.response?.data?.message || error.message || 'Email hoặc mật khẩu không chính xác.';
            throw new Error(msg);
        }
    },

    /**
     * Đăng ký tài khoản người dùng mới
     * @param {Object} userData { name, email, password, role, shopName }
     */
    async register(userData) {
        try {
            const response = await api.post('/api/auth/register', userData);
            const data = response.data;
            if (data && data.success) {
                if (data.token) storage.setToken(data.token);
                if (data.user) storage.setUser(data.user);
                return data.user;
            }
            return data;
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Đăng ký tài khoản thất bại.';
            throw new Error(msg);
        }
    },

    /**
     * Kiểm tra xem email đã tồn tại trong database chưa
     * @param {string} email 
     */
    async checkEmailExists(email) {
        try {
            const response = await api.get('/user', { params: { email } });
            return response.data && response.data.length > 0;
        } catch {
            return false;
        }
    },

    /**
     * Lấy thông tin user hiện tại đang đăng nhập từ storage
     */
    getCurrentUser() {
        return storage.getUser();
    },

    /**
     * Lấy toàn bộ danh sách tài khoản người dùng trong hệ thống (dành cho Admin)
     */
    async getAllUsers() {
        const response = await api.get('/user');
        return response.data;
    },

    /**
     * Tìm thông tin người dùng theo địa chỉ email
     * @param {string} email
     */
    async findUserByEmail(email) {
        const response = await api.get('/user', { params: { email } });
        const users = response.data;
        return (users && users.length > 0) ? users[0] : null;
    },

    /**
     * Cập nhật thông tin hồ sơ người dùng
     * @param {number|string} userId
     * @param {Object} profileData
     */
    async updateProfile(userId, profileData) {
        try {
            const response = await api.put('/api/auth/profile', profileData);
            const current = storage.getUser() || {};
            const merged = { ...current, ...profileData };
            storage.setUser(merged);
            return merged;
        } catch {
            // Fallback nếu gọi /user/:id
            const response = await api.patch(`/user/${userId}`, profileData);
            const updatedUser = response.data;
            const current = storage.getUser() || {};
            const merged = { ...current, ...updatedUser };
            storage.setUser(merged);
            return merged;
        }
    },

    /**
     * Đổi mật khẩu tài khoản
     */
    async changePassword(userId, oldPassword, newPassword) {
        return this.updateProfile(userId, { password: newPassword });
    },

    /**
     * Đăng xuất xóa toàn bộ session và token
     */
    logout() {
        storage.clearAuth();
    }
};
