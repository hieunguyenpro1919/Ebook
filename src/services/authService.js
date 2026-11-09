import api from '../api/client.js';
import { storage } from '../utils/storage.js';

export const authService = {
    /**
     * Đăng nhập người dùng bằng email và mật khẩu
     * @param {string} email 
     * @param {string} password 
     */
    async login(email, password) {
        const response = await api.get('/user', {
            params: { email, password }
        });
        const users = response.data;
        if (!users || users.length === 0) {
            throw new Error('Email hoặc mật khẩu không chính xác.');
        }
        const user = users[0];
        storage.setUser(user);
        return user;
    },

    /**
     * Kiểm tra xem email đã tồn tại trong database chưa
     * @param {string} email 
     */
    async checkEmailExists(email) {
        const response = await api.get('/user', {
            params: { email }
        });
        return response.data && response.data.length > 0;
    },

    /**
     * Đăng ký tài khoản người dùng mới
     * @param {Object} userData { name, email, password }
     */
    async register(userData) {
        const response = await api.post('/user', userData);
        return response.data;
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
        const response = await api.get('/user', {
            params: { email }
        });
        const users = response.data;
        return (users && users.length > 0) ? users[0] : null;
    },

    /**
     * Cập nhật mật khẩu mới cho người dùng
     * @param {number|string} userId
     * @param {string} newPassword
     */
    async resetPassword(userId, newPassword) {
        const response = await api.patch(`/user/${userId}`, {
            password: newPassword
        });
        return response.data;
    },

    /**
     * Lấy thông tin người dùng mới nhất từ máy chủ theo ID
     * @param {number|string} userId
     */
    async getUserById(userId) {
        const response = await api.get(`/user/${userId}`);
        return response.data;
    },

    /**
     * Cập nhật thông tin hồ sơ người dùng
     * @param {number|string} userId
     * @param {Object} profileData
     */
    async updateProfile(userId, profileData) {
        const response = await api.patch(`/user/${userId}`, profileData);
        const updatedUser = response.data;
        const current = storage.getUser() || {};
        const merged = { ...current, ...updatedUser };
        storage.setUser(merged);
        return merged;
    },

    /**
     * Đổi mật khẩu tài khoản (có đối soát mật khẩu cũ)
     * @param {number|string} userId
     * @param {string} oldPassword
     * @param {string} newPassword
     */
    async changePassword(userId, oldPassword, newPassword) {
        const user = await this.getUserById(userId);
        if (!user || user.password !== oldPassword) {
            throw new Error('Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại!');
        }
        const updated = await this.resetPassword(userId, newPassword);
        const current = storage.getUser() || {};
        storage.setUser({ ...current, password: newPassword });
        return updated;
    },

    /**
     * Đăng xuất xóa session người dùng
     */
    logout() {
        storage.removeUser();
    }
};
