import { productService } from '../services/productService.js';
import { categoryService } from '../services/categoryService.js';
import { menuService } from '../services/menuService.js';
import { authService } from '../services/authService.js';
import { cartService } from '../services/cartService.js';
import { reviewService } from '../services/reviewService.js';
import { saleService } from '../services/saleService.js';
import { wishlistService } from '../services/wishlistService.js';
import { formatPrice, escapeHtml } from '../utils/format.js';
import { initChatbot } from './chatWidget.js';
import { initNotificationBell } from './notificationBell.js';
import { initInternalChat } from './internalChat.js';
import './themeToggle.js';

// Số sản phẩm render sẵn cho mỗi kệ Carousel (Lazy render)
const CAROUSEL_CHUNK_SIZE = 5;
// Số sản phẩm hiển thị thêm mỗi lần bấm nút "Xem thêm" ở kết quả tìm kiếm
const SEARCH_PAGE_SIZE = 8;

// Lưu số lượng thẻ sản phẩm đã render của từng kệ Carousel (key = categoryId)
const carouselRenderedCount = new Map();
// Kết quả tìm kiếm hiện tại và số lượng đang hiển thị
let currentSearchResults = [];
let searchVisibleCount = 0;

// State quản lý dữ liệu trên giao diện
let allCategories = [];
let allProducts = [];
let allMenuItems = [];
let selectedCategoryId = 0; // 0 nghĩa là "Tất cả"
let newProductIds = new Set(); // Chứa ID của 4 sản phẩm mới nhất
let hotProductIds = new Set(); // Chứa ID của 4 sản phẩm nổi bật nhất
let productRatingMap = new Map(); // Lưu điểm sao đánh giá theo productId
let userWishlistProductIds = new Set(); // Lưu danh sách ID sách yêu thích của người dùng
let saleConfig = null; // Cấu hình đợt Sale
let isSaleActive = false; // Trạng thái đợt sale đang diễn ra hay không

// DOM Elements
const mainMenu = document.querySelector('#mainMenu');
const saleProductsSection = document.querySelector('#saleProductsSection');
const saleProductList = document.querySelector('#saleProductList');
const saleCampaignTitle = document.querySelector('#saleCampaignTitle');
const saleCampaignSubtitle = document.querySelector('#saleCampaignSubtitle');
const saleDateRangeText = document.querySelector('#saleDateRangeText');
const clockDaysUnit = document.querySelector('#clockDaysUnit');
const clockDaysSep = document.querySelector('#clockDaysSep');
const clockDays = document.querySelector('#clockDays');
const clockHours = document.querySelector('#clockHours');
const clockMinutes = document.querySelector('#clockMinutes');
const clockSeconds = document.querySelector('#clockSeconds');
const saleCountdownStatusText = document.querySelector('#saleCountdownStatusText');
let saleCountdownTimer = null;
const newProductsSection = document.querySelector('#newProductsSection');
const newProductList = document.querySelector('#newProductList');
const hotProductsSection = document.querySelector('#hotProductsSection');
const hotProductList = document.querySelector('#hotProductList');
const categoryCarouselsContainer = document.querySelector('#categoryCarouselsContainer');
const searchResultsSection = document.querySelector('#searchResultsSection');
const searchResultsTitle = document.querySelector('#searchResultsTitle');
const searchProductList = document.querySelector('#searchProductList');
const btnClearSearch = document.querySelector('#btnClearSearch');
const searchLoadMoreWrap = document.querySelector('#searchLoadMoreWrap');
const btnLoadMoreSearch = document.querySelector('#btnLoadMoreSearch');

const categoryList = document.querySelector('#categoryList');
const searchInput = document.querySelector('#searchInput');
const searchBtn = document.querySelector('#searchBtn');
const loadingElement = document.querySelector('#loading');
const errorElement = document.querySelector('#error');

const userText = document.querySelector('#userText');
const userName = document.querySelector('#userName');
const userAvatarWrap = document.querySelector('#userAvatarWrap');
const logoutBtn = document.querySelector('#logoutBtn');
const authLinks = document.querySelector('#authLinks');
const cartCount = document.querySelector('#cartCount');
const wishlistCount = document.querySelector('#wishlistCount');
const adminLink = document.querySelector('#adminLink');

// Dropdown tài khoản mới
const userDropdownWrap = document.querySelector('#userDropdownWrap');
const userDropdownBtn = document.querySelector('#userDropdownBtn');
const userDropdownMenu = document.querySelector('#userDropdownMenu');
const userDropdownFullName = document.querySelector('#userDropdownFullName');
const userRoleBadge = document.querySelector('#userRoleBadge');
const sellerPortalLink = document.querySelector('#sellerPortalLink');
const adminPortalLink = document.querySelector('#adminPortalLink');

// 1. Tải danh mục từ Service
async function loadCategories() {
    try {
        allCategories = await categoryService.getAll();
        renderCategories(allCategories);
    } catch (error) {
        console.error('Không thể lấy danh mục:', error);
    }
}

// 2. Tải và Render Menu Tabbar động từ Database
async function loadAndRenderMenu() {
    if (!mainMenu) return;
    try {
        allMenuItems = await menuService.getAll();
        const user = authService.getCurrentUser();

        let html = '';
        allMenuItems.forEach(item => {
            // Nếu menu mục yêu cầu đăng nhập mà khách chưa đăng nhập thì ẩn
            if (item.requireAuth && !user) return;

            if (item.hasDropdown) {
                // Dropdown thể loại sách
                html += `
                    <div class="menu-item-dropdown">
                        <a href="${item.url}" class="menu-tab">
                            <span>${item.title}</span>
                            <span class="dropdown-arrow">▾</span>
                        </a>
                        <div class="menu-dropdown-list">
                            ${allCategories.map(cat => `
                                <a href="#category-block-${cat.id}" class="menu-dropdown-item" data-cat-id="${cat.id}">
                                    <span class="cat-drop-icon">${cat.icon || '📖'}</span>
                                    <span>${cat.name}</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <a href="${item.url}" class="menu-tab ${item.isHome ? 'active' : ''}">
                        <span>${item.title}</span>
                    </a>
                `;
            }
        });

        mainMenu.innerHTML = html;
    } catch (error) {
        console.error('Không thể tải menu động:', error);
    }
}

// Bắt sự kiện click chọn nhanh thể loại từ dropdown menu
if (mainMenu) {
    mainMenu.addEventListener('click', (e) => {
        const dropItem = e.target.closest('[data-cat-id]');
        if (dropItem) {
            e.preventDefault();
            const catId = Number(dropItem.dataset.catId);
            selectedCategoryId = catId;
            renderCategories(allCategories);

            if (searchInput) searchInput.value = '';
            handleSearch();

            // Hiển thị duy nhất kệ sách của thể loại đó
            renderCategoryCarousels(allCategories, allProducts);

            // Cuộn mượt tới khu vực thể loại
            const prodSec = document.querySelector('#products');
            if (prodSec) {
                prodSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
}

// 2. Render danh mục tabs ra giao diện
function renderCategories(categories) {
    if (!categoryList) return;

    let html = `
        <button class="category-btn ${selectedCategoryId === 0 ? 'active' : ''}" data-category="0">
            📚 Tất cả kệ sách
        </button>
    `;

    categories.forEach(category => {
        const isActive = selectedCategoryId === Number(category.id) ? 'active' : '';
        const icon = category.icon || '📖';
        html += `
            <button class="category-btn ${isActive}" data-category="${category.id}">
                ${icon} ${category.name}
            </button>
        `;
    });

    categoryList.innerHTML = html;
}

/**
 * Kiểm tra xem cuốn sách có phải là Sách Mới hay không:
 * 1. Nếu Admin / Seller chủ động gán isNew: true -> luôn là Sách Mới.
 * 2. Nếu Admin / Seller chủ động gán isNew: false -> không phải Sách Mới.
 * 3. Nếu không có cờ nhưng có ngày nhập importDate trong vòng 60 ngày gần đây -> hệ thống tự động xác định là Sách Mới.
 * 4. Nằm trong danh sách hiển thị Top Sách Mới.
 */
function isBookNew(product) {
    if (!product) return false;
    if (product.isNew === true) return true;
    if (product.isNew === false) return false;
    if (newProductIds.has(Number(product.id))) return true;
    if (product.importDate) {
        const importTime = new Date(product.importDate).getTime();
        if (Number.isFinite(importTime) && importTime > 0) {
            const diffDays = (Date.now() - importTime) / (1000 * 60 * 60 * 24);
            return diffDays >= -7 && diffDays <= 60;
        }
    }
    return false;
}

// Helper: Tạo HTML cho 1 thẻ sản phẩm chuẩn (Bỏ nút chi tiết, nhấp vào thẻ để xem, hiển thị đã bán, số sao và giá sale nếu có)
function createProductCardHtml(product) {
    const isHot = hotProductIds.has(Number(product.id));
    const isNew = isBookNew(product);
    const isWishlisted = userWishlistProductIds.has(Number(product.id));
    const priceInfo = saleService.getPriceInfo(product, isSaleActive);
    const isSale = priceInfo.isSale;

    const stock = Number(product.stock);
    const isSoldOut = !Number.isFinite(stock) || stock <= 0;
    const isLowStock = !isSoldOut && stock <= 5;
    const soldCount = Number(product.soldCount) || 0;
    const rData = productRatingMap.get(Number(product.id)) || { average: 5.0, total: 0 };

    // Tag thể loại cụ thể (không dùng tag gộp, ví dụ: Khoa học, Lịch sử, Văn học, Kinh tế)
    const specificTag = product.tag || 'Sách hay';

    // Tạo badges ở góc trên ảnh
    let badgesHtml = '';
    if (isSale) {
        badgesHtml += `<span class="product-badge-sale">-${priceInfo.discountPercent}%</span>`;
        if (isHot) {
            badgesHtml += `<span class="product-badge-hot" style="right: auto; left: 12px;">🔥 HOT!</span>`;
        } else if (isNew) {
            badgesHtml += `<span class="product-badge-new" style="right: auto; left: 12px;">NEW!</span>`;
        }
    } else {
        if (isHot) {
            badgesHtml += `<span class="product-badge-hot">🔥 HOT!</span>`;
        } else if (isNew) {
            badgesHtml += `<span class="product-badge-new">NEW!</span>`;
        }
    }

    // Giá hiển thị: nếu đang sale thì hiện giá sale nổi bật + giá gốc gạch ngang
    const priceHtml = isSale
        ? `
            <div class="price-wrap">
                <span class="price sale">${formatPrice(priceInfo.salePrice)}</span>
                <span class="price-original">${formatPrice(priceInfo.originalPrice)}</span>
            </div>
          `
        : `
            <div class="price-wrap">
                <span class="price">${formatPrice(product.price)}</span>
            </div>
          `;

    return `
        <article class="product-card ${isSoldOut ? 'is-sold-out' : ''} ${isSale ? 'is-on-sale' : ''}">
            <a href="./pages/product-detail.html?id=${product.id}" class="product-image" title="Xem chi tiết: ${product.name}">
                <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80'">
                <span class="product-category-tag">${specificTag}</span>
                ${badgesHtml}
                <button type="button" class="btn-wishlist-toggle ${isWishlisted ? 'active' : ''}" data-wishlist-id="${product.id}" title="${isWishlisted ? 'Bỏ thích' : 'Thêm vào yêu thích'}" aria-label="Yêu thích">
                    ${isWishlisted ? '❤️' : '🤍'}
                </button>
                ${isSoldOut
                    ? '<span class="product-stock-tag tag-out">Hết hàng</span>'
                    : (isLowStock ? `<span class="product-stock-tag tag-low">Chỉ còn ${stock}</span>` : '')}
            </a>
            <div class="product-info">
                <p class="product-author">${product.author || 'Tác giả tuyển chọn'}</p>
                <h3 title="${product.name}">
                    <a href="./pages/product-detail.html?id=${product.id}">
                        ${product.name}
                    </a>
                </h3>
                <p class="description">${product.description || ''}</p>
                
                <!-- Hàng thống kê: Số sao đánh giá & Số lượng đã bán (gọn gàng, không chiếm chỗ) -->
                <div class="product-card-stat">
                    <span class="stat-star" title="${rData.total} lượt đánh giá">⭐ ${rData.average}</span>
                    <span class="stat-sold">Đã bán ${soldCount}</span>
                </div>

                <div class="product-bottom">
                    ${priceHtml}
                    <button class="add-cart" data-id="${product.id}" title="Thêm vào giỏ" ${isSoldOut ? 'disabled' : ''}>
                        ${isSoldOut ? 'Hết hàng' : '+ Giỏ hàng'}
                    </button>
                </div>
            </div>
        </article>
    `;
}

// 3. Khởi động đồng hồ đếm ngược Realtime Flash Sale (đếm từng giây)
function startSaleCountdownTimer() {
    if (saleCountdownTimer) {
        clearInterval(saleCountdownTimer);
        saleCountdownTimer = null;
    }

    if (!isSaleActive || !saleConfig) return;

    function tick() {
        const remaining = saleService.getTimeRemaining(saleConfig);

        if (remaining.isExpired) {
            // Đợt sale đã kết thúc theo thời gian thực!
            if (saleCountdownTimer) {
                clearInterval(saleCountdownTimer);
                saleCountdownTimer = null;
            }
            isSaleActive = false;

            if (saleCountdownStatusText) {
                saleCountdownStatusText.textContent = 'ĐỢT SALE ĐÃ KẾT THÚC';
            }
            if (clockHours) clockHours.textContent = '00';
            if (clockMinutes) clockMinutes.textContent = '00';
            if (clockSeconds) clockSeconds.textContent = '00';

            // Ẩn section sale tức thì
            if (saleProductsSection) {
                saleProductsSection.style.display = 'none';
            }

            // Render lại toàn bộ các khu vực khác để giá sale tự động hồi phục về giá niêm yết mà không cần reload
            renderNewProducts(allProducts);
            renderHotProducts(allProducts);
            renderCategoryCarousels(allCategories, allProducts);
            if (searchResultsSection && searchResultsSection.style.display !== 'none') {
                handleSearch();
            }
            return;
        }

        if (remaining.isUpcoming) {
            if (saleCountdownStatusText) saleCountdownStatusText.textContent = '⚡ SẮP BẮT ĐẦU';
            return;
        }

        if (saleCountdownStatusText) {
            saleCountdownStatusText.textContent = 'FLASH SALE KẾT THÚC SAU';
        }

        if (remaining.days > 0) {
            if (clockDaysUnit) clockDaysUnit.style.display = 'flex';
            if (clockDaysSep) clockDaysSep.style.display = 'inline-block';
            if (clockDays) clockDays.textContent = String(remaining.days).padStart(2, '0');
        } else {
            if (clockDaysUnit) clockDaysUnit.style.display = 'none';
            if (clockDaysSep) clockDaysSep.style.display = 'none';
        }

        if (clockHours) clockHours.textContent = String(remaining.hours).padStart(2, '0');
        if (clockMinutes) clockMinutes.textContent = String(remaining.minutes).padStart(2, '0');
        if (clockSeconds) clockSeconds.textContent = String(remaining.seconds).padStart(2, '0');
    }

    // Chạy tick ngay lập tức và duy trì mỗi 1 giây
    tick();
    saleCountdownTimer = setInterval(tick, 1000);
}

// 3.1 Render Mục Sản phẩm đang Sale (Hiển thị trong thời gian diễn ra đợt Sale)
function renderSaleProducts(products, config) {
    if (!saleProductsSection || !saleProductList) return;

    if (!isSaleActive) {
        saleProductsSection.style.display = 'none';
        if (saleCountdownTimer) clearInterval(saleCountdownTimer);
        return;
    }

    // Lọc những sản phẩm được bật Sale và có % giảm giá > 0
    const saleList = products.filter(p => (p.onSale === true || p.onSale === 'true') && Number(p.discountPercent) > 0);

    if (saleList.length === 0) {
        saleProductsSection.style.display = 'none';
        if (saleCountdownTimer) clearInterval(saleCountdownTimer);
        return;
    }

    if (saleCampaignTitle && config && config.campaignName) {
        saleCampaignTitle.textContent = config.campaignName;
    }
    if (saleCampaignSubtitle && config && config.description) {
        saleCampaignSubtitle.textContent = config.description;
    }
    if (saleDateRangeText && config) {
        if (config.durationHours) {
            if (config.durationHours < 1) {
                const mins = Math.round(config.durationHours * 60 * 10) / 10;
                saleDateRangeText.textContent = `Chương trình Flash Sale ${mins} phút`;
            } else {
                saleDateRangeText.textContent = `Chương trình Flash Sale ${config.durationHours} tiếng`;
            }
        } else {
            const startStr = saleService.formatDateVn(config.startDate);
            const endStr = saleService.formatDateVn(config.endDate);
            saleDateRangeText.textContent = `${startStr} - ${endStr}`;
        }
    }

    saleProductList.innerHTML = saleList.map(createProductCardHtml).join('');
    saleProductsSection.style.display = 'block';

    // Bắt đầu đồng hồ đếm ngược Realtime
    startSaleCountdownTimer();
}

// 3.1. Render Mục Sản phẩm mới (Hệ thống tự động lọc theo ngày nhập kho hoặc cờ isNew do Admin/Seller quản lý)
function renderNewProducts(products) {
    if (!newProductList) return;

    // Sắp xếp toàn bộ sách theo thứ tự thời điểm nhập sách mới nhất (importDate giảm dần)
    const sortedByDate = [...products].sort((a, b) => {
        const timeA = new Date(a.importDate || 0).getTime();
        const timeB = new Date(b.importDate || 0).getTime();
        return timeB - timeA;
    });

    // Lọc các sách thỏa mãn điều kiện sách mới:
    // - Admin hoặc Seller đánh dấu isNew: true
    // - HOẶC thời điểm nhập kho trong vòng 60 ngày gần nhất (và không bị tắt isNew: false)
    const eligibleNewBooks = sortedByDate.filter(p => {
        if (p.isNew === true) return true;
        if (p.isNew === false) return false;
        if (p.importDate) {
            const diffDays = (Date.now() - new Date(p.importDate).getTime()) / (1000 * 60 * 60 * 24);
            return diffDays >= -7 && diffDays <= 60;
        }
        return false;
    });

    // Nếu có sách mới thực tế, hiển thị các cuốn đó (tối đa 8 cuốn).
    // Nếu chưa đủ 4 cuốn, lấy thêm các sách có ngày nhập mới nhất để lấp đầy kệ trang chủ.
    const displayList = eligibleNewBooks.length >= 4 
        ? eligibleNewBooks.slice(0, 8) 
        : sortedByDate.slice(0, 4);

    // Lưu lại ID để gắn badge NEW! lên tất cả các nơi
    newProductIds = new Set(displayList.map(p => Number(p.id)));
    // Đồng thời thêm tất cả các sách được Admin/Seller chủ động gắn cờ isNew: true vào Set
    products.forEach(p => {
        if (p.isNew === true) newProductIds.add(Number(p.id));
    });

    newProductList.innerHTML = displayList.map(createProductCardHtml).join('');
}

// 3.5. Render Mục Sản phẩm nổi bật (Tối đa 4 sản phẩm bán chạy nhất / HOT)
function renderHotProducts(products) {
    if (!hotProductList) return;

    // Sắp xếp giảm dần theo số lượng sách đã bán (soldCount)
    const sorted = [...products].sort((a, b) => {
        const soldA = Number(a.soldCount) || 0;
        const soldB = Number(b.soldCount) || 0;
        return soldB - soldA;
    });

    // Chỉ lấy tối đa 4 sản phẩm bán chạy nhất
    const top4Hot = sorted.slice(0, 4);

    // Lưu lại ID để gắn badge HOT! lên tất cả các nơi
    hotProductIds = new Set(top4Hot.map(p => Number(p.id)));

    hotProductList.innerHTML = top4Hot.map(createProductCardHtml).join('');
}

// 4. Render các Carousel theo từng thể loại (Lọc đúng thể loại đang chọn nếu có)
function renderCategoryCarousels(categories, products) {
    if (!categoryCarouselsContainer) return;

    // Nếu chọn "Tất cả" (0) thì hiển thị tất cả các thể loại, ngược lại chỉ hiển thị đúng thể loại được chọn
    const categoriesToRender = selectedCategoryId === 0
        ? categories
        : categories.filter(cat => Number(cat.id) === selectedCategoryId);

    let html = '';

    categoriesToRender.forEach(cat => {
        const catId = Number(cat.id);
        const booksInCat = products.filter(p => Number(p.categoryId) === catId);

        if (booksInCat.length === 0) return;

        // Lazy render: mỗi kệ chỉ render CAROUSEL_CHUNK_SIZE cuốn đầu tiên vào DOM,
        // phần còn lại được nạp thêm khi người dùng cuộn tới cuối hàng.
        const remembered = carouselRenderedCount.get(catId) || CAROUSEL_CHUNK_SIZE;
        const visibleCount = Math.min(Math.max(remembered, CAROUSEL_CHUNK_SIZE), booksInCat.length);
        carouselRenderedCount.set(catId, visibleCount);

        html += `
            <div class="category-block" id="category-block-${catId}">
                <div class="category-block-header">
                    <div class="category-block-title">
                        <span class="cat-icon">${cat.icon || '📖'}</span>
                        <h3>${cat.name}</h3>
                        <span class="cat-count">(${booksInCat.length} cuốn)</span>
                    </div>
                    <div class="carousel-nav-controls">
                        <button type="button" class="carousel-btn prev" data-track-id="track-${catId}" title="Cuộn xem trước">‹</button>
                        <button type="button" class="carousel-btn next" data-track-id="track-${catId}" title="Cuộn xem tiếp">›</button>
                    </div>
                </div>
                <div class="carousel-container">
                    <div class="carousel-track" id="track-${catId}">
                        ${booksInCat.slice(0, visibleCount).map(createProductCardHtml).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    if (html === '') {
        html = `
            <div style="text-align: center; padding: 48px 24px; background: #fff; border-radius: 16px; border: 1px dashed #cbd5e1; margin: 20px 0;">
                <p style="font-size: 1.05rem; color: #64748b; margin-bottom: 8px;">📖 Hiện chưa có cuốn sách nào trong thể loại này.</p>
                <span style="font-size: 0.875rem; color: #94a3b8;">Vui lòng chọn thể loại khác hoặc bấm "Tất cả kệ sách"!</span>
            </div>
        `;
    }

    categoryCarouselsContainer.innerHTML = html;
}

/**
 * Nạp thêm sách vào một kệ Carousel khi người dùng cuộn tới gần cuối hàng.
 * Chỉ thêm thẻ sản phẩm vào DOM khi thật sự cần xem -> DOM nhẹ hơn nhiều.
 * @param {number} catId ID thể loại (tương ứng với track-${catId})
 */
function loadMoreCarouselItems(catId) {
    const booksInCat = allProducts.filter(p => Number(p.categoryId) === Number(catId));
    const rendered = carouselRenderedCount.get(catId) || CAROUSEL_CHUNK_SIZE;

    // Đã hiển thị hết sách của thể loại này
    if (rendered >= booksInCat.length) return;

    const track = document.getElementById(`track-${catId}`);
    if (!track) return;

    const nextChunk = booksInCat.slice(rendered, rendered + CAROUSEL_CHUNK_SIZE);
    track.insertAdjacentHTML('beforeend', nextChunk.map(createProductCardHtml).join(''));

    carouselRenderedCount.set(catId, rendered + nextChunk.length);
}

// Lazy render: tự nạp thêm sách khi người dùng cuộn carousel tới gần cuối hàng.
// Dùng capture vì sự kiện 'scroll' không lan (bubble) ra phần tử cha.
if (categoryCarouselsContainer) {
    categoryCarouselsContainer.addEventListener('scroll', (e) => {
        const track = e.target.closest('.carousel-track');
        if (!track) return;

        const remaining = track.scrollWidth - track.clientWidth - track.scrollLeft;
        if (remaining <= 120) {
            const catId = Number(track.id.replace('track-', ''));
            if (Number.isFinite(catId)) loadMoreCarouselItems(catId);
        }
    }, { passive: true, capture: true });
}

// 5. Tải danh sách sản phẩm và đánh giá từ Service
async function loadProducts() {
    try {
        if (loadingElement) loadingElement.classList.remove('hidden');
        if (errorElement) errorElement.classList.add('hidden');

        // Tải song song danh sách sản phẩm, đánh giá và cấu hình đợt Sale
        const [products, reviews, fetchedSaleConfig] = await Promise.all([
            productService.getAll(),
            reviewService.getAll().catch(() => []),
            saleService.getConfig().catch(() => null)
        ]);

        allProducts = products;
        saleConfig = fetchedSaleConfig;
        isSaleActive = saleService.isSaleActive(saleConfig);

        // Tính toán phân bổ đánh giá sao cho từng sản phẩm
        const reviewByProd = new Map();
        reviews.forEach(r => {
            const pid = Number(r.productId);
            if (!reviewByProd.has(pid)) reviewByProd.set(pid, []);
            reviewByProd.get(pid).push(r);
        });
        reviewByProd.forEach((revList, pid) => {
            productRatingMap.set(pid, reviewService.calcStats(revList));
        });

        if (loadingElement) loadingElement.classList.add('hidden');

        // Render các sản phẩm đang Sale (Flash Sale trong ngày diễn ra đợt Sale)
        renderSaleProducts(allProducts, saleConfig);

        // Render 4 sản phẩm bán chạy nhất (HOT)
        renderHotProducts(allProducts);

        // Render 4 sản phẩm mới nhất trước (NEW)
        renderNewProducts(allProducts);

        // Render các Carousel theo từng thể loại
        renderCategoryCarousels(allCategories, allProducts);

        // Thiết lập hero slider
        setupHeroSlider(allProducts);
    } catch (error) {
        console.error('Không thể lấy danh sách sản phẩm:', error);
        if (loadingElement) loadingElement.classList.add('hidden');
        if (errorElement) errorElement.classList.remove('hidden');
    }
}

// 6. Xử lý Tìm kiếm thời gian thực
function handleSearch() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (!query) {
        // Đóng kết quả tìm kiếm, hiển thị lại bình thường
        if (searchResultsSection) searchResultsSection.style.display = 'none';
        if (categoryCarouselsContainer) categoryCarouselsContainer.style.display = 'flex';
        if (saleProductsSection && isSaleActive) saleProductsSection.style.display = 'block';
        if (newProductsSection) newProductsSection.style.display = 'block';
        if (hotProductsSection) hotProductsSection.style.display = 'block';

        currentSearchResults = [];
        searchVisibleCount = 0;
        if (searchLoadMoreWrap) searchLoadMoreWrap.style.display = 'none';
        return;
    }

    // Khi có từ khóa tìm kiếm:
    if (saleProductsSection) saleProductsSection.style.display = 'none';
    if (newProductsSection) newProductsSection.style.display = 'none';
    if (hotProductsSection) hotProductsSection.style.display = 'none';
    if (categoryCarouselsContainer) categoryCarouselsContainer.style.display = 'none';
    if (searchResultsSection) searchResultsSection.style.display = 'block';

    const filtered = allProducts.filter(p => {
        const name = (p.name || '').toLowerCase();
        const author = (p.author || '').toLowerCase();
        const tag = (p.tag || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(query) || author.includes(query) || tag.includes(query) || desc.includes(query);
    });

    // Lưu kết quả và đặt lại số lượng hiển thị về lần đầu
    currentSearchResults = filtered;
    searchVisibleCount = SEARCH_PAGE_SIZE;

    if (searchResultsTitle) {
        searchResultsTitle.textContent = `🔍 Kết quả tìm kiếm (${filtered.length} cuốn sách)`;
    }

    renderSearchResults();
}

/**
 * Render danh sách kết quả tìm kiếm (hiển thị từng phần, bấm "Xem thêm" để tải tiếp)
 */
function renderSearchResults() {
    if (!searchProductList) return;

    const total = currentSearchResults.length;

    if (total === 0) {
        searchProductList.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #fff; border-radius: 16px; border: 1px dashed #cbd5e1;">
                <p style="font-size: 1.1rem; color: #64748b; margin-bottom: 8px;">🔍 Không tìm thấy cuốn sách nào khớp với từ khóa "${escapeHtml(searchInput ? searchInput.value.trim() : '')}".</p>
                <span style="font-size: 0.9rem; color: #94a3b8;">Vui lòng thử tìm kiếm bằng tên sách, tác giả hoặc thể loại khác!</span>
            </div>
        `;
        if (searchLoadMoreWrap) searchLoadMoreWrap.style.display = 'none';
        return;
    }

    const visible = currentSearchResults.slice(0, searchVisibleCount);
    searchProductList.innerHTML = visible.map(createProductCardHtml).join('');

    // Hiện nút "Xem thêm" khi vẫn còn sách chưa hiển thị
    if (searchLoadMoreWrap) {
        const remaining = total - visible.length;
        if (remaining > 0) {
            searchLoadMoreWrap.style.display = 'flex';
            if (btnLoadMoreSearch) {
                btnLoadMoreSearch.textContent = `⬇️ Xem thêm ${Math.min(SEARCH_PAGE_SIZE, remaining)} cuốn nữa (còn ${remaining} cuốn)`;
            }
        } else {
            searchLoadMoreWrap.style.display = 'none';
        }
    }
}

if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
}
if (searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
}
if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        handleSearch();
    });
}
if (btnLoadMoreSearch) {
    btnLoadMoreSearch.addEventListener('click', () => {
        searchVisibleCount += SEARCH_PAGE_SIZE;
        renderSearchResults();
    });
}

// 7. Sự kiện chuyển động Carousel (Nút Prev / Next)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.carousel-btn');
    if (!btn) return;

    const trackId = btn.dataset.trackId;
    const track = document.getElementById(trackId);
    if (!track) return;

    const isNext = btn.classList.contains('next');
    const scrollAmount = track.clientWidth * 0.75;

    track.scrollBy({
        left: isNext ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
    });
});


// 8. Sự kiện click trên danh mục Tabs (Chỉ hiển thị Carousel của thể loại được chọn)
if (categoryList) {
    categoryList.addEventListener('click', (event) => {
        const button = event.target.closest('[data-category]');
        if (!button) return;

        selectedCategoryId = Number(button.dataset.category);
        renderCategories(allCategories);

        // Nếu đang mở tìm kiếm, đóng lại
        if (searchInput) searchInput.value = '';
        handleSearch();

        // Hiển thị duy nhất kệ Carousel tương ứng ngay tại vị trí hiện tại
        renderCategoryCarousels(allCategories, allProducts);
    });
}

// 9. Cập nhật Badge số lượng giỏ hàng
function updateCartBadge() {
    if (!cartCount) return;
    const items = cartService.getCart();
    const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    cartCount.textContent = totalQuantity;
}

// 10. Sự kiện thêm vào giỏ hàng (Toàn trang)
document.addEventListener('click', async (e) => {
    const addBtn = e.target.closest('.add-cart');
    if (!addBtn || addBtn.disabled) return;

    // Ngăn chặn nổi bọt sự kiện và ngăn hành vi mặc định
    e.preventDefault();
    e.stopPropagation();

    const id = addBtn.dataset.id;
    const product = allProducts.find(p => Number(p.id) === Number(id));

    if (product) {
        const originalText = addBtn.textContent;
        const currentInCart = cartService.getItemQuantity(product.id);
        const maxStock = Number(product.stock);

        if (Number.isFinite(maxStock) && currentInCart >= maxStock) {
            addBtn.textContent = 'Đã đạt tối đa';
            setTimeout(() => { addBtn.textContent = originalText; }, 1200);
            return;
        }

        const priceInfo = saleService.getPriceInfo(product, isSaleActive);
        const productToAdd = priceInfo.isSale ? { ...product, price: priceInfo.salePrice } : product;
        const res = cartService.addToCart(productToAdd, 1);
        if (!res || res.added <= 0) {
            addBtn.textContent = 'Đã đạt tối đa';
            setTimeout(() => { addBtn.textContent = originalText; }, 1200);
            return;
        }

        updateCartBadge();

        if (cartCount) {
            cartCount.style.transform = 'scale(1.35)';
            setTimeout(() => {
                cartCount.style.transform = 'scale(1)';
            }, 200);
        }

        addBtn.textContent = '✓ Đã thêm';
        addBtn.style.background = '#10b981';
        addBtn.style.color = '#fff';

        setTimeout(() => {
            addBtn.textContent = originalText;
            addBtn.style.background = '';
            addBtn.style.color = '';
        }, 1200);
    }
});

// 10.1 Click vào bất kỳ vị trí nào trên thẻ sản phẩm để vào xem chi tiết sách (trừ nút thêm giỏ và link)
document.addEventListener('click', (e) => {
    if (e.target.closest('.add-cart') || e.target.closest('a')) return;

    const card = e.target.closest('.product-card');
    if (!card) return;

    const detailLink = card.querySelector('a.product-image');
    if (detailLink && detailLink.href) {
        window.location.href = detailLink.href;
    }
});

// 11. Đồng bộ trạng thái người dùng đăng nhập
function setupCurrentUser() {
    const user = authService.getCurrentUser();

    if (user) {
        const displayName = user.shopName || user.name || user.email;
        if (userName) userName.textContent = displayName;
        if (userDropdownFullName) userDropdownFullName.textContent = displayName;

        // Avatar
        if (userAvatarWrap) {
            if (user.avatar && user.avatar.trim() !== '') {
                userAvatarWrap.innerHTML = `<img src="${user.avatar}" alt="Avatar">`;
            } else {
                userAvatarWrap.textContent = '👤';
            }
        }

        // Badge vai trò & hiển thị các mục tương ứng trong dropdown
        if (userRoleBadge) {
            userRoleBadge.className = 'user-role-badge';
            if (user.role === 'admin') {
                userRoleBadge.textContent = '👑 Quản trị viên';
                userRoleBadge.classList.add('admin');
            } else if (user.role === 'seller') {
                userRoleBadge.textContent = '🏪 Người bán';
                userRoleBadge.classList.add('seller');
            } else {
                userRoleBadge.textContent = 'Khách hàng';
            }
        }

        // Phân quyền link Kênh Người Bán & Trang Quản Trị trong Dropdown: tách bạch hoàn toàn
        if (sellerPortalLink) {
            sellerPortalLink.style.display = user.role === 'seller' ? 'flex' : 'none';
        }
        if (adminPortalLink) {
            adminPortalLink.style.display = user.role === 'admin' ? 'flex' : 'none';
        }

        if (userDropdownWrap) userDropdownWrap.style.display = 'inline-block';
        if (authLinks) authLinks.style.display = 'none';
    } else {
        if (userDropdownWrap) {
            userDropdownWrap.style.display = 'none';
            userDropdownWrap.classList.remove('open');
        }
        if (authLinks) authLinks.style.display = 'flex';
    }

    // Cập nhật lại menu động (ẩn/hiển thị mục Đơn hàng khi đăng nhập)
    loadAndRenderMenu();
    loadUserWishlistStatus();
}

// Cập nhật số lượng sách yêu thích trên Header
function updateWishlistHeaderCount() {
    if (!wishlistCount) return;
    wishlistCount.textContent = userWishlistProductIds.size;
}

// Tải danh sách yêu thích của người dùng
async function loadUserWishlistStatus() {
    const user = authService.getCurrentUser();
    if (user) {
        try {
            userWishlistProductIds = await wishlistService.getUserWishlistProductIds(user.id);
        } catch {
            userWishlistProductIds = new Set();
        }
    } else {
        userWishlistProductIds = new Set();
    }
    updateWishlistHeaderCount();
}

// Lắng nghe sự kiện click Thả tim yêu thích trên toàn bộ các thẻ sách
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-wishlist-toggle');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const user = authService.getCurrentUser();
    if (!user) {
        alert('Vui lòng đăng nhập để lưu cuốn sách này vào danh sách Yêu thích của bạn!');
        window.location.href = './pages/login.html';
        return;
    }

    const productId = Number(btn.getAttribute('data-wishlist-id'));
    if (!productId) return;

    btn.disabled = true;
    try {
        const result = await wishlistService.toggleWishlist(user.id, productId);
        if (result.isWishlisted) {
            userWishlistProductIds.add(productId);
        } else {
            userWishlistProductIds.delete(productId);
        }

        // Cập nhật icon trên mọi thẻ sách tương ứng
        document.querySelectorAll(`.btn-wishlist-toggle[data-wishlist-id="${productId}"]`).forEach(b => {
            b.innerHTML = result.isWishlisted ? '❤️' : '🤍';
            b.classList.toggle('active', result.isWishlisted);
            b.title = result.isWishlisted ? 'Bỏ thích' : 'Thêm vào yêu thích';
        });

        updateWishlistHeaderCount();
    } catch (err) {
        console.error('Lỗi khi thao tác yêu thích:', err);
    } finally {
        btn.disabled = false;
    }
});

// 12. Sự kiện Dropdown và Đăng xuất
if (userDropdownBtn && userDropdownWrap) {
    userDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdownWrap.classList.toggle('open');
        const isOpen = userDropdownWrap.classList.contains('open');
        userDropdownBtn.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', (e) => {
        if (!userDropdownWrap.contains(e.target)) {
            userDropdownWrap.classList.remove('open');
            userDropdownBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        authService.logout();
        setupCurrentUser();
    });
}

// 13. Hero Slider
let heroSlideIndex = 0;
let heroSlideInterval = null;

function setupHeroSlider(products) {
    if (!products || products.length === 0) return;

    const heroBookLink = document.querySelector('#heroBookLink');
    const heroBookImg = document.querySelector('#heroBookImg');
    const heroBookTitle = document.querySelector('#heroBookTitle');
    const heroBookPrice = document.querySelector('#heroBookPrice');

    if (!heroBookLink || !heroBookImg) return;

    function renderSlide(index) {
        const item = products[index];
        if (!item) return;

        heroBookImg.style.opacity = '0.3';

        setTimeout(() => {
            heroBookImg.src = item.image;
            heroBookImg.alt = item.name;
            if (heroBookTitle) heroBookTitle.textContent = item.name;
            if (heroBookPrice) heroBookPrice.textContent = formatPrice(item.price);
            heroBookLink.href = `./pages/product-detail.html?id=${item.id}`;
            heroBookImg.style.opacity = '1';
        }, 200);
    }

    renderSlide(0);

    function startAutoSlide() {
        if (heroSlideInterval) clearInterval(heroSlideInterval);
        heroSlideInterval = setInterval(() => {
            heroSlideIndex = (heroSlideIndex + 1) % products.length;
            renderSlide(heroSlideIndex);
        }, 3500);
    }

    startAutoSlide();

    heroBookLink.addEventListener('mouseenter', () => {
        if (heroSlideInterval) clearInterval(heroSlideInterval);
    });

    heroBookLink.addEventListener('mouseleave', () => {
        startAutoSlide();
    });
}

// Khởi chạy ứng dụng Trang chủ
async function init() {
    setupCurrentUser();
    updateCartBadge();
    if (searchInput) searchInput.value = '';
    await loadCategories();
    await loadAndRenderMenu();
    await loadProducts();
    initNotificationBell();
    initInternalChat();
    initChatbot();
}

init();
