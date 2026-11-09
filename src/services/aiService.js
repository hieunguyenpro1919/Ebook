/**
 * Service quản lý kết nối Google Gemini API
 * Hỗ trợ Lightweight RAG (Retrieval-Augmented Generation) cho Nhà Sách Trí Tuệ
 */

// GẮN KEY TẠI ĐÂY NẾU MUỐN DÙNG MẶC ĐỊNH TRONG CODE (hoặc nhập trên giao diện qua nút ⚙️):
const DEFAULT_GEMINI_KEY = ''; 

const STORAGE_KEY = 'TRITUE_GEMINI_API_KEY';

export const aiService = {
    cachedValidModels: null,

    /**
     * Lấy API Key hiện tại từ localStorage hoặc từ key mặc định
     */
    getApiKey() {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_GEMINI_KEY || '';
    },

    /**
     * Lưu API Key vào localStorage
     * @param {string} key 
     */
    setApiKey(key) {
        this.cachedValidModels = null;
        if (!key) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, key.trim());
        }
    },

    /**
     * Kiểm tra xem đã có API Key hợp lệ chưa
     */
    hasApiKey() {
        const key = this.getApiKey();
        return Boolean(key && key.length > 10);
    },

    /**
     * Lấy danh sách model THỰC TẾ mà Google cấp cho API Key này (ListModels API)
     * Tránh hoàn toàn lỗi 404 do model không tồn tại hoặc sai phiên bản v1/v1beta
     */
    async fetchAvailableModels(apiKey) {
        if (this.cachedValidModels && this.cachedValidModels.length > 0) {
            return this.cachedValidModels;
        }

        const versions = ['v1beta', 'v1'];
        for (const ver of versions) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`);
                if (res.ok) {
                    const data = await res.json();
                    const models = (data.models || [])
                        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
                        .map(m => ({
                            name: m.name.replace(/^models\//, ''),
                            version: ver,
                            displayName: m.displayName || m.name
                        }));

                    if (models.length > 0) {
                        // Sắp xếp ưu tiên flash lên trước (nhanh và tiết kiệm token)
                        models.sort((a, b) => {
                            const aIsFlash = a.name.includes('flash');
                            const bIsFlash = b.name.includes('flash');
                            if (aIsFlash && !bIsFlash) return -1;
                            if (!aIsFlash && bIsFlash) return 1;
                            return 0;
                        });

                        this.cachedValidModels = models;
                        console.log('✓ Google đã cấp các model sau cho key của bạn:', models.map(m => m.name));
                        return models;
                    }
                }
            } catch (err) {
                console.warn(`Không lấy được danh sách model qua ${ver}:`, err);
            }
        }

        // Danh sách dự phòng nếu không list được
        return [
            { name: 'gemini-1.5-flash', version: 'v1beta' },
            { name: 'gemini-1.5-flash-latest', version: 'v1beta' },
            { name: 'gemini-2.0-flash', version: 'v1beta' },
            { name: 'gemini-1.5-pro', version: 'v1beta' },
            { name: 'gemini-1.5-flash', version: 'v1' }
        ];
    },

    /**
     * Kiểm tra tính hợp lệ của API Key và trả về kết quả chi tiết
     */
    async testApiKey(key) {
        const cleanKey = (key || this.getApiKey()).trim();
        if (!cleanKey) return { ok: false, message: 'Chưa nhập API Key' };

        try {
            const models = await this.fetchAvailableModels(cleanKey);
            if (models && models.length > 0) {
                const modelNames = models.slice(0, 3).map(m => m.name).join(', ');
                return {
                    ok: true,
                    message: `Kết nối thành công! Đã nhận diện được các model: ${modelNames}...`,
                    models: models.map(m => m.name)
                };
            }
            return {
                ok: false,
                message: 'API Key được chấp nhận nhưng không tìm thấy model nào hỗ trợ generateContent.'
            };
        } catch (err) {
            return { ok: false, message: `Lỗi kết nối mạng hoặc key không hợp lệ: ${err.message}` };
        }
    },

    /**
     * Gọi Gemini API để sinh câu trả lời với ngữ cảnh danh mục sách (Lightweight RAG)
     * @param {string} userMessage Tin nhắn từ người dùng
     * @param {Array} books Danh sách sách từ kho để nạp ngữ cảnh
     * @param {Array} chatHistory Lịch sử trò chuyện gần nhất [{ role: 'user'|'model', text: string }]
     */
    async generateResponse(userMessage, books = [], chatHistory = []) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('CHUA_CO_KEY');
        }

        // 1. Chuẩn bị ngữ cảnh danh mục sách (Lightweight RAG Context)
        const booksSummary = books.slice(0, 30).map(b => {
            const saleInfo = b.onSale ? ` (Đang SALE -${b.discountPercent || 20}%)` : '';
            return `- [ID:${b.id}] "${b.name}" | Tác giả: ${b.author || 'Đang cập nhật'} | Thể loại: ${b.tag || 'Sách'} | Giá: ${Number(b.price).toLocaleString('vi-VN')}₫${saleInfo} | Đã bán: ${b.soldCount || 0} | Tóm tắt: ${b.description ? b.description.slice(0, 120) + '...' : ''}`;
        }).join('\n');

        // 2. Xây dựng System Prompt chuyên nghiệp
        const systemPromptText = `
Bạn là "Trợ lý AI Nhà Sách Trí Tuệ" - một trợ lý ảo thân thiện, hiểu biết, lịch thiệp và am hiểu về sách.
Nhiệm vụ của bạn:
1. Tư vấn, gợi ý sách phù hợp nhất cho người đọc dựa trên sở thích, tâm trạng, độ tuổi hoặc ngân sách của họ.
2. Tóm tắt, giải thích ý nghĩa hoặc nêu bài học từ các cuốn sách.
3. Giải đáp thắc mắc về sách bằng giọng văn lôi cuốn, truyền cảm hứng đọc sách.

QUY TẮC RẤT QUAN TRỌNG (RAG):
- Dưới đây là KHO SÁCH HIỆN CÓ CỦA CỬA HÀNG:
${booksSummary}

- NGUYÊN TẮC: Khi tư vấn hoặc gợi ý, bạn PHẢI ƯU TIÊN chọn từ KHO SÁCH TRÊN. Nêu rõ Tên sách và Giá tiền. Nếu sách nào đang SALE thì hãy nhắc khách để họ vui.
- Giữ câu trả lời ngắn gọn (khoảng 2 đến 4 đoạn ngắn), dùng bullet points hoặc in đậm tên sách để dễ nhìn trên khung chat nhỏ.
- Nếu khách hỏi sách hoàn toàn không có trong danh mục, bạn có thể nói ngắn gọn là nhà sách hiện chưa có bản này nhưng gợi ý một cuốn tương tự có trong kho.
- Hãy kết thúc bằng một câu hỏi gợi mở hoặc lời chúc ấm áp.
`;

        // 3. Chuẩn bị nội dung gửi lên API
        const formattedHistory = chatHistory.slice(-4).map(item => ({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }]
        }));

        // Gộp system prompt vào lời chào đầu tiên hoặc tin nhắn hiện tại để 100% model đều tương thích
        const unifiedContents = [
            ...formattedHistory,
            {
                role: 'user',
                parts: [{ text: `[HƯỚNG DẪN HỆ THỐNG VÀ KHO SÁCH NHÀ SÁCH TRÍ TUỆ]:\n${systemPromptText}\n\n[CÂU HỎI CỦA KHÁCH HÀNG]:\n${userMessage}` }]
            }
        ];

        // 4. Lấy danh sách model thực tế mà Google cấp cho API key này
        const targetModels = await this.fetchAvailableModels(apiKey);
        let lastError = null;

        for (const target of targetModels) {
            try {
                const endpoint = `https://generativelanguage.googleapis.com/${target.version}/models/${target.name}:generateContent?key=${apiKey}`;
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: unifiedContents,
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 800
                        }
                    })
                });

                if (!response.ok) {
                    const errJson = await response.json().catch(() => ({}));
                    const errMsg = errJson.error ? errJson.error.message : `HTTP ${response.status}`;
                    console.warn(`Model ${target.name} (${target.version}) báo lỗi:`, errMsg);

                    if (response.status === 400 && errMsg.includes('API_KEY_INVALID')) {
                        throw new Error(`API_KEY_ERROR: Mã API Key không hợp lệ. Vui lòng kiểm tra lại key.`);
                    }

                    lastError = new Error(errMsg);
                    continue; // thử model tiếp theo trong danh sách
                }

                const data = await response.json();
                const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (replyText) {
                    console.log(`✓ AI đã trả lời thành công bằng model: ${target.name} (${target.version})`);
                    return replyText;
                }
            } catch (err) {
                if (err.message && err.message.startsWith('API_KEY_ERROR')) {
                    throw err;
                }
                lastError = err;
            }
        }

        throw lastError || new Error('Không nhận được phản hồi từ AI');
    }
};
