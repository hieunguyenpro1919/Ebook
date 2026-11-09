import { productService } from './productService.js';
import { orderService } from './orderService.js';
import { authService } from './authService.js';
import { saleService } from './saleService.js';
import { aiService } from './aiService.js';
import { formatPrice } from '../utils/format.js';

export const botService = {
    /**
     * Xử lý tin nhắn của người dùng và sinh câu trả lời
     * @param {string} rawMessage Tin nhắn người dùng
     * @param {Array} chatHistory Lịch sử trò chuyện
     * @returns {Promise<{ text: string, type: string, books?: Array, order?: Object }>}
     */
    async processMessage(rawMessage, chatHistory = []) {
        const text = (rawMessage || '').trim();
        const lower = text.toLowerCase();

        if (!text) {
            return {
                text: 'Xin chào! Em là Trợ lý AI của Nhà Sách Trí Tuệ. Em có thể giúp gì cho bạn hôm nay?',
                type: 'text'
            };
        }

        // ========================================================
        // 1. TRA CỨU ĐƠN HÀNG (Local - Tức thì, không tốn API)
        // ========================================================
        const orderCodeMatch = text.match(/\b(DH\d{3,10})\b/i);
        if (orderCodeMatch || lower.includes('kiểm tra đơn') || lower.includes('tra cứu đơn') || lower.includes('đơn hàng của tôi')) {
            return await this.handleOrderQuery(orderCodeMatch ? orderCodeMatch[1].toUpperCase() : null);
        }

        // ========================================================
        // 2. HỎI ĐÁP CHÍNH SÁCH / FAQ (Local - Tức thì)
        // ========================================================
        // 2.1. Phí ship & Giao hàng
        if (lower.includes('phí ship') || lower.includes('tiền ship') || lower.includes('vận chuyển') || lower.includes('giao hàng') || lower.includes('bao lâu thì nhận')) {
            return {
                type: 'faq',
                text: `📦 **Chính sách Vận chuyển & Giao hàng tại Nhà Sách Trí Tuệ:**\n\n` +
                      `• **Miễn phí ship (0đ)**: Áp dụng cho mọi đơn hàng từ **250.000₫** trở lên.\n` +
                      `• **Đơn dưới 250.000₫**: Đồng giá phí ship toàn quốc là **30.000₫**.\n` +
                      `• **Thời gian nhận hàng**: Nội thành TP.HCM nhận trong 1-2 ngày, các tỉnh thành khác từ 2-4 ngày làm việc.\n` +
                      `• Sách được đóng gói bọc xốp chống sốc cẩn thận trước khi giao.`
            };
        }

        // 2.2. Phương thức thanh toán (COD & VietQR)
        if (lower.includes('thanh toán') || lower.includes('vietqr') || lower.includes('chuyển khoản') || lower.includes('cod') || lower.includes('quẹt thẻ')) {
            return {
                type: 'faq',
                text: `💳 **Phương thức Thanh toán hỗ trợ:**\n\n` +
                      `1. **Chuyển khoản VietQR**: Quét mã QR tự động qua ứng dụng mọi ngân hàng (MBBank, Vietcombank, Techcombank,...). Xác nhận tức thì và có thể xuất hóa đơn điện tử PDF.\n` +
                      `2. **Thanh toán tiền mặt khi nhận hàng (COD)**: Nhận sách, kiểm tra rồi mới thanh toán tiền cho shipper.\n\n` +
                      `💡 *Cả 2 hình thức đều đảm bảo quyền lợi đổi trả sách trong 7 ngày.*`
            };
        }

        // 2.3. Đổi trả & Bảo hành
        if (lower.includes('đổi trả') || lower.includes('trả hàng') || lower.includes('bảo hành') || lower.includes('bị rách') || lower.includes('lỗi in')) {
            return {
                type: 'faq',
                text: `🔄 **Chính sách Đổi trả Sách:**\n\n` +
                      `• Thời hạn đổi trả trong vòng **7 ngày** kể từ khi nhận được sách.\n` +
                      `• Áp dụng khi sách bị lỗi in ấn, nhòe trang, rách bìa hoặc giao nhầm tựa sách.\n` +
                      `• Bạn chỉ cần giữ hóa đơn mua hàng (hoặc mã đơn #DH...) và liên hệ hotline **1900 6868** để được hỗ trợ đổi cuốn mới miễn phí 100%.`
            };
        }

        // 2.4. Địa chỉ & Hotline liên hệ
        if (lower.includes('địa chỉ') || lower.includes('cửa hàng') || lower.includes('ở đâu') || lower.includes('hotline') || lower.includes('liên hệ') || lower.includes('sđt')) {
            return {
                type: 'faq',
                text: `📍 **Thông tin liên hệ Nhà Sách Trí Tuệ:**\n\n` +
                      `• **Địa chỉ cửa hàng**: 123 Đường Sách Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM\n` +
                      `• **Hotline hỗ trợ**: 1900 6868 (8:00 - 21:00 hàng ngày)\n` +
                      `• **Email**: lienhe@trituebook.vn\n` +
                      `• **Giờ mở cửa**: 08:00 - 22:00 tất cả các ngày trong tuần (kể cả Lễ, Tết).`
            };
        }

        // ========================================================
        // 3. SÁCH ĐANG SALE / KHUYẾN MÃI (Local)
        // ========================================================
        if (lower.includes('đang sale') || lower.includes('khuyến mãi') || lower.includes('giảm giá') || lower.includes('sách sale')) {
            return await this.handleSaleQuery();
        }

        // ========================================================
        // 4. SÁCH BÁN CHẠY / NỔI BẬT (Local)
        // ========================================================
        if (lower.includes('bán chạy') || lower.includes('sách hot') || lower.includes('nổi bật') || lower.includes('top sách') || lower.includes('nhiều người mua')) {
            return await this.handleHotBooksQuery();
        }

        // ========================================================
        // 5. TƯ VẤN SÁCH & HỎI ĐÁP TỰ DO (LIGHTWEIGHT RAG + GEMINI AI)
        // ========================================================
        return await this.handleAiConsultation(rawMessage, chatHistory);
    },

    /**
     * Xử lý tra cứu đơn hàng
     */
    async handleOrderQuery(orderCode) {
        try {
            const allOrders = await orderService.getAllOrders();
            const currentUser = authService.getCurrentUser();

            // Nếu người dùng đã cung cấp mã đơn cụ thể (DH...)
            if (orderCode) {
                const found = allOrders.find(o => (o.orderCode || '').toUpperCase() === orderCode);
                if (!found) {
                    return {
                        type: 'order_not_found',
                        text: `🔍 Em không tìm thấy đơn hàng mang mã **#${orderCode}** trong hệ thống.\n\nBạn vui lòng kiểm tra lại mã đơn (thường có dạng #DH123456 trong trang Đơn hàng của bạn nhé)!`
                    };
                }

                const isVietQr = found.paymentMethod === 'VIETQR' || found.isPaid;
                const status = found.status || 'Chờ xác nhận';
                const itemsCount = (found.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);
                const itemsListStr = (found.items || []).map(i => `• ${i.name} (x${i.quantity})`).join('\n');

                return {
                    type: 'order_detail',
                    order: found,
                    text: `📦 **Thông tin đơn hàng #${found.orderCode}:**\n\n` +
                          `• **Trạng thái hiện tại**: **${status}** ${status.includes('giao') ? '🚚' : (status.includes('Hoàn thành') ? '✅' : '⏳')}\n` +
                          `• **Thanh toán**: ${isVietQr ? 'Đã thanh toán (VietQR) ✓' : 'Thanh toán tiền mặt khi nhận hàng (COD)'}\n` +
                          `• **Người nhận**: ${found.receiverName || '---'} (${found.receiverPhone || ''})\n` +
                          `• **Địa chỉ giao**: ${found.receiverAddress || 'Tại quầy'}\n` +
                          `• **Sách đã mua (${itemsCount} cuốn)**:\n${itemsListStr}\n` +
                          `• **Tổng thanh toán**: **${formatPrice(found.totalAmount)}**\n\n` +
                          `💡 *Bạn có thể vào mục [Đơn Hàng] để xem chi tiết và xuất Hóa đơn điện tử PDF bất cứ lúc nào!*`
                };
            }

            // Nếu người dùng hỏi chung chung "đơn hàng của tôi"
            if (currentUser) {
                const userOrders = allOrders.filter(o => 
                    (o.userId && Number(o.userId) === Number(currentUser.id)) ||
                    (o.userEmail && o.userEmail.toLowerCase() === currentUser.email?.toLowerCase())
                );

                if (userOrders.length === 0) {
                    return {
                        type: 'text',
                        text: `Chào bạn **${currentUser.name || currentUser.email}**, tài khoản của bạn hiện chưa có đơn hàng nào tại Nhà Sách Trí Tuệ.\n\nNếu bạn có mã đơn khách vãng lai, hãy nhắn mã đơn (ví dụ: *DH123456*) để em tra cứu giúp nhé!`
                    };
                }

                // Lấy đơn mới nhất
                const latest = userOrders[userOrders.length - 1];
                return {
                    type: 'order_detail',
                    order: latest,
                    text: `Chào bạn! Đơn hàng gần nhất của bạn là **#${latest.orderCode}**:\n\n` +
                          `• **Trạng thái**: **${latest.status || 'Đang xử lý'}**\n` +
                          `• **Hình thức**: ${latest.paymentMethod === 'VIETQR' ? 'Đã thanh toán (VietQR)' : 'COD'}\n` +
                          `• **Tổng tiền**: **${formatPrice(latest.totalAmount)}**\n\n` +
                          `💡 Nếu bạn muốn tra cứu đơn hàng khác, hãy gửi mã đơn cụ thể (ví dụ: *DH123456*) nhé!`
                };
            }

            return {
                type: 'text',
                text: `📦 Để tra cứu đơn hàng nhanh chóng, bạn vui lòng nhập **Mã đơn hàng** (Ví dụ: **DH123456**) hoặc đăng nhập tài khoản để xem toàn bộ lịch sử đơn mua nhé!`
            };
        } catch (err) {
            console.error('Lỗi khi tra cứu đơn hàng:', err);
            return {
                type: 'text',
                text: 'Hệ thống tra cứu đơn hàng đang bận một chút, bạn vui lòng thử lại sau giây lát nhé!'
            };
        }
    },

    /**
     * Tra cứu sách đang sale
     */
    async handleSaleQuery() {
        try {
            const [products, saleConfig] = await Promise.all([
                productService.getAll(),
                saleService.getConfig()
            ]);

            const isSaleActive = saleService.isSaleActive(saleConfig);
            let saleProducts = [];

            if (isSaleActive) {
                saleProducts = products.filter(p => p.onSale);
            } else {
                saleProducts = products.filter(p => p.onSale || p.discountPercent > 0);
            }

            if (saleProducts.length === 0) {
                return {
                    type: 'text',
                    text: `Hiện tại chương trình Flash Sale vừa kết thúc. Tuy nhiên, nhà sách vẫn luôn có chính sách **Miễn phí vận chuyển cho đơn từ 250k** và các tựa sách chọn lọc giá rất tốt!`
                };
            }

            const topSales = saleProducts.slice(0, 4);
            const remaining = saleService.getTimeRemaining(saleConfig);

            return {
                type: 'book_list',
                books: topSales,
                text: `🔥 **Các tựa sách đang được SALE KHỦNG hôm nay** ${isSaleActive ? `(Thời gian còn lại: ${remaining.formatted})` : ''}:\n\n` +
                      topSales.map(p => `• **${p.name}** - Giảm **${p.discountPercent || 20}%** còn **${formatPrice(p.price)}**`).join('\n') +
                      `\n\n💡 Bạn có thể bấm vào sách dưới đây để xem chi tiết ngay:`
            };
        } catch (err) {
            return {
                type: 'text',
                text: 'Bạn có thể xem các sách khuyến mãi tại mục Flash Sale trên trang chủ nhé!'
            };
        }
    },

    /**
     * Tra cứu sách nổi bật / bán chạy
     */
    async handleHotBooksQuery() {
        try {
            const products = await productService.getAll();
            const hotBooks = [...products]
                .sort((a, b) => (Number(b.soldCount) || 0) - (Number(a.soldCount) || 0))
                .slice(0, 4);

            return {
                type: 'book_list',
                books: hotBooks,
                text: `⭐ **Top 4 cuốn sách BÁN CHẠY NHẤT tại Nhà Sách Trí Tuệ:**\n\n` +
                      hotBooks.map(p => `• **${p.name}** (Tác giả: ${p.author || 'Nhiều tác giả'}) - Đã bán: **${p.soldCount || 0} cuốn** - Giá: **${formatPrice(p.price)}**`).join('\n') +
                      `\n\nBạn có muốn em tóm tắt hoặc tư vấn thêm về cuốn nào trong số này không?`
            };
        } catch (err) {
            return {
                type: 'text',
                text: 'Bạn có thể xem các tựa sách nổi bật ngay ở trang chủ nhé!'
            };
        }
    },

    /**
     * Xử lý tư vấn chuyên sâu qua AI Gemini (Lightweight RAG) với fallback nội bộ
     */
    async handleAiConsultation(userMessage, chatHistory = []) {
        let allProducts = [];
        try {
            allProducts = await productService.getAll();
        } catch (e) {
            console.warn('Không tải được danh sách sách cho AI:', e);
        }

        // Nếu đã có API Key Gemini -> Gọi AI với Lightweight RAG
        if (aiService.hasApiKey()) {
            try {
                const aiReply = await aiService.generateResponse(userMessage, allProducts, chatHistory);
                
                // Trích xuất các sách được AI nhắc tên để hiển thị card mini tương tác
                const mentionedBooks = allProducts.filter(p => 
                    aiReply.toLowerCase().includes(p.name.toLowerCase()) ||
                    (p.author && aiReply.toLowerCase().includes(p.author.toLowerCase()))
                ).slice(0, 3);

                return {
                    type: mentionedBooks.length > 0 ? 'book_list' : 'ai_text',
                    text: aiReply,
                    books: mentionedBooks
                };
            } catch (err) {
                console.warn('Gọi Gemini API thất bại, chuyển sang chế độ tư vấn dự phòng:', err);
                const fallback = this.fallbackConsultation(userMessage, allProducts, false);
                return {
                    ...fallback,
                    text: `⚠️ *Google AI phản hồi: "${err.message || 'Không thể kết nối'}"*\n\n` +
                          `📚 *Em tạm thời chuyển sang gợi ý từ kho sách nội bộ Nhà Sách Trí Tuệ:*\n\n` +
                          fallback.text
                };
            }
        }

        // Chế độ Tư Vấn Dự Phòng (Fallback Smart Search) khi chưa cấu hình Key
        return this.fallbackConsultation(userMessage, allProducts, true);
    },

    /**
     * Tư vấn thông minh nội bộ dựa trên từ khóa & thể loại trong db.json
     * @param {string} userMessage
     * @param {Array} allProducts
     * @param {boolean} showKeyHint Có hiển thị câu nhắc nhập API Key hay không
     */
    fallbackConsultation(userMessage, allProducts, showKeyHint = true) {
        const lower = userMessage.toLowerCase();

        // Tìm kiếm so khớp thể loại và nội dung
        const matched = allProducts.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(lower);
            const authorMatch = p.author && p.author.toLowerCase().includes(lower);
            const descMatch = p.description && p.description.toLowerCase().includes(lower);
            const tagMatch = p.tag && p.tag.toLowerCase().includes(lower);

            // Bắt các từ khóa thông dụng
            const isSkill = (lower.includes('kỹ năng') || lower.includes('phát triển') || lower.includes('bản thân') || lower.includes('tự tin')) && (p.tag === 'Kỹ năng sống' || p.categoryId === 2);
            const isTech = (lower.includes('lập trình') || lower.includes('công nghệ') || lower.includes('it') || lower.includes('code') || lower.includes('javascript')) && (p.tag === 'Công nghệ' || p.categoryId === 3);
            const isEcon = (lower.includes('kinh tế') || lower.includes('làm giàu') || lower.includes('khởi nghiệp') || lower.includes('tài chính') || lower.includes('tiền')) && (p.tag === 'Kinh tế' || p.categoryId === 4);
            const isLit = (lower.includes('văn học') || lower.includes('tiểu thuyết') || lower.includes('truyện') || lower.includes('tình cảm')) && (p.tag === 'Văn học' || p.categoryId === 1);
            const isHeal = (lower.includes('chữa lành') || lower.includes('bình an') || lower.includes('tâm lý') || lower.includes('thiền')) && (p.categoryId === 5 || (p.description && p.description.includes('chữa lành')));

            return nameMatch || authorMatch || descMatch || tagMatch || isSkill || isTech || isEcon || isLit || isHeal;
        });

        const keyHintText = showKeyHint 
            ? `\n\n💡 *Gợi ý: Bạn có thể bấm vào biểu tượng ⚙️ ở góc trên khung chat để nhập Gemini API Key miễn phí.*` 
            : '';

        // Nếu tìm thấy sách phù hợp
        if (matched.length > 0) {
            const topMatched = matched.slice(0, 3);
            return {
                type: 'book_list',
                books: topMatched,
                text: `Dựa trên yêu cầu của bạn, em xin gợi ý cho bạn những cuốn sách phù hợp nhất hiện có tại Nhà Sách Trí Tuệ:\n\n` +
                      topMatched.map(p => `• **${p.name}** (${formatPrice(p.price)}): ${p.description ? p.description.slice(0, 100) + '...' : ''}`).join('\n\n') +
                      keyHintText
            };
        }

        // Trả lời mặc định thân thiện
        return {
            type: 'text',
            text: `Dạ em đã nhận được yêu cầu của bạn! Tại Nhà Sách Trí Tuệ hiện có rất nhiều đầu sách hay về **Văn học, Kỹ năng sống, Công nghệ & Kinh tế**.\n\n` +
                  `Bạn có thể nói rõ hơn về sở thích (ví dụ: *thích đọc tiểu thuyết, sách phát triển bản thân, sách dưới 100k...*) để em gợi ý chính xác hơn nhé!` +
                  keyHintText
        };
    }
};
