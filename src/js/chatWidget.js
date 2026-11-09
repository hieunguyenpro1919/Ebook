import { botService } from '../services/botService.js';
import { aiService } from '../services/aiService.js';
import { formatPrice } from '../utils/format.js';

export class ChatWidget {
    constructor() {
        this.isOpen = false;
        this.chatHistory = [];
        this.isWaiting = false;
        this.basePath = this.detectBasePath();
        this.init();
    }

    /**
     * Tự động xác định đường dẫn tương đối (đang ở trang chủ index.html hay các trang trong /pages/)
     */
    detectBasePath() {
        const path = window.location.pathname;
        if (path.includes('/pages/')) {
            return '../';
        }
        return './';
    }

    init() {
        // Kiểm tra xem đã có widget trong DOM chưa, nếu chưa thì tạo
        if (!document.getElementById('aiChatLauncher')) {
            this.injectWidgetHtml();
            this.bindEvents();
            this.sendWelcomeMessage();
        }
    }

    /**
     * Tiêm toàn bộ HTML của Widget vào cuối body
     */
    injectWidgetHtml() {
        const container = document.createElement('div');
        container.id = 'aiChatContainer';
        container.innerHTML = `
            <!-- Nút nổi Launcher -->
            <div class="ai-chat-launcher" id="aiChatLauncher">
                <div class="ai-launcher-tooltip" id="aiLauncherTooltip">
                    ✨ Hỏi Trợ lý AI Nhà Sách nhé!
                </div>
                <button type="button" class="ai-chat-toggle-btn" id="aiChatToggleBtn" title="Trò chuyện với Trợ lý AI Trí Tuệ">
                    🤖
                    <span class="ai-launcher-badge">AI</span>
                </button>
            </div>

            <!-- Cửa sổ Chat Popup -->
            <div class="ai-chat-window" id="aiChatWindow">
                <!-- Header -->
                <div class="ai-chat-header">
                    <div class="ai-header-info">
                        <div class="ai-avatar">🤖</div>
                        <div class="ai-title-wrap">
                            <h4>Trí Tuệ Book AI</h4>
                            <div class="ai-status-indicator">
                                <span class="dot"></span>
                                <span id="aiStatusText">Sẵn sàng hỗ trợ &bull; Gemini RAG</span>
                            </div>
                        </div>
                    </div>
                    <div class="ai-header-actions">
                        <button type="button" class="ai-btn-icon" id="aiBtnConfig" title="Cài đặt Gemini API Key">⚙️</button>
                        <button type="button" class="ai-btn-icon" id="aiBtnClose" title="Thu nhỏ khung chat">&times;</button>
                    </div>
                </div>

                <!-- Panel Cài Đặt API Key -->
                <div class="ai-api-panel" id="aiApiPanel">
                    <p>🔑 Nhập <strong>Google Gemini API Key</strong> để kích hoạt Trí tuệ nhân tạo tư vấn chuyên sâu:</p>
                    <div class="ai-api-input-row">
                        <input type="text" id="aiApiKeyInput" class="ai-api-input" placeholder="Dán Gemini API Key (AIzaSy...)" autocomplete="new-password" spellcheck="false" data-lpignore="true">
                        <button type="button" id="aiBtnSaveKey" class="ai-btn-save-key">Lưu Key</button>
                    </div>
                    <div class="ai-api-help-links">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Lấy key miễn phí (Google AI Studio) →</a>
                        <button type="button" id="aiBtnClearKey">Xóa Key</button>
                    </div>
                </div>

                <!-- Vùng hiển thị tin nhắn -->
                <div class="ai-chat-body" id="aiChatBody">
                    <!-- Các tin nhắn được nạp động -->
                </div>

                <!-- Nút gợi ý nhanh -->
                <div class="ai-quick-suggestions" id="aiQuickSuggestions">
                    <button type="button" class="ai-chip-btn" data-query="Kiểm tra đơn hàng của tôi">📦 Tra cứu đơn hàng</button>
                    <button type="button" class="ai-chip-btn" data-query="Hôm nay có những sách nào đang Sale?">🔥 Sách đang Sale</button>
                    <button type="button" class="ai-chip-btn" data-query="Gợi ý cho tôi 4 cuốn sách bán chạy nhất">⭐ Sách bán chạy</button>
                    <button type="button" class="ai-chip-btn" data-query="Chính sách phí ship và đổi trả thế nào?">🚚 Phí ship & Đổi trả</button>
                </div>

                <!-- Footer nhập tin nhắn -->
                <div class="ai-chat-footer">
                    <form class="ai-chat-form" id="aiChatForm">
                        <input 
                            type="text" 
                            id="aiChatInput" 
                            class="ai-chat-input" 
                            placeholder="Nhập câu hỏi (Ví dụ: Tra cứu DH123456, tư vấn sách...)" 
                            autocomplete="off"
                        >
                        <button type="submit" class="ai-chat-send-btn" id="aiChatSendBtn" title="Gửi tin nhắn">
                            ➤
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(container);
    }

    /**
     * Gắn sự kiện cho các thành phần widget
     */
    bindEvents() {
        const toggleBtn = document.getElementById('aiChatToggleBtn');
        const tooltip = document.getElementById('aiLauncherTooltip');
        const closeBtn = document.getElementById('aiBtnClose');
        const configBtn = document.getElementById('aiBtnConfig');
        const chatForm = document.getElementById('aiChatForm');
        const saveKeyBtn = document.getElementById('aiBtnSaveKey');
        const clearKeyBtn = document.getElementById('aiBtnClearKey');
        const apiKeyInput = document.getElementById('aiApiKeyInput');
        const suggestionsBox = document.getElementById('aiQuickSuggestions');

        // Mở/Đóng chat
        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleChat());
        if (tooltip) tooltip.addEventListener('click', () => this.openChat());
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeChat());

        // Bật/Tắt panel cấu hình API Key
        if (configBtn) {
            configBtn.addEventListener('click', () => {
                const panel = document.getElementById('aiApiPanel');
                if (panel) {
                    panel.classList.toggle('active');
                    if (panel.classList.contains('active')) {
                        const currentKey = aiService.getApiKey();
                        if (apiKeyInput) apiKeyInput.value = currentKey;
                        apiKeyInput.focus();
                    }
                }
            });
        }

        // Lưu API Key (Có kiểm tra kết nối ngay lập tức)
        if (saveKeyBtn) {
            saveKeyBtn.addEventListener('click', async () => {
                const key = apiKeyInput ? apiKeyInput.value.trim() : '';
                if (!key) {
                    alert('Vui lòng dán mã API Key hợp lệ!');
                    return;
                }

                saveKeyBtn.disabled = true;
                saveKeyBtn.textContent = 'Đang kiểm tra...';

                try {
                    const testResult = await aiService.testApiKey(key);
                    if (testResult.ok) {
                        aiService.setApiKey(key);
                        alert(`✓ Tuyệt vời! ${testResult.message}\nBot đã kích hoạt chế độ AI Tư Vấn Thông Minh.`);
                        document.getElementById('aiApiPanel').classList.remove('active');
                        this.updateAiStatusText();
                    } else {
                        const confirmSave = confirm(`⚠️ Google phản hồi lỗi: "${testResult.message}"\n\nBạn có muốn vẫn lưu key này không?`);
                        if (confirmSave) {
                            aiService.setApiKey(key);
                            document.getElementById('aiApiPanel').classList.remove('active');
                            this.updateAiStatusText();
                        }
                    }
                } catch (e) {
                    alert('Lỗi kiểm tra key: ' + e.message);
                } finally {
                    saveKeyBtn.disabled = false;
                    saveKeyBtn.textContent = 'Lưu Key';
                }
            });
        }

        // Xóa API Key
        if (clearKeyBtn) {
            clearKeyBtn.addEventListener('click', () => {
                if (confirm('Bạn muốn xóa Gemini API Key và quay về chế độ tư vấn cơ bản?')) {
                    aiService.setApiKey('');
                    if (apiKeyInput) apiKeyInput.value = '';
                    alert('Đã xóa API Key.');
                    document.getElementById('aiApiPanel').classList.remove('active');
                    this.updateAiStatusText();
                }
            });
        }

        // Gửi tin nhắn qua form
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('aiChatInput');
                if (!input) return;
                const message = input.value.trim();
                if (message) {
                    input.value = '';
                    this.handleUserSend(message);
                }
            });
        }

        // Click các nút gợi ý nhanh
        if (suggestionsBox) {
            suggestionsBox.addEventListener('click', (e) => {
                const chip = e.target.closest('.ai-chip-btn');
                if (chip && chip.dataset.query) {
                    this.handleUserSend(chip.dataset.query);
                }
            });
        }

        // Cập nhật trạng thái hiển thị
        this.updateAiStatusText();
    }

    updateAiStatusText() {
        const statusText = document.getElementById('aiStatusText');
        if (statusText) {
            if (aiService.hasApiKey()) {
                statusText.innerHTML = '● Gemini AI Pro &bull; RAG Sách Kho';
            } else {
                statusText.innerHTML = '● Tra cứu nhanh &bull; Bấm ⚙️ bật AI';
            }
        }
    }

    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        const windowEl = document.getElementById('aiChatWindow');
        const tooltip = document.getElementById('aiLauncherTooltip');
        if (windowEl) windowEl.classList.add('active');
        if (tooltip) tooltip.style.display = 'none';
        this.isOpen = true;
        this.scrollToBottom();

        const input = document.getElementById('aiChatInput');
        if (input) setTimeout(() => input.focus(), 300);
    }

    closeChat() {
        const windowEl = document.getElementById('aiChatWindow');
        if (windowEl) windowEl.classList.remove('active');
        this.isOpen = false;
    }

    sendWelcomeMessage() {
        const welcomeText = `Xin chào bạn! Em là **Trợ lý AI Nhà Sách Trí Tuệ** 📚✨\n\n` +
            `Em có thể hỗ trợ bạn:\n` +
            `• 📦 **Tra cứu đơn hàng** tức thì (chỉ cần nhập mã *#DH...*)\n` +
            `• 💡 **Tư vấn & Gợi ý sách** theo sở thích, tâm trạng, ngân sách\n` +
            `• 🔥 Xem **Sách đang Sale & Bán chạy nhất**\n` +
            `• 🚚 Giải đáp **Phí ship & Chính sách đổi trả**\n\n` +
            `*Bạn hãy bấm các nút gợi ý bên dưới hoặc gõ câu hỏi nhé!*`;

        this.appendMessage('bot', welcomeText);
    }

    /**
     * Xử lý khi người dùng gửi tin nhắn
     */
    async handleUserSend(text) {
        if (this.isWaiting) return;

        // 1. Thêm tin nhắn của User vào UI
        this.appendMessage('user', text);
        this.chatHistory.push({ role: 'user', text });

        // 2. Khóa form và hiển thị typing indicator
        this.isWaiting = true;
        this.setFormDisabled(true);
        this.showTypingIndicator();

        try {
            // 3. Gọi botService xử lý
            const result = await botService.processMessage(text, this.chatHistory);

            // 4. Xóa typing và nạp kết quả
            this.hideTypingIndicator();
            this.appendMessage('bot', result.text, result.books);
            this.chatHistory.push({ role: 'model', text: result.text });
        } catch (error) {
            console.error('Lỗi khi chat bot xử lý:', error);
            this.hideTypingIndicator();
            this.appendMessage('bot', 'Dạ hệ thống đang bận một chút, bạn thử lại sau vài giây nhé!');
        } finally {
            this.isWaiting = false;
            this.setFormDisabled(false);
            const input = document.getElementById('aiChatInput');
            if (input) input.focus();
        }
    }

    /**
     * Thêm tin nhắn vào khung chat
     */
    appendMessage(sender, text, books = []) {
        const body = document.getElementById('aiChatBody');
        if (!body) return;

        const row = document.createElement('div');
        row.className = `ai-msg-row ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'ai-msg-avatar';
        avatar.textContent = sender === 'bot' ? '🤖' : '👤';

        const bubble = document.createElement('div');
        bubble.className = 'ai-msg-bubble';
        bubble.innerHTML = this.formatMarkdown(text);

        // Nếu có danh sách sách đi kèm (Book Carousel)
        if (books && Array.isArray(books) && books.length > 0) {
            const carousel = document.createElement('div');
            carousel.className = 'chat-books-carousel';

            books.forEach(b => {
                const detailLink = this.basePath === './' 
                    ? `./pages/product-detail.html?id=${b.id}` 
                    : `./product-detail.html?id=${b.id}`;

                const item = document.createElement('div');
                item.className = 'chat-book-item';
                item.innerHTML = `
                    <img src="${b.image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80'}" alt="${b.name}">
                    <div class="name" title="${b.name}">${b.name}</div>
                    <div class="price">${formatPrice(b.price)}</div>
                    <a href="${detailLink}" class="btn-view-book">Xem sách →</a>
                `;
                carousel.appendChild(item);
            });

            bubble.appendChild(carousel);
        }

        row.appendChild(avatar);
        row.appendChild(bubble);
        body.appendChild(row);

        this.scrollToBottom();
    }

    /**
     * Định dạng Markdown thông minh (in đậm, ngắt dòng, danh sách, tiêu đề)
     */
    formatMarkdown(str) {
        if (!str) return '';
        let text = str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Tiêu đề Markdown: ### Tiêu đề -> In đậm to
        text = text.replace(/^#{1,4}\s+(.*$)/gim, '<strong style="display:block; margin: 4px 0 2px 0; color: #1e1b4b;">$1</strong>');

        // Gạch ngang phân cách ---
        text = text.replace(/^---+$/gim, '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 6px 0;">');

        // Danh sách gạch đầu dòng: * item hoặc - item -> Dấu chấm tròn •
        text = text.replace(/^[\*\-]\s+(.*$)/gim, '<div style="margin-left: 4px; padding-left: 12px; position: relative;">• $1</div>');

        // In đậm: **text**
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // In nghiêng: *text*
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Code inline: `code`
        text = text.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.06); padding: 2px 4px; border-radius: 4px; font-family: inherit;">$1</code>');

        // Xuống dòng: \n -> <br> (nếu chưa có thẻ khối div)
        text = text.replace(/\n{2,}/g, '<br><br>');
        text = text.replace(/\n/g, '<br>');

        return text;
    }

    showTypingIndicator() {
        const body = document.getElementById('aiChatBody');
        if (!body) return;

        const row = document.createElement('div');
        row.id = 'aiTypingRow';
        row.className = 'ai-msg-row bot';
        row.innerHTML = `
            <div class="ai-msg-avatar">🤖</div>
            <div class="ai-typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        body.appendChild(row);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingEl = document.getElementById('aiTypingRow');
        if (typingEl) typingEl.remove();
    }

    scrollToBottom() {
        const body = document.getElementById('aiChatBody');
        if (body) {
            setTimeout(() => {
                body.scrollTop = body.scrollHeight;
            }, 50);
        }
    }

    setFormDisabled(disabled) {
        const input = document.getElementById('aiChatInput');
        const btn = document.getElementById('aiChatSendBtn');
        if (input) input.disabled = disabled;
        if (btn) btn.disabled = disabled;
    }
}

// Khởi tạo ChatWidget ngay khi file này được import
export function initChatbot() {
    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new ChatWidget());
        } else {
            new ChatWidget();
        }
    }
}
