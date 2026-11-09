const USER_KEY = 'user';

/**
 * Module quản lý lưu trữ LocalStorage an toàn
 */
export const storage = {
    getUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Lỗi khi đọc user từ localStorage:', e);
            return null;
        }
    },

    setUser(user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    removeUser() {
        localStorage.removeItem(USER_KEY);
    }
};
