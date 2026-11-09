import { authService } from '../services/authService.js';
import { notificationService } from '../services/notificationService.js';

function formatNotificationTime(isoString) {
    if (!isoString) return 'Vừa xong';
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    } catch {
        return 'Gần đây';
    }
}

function getNotificationIcon(type, title) {
    if (type === 'order' || (title && title.includes('đơn'))) {
        if (title.includes('thành công') || title.includes('Hoàn thành')) return '🎉';
        if (title.includes('vận chuyển') || title.includes('giao')) return '🚚';
        if (title.includes('hủy')) return '❌';
        return '📦';
    }
    if (type === 'promo') return '🎁';
    return '🔔';
}

export function initNotificationBell() {
    const bellWrap = document.querySelector('.notification-bell-wrap');
    if (!bellWrap) return;

    const bellBtn = bellWrap.querySelector('.btn-notification-bell');
    const badge = bellWrap.querySelector('.notification-badge');
    const dropdown = bellWrap.querySelector('.notification-dropdown');
    const listEl = bellWrap.querySelector('.notification-list');
    const btnMarkAll = bellWrap.querySelector('.btn-mark-all-read');

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
        bellWrap.style.display = 'none';
        return;
    }

    bellWrap.style.display = 'inline-flex';

    async function refreshNotifications() {
        const user = authService.getCurrentUser();
        if (!user) {
            bellWrap.style.display = 'none';
            return;
        }

        const items = await notificationService.getUserNotifications(user.id);
        const unreadCount = items.filter(n => !n.read).length;

        // Cập nhật Badge
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'flex';
                bellBtn?.classList.add('bell-ring-active');
            } else {
                badge.style.display = 'none';
                bellBtn?.classList.remove('bell-ring-active');
            }
        }

        // Render Dropdown List
        if (listEl) {
            if (!items || items.length === 0) {
                listEl.innerHTML = `
                    <div class="notification-empty-state">
                        <div class="empty-icon">🔕</div>
                        <p>Bạn chưa có thông báo nào.</p>
                    </div>
                `;
            } else {
                listEl.innerHTML = items.slice(0, 15).map(n => {
                    const icon = getNotificationIcon(n.type, n.title);
                    return `
                        <div class="notification-item ${n.read ? 'read' : 'unread'}" data-id="${n.id}" data-link="${n.link || ''}">
                            <div class="notification-icon">${icon}</div>
                            <div class="notification-body">
                                <div class="notification-title">${n.title}</div>
                                <div class="notification-msg">${n.message}</div>
                                <div class="notification-time">${formatNotificationTime(n.createdAt)}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    // Toggle Dropdown
    if (bellBtn && dropdown) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');
            if (isHidden) {
                dropdown.classList.remove('hidden');
                refreshNotifications();
            } else {
                dropdown.classList.add('hidden');
            }
        });
    }

    // Đóng Dropdown khi click ra ngoài
    document.addEventListener('click', (e) => {
        if (dropdown && !dropdown.classList.contains('hidden')) {
            if (!bellWrap.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        }
    });

    // Đánh dấu tất cả đã đọc
    if (btnMarkAll) {
        btnMarkAll.addEventListener('click', async (e) => {
            e.stopPropagation();
            const user = authService.getCurrentUser();
            if (!user) return;
            btnMarkAll.disabled = true;
            await notificationService.markAllAsRead(user.id);
            btnMarkAll.disabled = false;
            refreshNotifications();
        });
    }

    // Click vào 1 thông báo
    if (listEl) {
        listEl.addEventListener('click', async (e) => {
            const itemEl = e.target.closest('.notification-item');
            if (!itemEl) return;

            const notifId = itemEl.getAttribute('data-id');
            const link = itemEl.getAttribute('data-link');
            const user = authService.getCurrentUser();

            if (user && notifId) {
                await notificationService.markAsRead(notifId, user.id);
            }

            if (dropdown) dropdown.classList.add('hidden');

            if (link && link.trim() !== '') {
                window.location.href = link;
            }
        });
    }

    // Lắng nghe sự kiện toàn sàn
    window.addEventListener('notifications:updated', refreshNotifications);
    window.addEventListener('notifications:new', (e) => {
        refreshNotifications();
        // Hiển thị toast nhẹ nếu đang mở trang
        const notif = e.detail;
        if (notif) {
            console.log('Thông báo mới:', notif.title);
        }
    });

    // Tải dữ liệu ban đầu
    refreshNotifications();
}

