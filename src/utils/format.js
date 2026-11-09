/**
 * Định dạng số thành chuỗi tiền tệ chuẩn Việt Nam (VND)
 * @param {number|string} price 
 * @returns {string} ví dụ: "89.000 ₫"
 */
export function formatPrice(price) {
    return Number(price).toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND'
    });
}

/**
 * Escape các ký tự đặc biệt của HTML để chèn an toàn vào innerHTML
 * (dùng cho dữ liệu do người dùng nhập như từ khóa tìm kiếm)
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
