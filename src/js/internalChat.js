import { authService } from '../services/authService.js';
import { internalChatService } from '../services/internalChatService.js';

let activeTargetUser = null;
let contactsList = [];
let pollInterval = null;

function formatMessageTime(isoString) {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${mins}`;
    } catch {
        return '';
    }
}

export function initInternalChat() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return; // Chỉ hiển thị khi đã đăng nhập

    // Kiểm tra xem đã có trigger button và drawer trên DOM chưa, nếu chưa thì tự động render
    let triggerBtn = document.querySelector('#btnOpenInternalChat');
    let drawer = document.querySelector('#internalChatDrawer');

    if (!triggerBtn) {
        triggerBtn = document.createElement('button');
        triggerBtn.id = 'btnOpenInternalChat';
        triggerBtn.className = 'btn-open-internal-chat';
        triggerBtn.innerHTML = '<span>💬</span> <span>Nhắn tin Shop</span>';
        triggerBtn.title = 'Trao đổi tin nhắn với gian hàng hoặc Quản trị viên';
        document.body.appendChild(triggerBtn);
    }

    if (!drawer) {
        drawer = document.createElement('div');
        drawer.id = 'internalChatDrawer';
        drawer.className = 'internal-chat-drawer';
        drawer.style.display = 'none';
        drawer.innerHTML = `
            <div class="chat-drawer-header">
                <div class="chat-header-user">
                    <div class="chat-user-avatar" id="chatTargetAvatar">🏪</div>
                    <div class="chat-user-info">
                        <span class="chat-user-name" id="chatTargetName">Chọn người nhận</span>
                        <span class="chat-user-status">
                            <span class="chat-status-dot"></span> <span id="chatTargetRole">Đang hoạt động</span>
                        </span>
                    </div>
                </div>
                <div class="chat-header-actions">
                    <button type="button" class="btn-chat-switch-contact" id="btnToggleContacts" title="Danh bạ người nhận">👥</button>
                    <button type="button" class="btn-close-internal-chat" id="btnCloseInternalChat" title="Thu nhỏ khung chat">✕</button>
                </div>
            </div>

            <!-- DANH BẠ LIÊN HỆ -->
            <div class="chat-contacts-view" id="chatContactsView" style="display: none;">
                <div class="contacts-header-title">Chọn đối tác / Shop trò chuyện:</div>
                <div class="contacts-list" id="chatContactsList">
                    <!-- Render bằng JS -->
                </div>
            </div>

            <!-- NỘI DUNG TIN NHẮN -->
            <div class="chat-messages-body" id="chatMessagesBody">
                <div class="chat-empty-convo">
                    <div class="empty-icon">💬</div>
                    <p>Hãy chọn một gian hàng hoặc Quản trị viên để bắt đầu cuộc trò chuyện!</p>
                </div>
            </div>

            <!-- THANH NHẬP TIN NHẮN -->
            <form class="chat-drawer-input-bar" id="chatInputForm">
                <input type="text" id="chatMessageInput" class="chat-input-text" placeholder="Nhập tin nhắn..." autocomplete="off">
                <button type="submit" class="btn-send-message" id="btnSendMessage" title="Gửi tin nhắn">✈️</button>
            </form>
        `;
        document.body.appendChild(drawer);
    }

    const btnClose = drawer.querySelector('#btnCloseInternalChat');
    const btnToggleContacts = drawer.querySelector('#btnToggleContacts');
    const contactsView = drawer.querySelector('#chatContactsView');
    const contactsListEl = drawer.querySelector('#chatContactsList');
    const messagesBody = drawer.querySelector('#chatMessagesBody');
    const inputForm = drawer.querySelector('#chatInputForm');
    const messageInput = drawer.querySelector('#chatMessageInput');
    const targetAvatar = drawer.querySelector('#chatTargetAvatar');
    const targetName = drawer.querySelector('#chatTargetName');
    const targetRole = drawer.querySelector('#chatTargetRole');

    // Mở / Đóng chat drawer
    triggerBtn.addEventListener('click', async () => {
        const isHidden = drawer.style.display === 'none';
        if (isHidden) {
            drawer.style.display = 'flex';
            await loadContacts();
            if (!activeTargetUser && contactsList.length > 0) {
                selectContact(contactsList[0]);
            }
            startPolling();
        } else {
            drawer.style.display = 'none';
            stopPolling();
        }
    });

    if (btnClose) {
        btnClose.addEventListener('click', () => {
            drawer.style.display = 'none';
            stopPolling();
        });
    }

    if (btnToggleContacts && contactsView) {
        btnToggleContacts.addEventListener('click', () => {
            contactsView.style.display = contactsView.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Tải danh bạ
    async function loadContacts() {
        contactsList = await internalChatService.getAvailableContacts(currentUser);
        if (contactsListEl) {
            contactsListEl.innerHTML = contactsList.map(c => `
                <button type="button" class="contact-item-btn ${activeTargetUser && activeTargetUser.id === c.id ? 'active' : ''}" data-id="${c.id}">
                    <span style="font-size: 1.1rem;">${c.role === 'seller' ? '🏪' : (c.role === 'admin' ? '👑' : '👤')}</span>
                    <span class="contact-item-name">${c.name}</span>
                    <span class="contact-item-badge">${c.subtitle}</span>
                </button>
            `).join('');

            contactsListEl.querySelectorAll('.contact-item-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cId = Number(btn.getAttribute('data-id'));
                    const target = contactsList.find(c => Number(c.id) === cId);
                    if (target) {
                        selectContact(target);
                        if (contactsView) contactsView.style.display = 'none';
                    }
                });
            });
        }
    }

    // Chọn đối tác trò chuyện
    async function selectContact(target) {
        activeTargetUser = target;
        if (targetName) targetName.textContent = target.name;
        if (targetRole) targetRole.textContent = target.subtitle || 'Đang trực tuyến';
        if (targetAvatar) {
            if (target.avatar) {
                targetAvatar.innerHTML = `<img src="${target.avatar}" alt="${target.name}">`;
            } else {
                targetAvatar.textContent = target.role === 'seller' ? '🏪' : (target.role === 'admin' ? '👑' : '👤');
            }
        }

        if (contactsListEl) {
            contactsListEl.querySelectorAll('.contact-item-btn').forEach(b => {
                b.classList.toggle('active', Number(b.getAttribute('data-id')) === Number(target.id));
            });
        }

        await loadMessages();
        if (messageInput) messageInput.focus();
    }

    // Tải tin nhắn của hội thoại hiện tại
    async function loadMessages() {
        if (!activeTargetUser || !messagesBody) return;
        const messages = await internalChatService.getConversation(currentUser.id, activeTargetUser.id);

        if (!messages || messages.length === 0) {
            messagesBody.innerHTML = `
                <div class="chat-empty-convo">
                    <div class="empty-icon">👋</div>
                    <p>Chưa có tin nhắn nào với <strong>${activeTargetUser.name}</strong>.<br>Hãy gửi lời chào đầu tiên nhé!</p>
                </div>
            `;
            return;
        }

        messagesBody.innerHTML = messages.map(m => {
            const isOutgoing = Number(m.senderId) === Number(currentUser.id);
            const avatarChar = (m.senderName || 'U').charAt(0).toUpperCase();

            return `
                <div class="chat-bubble-wrap ${isOutgoing ? 'outgoing' : 'incoming'}">
                    <div class="bubble-avatar">${isOutgoing ? 'Tôi' : avatarChar}</div>
                    <div>
                        <div class="chat-bubble">
                            ${m.message}
                            <div class="bubble-time">${formatMessageTime(m.timestamp)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Cuộn xuống tin nhắn cuối cùng
        messagesBody.scrollTop = messagesBody.scrollHeight;
    }

    // Gửi tin nhắn
    if (inputForm && messageInput) {
        inputForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = messageInput.value.trim();
            if (!text || !activeTargetUser) return;

            messageInput.value = '';
            try {
                await internalChatService.sendMessage({
                    senderId: currentUser.id,
                    senderName: currentUser.shopName || currentUser.name || currentUser.email,
                    senderRole: currentUser.role || 'customer',
                    senderAvatar: currentUser.avatar || '',
                    receiverId: activeTargetUser.id,
                    receiverName: activeTargetUser.name,
                    message: text
                });
                await loadMessages();
            } catch (err) {
                console.error('Lỗi khi gửi tin nhắn:', err);
            }
        });
    }

    function startPolling() {
        stopPolling();
        pollInterval = setInterval(loadMessages, 3500);
    }

    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    window.addEventListener('internal-chat:message', () => {
        if (drawer.style.display !== 'none' && activeTargetUser) {
            loadMessages();
        }
    });

    // Mở trực tiếp với người dùng chỉ định
    window.openInternalChatWith = async function(targetUserId, targetName) {
        drawer.style.display = 'flex';
        await loadContacts();
        let target = contactsList.find(c => Number(c.id) === Number(targetUserId));
        if (!target) {
            target = { id: targetUserId, name: targetName || 'Người bán', subtitle: 'Gian hàng đối tác' };
        }
        selectContact(target);
        startPolling();
    };
}

