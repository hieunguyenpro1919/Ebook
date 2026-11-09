import { productService } from '../services/productService.js';
import { categoryService } from '../services/categoryService.js';
import { orderService } from '../services/orderService.js';
import { authService } from '../services/authService.js';
import { saleService } from '../services/saleService.js';
import { formatPrice } from '../utils/format.js';
import { paginate, renderPagination, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../utils/pagination.js';
import './themeToggle.js';

// 1. Kiểm tra quyền truy cập Quản trị viên
const currentUser = authService.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    alert('⚠️ Bạn cần đăng nhập bằng tài khoản Quản trị viên để truy cập trang này!');
    window.location.href = './login.html';
}

// State quản lý toàn bộ hệ thống
let allCategories = [];
let allBooks = [];
let allOrders = [];
let allUsers = [];
let currentSaleConfig = null;

// State phân trang (client-side) cho từng bảng dữ liệu
let booksPage = 1;
let booksPageSize = DEFAULT_PAGE_SIZE;
let ordersPage = 1;
let ordersPageSize = DEFAULT_PAGE_SIZE;
let usersPage = 1;
let usersPageSize = DEFAULT_PAGE_SIZE;
let salesPage = 1;
let salesPageSize = DEFAULT_PAGE_SIZE;

// Lưu lại kết quả lọc hiện tại để phân trang gọi lại được mà không cần lọc lại từ đầu
let filteredBooks = [];
let filteredOrders = [];
let filteredUsers = [];
let filteredSales = [];

// DOM Elements: Thống kê & Tabs
const statTotalBooks = document.querySelector('#statTotalBooks');
const statTotalStock = document.querySelector('#statTotalStock');
const statTotalOrders = document.querySelector('#statTotalOrders');
const statPendingOrders = document.querySelector('#statPendingOrders');
const statTotalRevenue = document.querySelector('#statTotalRevenue');
const statCompletedRevenue = document.querySelector('#statCompletedRevenue');
const statLowStock = document.querySelector('#statLowStock');
const statOutStock = document.querySelector('#statOutStock');

const booksTabCount = document.querySelector('#booksTabCount');
const ordersTabCount = document.querySelector('#ordersTabCount');
const categoriesTabCount = document.querySelector('#categoriesTabCount');
const usersTabCount = document.querySelector('#usersTabCount');
const salesTabCount = document.querySelector('#salesTabCount');

// Bảng dữ liệu
const booksTableBody = document.querySelector('#booksTableBody');
const ordersTableBody = document.querySelector('#ordersTableBody');
const categoriesTableBody = document.querySelector('#categoriesTableBody');
const usersTableBody = document.querySelector('#usersTableBody');
const salesTableBody = document.querySelector('#salesTableBody');

// Container chứa thanh phân trang của từng bảng
const booksPagination = document.querySelector('#booksPagination');
const ordersPagination = document.querySelector('#ordersPagination');
const usersPagination = document.querySelector('#usersPagination');
const salesPagination = document.querySelector('#salesPagination');

// Tìm kiếm & Bộ lọc
const searchBookInput = document.querySelector('#searchBookInput');
const filterBookCategory = document.querySelector('#filterBookCategory');
const filterBookStock = document.querySelector('#filterBookStock');
const searchOrderAdminInput = document.querySelector('#searchOrderAdminInput');
const filterOrderStatusSelect = document.querySelector('#filterOrderStatusSelect');
const searchCategoryInput = document.querySelector('#searchCategoryInput');
const searchUserInput = document.querySelector('#searchUserInput');
const searchSaleBookInput = document.querySelector('#searchSaleBookInput');
const filterSaleStatus = document.querySelector('#filterSaleStatus');
const saleEligibleCount = document.querySelector('#saleEligibleCount');

// Elements Cấu hình Sale & Flash Sale Realtime
const saleStatusIndicator = document.querySelector('#saleStatusIndicator');
const adminSaleLivePanel = document.querySelector('#adminSaleLivePanel');
const adminLiveTitle = document.querySelector('#adminLiveTitle');
const adminLiveTimeRange = document.querySelector('#adminLiveTimeRange');
const adminLiveClock = document.querySelector('#adminLiveClock');
const adminLiveDesc = document.querySelector('#adminLiveDesc');
const customDurationHours = document.querySelector('#customDurationHours');
const btnStartQuickSale = document.querySelector('#btnStartQuickSale');
const btnStopSale = document.querySelector('#btnStopSale');
const btnPresetHoursList = document.querySelectorAll('.btn-preset-hours');
let adminLiveCountdownTimer = null;

const saleCampaignForm = document.querySelector('#saleCampaignForm');
const campaignNameInput = document.querySelector('#campaignName');
const campaignStartDateInput = document.querySelector('#campaignStartDate');
const campaignEndDateInput = document.querySelector('#campaignEndDate');
const campaignDescriptionInput = document.querySelector('#campaignDescription');
const campaignIsActiveInput = document.querySelector('#campaignIsActive');

// Modal Sách
const bookModal = document.querySelector('#bookModal');
const bookModalTitle = document.querySelector('#bookModalTitle');
const bookForm = document.querySelector('#bookForm');
const bookIdInput = document.querySelector('#bookId');
const bookNameInput = document.querySelector('#bookName');
const bookAuthorInput = document.querySelector('#bookAuthor');
const bookCategoryIdInput = document.querySelector('#bookCategoryId');
const bookPriceInput = document.querySelector('#bookPrice');
const bookOnSaleInput = document.querySelector('#bookOnSale');
const bookDiscountPercentInput = document.querySelector('#bookDiscountPercent');
const bookStockInput = document.querySelector('#bookStock');
const bookImageInput = document.querySelector('#bookImage');
const bookDescriptionInput = document.querySelector('#bookDescription');
const btnOpenAddBookModal = document.querySelector('#btnOpenAddBookModal');
const btnCancelBookModal = document.querySelector('#btnCancelBookModal');

// Modal Nhập kho nhanh
const restockModal = document.querySelector('#restockModal');
const restockForm = document.querySelector('#restockForm');
const restockBookId = document.querySelector('#restockBookId');
const restockBookName = document.querySelector('#restockBookName');
const restockCurrentStock = document.querySelector('#restockCurrentStock');
const restockAmount = document.querySelector('#restockAmount');
const btnCancelRestockModal = document.querySelector('#btnCancelRestockModal');

// Modal Chi tiết Đơn hàng
const orderDetailModal = document.querySelector('#orderDetailModal');
const detailOrderCode = document.querySelector('#detailOrderCode');
const detailOrderStatusBadge = document.querySelector('#detailOrderStatusBadge');
const detailReceiverName = document.querySelector('#detailReceiverName');
const detailReceiverPhone = document.querySelector('#detailReceiverPhone');
const detailReceiverAddress = document.querySelector('#detailReceiverAddress');
const detailPaymentMethod = document.querySelector('#detailPaymentMethod');
const detailOrderDate = document.querySelector('#detailOrderDate');
const detailOrderItemsList = document.querySelector('#detailOrderItemsList');
const detailOrderTotal = document.querySelector('#detailOrderTotal');
const btnCloseOrderDetailModal = document.querySelector('#btnCloseOrderDetailModal');

// Modal Thể loại
const categoryModal = document.querySelector('#categoryModal');
const categoryModalTitle = document.querySelector('#categoryModalTitle');
const categoryForm = document.querySelector('#categoryForm');
const categoryIdInput = document.querySelector('#categoryIdInput');
const categoryNameInput = document.querySelector('#categoryNameInput');
const categoryIconInput = document.querySelector('#categoryIconInput');
const btnOpenAddCategoryModal = document.querySelector('#btnOpenAddCategoryModal');
const btnCancelCategoryModal = document.querySelector('#btnCancelCategoryModal');

const btnAdminLogout = document.querySelector('#btnAdminLogout');

// 1.1 Tiện ích phân trang dùng chung cho các bảng dữ liệu
/**
 * Gắn sự kiện click / đổi kích thước trang cho một thanh phân trang
 * @param {HTMLElement} container Thẻ chứa thanh phân trang
 * @param {Object} handlers { getPage, setPage, getPageSize, setPageSize, rerender }
 */
function setupPagination(container, handlers) {
    if (!container) return;

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.pagination-btn');
        if (!btn || btn.disabled) return;

        const targetPage = Number(btn.dataset.page);
        if (!Number.isFinite(targetPage) || targetPage < 1) return;

        handlers.setPage(targetPage);
        handlers.rerender();
    });

    container.addEventListener('change', (e) => {
        const select = e.target.closest('.pagination-size-select');
        if (!select) return;

        const newSize = Number(select.value) || DEFAULT_PAGE_SIZE;
        handlers.setPageSize(newSize);
        handlers.setPage(1);
        handlers.rerender();
    });
}

/**
 * Dựng thanh phân trang từ kết quả phân trang
 * @param {HTMLElement} container
 * @param {Object} result Kết quả từ hàm paginate()
 * @param {number} pageSize Số bản ghi / trang đang dùng
 * @param {string} unit Đơn vị hiển thị (vd: "cuốn sách")
 */
function drawPagination(container, result, pageSize, unit) {
    if (!container) return;
    renderPagination(container, {
        page: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        from: result.from,
        to: result.to,
        unit,
        pageSize,
        sizeOptions: PAGE_SIZE_OPTIONS
    });
}

// 2. Chuyển đổi Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.dataset.tab;
        const targetPanel = document.querySelector(`#${targetId}`);
        if (targetPanel) targetPanel.classList.add('active');
    });
});

// 3. Đăng xuất Admin
if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn đăng xuất khỏi trang Quản trị?')) {
            authService.logout();
            window.location.href = './login.html';
        }
    });
}

// 4. Cập nhật Thống kê toàn diện (Dashboard Stats)
function updateStats() {
    // A. Sách & Tồn kho
    const totalBooks = allBooks.length;
    const totalStock = allBooks.reduce((sum, b) => sum + Number(b.stock !== undefined ? b.stock : 0), 0);
    const lowStockBooks = allBooks.filter(b => Number(b.stock || 0) > 0 && Number(b.stock || 0) < 10).length;
    const outOfStockBooks = allBooks.filter(b => Number(b.stock || 0) <= 0).length;

    if (statTotalBooks) statTotalBooks.textContent = `${totalBooks} đầu sách`;
    if (statTotalStock) statTotalStock.textContent = `Tổng tồn: ${totalStock.toLocaleString()} cuốn`;
    if (booksTabCount) booksTabCount.textContent = totalBooks;

    // B. Đơn hàng
    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(o => (o.status || '').toLowerCase().includes('chờ') || (o.status || '').toLowerCase().includes('đang')).length;
    if (statTotalOrders) statTotalOrders.textContent = `${totalOrders} đơn`;
    if (statPendingOrders) statPendingOrders.textContent = `Chờ/đang giao: ${pendingOrders} đơn`;
    if (ordersTabCount) ordersTabCount.textContent = totalOrders;

    // C. Doanh thu
    const completedOrders = allOrders.filter(o => 
        (o.status || '').toLowerCase().includes('hoàn thành') || 
        (o.status || '').toLowerCase().includes('đã thanh toán')
    );
    const revenue = completedOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    if (statTotalRevenue) statTotalRevenue.textContent = formatPrice(revenue);
    if (statCompletedRevenue) statCompletedRevenue.textContent = `Từ ${completedOrders.length} đơn hoàn thành`;

    // D. Cảnh báo kho
    if (statLowStock) statLowStock.textContent = `${lowStockBooks + outOfStockBooks} sách cần nhập`;
    if (statOutStock) statOutStock.textContent = `Hết hàng: ${outOfStockBooks} | Sắp hết: ${lowStockBooks}`;

    // E. Thể loại & User
    if (categoriesTabCount) categoriesTabCount.textContent = allCategories.length;
    if (usersTabCount) usersTabCount.textContent = allUsers.length;
}

// 5. Quản lý Kho sách (Render & Filter)
function renderBooks(books) {
    if (!booksTableBody) return;

    // Lưu lại kết quả lọc hiện tại để thanh phân trang gọi lại được
    filteredBooks = Array.isArray(books) ? books : [];

    const pageData = paginate(filteredBooks, booksPage, booksPageSize);

    if (!filteredBooks || filteredBooks.length === 0) {
        booksTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 32px; color: #94a3b8;">
                    Không tìm thấy cuốn sách nào phù hợp với bộ lọc.
                </td>
            </tr>
        `;
        drawPagination(booksPagination, pageData, booksPageSize, 'cuốn sách');
        return;
    }

    booksTableBody.innerHTML = pageData.items.map(book => {
        const cat = allCategories.find(c => Number(c.id) === Number(book.categoryId));
        const catName = cat ? cat.name : 'Khác';
        const stock = book.stock !== undefined ? Number(book.stock) : 0;

        let stockBadgeHtml = '';
        if (stock <= 0) {
            stockBadgeHtml = `<span class="badge-stock out-of-stock">⚠️ Hết hàng (0)</span>`;
        } else if (stock < 10) {
            stockBadgeHtml = `<span class="badge-stock low-stock">⚡ Chỉ còn ${stock} cuốn</span>`;
        } else {
            stockBadgeHtml = `<span class="badge-stock in-stock">✓ ${stock} cuốn</span>`;
        }

        return `
            <tr>
                <td><strong>#${book.id}</strong></td>
                <td>
                    <div class="book-cell">
                        <img src="${book.image}" alt="${book.name}">
                        <div class="book-cell-info">
                            <strong>${book.name}</strong>
                            <span>Tác giả: ${book.author || 'Chưa rõ'}</span>
                        </div>
                    </div>
                </td>
                <td><span class="admin-cat-pill">${catName}</span></td>
                <td><strong class="admin-price-text">${formatPrice(book.price)}</strong></td>
                <td>${stockBadgeHtml}</td>
                <td style="text-align: right;">
                    <div class="action-btns" style="justify-content: flex-end;">
                        <button type="button" class="btn-action restock btn-open-restock" data-id="${book.id}" data-name="${book.name}" data-stock="${stock}" title="Nhập thêm hàng vào kho">
                            📥 Nhập kho
                        </button>
                        <button type="button" class="btn-action edit btn-edit-book" data-id="${book.id}" title="Sửa thông tin sách">
                            ✏️ Sửa
                        </button>
                        <button type="button" class="btn-action delete btn-delete-book" data-id="${book.id}" title="Xóa sách">
                            🗑️ Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    drawPagination(booksPagination, pageData, booksPageSize, 'cuốn sách');
}

// Bộ lọc sách kết hợp (Tìm kiếm + Thể loại + Tồn kho)
function applyBooksFilter(resetPage = true) {
    const query = (searchBookInput?.value || '').trim().toLowerCase();
    const catId = filterBookCategory?.value;
    const stockStatus = filterBookStock?.value;

    const filtered = allBooks.filter(book => {
        const matchesQuery = !query || 
            (book.name || '').toLowerCase().includes(query) || 
            (book.author || '').toLowerCase().includes(query);

        const matchesCat = !catId || Number(book.categoryId) === Number(catId);

        const stock = book.stock !== undefined ? Number(book.stock) : 0;
        let matchesStock = true;
        if (stockStatus === 'in_stock') matchesStock = stock >= 10;
        if (stockStatus === 'low_stock') matchesStock = stock > 0 && stock < 10;
        if (stockStatus === 'out_of_stock') matchesStock = stock <= 0;

        return matchesQuery && matchesCat && matchesStock;
    });

    // Thay đổi bộ lọc -> luôn quay về trang đầu tiên
    if (resetPage) booksPage = 1;
    renderBooks(filtered);
}

if (searchBookInput) searchBookInput.addEventListener('input', applyBooksFilter);
if (filterBookCategory) filterBookCategory.addEventListener('change', applyBooksFilter);
if (filterBookStock) filterBookStock.addEventListener('change', applyBooksFilter);

// Phân trang bảng Kho sách
setupPagination(booksPagination, {
    getPage: () => booksPage,
    setPage: (p) => { booksPage = p; },
    getPageSize: () => booksPageSize,
    setPageSize: (s) => { booksPageSize = s; },
    rerender: () => renderBooks(filteredBooks)
});

// Sự kiện trên bảng sách (Sửa, Xóa, Nhập kho)
if (booksTableBody) {
    booksTableBody.addEventListener('click', async (e) => {
        // 1. Nhập thêm hàng (Quick Restock)
        const btnRestock = e.target.closest('.btn-open-restock');
        if (btnRestock) {
            const id = btnRestock.dataset.id;
            const name = btnRestock.dataset.name;
            const stock = btnRestock.dataset.stock;

            restockBookId.value = id;
            restockBookName.textContent = name;
            restockCurrentStock.textContent = stock;
            restockAmount.value = 20;
            restockModal.classList.add('active');
            return;
        }

        // 2. Xóa sách
        const btnDelete = e.target.closest('.btn-delete-book');
        if (btnDelete) {
            const id = btnDelete.dataset.id;
            const book = allBooks.find(b => Number(b.id) === Number(id));
            if (confirm(`Bạn có chắc muốn xóa cuốn sách "${book?.name || id}" khỏi kho?`)) {
                try {
                    await productService.delete(id);
                    allBooks = allBooks.filter(b => Number(b.id) !== Number(id));
                    applyBooksFilter(false);
                    updateStats();
                    alert('✓ Đã xóa sách thành công.');
                } catch (err) {
                    console.error('Lỗi khi xóa sách:', err);
                    alert('Không thể xóa sách khỏi server.');
                }
            }
            return;
        }

        // 3. Sửa sách
        const btnEdit = e.target.closest('.btn-edit-book');
        if (btnEdit) {
            const id = btnEdit.dataset.id;
            const book = allBooks.find(b => Number(b.id) === Number(id));
            if (!book) return;

            bookModalTitle.textContent = `Chỉnh sửa sách: ${book.name}`;
            bookIdInput.value = book.id;
            bookNameInput.value = book.name;
            bookAuthorInput.value = book.author || '';
            bookCategoryIdInput.value = book.categoryId;
            bookPriceInput.value = book.price;
            if (bookOnSaleInput) bookOnSaleInput.checked = book.onSale === true;
            if (bookDiscountPercentInput) bookDiscountPercentInput.value = book.discountPercent !== undefined ? book.discountPercent : 0;
            bookStockInput.value = book.stock !== undefined ? book.stock : 50;
            bookImageInput.value = book.image;
            bookDescriptionInput.value = book.description || '';

            bookModal.classList.add('active');
        }
    });
}

// Xử lý Quick Restock Form
if (restockForm) {
    // Các nút chọn nhanh +10, +20, +50, +100
    document.querySelectorAll('.btn-quick-amount').forEach(btn => {
        btn.addEventListener('click', () => {
            const add = Number(btn.dataset.add);
            restockAmount.value = add;
        });
    });

    if (btnCancelRestockModal) {
        btnCancelRestockModal.addEventListener('click', () => {
            restockModal.classList.remove('active');
        });
    }

    restockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = restockBookId.value;
        const addQuantity = Number(restockAmount.value);

        const book = allBooks.find(b => Number(b.id) === Number(id));
        if (!book) return;

        const newStock = (Number(book.stock) || 0) + addQuantity;

        try {
            await productService.updateStock(id, newStock);
            book.stock = newStock;
            restockModal.classList.remove('active');
            applyBooksFilter(false);
            updateStats();
            alert(`✓ Đã nhập thêm ${addQuantity} cuốn vào kho! Tồn kho hiện tại: ${newStock} cuốn.`);
        } catch (err) {
            console.error('Lỗi khi nhập kho:', err);
            alert('Không thể cập nhật số lượng tồn kho. Vui lòng thử lại!');
        }
    });
}

// Modal Thêm / Sửa sách
if (btnOpenAddBookModal) {
    btnOpenAddBookModal.addEventListener('click', () => {
        bookModalTitle.textContent = '➕ Thêm sách mới vào kho';
        bookForm.reset();
        bookIdInput.value = '';
        if (bookOnSaleInput) bookOnSaleInput.checked = false;
        if (bookDiscountPercentInput) bookDiscountPercentInput.value = 0;
        bookStockInput.value = 50;
        bookModal.classList.add('active');
    });
}

if (btnCancelBookModal) {
    btnCancelBookModal.addEventListener('click', () => {
        bookModal.classList.remove('active');
    });
}

if (bookForm) {
    bookForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = bookIdInput.value;
        const bookData = {
            name: bookNameInput.value.trim(),
            author: bookAuthorInput.value.trim(),
            categoryId: Number(bookCategoryIdInput.value),
            price: Number(bookPriceInput.value),
            onSale: bookOnSaleInput ? bookOnSaleInput.checked : false,
            discountPercent: bookDiscountPercentInput ? Math.min(90, Math.max(0, Number(bookDiscountPercentInput.value) || 0)) : 0,
            stock: Number(bookStockInput.value),
            image: bookImageInput.value.trim(),
            description: bookDescriptionInput.value.trim()
        };

        try {
            if (id) {
                const updated = await productService.update(id, { id: Number(id), ...bookData });
                const index = allBooks.findIndex(b => Number(b.id) === Number(id));
                if (index > -1) allBooks[index] = updated;
                alert('✓ Đã cập nhật thông tin sách và số lượng tồn kho thành công!');
            } else {
                const created = await productService.create(bookData);
                allBooks.push(created);
                alert('✓ Đã thêm sách mới vào kho thành công!');
            }

            bookModal.classList.remove('active');
            applyBooksFilter(false);
            applySaleBooksFilter(false);
            updateStats();
        } catch (err) {
            console.error('Lỗi khi lưu sách:', err);
            alert('Không thể lưu sách. Vui lòng kiểm tra lại kết nối.');
        }
    });
}

// 6. Quản lý Đơn hàng (Render, Filter & Actions)
function renderOrders(orders) {
    if (!ordersTableBody) return;

    // Lưu lại kết quả lọc hiện tại để thanh phân trang gọi lại được
    filteredOrders = Array.isArray(orders) ? orders : [];

    const sorted = [...filteredOrders].reverse();
    const pageData = paginate(sorted, ordersPage, ordersPageSize);

    if (!filteredOrders || filteredOrders.length === 0) {
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 32px; color: #94a3b8;">
                    Không tìm thấy đơn hàng nào.
                </td>
            </tr>
        `;
        drawPagination(ordersPagination, pageData, ordersPageSize, 'đơn hàng');
        return;
    }

    ordersTableBody.innerHTML = pageData.items.map(order => {
        const items = order.items || [];
        const totalItems = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
        const date = new Date(order.createdAt).toLocaleString('vi-VN', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
        });

        const statusOptions = [
            'Chờ xác nhận (COD)',
            'Đã thanh toán (VietQR)',
            'Đang giao hàng',
            'Hoàn thành',
            'Đã hủy'
        ];

        const optionsHtml = statusOptions.map(opt => `
            <option value="${opt}" ${order.status === opt ? 'selected' : ''}>${opt}</option>
        `).join('');

        const isCompleted = order.status === 'Hoàn thành' || (order.status || '').toLowerCase().includes('hoàn thành');
        const actionCompleteHtml = isCompleted 
            ? `<span class="badge-order-complete-done">✓ Hoàn thành</span>`
            : `<button type="button" class="btn-action complete btn-complete-order" data-order-id="${order.id}" data-order-code="${order.orderCode}" title="Xác nhận hoàn thành đơn hàng">✓ Hoàn thành</button>`;

        return `
            <tr>
                <td><strong style="color: #4f46e5;">#${order.orderCode}</strong></td>
                <td><span style="font-size: 0.85rem; color: #64748b;">${date}</span></td>
                <td>
                    <strong>${order.receiverName}</strong>
                    <div style="font-size: 0.8rem; color: #94a3b8;">${order.receiverPhone}</div>
                </td>
                <td><strong>${totalItems}</strong> cuốn</td>
                <td><strong style="color: #dc2626;">${formatPrice(order.totalAmount)}</strong></td>
                <td>
                    <select class="select-status" data-order-id="${order.id}">
                        ${optionsHtml}
                    </select>
                </td>
                <td style="text-align: right;">
                    <div class="action-btns" style="justify-content: flex-end;">
                        <button type="button" class="btn-action view btn-view-order-detail" data-order-id="${order.id}" title="Xem chi tiết đơn hàng">
                            👁️ Chi tiết
                        </button>
                        ${actionCompleteHtml}
                        <button class="btn-action delete btn-delete-order" data-order-id="${order.id}" title="Xóa đơn hàng">
                            🗑️ Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    drawPagination(ordersPagination, pageData, ordersPageSize, 'đơn hàng');
}

function applyOrdersFilter(resetPage = true) {
    const query = (searchOrderAdminInput?.value || '').trim().toLowerCase();
    const status = filterOrderStatusSelect?.value;

    const filtered = allOrders.filter(order => {
        const matchesQuery = !query ||
            (order.orderCode || '').toLowerCase().includes(query) ||
            (order.receiverPhone || '').toLowerCase().includes(query) ||
            (order.receiverName || '').toLowerCase().includes(query);

        const matchesStatus = !status || order.status === status;

        return matchesQuery && matchesStatus;
    });

    // Thay đổi bộ lọc -> luôn quay về trang đầu tiên
    if (resetPage) ordersPage = 1;
    renderOrders(filtered);
}

if (searchOrderAdminInput) searchOrderAdminInput.addEventListener('input', applyOrdersFilter);
if (filterOrderStatusSelect) filterOrderStatusSelect.addEventListener('change', applyOrdersFilter);

// Phân trang bảng Đơn hàng
setupPagination(ordersPagination, {
    getPage: () => ordersPage,
    setPage: (p) => { ordersPage = p; },
    getPageSize: () => ordersPageSize,
    setPageSize: (s) => { ordersPageSize = s; },
    rerender: () => renderOrders(filteredOrders)
});

// Sự kiện Bảng Đơn hàng
if (ordersTableBody) {
    ordersTableBody.addEventListener('change', async (e) => {
        if (e.target.classList.contains('select-status')) {
            const orderId = e.target.dataset.orderId;
            const newStatus = e.target.value;

            try {
                await orderService.updateStatus(orderId, newStatus);
                const order = allOrders.find(o => Number(o.id) === Number(orderId));
                if (order) order.status = newStatus;
                applyOrdersFilter(false);
                updateStats();
                alert(`✓ Đã cập nhật trạng thái đơn hàng #${order?.orderCode} thành: "${newStatus}"`);
            } catch (err) {
                console.error('Lỗi khi cập nhật trạng thái đơn:', err);
                alert('Không thể cập nhật trạng thái đơn hàng.');
            }
        }
    });

    ordersTableBody.addEventListener('click', async (e) => {
        // 1. Xem chi tiết đơn hàng
        const btnView = e.target.closest('.btn-view-order-detail');
        if (btnView) {
            const orderId = btnView.dataset.orderId;
            const order = allOrders.find(o => Number(o.id) === Number(orderId));
            if (!order) return;

            detailOrderCode.textContent = `#${order.orderCode}`;
            detailOrderStatusBadge.textContent = `● ${order.status}`;
            detailReceiverName.textContent = order.receiverName;
            detailReceiverPhone.textContent = order.receiverPhone;
            detailReceiverAddress.textContent = order.receiverAddress;
            detailPaymentMethod.textContent = order.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR' : 'Thanh toán khi nhận hàng (COD)';
            detailOrderDate.textContent = new Date(order.createdAt).toLocaleString('vi-VN');
            detailOrderTotal.textContent = formatPrice(order.totalAmount);

            const items = order.items || [];
            detailOrderItemsList.innerHTML = items.map(item => `
                <div class="order-detail-item-row">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${item.image}" style="width: 36px; height: 48px; object-fit: cover; border-radius: 4px;">
                        <div>
                            <div style="font-weight: 700; font-size: 0.9rem;">${item.name}</div>
                            <div style="font-size: 0.8rem; color: #64748b;">Số lượng: x${item.quantity} &bull; Đơn giá: ${formatPrice(item.price)}</div>
                        </div>
                    </div>
                    <div class="admin-price-text" style="font-weight: 700;">${formatPrice(item.price * item.quantity)}</div>
                </div>
            `).join('');

            orderDetailModal.classList.add('active');
            return;
        }

        // 2. Xác nhận hoàn thành đơn
        const btnComplete = e.target.closest('.btn-complete-order');
        if (btnComplete) {
            const orderId = btnComplete.dataset.orderId;
            const orderCode = btnComplete.dataset.orderCode;

            if (confirm(`Bạn muốn xác nhận HOÀN THÀNH cho đơn hàng #${orderCode}?`)) {
                try {
                    await orderService.updateStatus(orderId, 'Hoàn thành');
                    const order = allOrders.find(o => Number(o.id) === Number(orderId));
                    if (order) order.status = 'Hoàn thành';
                    applyOrdersFilter(false);
                    updateStats();
                    alert(`✓ Đã xác nhận hoàn thành đơn hàng #${orderCode}!`);
                } catch (err) {
                    console.error('Lỗi khi hoàn thành đơn:', err);
                    alert('Không thể cập nhật trạng thái đơn hàng.');
                }
            }
            return;
        }

        // 3. Xóa đơn hàng
        const btnDelete = e.target.closest('.btn-delete-order');
        if (btnDelete) {
            const orderId = btnDelete.dataset.orderId;
            if (confirm(`Bạn có chắc muốn xóa đơn hàng này khỏi hệ thống?`)) {
                try {
                    await orderService.deleteOrder(orderId);
                    allOrders = allOrders.filter(o => Number(o.id) !== Number(orderId));
                    applyOrdersFilter(false);
                    updateStats();
                    alert('✓ Đã xóa đơn hàng thành công!');
                } catch (err) {
                    console.error('Lỗi khi xóa đơn hàng:', err);
                    alert('Không thể xóa đơn hàng.');
                }
            }
        }
    });
}

if (btnCloseOrderDetailModal) {
    btnCloseOrderDetailModal.addEventListener('click', () => {
        orderDetailModal.classList.remove('active');
    });
}

// 7. Quản lý Thể loại sách (Tab Categories)
function renderCategories(categories) {
    if (!categoriesTableBody) return;

    if (!categories || categories.length === 0) {
        categoriesTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">
                    Chưa có thể loại nào.
                </td>
            </tr>
        `;
        return;
    }

    categoriesTableBody.innerHTML = categories.map(cat => {
        const countBooks = allBooks.filter(b => Number(b.categoryId) === Number(cat.id)).length;

        return `
            <tr>
                <td><strong>#${cat.id}</strong></td>
                <td><span style="font-size: 1.5rem;">${cat.icon || '📖'}</span></td>
                <td><strong>${cat.name}</strong></td>
                <td><span style="font-weight: 700; color: #4f46e5;">${countBooks}</span> tựa sách</td>
                <td style="text-align: right;">
                    <div class="action-btns" style="justify-content: flex-end;">
                        <button type="button" class="btn-action edit btn-edit-category" data-id="${cat.id}" data-name="${cat.name}" data-icon="${cat.icon || '📖'}" title="Sửa thể loại">
                            ✏️ Sửa
                        </button>
                        <button type="button" class="btn-action delete btn-delete-category" data-id="${cat.id}" data-name="${cat.name}" data-count="${countBooks}" title="Xóa thể loại">
                            🗑️ Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

if (searchCategoryInput) {
    searchCategoryInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        const filtered = allCategories.filter(c => (c.name || '').toLowerCase().includes(query));
        renderCategories(filtered);
    });
}

if (btnOpenAddCategoryModal) {
    btnOpenAddCategoryModal.addEventListener('click', () => {
        categoryModalTitle.textContent = '➕ Thêm thể loại mới';
        categoryForm.reset();
        categoryIdInput.value = '';
        categoryModal.classList.add('active');
    });
}

if (btnCancelCategoryModal) {
    btnCancelCategoryModal.addEventListener('click', () => {
        categoryModal.classList.remove('active');
    });
}

if (categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = categoryIdInput.value;
        const catData = {
            name: categoryNameInput.value.trim(),
            icon: categoryIconInput.value.trim() || '📖'
        };

        try {
            if (id) {
                const updated = await categoryService.update(id, { id: Number(id), ...catData });
                const index = allCategories.findIndex(c => Number(c.id) === Number(id));
                if (index > -1) allCategories[index] = updated;
                alert('✓ Đã cập nhật thể loại thành công!');
            } else {
                const created = await categoryService.create(catData);
                allCategories.push(created);
                alert('✓ Đã thêm thể loại mới thành công!');
            }

            categoryModal.classList.remove('active');
            renderCategories(allCategories);
            updateCategoriesSelect();
            updateStats();
        } catch (err) {
            console.error('Lỗi khi lưu thể loại:', err);
            alert('Không thể lưu thể loại. Vui lòng kiểm tra lại!');
        }
    });
}

if (categoriesTableBody) {
    categoriesTableBody.addEventListener('click', async (e) => {
        // Sửa thể loại
        const btnEdit = e.target.closest('.btn-edit-category');
        if (btnEdit) {
            categoryIdInput.value = btnEdit.dataset.id;
            categoryNameInput.value = btnEdit.dataset.name;
            categoryIconInput.value = btnEdit.dataset.icon;
            categoryModalTitle.textContent = `Chỉnh sửa thể loại: ${btnEdit.dataset.name}`;
            categoryModal.classList.add('active');
            return;
        }

        // Xóa thể loại
        const btnDelete = e.target.closest('.btn-delete-category');
        if (btnDelete) {
            const id = btnDelete.dataset.id;
            const name = btnDelete.dataset.name;
            const count = Number(btnDelete.dataset.count);

            if (count > 0) {
                alert(`⚠️ Không thể xóa thể loại "${name}" vì hiện đang có ${count} cuốn sách thuộc thể loại này!`);
                return;
            }

            if (confirm(`Bạn có chắc muốn xóa thể loại "${name}"?`)) {
                try {
                    await categoryService.delete(id);
                    allCategories = allCategories.filter(c => Number(c.id) !== Number(id));
                    renderCategories(allCategories);
                    updateCategoriesSelect();
                    updateStats();
                    alert('✓ Đã xóa thể loại thành công!');
                } catch (err) {
                    console.error('Lỗi khi xóa thể loại:', err);
                    alert('Không thể xóa thể loại.');
                }
            }
        }
    });
}

// 8. Quản lý Người dùng & Khách hàng (Tab Users)
function renderUsers(users) {
    if (!usersTableBody) return;

    // Lưu lại kết quả lọc hiện tại để thanh phân trang gọi lại được
    filteredUsers = Array.isArray(users) ? users : [];

    const pageData = paginate(filteredUsers, usersPage, usersPageSize);

    if (!filteredUsers || filteredUsers.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">
                    Không tìm thấy người dùng nào.
                </td>
            </tr>
        `;
        drawPagination(usersPagination, pageData, usersPageSize, 'người dùng');
        return;
    }

    usersTableBody.innerHTML = pageData.items.map(user => {
        const userOrdersCount = allOrders.filter(o => 
            (o.userId && Number(o.userId) === Number(user.id)) ||
            (o.userEmail && o.userEmail.toLowerCase() === (user.email || '').toLowerCase())
        ).length;

        const roleBadge = user.role === 'admin' 
            ? `<span style="background: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">👑 Quản trị viên</span>`
            : `<span style="background: #e0f2fe; color: #0284c7; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem;">👤 Khách hàng</span>`;

        return `
            <tr>
                <td><strong>#${user.id}</strong></td>
                <td><strong>${user.name || 'Chưa đặt tên'}</strong></td>
                <td><span style="color: #64748b;">${user.email}</span></td>
                <td>${roleBadge}</td>
                <td><strong style="color: #4f46e5;">${userOrdersCount}</strong> đơn</td>
            </tr>
        `;
    }).join('');

    drawPagination(usersPagination, pageData, usersPageSize, 'người dùng');
}

if (searchUserInput) {
    searchUserInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        const filtered = allUsers.filter(u => 
            (u.name || '').toLowerCase().includes(query) || 
            (u.email || '').toLowerCase().includes(query)
        );
        // Thay đổi từ khóa tìm kiếm -> quay về trang đầu tiên
        usersPage = 1;
        renderUsers(filtered);
    });
}

// Phân trang bảng Người dùng
setupPagination(usersPagination, {
    getPage: () => usersPage,
    setPage: (p) => { usersPage = p; },
    getPageSize: () => usersPageSize,
    setPageSize: (s) => { usersPageSize = s; },
    rerender: () => renderUsers(filteredUsers)
});

// Cập nhật các select box thể loại
function updateCategoriesSelect() {
    if (bookCategoryIdInput) {
        bookCategoryIdInput.innerHTML = allCategories.map(cat => `
            <option value="${cat.id}">${cat.icon || '📖'} ${cat.name}</option>
        `).join('');
    }

    if (filterBookCategory) {
        filterBookCategory.innerHTML = `
            <option value="">-- Tất cả thể loại --</option>
            ${allCategories.map(cat => `<option value="${cat.id}">${cat.icon || '📖'} ${cat.name}</option>`).join('')}
        `;
    }
}

// Helper định dạng chuỗi datetime-local input YYYY-MM-DDTHH:mm
function toDatetimeLocalValue(isoOrDateStr) {
    if (!isoOrDateStr) return '';
    try {
        const d = new Date(isoOrDateStr);
        if (isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day}T${h}:${min}`;
    } catch {
        return '';
    }
}

// Helper định dạng ngày giờ hiển thị tiếng Việt
function formatDateTimeVn(isoOrDateStr) {
    if (!isoOrDateStr) return '--:--';
    try {
        const d = new Date(isoOrDateStr);
        if (isNaN(d.getTime())) return String(isoOrDateStr);
        return d.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return String(isoOrDateStr);
    }
}

// ============ 9. QUẢN LÝ SALE & KHUYẾN MÃI ============
function startAdminLiveCountdown(config) {
    if (adminLiveCountdownTimer) {
        clearInterval(adminLiveCountdownTimer);
        adminLiveCountdownTimer = null;
    }

    if (!config) return;

    function tick() {
        const rem = saleService.getTimeRemaining(config);
        const isActive = saleService.isSaleActive(config);

        if (!config.isActive) {
            if (saleStatusIndicator) {
                saleStatusIndicator.innerHTML = '<span class="campaign-status-badge inactive">⚪ Tạm tắt</span>';
            }
            if (adminLiveTitle) adminLiveTitle.textContent = 'CHƯƠNG TRÌNH SALE ĐANG TẮT';
            if (adminLiveClock) adminLiveClock.textContent = '00:00:00';
            if (adminLiveDesc) adminLiveDesc.textContent = 'Chương trình chưa được kích hoạt';
            return;
        }

        if (rem.isExpired) {
            if (saleStatusIndicator) {
                saleStatusIndicator.innerHTML = '<span class="campaign-status-badge ended">🔴 Đã kết thúc</span>';
            }
            if (adminLiveTitle) adminLiveTitle.textContent = 'ĐỢT SALE ĐÃ KẾT THÚC';
            if (adminLiveClock) adminLiveClock.textContent = '00:00:00';
            if (adminLiveDesc) adminLiveDesc.textContent = 'Thời gian Flash Sale đã hết';
            return;
        }

        if (rem.isUpcoming) {
            if (saleStatusIndicator) {
                saleStatusIndicator.innerHTML = '<span class="campaign-status-badge upcoming">🟡 Sắp diễn ra</span>';
            }
            if (adminLiveTitle) adminLiveTitle.textContent = 'SẮP DIỄN RA';
            if (adminLiveClock) adminLiveClock.textContent = rem.formatted;
            if (adminLiveDesc) adminLiveDesc.textContent = 'Chưa đến giờ bắt đầu đợt Sale';
            return;
        }

        // Đang diễn ra Flash Sale
        if (saleStatusIndicator) {
            saleStatusIndicator.innerHTML = '<span class="campaign-status-badge active">🟢 ĐANG DIỄN RA</span>';
        }
        if (adminLiveTitle) adminLiveTitle.textContent = 'ĐỒNG HỒ ĐẾM NGƯỢC REALTIME ĐANG CHẠY';
        if (adminLiveClock) adminLiveClock.textContent = rem.formatted;
        if (adminLiveDesc) adminLiveDesc.textContent = 'Thời gian còn lại của đợt Sale';
    }

    tick();
    adminLiveCountdownTimer = setInterval(tick, 1000);
}

function renderSaleCampaignInfo(config) {
    if (!config) return;
    currentSaleConfig = config;

    if (campaignNameInput) campaignNameInput.value = config.campaignName || '';
    if (campaignStartDateInput) campaignStartDateInput.value = toDatetimeLocalValue(config.startTime || config.startDate);
    if (campaignEndDateInput) campaignEndDateInput.value = toDatetimeLocalValue(config.endTime || config.endDate);
    if (campaignDescriptionInput) campaignDescriptionInput.value = config.description || '';
    if (campaignIsActiveInput) campaignIsActiveInput.checked = config.isActive === true;

    if (adminLiveTimeRange) {
        const startText = formatDateTimeVn(config.startTime || config.startDate);
        const endText = formatDateTimeVn(config.endTime || config.endDate);
        adminLiveTimeRange.textContent = `Bắt đầu: ${startText}  •  Kết thúc: ${endText}`;
    }

    if (customDurationHours && config.durationHours) {
        customDurationHours.value = config.durationHours;
        if (btnStartQuickSale) {
            btnStartQuickSale.textContent = `🚀 Bắt Đầu Đếm Ngược Ngay (${config.durationHours} Tiếng)`;
        }
    }

    // Khởi chạy đồng hồ đếm ngược Realtime trên Admin
    startAdminLiveCountdown(config);
}

function applySaleBooksFilter(resetPage = true) {
    if (!salesTableBody) return;
    const query = searchSaleBookInput ? searchSaleBookInput.value.trim().toLowerCase() : '';
    const statusFilter = filterSaleStatus ? filterSaleStatus.value : '';

    const onSaleCount = allBooks.filter(b => b.onSale === true && Number(b.discountPercent) > 0).length;
    if (saleEligibleCount) saleEligibleCount.textContent = onSaleCount;
    if (salesTabCount) salesTabCount.textContent = onSaleCount;

    const filtered = allBooks.filter(book => {
        const matchQuery = !query || 
            (book.name || '').toLowerCase().includes(query) || 
            (book.author || '').toLowerCase().includes(query);

        let matchStatus = true;
        if (statusFilter === 'on_sale') {
            matchStatus = book.onSale === true && Number(book.discountPercent) > 0;
        } else if (statusFilter === 'not_sale') {
            matchStatus = !book.onSale || Number(book.discountPercent) <= 0;
        }

        return matchQuery && matchStatus;
    });

    // Thay đổi bộ lọc -> luôn quay về trang đầu tiên
    if (resetPage) salesPage = 1;
    renderSalesTable(filtered);
}

function renderSalesTable(books) {
    if (!salesTableBody) return;

    // Lưu lại kết quả lọc hiện tại để thanh phân trang gọi lại được
    filteredSales = Array.isArray(books) ? books : [];

    const pageData = paginate(filteredSales, salesPage, salesPageSize);

    if (!filteredSales || filteredSales.length === 0) {
        salesTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 32px; color: #94a3b8;">
                    Không tìm thấy cuốn sách nào phù hợp với bộ lọc Sale.
                </td>
            </tr>
        `;
        drawPagination(salesPagination, pageData, salesPageSize, 'cuốn sách');
        return;
    }

    salesTableBody.innerHTML = pageData.items.map(book => {
        const isOnSale = book.onSale === true;
        const discount = Number(book.discountPercent) || (isOnSale ? 20 : 0);
        const salePrice = saleService.calculateSalePrice(book.price, discount);

        return `
            <tr data-book-id="${book.id}">
                <td>
                    <img 
                        src="${book.image}" 
                        alt="${book.name}" 
                        style="width: 44px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;"
                        onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80'"
                    >
                </td>
                <td>
                    <strong style="color: #1e293b; display: block; font-size: 0.95rem;">${book.name}</strong>
                    <span style="font-size: 0.8rem; color: #64748b;">${book.author || 'Đang cập nhật'}</span>
                </td>
                <td>
                    <strong style="color: #475569;">${formatPrice(book.price)}</strong>
                </td>
                <td style="text-align: center;">
                    <label style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <input 
                            type="checkbox" 
                            class="sale-row-toggle" 
                            data-id="${book.id}"
                            ${isOnSale ? 'checked' : ''}
                            style="width: 18px; height: 18px; accent-color: #e11d48; cursor: pointer;"
                        >
                        <span class="sale-row-status-text" style="font-size: 0.85rem; font-weight: 700; color: ${isOnSale ? '#e11d48' : '#94a3b8'};">
                            ${isOnSale ? 'BẬT' : 'Tắt'}
                        </span>
                    </label>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input 
                            type="number" 
                            class="sale-discount-input" 
                            data-id="${book.id}"
                            value="${discount}"
                            min="0" 
                            max="90" 
                            step="5"
                        >
                        <span style="font-weight: 700; color: #64748b;">%</span>
                    </div>
                </td>
                <td>
                    <span class="sale-preview-price" id="salePreviewPrice_${book.id}">
                        ${isOnSale && discount > 0 ? formatPrice(salePrice) : '---'}
                    </span>
                </td>
                <td style="text-align: center;">
                    <button type="button" class="btn-save-row-sale" data-id="${book.id}">
                        💾 Lưu
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    drawPagination(salesPagination, pageData, salesPageSize, 'cuốn sách');
}

// Phân trang bảng Quản lý Sale
setupPagination(salesPagination, {
    getPage: () => salesPage,
    setPage: (p) => { salesPage = p; },
    getPageSize: () => salesPageSize,
    setPageSize: (s) => { salesPageSize = s; },
    rerender: () => renderSalesTable(filteredSales)
});

// 1. Bắt sự kiện chọn nhanh thời lượng Flash Sale (2h, 4h, 8h, 12h, 24h)
if (btnPresetHoursList && btnPresetHoursList.length > 0) {
    btnPresetHoursList.forEach(btn => {
        btn.addEventListener('click', () => {
            btnPresetHoursList.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const hours = Number(btn.dataset.hours) || 8;
            if (customDurationHours) customDurationHours.value = hours;
            if (btnStartQuickSale) {
                btnStartQuickSale.textContent = `🚀 Bắt Đầu Đếm Ngược Ngay (${hours} Tiếng)`;
            }
        });
    });
}

if (customDurationHours) {
    customDurationHours.addEventListener('input', () => {
        const h = Number(customDurationHours.value) || 1;
        if (btnStartQuickSale) {
            btnStartQuickSale.textContent = `🚀 Bắt Đầu Đếm Ngược Ngay (${h} Tiếng)`;
        }
    });
}

// 2. Kích hoạt Flash Sale Realtime ngay lập tức (Đếm ngược ngay sau khi bấm)
if (btnStartQuickSale) {
    btnStartQuickSale.addEventListener('click', async () => {
        const hours = Number(customDurationHours?.value) || 8;
        btnStartQuickSale.disabled = true;
        btnStartQuickSale.textContent = '⏳ Đang khởi động Sale...';

        try {
            const campaignTitle = `⚡ Flash Sale Giờ Vàng (${hours} Tiếng)`;
            const campaignDesc = `Ưu đãi giá sốc có hạn trong ngày hôm nay - Đếm ngược ${hours} tiếng!`;
            const updated = await saleService.startQuickSale(hours, campaignTitle, campaignDesc);
            currentSaleConfig = updated;
            renderSaleCampaignInfo(updated);
            alert(`✓ ĐÃ KÍCH HOẠT FLASH SALE ${hours} TIẾNG THÀNH CÔNG!\n\nĐồng hồ đếm ngược bắt đầu chạy ngay lập tức. Trang chủ và chi tiết sản phẩm sẽ áp dụng giá sale thời gian thực.`);
        } catch (err) {
            console.error('Lỗi khi kích hoạt Flash Sale:', err);
            alert('Không thể kích hoạt Flash Sale. Vui lòng thử lại!');
        } finally {
            btnStartQuickSale.disabled = false;
            btnStartQuickSale.textContent = `🚀 Bắt Đầu Đếm Ngược Ngay (${hours} Tiếng)`;
        }
    });
}

// 3. Dừng đợt Sale ngay lập tức
if (btnStopSale) {
    btnStopSale.addEventListener('click', async () => {
        if (!confirm('Bạn có chắc chắn muốn DỪNG đợt Sale ngay lập tức?\n\nToàn bộ giá các cuốn sách sẽ quay trở về giá niêm yết gốc ngay bây giờ.')) {
            return;
        }

        btnStopSale.disabled = true;
        btnStopSale.textContent = '⏳ Đang dừng...';

        try {
            const updated = await saleService.stopSale();
            currentSaleConfig = updated;
            renderSaleCampaignInfo(updated);
            alert('✓ Đã dừng đợt Sale thành công! Hệ thống đã chuyển về giá gốc.');
        } catch (err) {
            console.error('Lỗi khi dừng Sale:', err);
            alert('Không thể dừng Sale. Vui lòng thử lại!');
        } finally {
            btnStopSale.disabled = false;
            btnStopSale.textContent = '⏹️ Dừng Sale Ngay';
        }
    });
}

// 4. Bắt sự kiện lưu Cấu hình đợt Sale Nâng Cao
if (saleCampaignForm) {
    saleCampaignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.querySelector('#btnSaveCampaign');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Đang lưu...';
        }

        const startVal = campaignStartDateInput?.value || '';
        const endVal = campaignEndDateInput?.value || '';

        const newConfig = {
            id: 1,
            campaignName: campaignNameInput.value.trim(),
            startTime: startVal ? new Date(startVal).toISOString() : '',
            endTime: endVal ? new Date(endVal).toISOString() : '',
            startDate: startVal ? startVal.slice(0, 10) : '',
            endDate: endVal ? endVal.slice(0, 10) : '',
            description: campaignDescriptionInput.value.trim(),
            isActive: campaignIsActiveInput.checked
        };

        try {
            const updated = await saleService.updateConfig(newConfig);
            currentSaleConfig = updated;
            renderSaleCampaignInfo(updated);
            alert('✓ Đã cập nhật thành công cấu hình đợt Sale!');
        } catch (err) {
            console.error('Lỗi khi lưu cấu hình Sale:', err);
            alert('Không thể lưu cấu hình đợt Sale. Vui lòng thử lại!');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Lưu Cấu Hình Nâng Cao';
            }
        }
    });
}

// Bắt sự kiện tìm kiếm và lọc sách Sale
if (searchSaleBookInput) {
    searchSaleBookInput.addEventListener('input', applySaleBooksFilter);
}
if (filterSaleStatus) {
    filterSaleStatus.addEventListener('change', applySaleBooksFilter);
}

// Bắt sự kiện trên từng dòng sách trong bảng Sale
if (salesTableBody) {
    // 1. Khi thay đổi checkbox hoặc % giảm giá -> tự động tính lại giá sau Sale
    salesTableBody.addEventListener('input', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;

        const bookId = row.dataset.bookId;
        const book = allBooks.find(b => Number(b.id) === Number(bookId));
        if (!book) return;

        const toggle = row.querySelector('.sale-row-toggle');
        const discountInput = row.querySelector('.sale-discount-input');
        const previewEl = row.querySelector(`#salePreviewPrice_${bookId}`);
        const statusText = row.querySelector('.sale-row-status-text');

        const isOn = toggle ? toggle.checked : false;
        const discountVal = discountInput ? Math.min(90, Math.max(0, Number(discountInput.value) || 0)) : 0;

        if (statusText) {
            statusText.textContent = isOn ? 'BẬT' : 'Tắt';
            statusText.style.color = isOn ? '#e11d48' : '#94a3b8';
        }

        if (previewEl) {
            if (isOn && discountVal > 0) {
                const sPrice = saleService.calculateSalePrice(book.price, discountVal);
                previewEl.textContent = formatPrice(sPrice);
            } else {
                previewEl.textContent = '---';
            }
        }
    });

    // 2. Khi bấm nút "Lưu" từng sản phẩm
    salesTableBody.addEventListener('click', async (e) => {
        const btnSave = e.target.closest('.btn-save-row-sale');
        if (!btnSave) return;

        const id = btnSave.dataset.id;
        const row = btnSave.closest('tr');
        if (!row) return;

        const toggle = row.querySelector('.sale-row-toggle');
        const discountInput = row.querySelector('.sale-discount-input');

        const onSale = toggle ? toggle.checked : false;
        const discountPercent = discountInput ? Math.min(90, Math.max(0, Number(discountInput.value) || 0)) : 0;

        btnSave.disabled = true;
        btnSave.textContent = 'Đang lưu...';

        try {
            await saleService.updateProductSale(id, onSale, discountPercent);
            
            // Cập nhật bộ nhớ cục bộ allBooks
            const book = allBooks.find(b => Number(b.id) === Number(id));
            if (book) {
                book.onSale = onSale;
                book.discountPercent = discountPercent;
            }

            btnSave.textContent = '✓ Đã lưu';
            btnSave.style.background = '#10b981';

            // Cập nhật lại số đếm
            const onSaleCount = allBooks.filter(b => b.onSale === true && Number(b.discountPercent) > 0).length;
            if (saleEligibleCount) saleEligibleCount.textContent = onSaleCount;
            if (salesTabCount) salesTabCount.textContent = onSaleCount;

            setTimeout(() => {
                btnSave.disabled = false;
                btnSave.textContent = '💾 Lưu';
                btnSave.style.background = '';
            }, 1500);

        } catch (err) {
            console.error('Lỗi khi cập nhật sale sản phẩm:', err);
            alert('Không thể cập nhật sản phẩm. Vui lòng thử lại!');
            btnSave.disabled = false;
            btnSave.textContent = '💾 Lưu';
        }
    });
}

// 9. Khởi chạy và nạp dữ liệu ban đầu
async function initAdmin() {
    try {
        const [categories, books, orders, users, fetchedSaleConfig] = await Promise.all([
            categoryService.getAll(),
            productService.getAll(),
            orderService.getAllOrders(),
            authService.getAllUsers(),
            saleService.getConfig().catch(() => null)
        ]);

        allCategories = categories;
        allBooks = books;
        allOrders = orders;
        allUsers = users;
        currentSaleConfig = fetchedSaleConfig;

        updateCategoriesSelect();
        renderBooks(allBooks);
        renderOrders(allOrders);
        renderCategories(allCategories);
        renderUsers(allUsers);
        renderSaleCampaignInfo(currentSaleConfig);
        applySaleBooksFilter();
        updateStats();

    } catch (err) {
        console.error('Lỗi khi tải dữ liệu trang quản trị:', err);
        alert('Không thể kết nối đến máy chủ json-server. Hãy chắc chắn bạn đã chạy lệnh "npm run server"!');
    }
}

initAdmin();
