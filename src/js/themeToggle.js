/**
 * ========================================================
 * THEME TOGGLE CONTROLLER: SÁNG / TỐI (LIGHT / DARK)
 * Tinh gọn, thẩm mỹ, đồng bộ mượt mà
 * Nhà Sách Trí Tuệ
 * ========================================================
 */

const STORAGE_KEY = 'theme_mode';

export function applyTheme(isDark) {
    if (isDark) {
        document.documentElement.classList.add('dark');
        if (document.body) document.body.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
        if (document.body) document.body.classList.remove('dark');
    }

    // Cập nhật icon trên tất cả nút chuyển đổi
    const buttons = document.querySelectorAll('.theme-switch-btn');
    buttons.forEach(btn => {
        btn.textContent = isDark ? '☀️' : '🌙';
        btn.setAttribute('title', isDark ? 'Chuyển sang Giao diện Sáng (Light Mode)' : 'Chuyển sang Giao diện Tối (Dark Mode)');
        btn.setAttribute('aria-label', isDark ? 'Chuyển sang Sáng' : 'Chuyển sang Tối');
    });
}

export function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark') || 
                   (document.body && document.body.classList.contains('dark'));
    const newMode = !isDark;
    applyTheme(newMode);
    localStorage.setItem(STORAGE_KEY, newMode ? 'dark' : 'light');
}

export function initThemeToggle() {
    // 1. Đọc trạng thái đã lưu
    const saved = localStorage.getItem(STORAGE_KEY);
    let isDark = false;
    if (saved === 'dark') {
        isDark = true;
    } else if (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDark = true;
    }

    // 2. Áp dụng ngay
    applyTheme(isDark);

    // 3. Tự động gắn sự kiện cho các nút đã có
    document.querySelectorAll('.theme-switch-btn').forEach(btn => {
        btn.removeEventListener('click', toggleTheme);
        btn.addEventListener('click', toggleTheme);
    });

    // 4. Nếu chưa có nút trên header thì tự động thêm nút tròn tinh gọn
    autoInjectButton();

    // 5. Đồng bộ khi thay đổi ở tab khác
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            applyTheme(e.newValue === 'dark');
        }
    });
}

function autoInjectButton() {
    if (document.querySelector('.theme-switch-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-switch-btn';
    const isDark = document.body.classList.contains('dark');
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.setAttribute('title', isDark ? 'Chuyển sang Giao diện Sáng (Light Mode)' : 'Chuyển sang Giao diện Tối (Dark Mode)');
    btn.addEventListener('click', toggleTheme);

    // Chèn vào vị trí thích hợp
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
        headerActions.insertBefore(btn, headerActions.firstChild);
        return;
    }

    const adminActions = document.querySelector('.admin-actions');
    if (adminActions) {
        adminActions.insertBefore(btn, adminActions.firstChild);
        return;
    }

    const headerInner = document.querySelector('.header-inner > div:last-child') || 
                        document.querySelector('.header-nav');
    if (headerInner) {
        headerInner.insertBefore(btn, headerInner.firstChild);
        return;
    }
}

// Khởi tạo ngay khi file được import hoặc DOM sẵn sàng
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeToggle);
    } else {
        initThemeToggle();
    }
}
