import api from '../api/client.js';

export const saleService = {
    /**
     * Lấy cấu hình đợt Sale từ cơ sở dữ liệu
     */
    async getConfig() {
        try {
            const response = await api.get('/saleConfig');
            const data = response.data;
            if (Array.isArray(data)) {
                return data[0] || null;
            }
            return data || null;
        } catch (error) {
            console.warn('Không thể tải cấu hình đợt Sale:', error);
            return null;
        }
    },

    /**
     * Cập nhật cấu hình đợt Sale (Dành cho Admin)
     * @param {Object} configData
     */
    async updateConfig(configData) {
        const payload = {
            id: 1,
            ...configData
        };
        try {
            const response = await api.put('/saleConfig/1', payload);
            return response.data;
        } catch (error) {
            // Thử bằng PATCH nếu PUT không thành công
            const response = await api.patch('/saleConfig/1', payload);
            return response.data;
        }
    },

    /**
     * Kích hoạt đợt Flash Sale nhanh theo số giờ (mặc định 8 tiếng)
     * Bắt đầu đếm ngược ngay lập tức
     * @param {number} hours Số giờ sale (ví dụ 8)
     * @param {string} campaignName Tên chương trình
     * @param {string} description Mô tả
     */
    async startQuickSale(hours = 8, campaignName = '', description = '') {
        const now = new Date();
        const parsed = Number(hours);
        const numHours = (!isNaN(parsed) && parsed >= 0.01) ? parsed : 8;
        const end = new Date(now.getTime() + numHours * 3600 * 1000);

        let defaultName = `⚡ Flash Sale Giá Sốc (${numHours} Giờ)`;
        let defaultDesc = `Đại tiệc sách giảm giá cực sốc trong ${numHours} giờ!`;
        if (numHours < 1) {
            const mins = Math.round(numHours * 60 * 10) / 10;
            defaultName = `⚡ Flash Sale Giá Sốc (${mins} Phút)`;
            defaultDesc = `Đại tiệc sách giảm giá chớp nhoáng trong ${mins} phút!`;
        }

        const payload = {
            id: 1,
            isActive: true,
            campaignName: campaignName || defaultName,
            startTime: now.toISOString(),
            endTime: end.toISOString(),
            startDate: now.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
            durationHours: numHours,
            description: description || defaultDesc
        };
        return await this.updateConfig(payload);
    },

    /**
     * Dừng đợt Sale ngay lập tức
     */
    async stopSale() {
        const current = await this.getConfig();
        const nowIso = new Date().toISOString();
        return await this.updateConfig({
            ...(current || {}),
            isActive: false,
            endTime: nowIso
        });
    },

    /**
     * Kiểm tra xem hiện tại có đang trong thời gian diễn ra đợt Sale hay không (chính xác đến từng mili-giây)
     * @param {Object} config Cấu hình sale lấy từ db
     * @returns {boolean}
     */
    isSaleActive(config) {
        if (!config || !config.isActive) return false;

        const now = Date.now();

        // 1. Nếu có startTime / endTime dạng ISO timestamp
        let startTimestamp = null;
        let endTimestamp = null;

        if (config.startTime) {
            startTimestamp = new Date(config.startTime).getTime();
        } else if (config.startDate) {
            startTimestamp = new Date(`${config.startDate}T00:00:00`).getTime();
        }

        if (config.endTime) {
            endTimestamp = new Date(config.endTime).getTime();
        } else if (config.endDate) {
            endTimestamp = new Date(`${config.endDate}T23:59:59`).getTime();
        }

        if (startTimestamp && Number.isFinite(startTimestamp) && now < startTimestamp) {
            return false;
        }

        if (endTimestamp && Number.isFinite(endTimestamp) && now > endTimestamp) {
            return false;
        }

        return true;
    },

    /**
     * Tính toán thời gian còn lại của đợt Sale (phục vụ đếm ngược realtime từng giây)
     * @param {Object} config
     * @returns {Object} { total, days, hours, minutes, seconds, isExpired, isUpcoming, formatted }
     */
    getTimeRemaining(config) {
        if (!config || !config.isActive) {
            return {
                total: 0,
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                isExpired: true,
                isUpcoming: false,
                formatted: '00:00:00'
            };
        }

        const now = Date.now();

        let startTimestamp = null;
        if (config.startTime) {
            startTimestamp = new Date(config.startTime).getTime();
        } else if (config.startDate) {
            startTimestamp = new Date(`${config.startDate}T00:00:00`).getTime();
        }

        let endTimestamp = null;
        if (config.endTime) {
            endTimestamp = new Date(config.endTime).getTime();
        } else if (config.endDate) {
            endTimestamp = new Date(`${config.endDate}T23:59:59`).getTime();
        }

        if (startTimestamp && Number.isFinite(startTimestamp) && now < startTimestamp) {
            const untilStart = startTimestamp - now;
            return {
                total: untilStart,
                days: Math.floor(untilStart / (1000 * 60 * 60 * 24)),
                hours: Math.floor((untilStart / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((untilStart / (1000 * 60)) % 60),
                seconds: Math.floor((untilStart / 1000) % 60),
                isExpired: false,
                isUpcoming: true,
                formatted: 'Sắp diễn ra'
            };
        }

        if (!endTimestamp || !Number.isFinite(endTimestamp)) {
            return {
                total: 0,
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                isExpired: true,
                isUpcoming: false,
                formatted: '00:00:00'
            };
        }

        const total = endTimestamp - now;

        if (total <= 0) {
            return {
                total: 0,
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                isExpired: true,
                isUpcoming: false,
                formatted: '00:00:00'
            };
        }

        const seconds = Math.floor((total / 1000) % 60);
        const minutes = Math.floor((total / 1000 / 60) % 60);
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        const days = Math.floor(total / (1000 * 60 * 60 * 24));

        const pad = (n) => String(n).padStart(2, '0');
        const formatted = days > 0
            ? `${days} ngày ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
            : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

        return {
            total,
            days,
            hours,
            minutes,
            seconds,
            isExpired: false,
            isUpcoming: false,
            formatted
        };
    },

    /**
     * Tính toán giá sau khi giảm (% discount)
     * Làm tròn đến hàng nghìn đồng cho đẹp chuẩn tiền tệ VNĐ
     * @param {number} originalPrice 
     * @param {number} discountPercent 
     */
    calculateSalePrice(originalPrice, discountPercent) {
        const price = Number(originalPrice) || 0;
        const discount = Number(discountPercent) || 0;
        if (discount <= 0 || price <= 0) return price;

        const raw = price * (100 - discount) / 100;
        // Làm tròn đến hàng nghìn gần nhất
        return Math.max(1000, Math.round(raw / 1000) * 1000);
    },

    /**
     * Lấy thông tin giá chi tiết của sản phẩm dựa trên trạng thái Sale
     * @param {Object} product 
     * @param {boolean} isCampaignActive 
     */
    getPriceInfo(product, isCampaignActive = false) {
        const originalPrice = Number(product.price) || 0;
        const onSale = product.onSale === true || product.onSale === 'true';
        const discountPercent = Number(product.discountPercent) || 0;

        if (isCampaignActive && onSale && discountPercent > 0) {
            const salePrice = this.calculateSalePrice(originalPrice, discountPercent);
            return {
                isSale: true,
                originalPrice,
                salePrice,
                discountPercent,
                savedAmount: Math.max(0, originalPrice - salePrice)
            };
        }

        return {
            isSale: false,
            originalPrice,
            salePrice: originalPrice,
            discountPercent: 0,
            savedAmount: 0
        };
    },

    /**
     * Định dạng chuỗi ngày tháng hiển thị cho người dùng
     * @param {string} dateStr YYYY-MM-DD
     */
    formatDateVn(dateStr) {
        if (!dateStr) return '';
        try {
            const parts = String(dateStr).slice(0, 10).split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateStr;
        } catch {
            return dateStr;
        }
    },

    /**
     * Cập nhật trạng thái Sale và % giảm giá cho một cuốn sách
     * @param {number|string} productId 
     * @param {boolean} onSale 
     * @param {number} discountPercent 
     */
    async updateProductSale(productId, onSale, discountPercent) {
        const response = await api.patch(`/products/${productId}`, {
            onSale: Boolean(onSale),
            discountPercent: Math.min(90, Math.max(0, Number(discountPercent) || 0))
        });
        return response.data;
    }
};
