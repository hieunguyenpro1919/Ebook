/**
 * ========================================================
 * UTILS: PHÂN TRANG PHÍA CLIENT (CLIENT-SIDE PAGINATION)
 * Tách riêng thành module dùng chung cho các bảng dữ liệu
 * trong trang Quản trị (Sách / Đơn hàng / Người dùng / Sale).
 *
 * Vì dữ liệu trong trang Quản trị đã được nạp sẵn vào bộ nhớ
 * (allBooks, allOrders, allUsers) nên phân trang được thực hiện
 * hoàn toàn ở phía client, không phụ thuộc tham số _page/_limit
 * của json-server.
 * ========================================================
 */

/**
 * Số bản ghi mặc định hiển thị trên 1 trang
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Các lựa chọn số bản ghi / trang cho thanh phân trang
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Cắt danh sách theo trang hiện tại
 * @param {Array} items Danh sách gốc (đã lọc)
 * @param {number} currentPage Trang hiện tại (bắt đầu từ 1)
 * @param {number} pageSize Số bản ghi mỗi trang
 * @returns {Object} { items, page, totalPages, totalItems, pageSize, from, to, hasPrev, hasNext }
 */
export function paginate(items, currentPage = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const list = Array.isArray(items) ? items : [];
    const size = Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE);
    const totalItems = list.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / size));

    // Giữ trang hiện tại nằm trong khoảng hợp lệ
    const page = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);

    const start = (page - 1) * size;
    const end = start + size;

    return {
        items: list.slice(start, end),
        page,
        totalPages,
        totalItems,
        pageSize: size,
        from: totalItems === 0 ? 0 : start + 1,
        to: Math.min(end, totalItems),
        hasPrev: page > 1,
        hasNext: page < totalPages
    };
}

/**
 * Tính danh sách số trang cần hiển thị (chèn dấu "..." khi trang quá nhiều)
 * @param {number} currentPage Trang hiện tại
 * @param {number} totalPages Tổng số trang
 * @param {number} maxButtons Số nút trang tối đa hiển thị
 * @returns {Array<number|string>} Mảng gồm số trang và chuỗi '...'
 */
export function getPageNumbers(currentPage, totalPages, maxButtons = 5) {
    if (totalPages <= 1) return [1];

    const half = Math.floor(maxButtons / 2);
    let start = Math.max(2, currentPage - half + 1);
    let end = Math.min(totalPages - 1, currentPage + half);

    // Bù lại số lượng nút khi trang hiện tại nằm sát mép đầu/cuối
    if (end - start + 1 < maxButtons - 2) {
        if (start === 2) {
            end = Math.min(totalPages - 1, maxButtons - 1);
        } else {
            start = Math.max(2, totalPages - (maxButtons - 2) + 1);
        }
    }

    const pages = [1];
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);

    return pages;
}

/**
 * Dựng HTML cho thanh phân trang
 * @param {Object} options { page, totalPages, totalItems, from, to, unit, pageSize, sizeOptions }
 * @returns {string} Chuỗi HTML
 */
export function buildPaginationHtml(options = {}) {
    const {
        page = 1,
        totalPages = 1,
        totalItems = 0,
        from = 0,
        to = 0,
        unit = 'bản ghi',
        pageSize = DEFAULT_PAGE_SIZE,
        sizeOptions = PAGE_SIZE_OPTIONS
    } = options;

    if (totalItems === 0) return '';

    const pages = getPageNumbers(page, totalPages);

    const sizeSelect = sizeOptions && sizeOptions.length > 0
        ? `
            <label class="pagination-size-label">
                <span>Hiển thị</span>
                <select class="pagination-size-select" data-role="page-size" aria-label="Số bản ghi mỗi trang">
                    ${sizeOptions.map(size => `
                        <option value="${size}" ${Number(size) === Number(pageSize) ? 'selected' : ''}>${size}</option>
                    `).join('')}
                </select>
                <span>bản ghi / trang</span>
            </label>
        `
        : '';

    const pageButtons = pages.map(p => {
        if (p === '...') {
            return '<span class="pagination-ellipsis">…</span>';
        }
        const isActive = Number(p) === Number(page);
        return `
            <button type="button" class="pagination-btn${isActive ? ' active' : ''}" data-page="${p}" ${isActive ? 'aria-current="page"' : ''}>${p}</button>
        `;
    }).join('');

    return `
        <div class="pagination-bar">
            <div class="pagination-meta">
                <span class="pagination-info">
                    Hiển thị <strong>${from}-${to}</strong> / <strong>${totalItems}</strong> ${unit}
                </span>
                ${sizeSelect}
            </div>
            <div class="pagination-controls">
                <button type="button" class="pagination-btn pagination-prev" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Trang trước">‹</button>
                ${pageButtons}
                <button type="button" class="pagination-btn pagination-next" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} aria-label="Trang sau">›</button>
            </div>
        </div>
    `;
}

/**
 * Render thanh phân trang vào container
 * @param {HTMLElement} container Phần tử chứa thanh phân trang
 * @param {Object} options Xem thêm ở buildPaginationHtml
 * @returns {string} Chuỗi HTML đã render
 */
export function renderPagination(container, options = {}) {
    const html = buildPaginationHtml(options);
    if (container) {
        container.innerHTML = html;
    }
    return html;
}
