import { productService } from '../services/productService.js';
import { categoryService } from '../services/categoryService.js';
import { orderService } from '../services/orderService.js';
import { authService } from '../services/authService.js';
import api from '../api/client.js';
import { storage } from '../utils/storage.js';
import { formatPrice } from '../utils/format.js';
import { paginate, renderPagination, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../utils/pagination.js';
import { excelExportUtil } from '../utils/excelExport.js';
import { excelImportUtil } from '../utils/excelImport.js';
import { setupImageUploader } from '../utils/imageUpload.js';
import './themeToggle.js';

// 1. KIỂM TRA QUYỀN TRUY CẬP NGƯỜI BÁN (SELLER)
let currentUser = authService.getCurrentUser();
if (!currentUser || currentUser.role !== 'seller') {
    alert('⚠️ Bạn cần đăng nhập bằng tài khoản Người Bán (Seller) để truy cập trang này!');
    window.location.href = './login.html';
}

// 2. STATE DỮ LIỆU CỦA GIAN HÀNG
let myBooks = [];
let myOrders = [];
let allCategories = [];

// State phân trang
let booksPage = 1;
let booksPageSize = DEFAULT_PAGE_SIZE;
let ordersPage = 1;
let ordersPageSize = DEFAULT_PAGE_SIZE;

let filteredBooks = [];
let filteredOrders = [];

// DOM ELEMENTS
const headerShopBadge = document.querySelector('#headerShopBadge');
const welcomeShopName = document.querySelector('#welcomeShopName');
const welcomeShopSubtitle = document.querySelector('#welcomeShopSubtitle');
const sellerAvatarText = document.querySelector('#sellerAvatarText');
const btnSellerLogout = document.querySelector('#btnSellerLogout');

// KPI Stats
const statShopTotalBooks = document.querySelector('#statShopTotalBooks');
const statShopTotalStock = document.querySelector('#statShopTotalStock');
const statShopTotalOrders = document.querySelector('#statShopTotalOrders');
const statShopPendingOrders = document.querySelector('#statShopPendingOrders');
const statShopTotalRevenue = document.querySelector('#statShopTotalRevenue');
const statShopCompletedRevenue = document.querySelector('#statShopCompletedRevenue');
const statShopLowStock = document.querySelector('#statShopLowStock');
const statShopOutStock = document.querySelector('#statShopOutStock');

const sellerBooksTabCount = document.querySelector('#sellerBooksTabCount');
const sellerOrdersTabCount = document.querySelector('#sellerOrdersTabCount');

// Bảng dữ liệu & Phân trang
const sellerBooksTableBody = document.querySelector('#sellerBooksTableBody');
const sellerOrdersTableBody = document.querySelector('#sellerOrdersTableBody');
const sellerBooksPagination = document.querySelector('#sellerBooksPagination');
const sellerOrdersPagination = document.querySelector('#sellerOrdersPagination');

// Bộ lọc
const searchSellerBookInput = document.querySelector('#searchSellerBookInput');
const filterSellerBookCategory = document.querySelector('#filterSellerBookCategory');
const filterSellerBookStock = document.querySelector('#filterSellerBookStock');
const searchSellerOrderInput = document.querySelector('#searchSellerOrderInput');
const filterSellerOrderStatus = document.querySelector('#filterSellerOrderStatus');

// Nút mở modal
const btnOpenAddSellerBook = document.querySelector('#btnOpenAddSellerBook');

// Modal Thêm/Sửa Sách
const sellerBookModal = document.querySelector('#sellerBookModal');
const sellerBookModalTitle = document.querySelector('#sellerBookModalTitle');
const btnCloseSellerBookModal = document.querySelector('#btnCloseSellerBookModal');
const btnCancelSellerBookModal = document.querySelector('#btnCancelSellerBookModal');
const sellerBookForm = document.querySelector('#sellerBookForm');
const sellerBookId = document.querySelector('#sellerBookId');
const sellerBookName = document.querySelector('#sellerBookName');
const sellerBookAuthor = document.querySelector('#sellerBookAuthor');
const sellerBookCategory = document.querySelector('#sellerBookCategory');
const sellerBookPrice = document.querySelector('#sellerBookPrice');
const sellerBookStock = document.querySelector('#sellerBookStock');
const sellerBookDiscount = document.querySelector('#sellerBookDiscount');
const sellerBookImportDate = document.querySelector('#sellerBookImportDate');
const sellerBookIsNew = document.querySelector('#sellerBookIsNew');
const sellerBookImage = document.querySelector('#sellerBookImage');
const sellerBookDesc = document.querySelector('#sellerBookDesc');

// Khởi tạo Bộ tải ảnh cho Người bán
const sellerImageUploader = setupImageUploader({
    dropzoneEl: document.querySelector('#sellerBookImageDropzone'),
    fileInputEl: document.querySelector('#sellerBookImageFile'),
    previewContainerEl: document.querySelector('#sellerBookImagePreviewContainer'),
    previewImgEl: document.querySelector('#sellerBookImagePreview'),
    fileNameEl: document.querySelector('#sellerBookImageFileName'),
    fileSizeEl: document.querySelector('#sellerBookImageFileSize'),
    btnChangeEl: document.querySelector('#btnChangeSellerBookImage'),
    btnRemoveEl: document.querySelector('#btnRemoveSellerBookImage'),
    urlInputEl: document.querySelector('#sellerBookImage'),
    toggleUrlBtnEl: document.querySelector('#btnToggleSellerBookImageUrl'),
    urlWrapEl: document.querySelector('#sellerBookImageUrlWrap')
});

// Modal Nhập kho
const sellerRestockModal = document.querySelector('#sellerRestockModal');
const btnCloseSellerRestockModal = document.querySelector('#btnCloseSellerRestockModal');
const btnCancelSellerRestockModal = document.querySelector('#btnCancelSellerRestockModal');
const sellerRestockForm = document.querySelector('#sellerRestockForm');
const sellerRestockBookId = document.querySelector('#sellerRestockBookId');
const sellerRestockBookName = document.querySelector('#sellerRestockBookName');
const sellerRestockCurrentStock = document.querySelector('#sellerRestockCurrentStock');
const sellerRestockAmount = document.querySelector('#sellerRestockAmount');

// Modal Chi tiết Đơn hàng
const sellerOrderDetailModal = document.querySelector('#sellerOrderDetailModal');
const btnCloseSellerOrderDetailModal = document.querySelector('#btnCloseSellerOrderDetailModal');
const sellerDetailOrderCode = document.querySelector('#sellerDetailOrderCode');
const sellerDetailOrderStatusBadge = document.querySelector('#sellerDetailOrderStatusBadge');
const sellerDetailReceiverName = document.querySelector('#sellerDetailReceiverName');
const sellerDetailReceiverPhone = document.querySelector('#sellerDetailReceiverPhone');
const sellerDetailReceiverAddress = document.querySelector('#sellerDetailReceiverAddress');
const sellerDetailPaymentMethod = document.querySelector('#sellerDetailPaymentMethod');
const sellerDetailOrderDate = document.querySelector('#sellerDetailOrderDate');
const sellerDetailOrderItemsList = document.querySelector('#sellerDetailOrderItemsList');
const sellerDetailOrderTotal = document.querySelector('#sellerDetailOrderTotal');

// Form Hồ sơ Gian hàng
const sellerProfileForm = document.querySelector('#sellerProfileForm');
const profileShopName = document.querySelector('#profileShopName');
const profileShopEmail = document.querySelector('#profileShopEmail');
const profileShopPhone = document.querySelector('#profileShopPhone');
const profileShopAddress = document.querySelector('#profileShopAddress');
const profileShopBio = document.querySelector('#profileShopBio');

// 3. HIỂN THỊ THÔNG TIN GIAN HÀNG HIỆN TẠI
function renderShopBranding() {
    const sName = currentUser.shopName || currentUser.name || 'Gian Hàng Đối Tác';
    if (headerShopBadge) headerShopBadge.textContent = `🏪 ${sName}`;
    if (welcomeShopName) welcomeShopName.textContent = sName;
    if (welcomeShopSubtitle) {
        welcomeShopSubtitle.textContent = `Chủ gian hàng: ${currentUser.name} • Email: ${currentUser.email} • Kho: ${currentUser.shopAddress || 'Chưa cập nhật'}`;
    }
    if (sellerAvatarText) {
        sellerAvatarText.textContent = sName.charAt(0).toUpperCase() || '🏪';
    }

    // Điền vào tab hồ sơ
    if (profileShopName) profileShopName.value = currentUser.shopName || currentUser.name || '';
    if (profileShopEmail) profileShopEmail.value = currentUser.email || '';
    if (profileShopPhone) profileShopPhone.value = currentUser.shopPhone || '';
    if (profileShopAddress) profileShopAddress.value = currentUser.shopAddress || '';
    if (profileShopBio) profileShopBio.value = currentUser.shopBio || '';
}

// 4. TIỆN ÍCH PHÂN TRANG
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

// 5. CHUYỂN ĐỔI TABS & ĐIỀU HƯỚNG NHANH
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

function switchSellerTab(targetTabId) {
    tabBtns.forEach(b => {
        if (b.dataset.tab === targetTabId) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });

    tabPanels.forEach(p => {
        if (p.id === targetTabId) {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        switchSellerTab(btn.dataset.tab);
    });
});

// Điều hướng nhanh từ 4 thẻ KPI
const cardSellerBooks = document.querySelector('#cardSellerBooks');
const cardSellerOrders = document.querySelector('#cardSellerOrders');
const cardSellerRevenue = document.querySelector('#cardSellerRevenue');
const cardSellerStockAlert = document.querySelector('#cardSellerStockAlert');

function bindQuickNav(cardEl, callback) {
    if (!cardEl) return;
    cardEl.addEventListener('click', callback);
    cardEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            callback();
        }
    });
}

bindQuickNav(cardSellerBooks, () => {
    switchSellerTab('tab-seller-books');
    if (filterSellerBookStock) filterSellerBookStock.value = '';
    applySellerBooksFilter(true);
    document.querySelector('#tab-seller-books')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

bindQuickNav(cardSellerOrders, () => {
    switchSellerTab('tab-seller-orders');
    document.querySelector('#tab-seller-orders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

bindQuickNav(cardSellerRevenue, () => {
    switchSellerTab('tab-seller-orders');
    if (filterSellerOrderStatus) filterSellerOrderStatus.value = 'Hoàn thành';
    applySellerOrdersFilter(true);
    document.querySelector('#tab-seller-orders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

bindQuickNav(cardSellerStockAlert, () => {
    switchSellerTab('tab-seller-books');
    const outCount = myBooks.filter(b => Number(b.stock || 0) <= 0).length;
    if (filterSellerBookStock) {
        filterSellerBookStock.value = outCount > 0 ? 'out_of_stock' : 'low_stock';
    }
    applySellerBooksFilter(true);
    document.querySelector('#tab-seller-books')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// 6. TÍNH TOÁN VÀ CẬP NHẬT CHỈ SỐ KPI CHO SHOP
function updateShopStats() {
    const totalBooks = myBooks.length;
    const totalStock = myBooks.reduce((sum, b) => sum + Number(b.stock !== undefined ? b.stock : 0), 0);
    const lowStock = myBooks.filter(b => Number(b.stock || 0) > 0 && Number(b.stock || 0) < 10).length;
    const outStock = myBooks.filter(b => Number(b.stock || 0) <= 0).length;

    if (statShopTotalBooks) statShopTotalBooks.textContent = `${totalBooks} đầu sách`;
    if (statShopTotalStock) statShopTotalStock.textContent = `Tổng tồn: ${totalStock.toLocaleString()} cuốn`;
    if (sellerBooksTabCount) sellerBooksTabCount.textContent = totalBooks;

    if (statShopLowStock) statShopLowStock.textContent = `${lowStock + outStock} sách cần nhập`;
    if (statShopOutStock) statShopOutStock.textContent = `Hết hàng: ${outStock} | Sắp hết: ${lowStock}`;

    // Đơn hàng
    const totalOrders = myOrders.length;
    const pendingOrders = myOrders.filter(o => 
        (o.status || '').toLowerCase().includes('chờ') || 
        (o.status || '').toLowerCase().includes('đang')
    ).length;

    if (statShopTotalOrders) statShopTotalOrders.textContent = `${totalOrders} đơn`;
    if (statShopPendingOrders) statShopPendingOrders.textContent = `Cần xử lý: ${pendingOrders} đơn`;
    if (sellerOrdersTabCount) sellerOrdersTabCount.textContent = totalOrders;

    // Doanh thu tính riêng cho các sản phẩm của shop này
    const completedOrders = myOrders.filter(o => 
        (o.status || '').toLowerCase().includes('hoàn thành') || 
        (o.status || '').toLowerCase().includes('đã thanh toán')
    );

    let myTotalRevenue = 0;
    completedOrders.forEach(o => {
        (o.items || []).forEach(it => {
            if (Number(it.sellerId) === Number(currentUser.id)) {
                myTotalRevenue += (Number(it.price || 0) * Number(it.quantity || 1));
            }
        });
    });

    if (statShopTotalRevenue) statShopTotalRevenue.textContent = formatPrice(myTotalRevenue);
    if (statShopCompletedRevenue) statShopCompletedRevenue.textContent = `Từ ${completedOrders.length} đơn hoàn thành`;
}

// 7. RENDER VÀ LỌC SÁCH GIAN HÀNG
function renderSellerBooks(books) {
    if (!sellerBooksTableBody) return;
    filteredBooks = Array.isArray(books) ? books : [];
    const pageData = paginate(filteredBooks, booksPage, booksPageSize);

    if (!filteredBooks || filteredBooks.length === 0) {
        sellerBooksTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 32px; color: #94a3b8;">
                    Gian hàng của bạn chưa có cuốn sách nào khớp với bộ lọc.
                </td>
            </tr>
        `;
        drawPagination(sellerBooksPagination, pageData, booksPageSize, 'cuốn sách');
        return;
    }

    sellerBooksTableBody.innerHTML = pageData.items.map(book => {
        const cat = allCategories.find(c => Number(c.id) === Number(book.categoryId));
        const catName = cat ? cat.name : 'Khác';
        const stock = book.stock !== undefined ? Number(book.stock) : 0;
        const discount = Number(book.discountPercent) || 0;

        let stockBadgeHtml = '';
        if (stock <= 0) {
            stockBadgeHtml = `<span class="badge-stock out-of-stock">⚠️ Hết hàng (0)</span>`;
        } else if (stock < 10) {
            stockBadgeHtml = `<span class="badge-stock low-stock">⚡ Chỉ còn ${stock}</span>`;
        } else {
            stockBadgeHtml = `<span class="badge-stock in-stock">✓ ${stock} cuốn</span>`;
        }

        let saleBadgeHtml = discount > 0 
            ? `<span style="background: #ffe4e6; color: #e11d48; font-weight: 700; font-size: 0.8rem; padding: 3px 8px; border-radius: 6px;">-${discount}%</span>` 
            : `<span style="color: #94a3b8; font-size: 0.85rem;">Không</span>`;

        const isNewBook = book.isNew === true || (book.importDate && (Date.now() - new Date(book.importDate).getTime()) / (1000 * 60 * 60 * 24) <= 45);
        const importDateFormatted = book.importDate ? new Date(book.importDate).toLocaleDateString('vi-VN') : 'Mới cập nhật';

        return `
            <tr>
                <td><strong>#${book.id}</strong></td>
                <td>
                    <div class="book-cell">
                        <img src="${book.image}" alt="${book.name}" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80'">
                        <div class="book-cell-info">
                            <strong>${book.name}</strong>
                            <span>Tác giả: ${book.author || 'Chưa rõ'}</span>
                            <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
                                ${isNewBook ? '<span style="background: #ecfdf5; color: #059669; font-size: 0.72rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">✨ Sách mới</span>' : ''}
                                <span style="font-size: 0.74rem; color: #64748b;">📅 Nhập: ${importDateFormatted}</span>
                            </div>
                        </div>
                    </div>
                </td>
                <td><span class="admin-cat-pill">${catName}</span></td>
                <td><strong class="admin-price-text">${formatPrice(book.price)}</strong></td>
                <td>${saleBadgeHtml}</td>
                <td>${stockBadgeHtml}</td>
                <td><strong>${book.soldCount || 0}</strong> đã bán</td>
                <td style="text-align: right;">
                    <div class="action-btns" style="justify-content: flex-end;">
                        <button type="button" class="btn-action restock btn-open-restock" data-id="${book.id}" data-name="${book.name}" data-stock="${stock}" title="Bổ sung tồn kho">
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

    drawPagination(sellerBooksPagination, pageData, booksPageSize, 'cuốn sách');
}

function applySellerBooksFilter(resetPage = true) {
    const query = (searchSellerBookInput?.value || '').trim().toLowerCase();
    const catId = filterSellerBookCategory?.value;
    const stockStatus = filterSellerBookStock?.value;

    const filtered = myBooks.filter(b => {
        const matchesQuery = !query || 
            (b.name || '').toLowerCase().includes(query) || 
            (b.author || '').toLowerCase().includes(query);

        const matchesCat = !catId || Number(b.categoryId) === Number(catId);

        const stock = b.stock !== undefined ? Number(b.stock) : 0;
        let matchesStock = true;
        if (stockStatus === 'in_stock') matchesStock = stock >= 10;
        if (stockStatus === 'low_stock') matchesStock = stock > 0 && stock < 10;
        if (stockStatus === 'out_of_stock') matchesStock = stock <= 0;

        return matchesQuery && matchesCat && matchesStock;
    });

    if (resetPage) booksPage = 1;
    renderSellerBooks(filtered);
}

if (searchSellerBookInput) searchSellerBookInput.addEventListener('input', () => applySellerBooksFilter(true));
if (filterSellerBookCategory) filterSellerBookCategory.addEventListener('change', () => applySellerBooksFilter(true));
if (filterSellerBookStock) filterSellerBookStock.addEventListener('change', () => applySellerBooksFilter(true));

// Xuất danh sách sách ra file Excel (Kho sách của riêng Gian Hàng)
const btnExportBooksSeller = document.querySelector('#btnExportBooksSeller');
if (btnExportBooksSeller) {
    btnExportBooksSeller.addEventListener('click', () => {
        const exportList = (filteredBooks && filteredBooks.length > 0) ? filteredBooks : myBooks;
        const shopTitle = currentUser.shopName || currentUser.name || 'gian_hang';
        excelExportUtil.exportSellerBooks(exportList, allCategories, shopTitle);
    });
}

setupPagination(sellerBooksPagination, {
    getPage: () => booksPage,
    setPage: (p) => { booksPage = p; },
    getPageSize: () => booksPageSize,
    setPageSize: (s) => { booksPageSize = s; },
    rerender: () => renderSellerBooks(filteredBooks)
});

// 8. SỰ KIỆN TRÊN BẢNG SÁCH (THÊM, SỬA, XÓA, NHẬP KHO)
if (btnOpenAddSellerBook) {
    btnOpenAddSellerBook.addEventListener('click', () => {
        sellerBookModalTitle.textContent = '➕ Đăng Bán Sách Mới';
        sellerBookForm.reset();
        sellerBookId.value = '';
        if (sellerBookImportDate) {
            sellerBookImportDate.value = new Date().toISOString().split('T')[0];
        }
        if (sellerBookIsNew) {
            sellerBookIsNew.checked = true;
        }
        if (sellerImageUploader) sellerImageUploader.reset();
        sellerBookModal.classList.add('active');
    });
}

function closeBookModal() {
    if (sellerImageUploader) sellerImageUploader.reset();
    sellerBookModal.classList.remove('active');
}
if (btnCloseSellerBookModal) btnCloseSellerBookModal.addEventListener('click', closeBookModal);
if (btnCancelSellerBookModal) btnCancelSellerBookModal.addEventListener('click', closeBookModal);

if (sellerBookForm) {
    sellerBookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = sellerBookId.value;
        const discount = Number(sellerBookDiscount.value) || 0;

        const imageValue = sellerImageUploader 
            ? sellerImageUploader.getImageValue() 
            : (sellerBookImage ? sellerBookImage.value.trim() : '');

        if (!imageValue) {
            alert('⚠️ Vui lòng tải lên file ảnh bìa sách hoặc nhập đường dẫn ảnh hợp lệ!');
            return;
        }

        const importDateIso = sellerBookImportDate && sellerBookImportDate.value 
            ? new Date(sellerBookImportDate.value).toISOString() 
            : new Date().toISOString();
        const isNewFlag = sellerBookIsNew ? sellerBookIsNew.checked : true;

        const bookPayload = {
            name: sellerBookName.value.trim(),
            author: sellerBookAuthor.value.trim(),
            categoryId: Number(sellerBookCategory.value),
            price: Number(sellerBookPrice.value),
            stock: Number(sellerBookStock.value),
            discountPercent: discount,
            onSale: discount > 0,
            importDate: importDateIso,
            isNew: isNewFlag,
            image: imageValue,
            description: sellerBookDesc.value.trim(),
            sellerId: Number(currentUser.id),
            sellerName: currentUser.shopName || currentUser.name
        };

        try {
            if (id) {
                // Sửa sách
                const updated = await productService.update(id, { id: Number(id), ...bookPayload });
                const idx = myBooks.findIndex(b => Number(b.id) === Number(id));
                if (idx > -1) myBooks[idx] = updated;
                alert('✓ Đã cập nhật thông tin sách thành công!');
            } else {
                // Thêm sách mới
                bookPayload.soldCount = 0;
                const created = await productService.create(bookPayload);
                myBooks.unshift(created);
                alert('✓ Đã đăng bán sách mới vào gian hàng thành công!');
            }

            closeBookModal();
            applySellerBooksFilter(false);
            updateShopStats();
        } catch (err) {
            console.error('Lỗi khi lưu sách:', err);
            alert('Không thể lưu sách. Vui lòng kiểm tra lại server json-server.');
        }
    });
}

// Click trên table: Nhập kho, Sửa, Xóa
if (sellerBooksTableBody) {
    sellerBooksTableBody.addEventListener('click', async (e) => {
        // 1. Nhập thêm hàng (Quick Restock)
        const btnRestock = e.target.closest('.btn-open-restock');
        if (btnRestock) {
            sellerRestockBookId.value = btnRestock.dataset.id;
            sellerRestockBookName.textContent = btnRestock.dataset.name;
            sellerRestockCurrentStock.textContent = btnRestock.dataset.stock;
            sellerRestockAmount.value = 20;
            sellerRestockModal.classList.add('active');
            return;
        }

        // 2. Sửa sách
        const btnEdit = e.target.closest('.btn-edit-book');
        if (btnEdit) {
            const id = btnEdit.dataset.id;
            const book = myBooks.find(b => Number(b.id) === Number(id));
            if (!book) return;

            sellerBookModalTitle.textContent = `Chỉnh sửa: ${book.name}`;
            sellerBookId.value = book.id;
            sellerBookName.value = book.name;
            sellerBookAuthor.value = book.author || '';
            sellerBookCategory.value = book.categoryId;
            sellerBookPrice.value = book.price;
            sellerBookStock.value = book.stock !== undefined ? book.stock : 50;
            sellerBookDiscount.value = book.discountPercent || 0;
            if (sellerBookImportDate) {
                sellerBookImportDate.value = book.importDate ? book.importDate.split('T')[0] : new Date().toISOString().split('T')[0];
            }
            if (sellerBookIsNew) {
                sellerBookIsNew.checked = book.isNew === true || (!book.hasOwnProperty('isNew') && book.importDate && (Date.now() - new Date(book.importDate).getTime()) / (1000 * 60 * 60 * 24) <= 45);
            }
            sellerBookImage.value = book.image || '';
            if (sellerImageUploader) {
                sellerImageUploader.setImage(book.image || '', book.name);
            }
            sellerBookDesc.value = book.description || '';

            sellerBookModal.classList.add('active');
            return;
        }

        // 3. Xóa sách
        const btnDelete = e.target.closest('.btn-delete-book');
        if (btnDelete) {
            const id = btnDelete.dataset.id;
            const book = myBooks.find(b => Number(b.id) === Number(id));
            if (confirm(`Bạn có chắc muốn xóa cuốn sách "${book?.name || id}" khỏi gian hàng?`)) {
                try {
                    await productService.delete(id);
                    myBooks = myBooks.filter(b => Number(b.id) !== Number(id));
                    applySellerBooksFilter(false);
                    updateShopStats();
                    alert('✓ Đã xóa sách khỏi gian hàng thành công!');
                } catch (err) {
                    console.error('Lỗi khi xóa sách:', err);
                    alert('Không thể xóa sách khỏi hệ thống.');
                }
            }
        }
    });
}

// Xử lý modal Nhập kho
function closeRestockModal() {
    sellerRestockModal.classList.remove('active');
}
if (btnCloseSellerRestockModal) btnCloseSellerRestockModal.addEventListener('click', closeRestockModal);
if (btnCancelSellerRestockModal) btnCancelSellerRestockModal.addEventListener('click', closeRestockModal);

if (sellerRestockForm) {
    sellerRestockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = sellerRestockBookId.value;
        const addAmount = Number(sellerRestockAmount.value) || 0;
        const book = myBooks.find(b => Number(b.id) === Number(id));
        if (!book) return;

        const newStock = (Number(book.stock) || 0) + addAmount;
        try {
            const updated = await productService.update(id, { ...book, stock: newStock });
            const idx = myBooks.findIndex(b => Number(b.id) === Number(id));
            if (idx > -1) myBooks[idx] = updated;

            closeRestockModal();
            applySellerBooksFilter(false);
            updateShopStats();
            alert(`✓ Đã nhập thêm +${addAmount} cuốn sách vào kho gian hàng!`);
        } catch (err) {
            console.error('Lỗi khi nhập kho:', err);
            alert('Không thể cập nhật tồn kho.');
        }
    });
}

// 9. RENDER VÀ LỌC ĐƠN HÀNG GIAN HÀNG
function renderSellerOrders(orders) {
    if (!sellerOrdersTableBody) return;
    filteredOrders = Array.isArray(orders) ? orders : [];
    const pageData = paginate(filteredOrders, ordersPage, ordersPageSize);

    if (!filteredOrders || filteredOrders.length === 0) {
        sellerOrdersTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 32px; color: #94a3b8;">
                    Chưa có đơn hàng nào khớp với bộ lọc.
                </td>
            </tr>
        `;
        drawPagination(sellerOrdersPagination, pageData, ordersPageSize, 'đơn hàng');
        return;
    }

    sellerOrdersTableBody.innerHTML = pageData.items.map(order => {
        // Chỉ lấy các sản phẩm thuộc seller này
        const shopItems = (order.items || []).filter(it => Number(it.sellerId) === Number(currentUser.id));
        const shopTotal = shopItems.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);

        const itemsSummaryHtml = shopItems.map(it => `
            <div style="font-size: 0.85rem; margin-bottom: 2px;">
                • <strong>${it.name}</strong> <span style="color: #64748b;">(x${it.quantity})</span>
            </div>
        `).join('');

        const statusLower = (order.status || '').toLowerCase();
        let statusBadgeClass = 'status-pending';
        if (statusLower.includes('hoàn thành')) statusBadgeClass = 'status-success';
        else if (statusLower.includes('giao')) statusBadgeClass = 'status-shipping';
        else if (statusLower.includes('xử lý') || statusLower.includes('đóng')) statusBadgeClass = 'status-processing';
        else if (statusLower.includes('hủy')) statusBadgeClass = 'status-danger';

        // Nút hành động nhanh
        let quickActionHtml = '';
        if (statusLower.includes('chờ')) {
            quickActionHtml = `
                <button type="button" class="btn-action edit btn-advance-order" data-id="${order.id}" data-next="Đang xử lý" title="Xác nhận đóng gói hàng">
                    📦 Đóng gói
                </button>
            `;
        } else if (statusLower.includes('xử lý')) {
            quickActionHtml = `
                <button type="button" class="btn-action restock btn-advance-order" data-id="${order.id}" data-next="Đang giao hàng" title="Giao cho shipper">
                    🚚 Giao hàng
                </button>
            `;
        }

        const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '--';

        return `
            <tr>
                <td><strong>#${order.orderCode || order.id}</strong></td>
                <td>
                    <strong style="display: block; color: var(--dark);">${order.receiverName || 'Khách vãng lai'}</strong>
                    <span style="font-size: 0.8rem; color: #64748b;">${order.receiverPhone || ''}</span>
                </td>
                <td>${itemsSummaryHtml}</td>
                <td><strong class="admin-price-text" style="color: #059669;">${formatPrice(shopTotal)}</strong></td>
                <td><span class="order-status-pill ${statusBadgeClass}">${order.status}</span></td>
                <td><span style="font-size: 0.85rem; font-weight: 600;">${order.paymentMethod || 'COD'}</span></td>
                <td><span style="font-size: 0.82rem; color: #64748b;">${dateStr}</span></td>
                <td style="text-align: right;">
                    <div class="action-btns" style="justify-content: flex-end;">
                        ${quickActionHtml}
                        <button type="button" class="btn-action edit btn-view-order" data-id="${order.id}" title="Xem chi tiết đơn">
                            👁️ Xem
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    drawPagination(sellerOrdersPagination, pageData, ordersPageSize, 'đơn hàng');
}

function applySellerOrdersFilter(resetPage = true) {
    const query = (searchSellerOrderInput?.value || '').trim().toLowerCase();
    const status = filterSellerOrderStatus?.value;

    const filtered = myOrders.filter(o => {
        const matchesQuery = !query || 
            (o.orderCode || '').toLowerCase().includes(query) || 
            (o.receiverName || '').toLowerCase().includes(query) ||
            (o.receiverPhone || '').toLowerCase().includes(query);

        const matchesStatus = !status || (o.status || '').toLowerCase().includes(status.toLowerCase());

        return matchesQuery && matchesStatus;
    });

    if (resetPage) ordersPage = 1;
    renderSellerOrders(filtered);
}

if (searchSellerOrderInput) searchSellerOrderInput.addEventListener('input', () => applySellerOrdersFilter(true));
if (filterSellerOrderStatus) filterSellerOrderStatus.addEventListener('change', () => applySellerOrdersFilter(true));

setupPagination(sellerOrdersPagination, {
    getPage: () => ordersPage,
    setPage: (p) => { ordersPage = p; },
    getPageSize: () => ordersPageSize,
    setPageSize: (s) => { ordersPageSize = s; },
    rerender: () => renderSellerOrders(filteredOrders)
});

// Sự kiện đơn hàng (Xem chi tiết, Chuyển trạng thái)
if (sellerOrdersTableBody) {
    sellerOrdersTableBody.addEventListener('click', async (e) => {
        // Xem chi tiết
        const btnView = e.target.closest('.btn-view-order');
        if (btnView) {
            const orderId = btnView.dataset.id;
            const order = myOrders.find(o => Number(o.id) === Number(orderId));
            if (!order) return;

            sellerDetailOrderCode.textContent = `Chi Tiết Đơn Hàng #${order.orderCode || order.id}`;
            sellerDetailOrderStatusBadge.textContent = order.status;
            sellerDetailReceiverName.textContent = order.receiverName || '--';
            sellerDetailReceiverPhone.textContent = order.receiverPhone || '--';
            sellerDetailReceiverAddress.textContent = order.receiverAddress || '--';
            sellerDetailPaymentMethod.textContent = `${order.paymentMethod || 'COD'} ${order.isPaid ? '(Đã thanh toán)' : ''}`;
            sellerDetailOrderDate.textContent = order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '--';

            const shopItems = (order.items || []).filter(it => Number(it.sellerId) === Number(currentUser.id));
            const shopTotal = shopItems.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);

            if (sellerDetailOrderItemsList) {
                sellerDetailOrderItemsList.innerHTML = shopItems.map(it => `
                    <div class="order-item-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed var(--gray-200);">
                        <div>
                            <strong>${it.name}</strong>
                            <div style="font-size: 0.82rem; color: #64748b;">Đơn giá: ${formatPrice(it.price)} x ${it.quantity}</div>
                        </div>
                        <strong style="color: #059669;">${formatPrice(it.price * it.quantity)}</strong>
                    </div>
                `).join('');
            }

            if (sellerDetailOrderTotal) {
                sellerDetailOrderTotal.textContent = formatPrice(shopTotal);
            }

            sellerOrderDetailModal.classList.add('active');
            return;
        }

        // Chuyển nhanh trạng thái (Đóng gói / Giao hàng)
        const btnAdvance = e.target.closest('.btn-advance-order');
        if (btnAdvance) {
            const orderId = btnAdvance.dataset.id;
            const nextStatus = btnAdvance.dataset.next;
            if (confirm(`Chuyển trạng thái đơn hàng #${orderId} sang "${nextStatus}"?`)) {
                try {
                    await orderService.updateStatus(orderId, nextStatus);
                    const o = myOrders.find(item => Number(item.id) === Number(orderId));
                    if (o) o.status = nextStatus;
                    applySellerOrdersFilter(false);
                    updateShopStats();
                    alert(`✓ Đã cập nhật trạng thái đơn sang "${nextStatus}"!`);
                } catch (err) {
                    console.error('Lỗi cập nhật trạng thái đơn:', err);
                    alert('Không thể cập nhật trạng thái đơn hàng.');
                }
            }
        }
    });
}

if (btnCloseSellerOrderDetailModal) {
    btnCloseSellerOrderDetailModal.addEventListener('click', () => {
        sellerOrderDetailModal.classList.remove('active');
    });
}

// Bấm ra ngoài vùng modal để đóng
[sellerBookModal, sellerRestockModal, sellerOrderDetailModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// 10. CẬP NHẬT HỒ SƠ GIAN HÀNG
if (sellerProfileForm) {
    sellerProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updatedShopName = profileShopName.value.trim();
        const updatedShopPhone = profileShopPhone.value.trim();
        const updatedShopAddress = profileShopAddress.value.trim();
        const updatedShopBio = profileShopBio.value.trim();

        if (!updatedShopName || !updatedShopPhone || !updatedShopAddress) {
            alert('Vui lòng nhập đầy đủ tên gian hàng, số điện thoại và địa chỉ kho!');
            return;
        }

        try {
            const patchData = {
                shopName: updatedShopName,
                shopPhone: updatedShopPhone,
                shopAddress: updatedShopAddress,
                shopBio: updatedShopBio
            };

            await api.patch(`/user/${currentUser.id}`, patchData);

            // Cập nhật local storage
            currentUser = { ...currentUser, ...patchData };
            storage.setUser(currentUser);

            renderShopBranding();
            alert('✓ Đã cập nhật thông tin gian hàng thành công!');
        } catch (err) {
            console.error('Lỗi khi cập nhật hồ sơ shop:', err);
            alert('Không thể lưu thông tin gian hàng.');
        }
    });
}

// 11. ĐĂNG XUẤT
if (btnSellerLogout) {
    btnSellerLogout.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn đăng xuất khỏi Kênh Người Bán?')) {
            authService.logout();
            window.location.href = './login.html';
        }
    });
}

// 12. NẠP DỮ LIỆU BAN ĐẦU
async function initSeller() {
    renderShopBranding();
    try {
        const [categories, books, orders] = await Promise.all([
            categoryService.getAll(),
            productService.getAll(),
            orderService.getAllOrders()
        ]);

        allCategories = categories;

        // Điền thể loại vào dropdowns
        if (filterSellerBookCategory) {
            filterSellerBookCategory.innerHTML = '<option value="">-- Tất cả thể loại --</option>' + 
                categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        if (sellerBookCategory) {
            sellerBookCategory.innerHTML = '<option value="">-- Chọn thể loại --</option>' + 
                categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }

        // Lọc sách và đơn hàng CHỈ CỦA SHOP NÀY
        myBooks = (books || []).filter(b => Number(b.sellerId) === Number(currentUser.id));
        myOrders = (orders || []).filter(o => (o.items || []).some(it => Number(it.sellerId) === Number(currentUser.id)));

        updateShopStats();
        applySellerBooksFilter(true);
        applySellerOrdersFilter(true);
        setupSellerExcelImport();

    } catch (err) {
        console.error('Lỗi tải dữ liệu Kênh Người Bán:', err);
        alert('Không thể tải dữ liệu từ máy chủ json-server.');
    }
}

// ==========================================
// XỬ LÝ NHẬP SÁCH TỪ EXCEL (SELLER)
// ==========================================
function setupSellerExcelImport() {
    const btnOpenModal = document.querySelector('#btnImportBooksSeller');
    const modal = document.querySelector('#sellerImportExcelModal');
    const btnClose = document.querySelector('#btnCloseSellerImportModal');
    const btnCancel = document.querySelector('#btnCancelSellerImportModal');
    const btnDownload = document.querySelector('#btnDownloadSellerExcelTemplate');
    const dropzone = document.querySelector('#sellerExcelDropzone');
    const fileInput = document.querySelector('#inputSellerExcelFile');
    const btnBrowse = document.querySelector('#btnBrowseSellerExcel');

    const previewSection = document.querySelector('#sellerExcelPreviewSection');
    const previewTotal = document.querySelector('#sellerPreviewTotal');
    const previewValid = document.querySelector('#sellerPreviewValid');
    const previewInvalid = document.querySelector('#sellerPreviewInvalid');
    const tbody = document.querySelector('#sellerExcelPreviewTbody');
    const btnConfirm = document.querySelector('#btnConfirmSellerImportExcel');
    const confirmCount = document.querySelector('#sellerConfirmCount');
    const progressBox = document.querySelector('#sellerImportProgress');
    const progressText = document.querySelector('#sellerImportProgressText');

    let parsedValidRows = [];

    function closeModal() {
        if (modal) modal.style.display = 'none';
        resetState();
    }

    function resetState() {
        parsedValidRows = [];
        if (fileInput) fileInput.value = '';
        if (previewSection) previewSection.style.display = 'none';
        if (progressBox) progressBox.style.display = 'none';
        if (tbody) tbody.innerHTML = '';
        if (btnConfirm) {
            btnConfirm.disabled = true;
            btnConfirm.style.opacity = '0.5';
            btnConfirm.style.cursor = 'not-allowed';
            if (confirmCount) confirmCount.textContent = '0';
        }
    }

    if (btnOpenModal && modal) {
        btnOpenModal.addEventListener('click', () => {
            resetState();
            modal.style.display = 'flex';
        });
    }

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    if (btnDownload) {
        btnDownload.addEventListener('click', () => {
            excelImportUtil.downloadTemplate(allCategories);
        });
    }

    if (btnBrowse && fileInput) {
        btnBrowse.addEventListener('click', () => fileInput.click());
    }

    if (dropzone && fileInput) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });
    }

    async function handleFile(file) {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            alert('Vui lòng chọn file Excel đúng định dạng (.xlsx hoặc .xls)!');
            return;
        }

        try {
            const { validRows, invalidRows, total } = await excelImportUtil.parseExcel(file, allCategories);
            parsedValidRows = validRows;

            if (previewSection) previewSection.style.display = 'block';
            if (previewTotal) previewTotal.textContent = total;
            if (previewValid) previewValid.textContent = validRows.length;
            if (previewInvalid) previewInvalid.textContent = invalidRows.length;

            if (tbody) {
                let html = '';
                validRows.forEach(r => {
                    html += `
                        <tr>
                            <td>#${r.rowNum}</td>
                            <td><strong>${r.name}</strong></td>
                            <td>${r.author}</td>
                            <td>${r.categoryName}</td>
                            <td>${formatPrice(r.price)}</td>
                            <td>${r.stock}</td>
                            <td><span class="status-badge-ok">✓ Hợp lệ</span></td>
                        </tr>
                    `;
                });
                invalidRows.forEach(r => {
                    html += `
                        <tr class="row-invalid">
                            <td>#${r.rowNum}</td>
                            <td><strong>${r.name}</strong></td>
                            <td>${r.author}</td>
                            <td>--</td>
                            <td>--</td>
                            <td>--</td>
                            <td><span class="status-badge-err">⚠️ ${r.errors}</span></td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
            }

            if (btnConfirm) {
                if (validRows.length > 0) {
                    btnConfirm.disabled = false;
                    btnConfirm.style.opacity = '1';
                    btnConfirm.style.cursor = 'pointer';
                    if (confirmCount) confirmCount.textContent = validRows.length;
                } else {
                    btnConfirm.disabled = true;
                    btnConfirm.style.opacity = '0.5';
                    btnConfirm.style.cursor = 'not-allowed';
                    if (confirmCount) confirmCount.textContent = '0';
                    alert('⚠️ Không tìm thấy dòng dữ liệu nào hợp lệ trong file Excel. Vui lòng kiểm tra lại cột thông tin!');
                }
            }
        } catch (err) {
            console.error('Lỗi đọc file Excel:', err);
            alert(err.message || 'Không thể phân tích dữ liệu từ file Excel này.');
        }
    }

    if (btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
            if (!parsedValidRows || parsedValidRows.length === 0) return;

            btnConfirm.disabled = true;
            if (progressBox) progressBox.style.display = 'block';
            if (previewSection) previewSection.style.display = 'none';

            let successCount = 0;
            const sellerId = Number(currentUser.id);
            const sellerName = currentUser.shopName || currentUser.name || 'Gian hàng đối tác';

            for (let i = 0; i < parsedValidRows.length; i++) {
                const book = parsedValidRows[i];
                if (progressText) {
                    progressText.textContent = `Đang lưu (${i + 1}/${parsedValidRows.length}): ${book.name}...`;
                }

                try {
                    const payload = {
                        name: book.name,
                        author: book.author,
                        categoryId: book.categoryId,
                        price: book.price,
                        stock: book.stock,
                        discountPercent: book.discountPercent,
                        description: book.description,
                        image: book.image,
                        tag: book.tag,
                        isNew: true,
                        importDate: new Date().toISOString(),
                        soldCount: 0,
                        sellerId,
                        sellerName
                    };

                    await productService.create(payload);
                    successCount++;
                } catch (e) {
                    console.error(`Lỗi khi tạo sách #${book.name}:`, e);
                }
            }

            alert(`🎉 Đã nhập thành công ${successCount}/${parsedValidRows.length} cuốn sách vào gian hàng của bạn!`);
            closeModal();

            try {
                const books = await productService.getAll();
                myBooks = (books || []).filter(b => Number(b.sellerId) === Number(currentUser.id));
                updateShopStats();
                applySellerBooksFilter(true);
            } catch (e) {
                console.warn('Lỗi refresh danh sách sau khi import:', e);
            }
        });
    }
}

initSeller();
