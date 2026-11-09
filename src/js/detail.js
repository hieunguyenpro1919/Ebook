import { productService } from '../services/productService.js';
import { cartService } from '../services/cartService.js';
import { reviewService } from '../services/reviewService.js';
import { authService } from '../services/authService.js';
import { saleService } from '../services/saleService.js';
import { wishlistService } from '../services/wishlistService.js';
import { formatPrice } from '../utils/format.js';
import { initChatbot } from './chatWidget.js';
import { initNotificationBell } from './notificationBell.js';
import { initInternalChat } from './internalChat.js';
import './themeToggle.js';

const detailContainer = document.querySelector('#productDetail');
const loadingElement = document.querySelector('#loading');
const errorElement = document.querySelector('#error');

let currentProduct = null;
let currentReviews = [];
let selectedRating = 5;

// 1. Lấy số lượng tồn kho của sản phẩm
function getStock(product) {
    const stock = Number(product.stock);
    return Number.isFinite(stock) && stock > 0 ? stock : 0;
}

// 2. Helper tạo chuỗi ngôi sao vàng
function renderStarsHtml(rating) {
    const rounded = Math.round(Number(rating) || 5);
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<span class="star-icon ${i <= rounded ? 'filled' : 'empty'}">★</span>`;
    }
    return html;
}

// 3. Helper format thời gian
function formatTimeAgo(isoString) {
    if (!isoString) return 'Gần đây';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return 'Gần đây';
    }
}

// 4. Sinh HTML phần chọn số lượng + tồn kho
function renderStockAndQuantity(product, effectivePrice) {
    const stock = getStock(product);
    const isSoldOut = stock === 0;
    const canBuy = !isSoldOut;
    const unitPrice = Number(effectivePrice) || Number(product.price);

    return `
        <div class="stock-box ${isSoldOut ? 'stock-out' : (stock <= 5 ? 'stock-low' : '')}">
            <span class="stock-icon">${isSoldOut ? '❌' : (stock <= 5 ? '⚠️' : '✅')}</span>
            <span class="stock-text">
                ${isSoldOut ? 'Tạm hết hàng' : (stock <= 5 ? `Chỉ còn ${stock} cuốn trong kho` : `Còn hàng (${stock} cuốn)`)}
            </span>
        </div>

        ${canBuy ? `
        <div class="qty-picker">
            <label class="qty-picker-label">Số lượng mua:</label>
            <div class="qty-picker-control">
                <button type="button" class="qty-btn" id="qtyMinus" aria-label="Giảm số lượng">−</button>
                <input type="number" class="qty-input" id="qtyInput"
                       value="1" min="1" max="${stock}" inputmode="numeric">
                <button type="button" class="qty-btn" id="qtyPlus" aria-label="Tăng số lượng">+</button>
                <span class="qty-max-hint">Tối đa ${stock}</span>
            </div>
        </div>

        <div class="detail-total-box">
            <span class="detail-total-label">Thành tiền:</span>
            <span class="detail-total-value" id="detailTotalValue">${formatPrice(unitPrice)}</span>
        </div>
        ` : ''}
    `;
}

// 5. Sinh HTML danh sách đánh giá & bình luận (Hỗ trợ Like và Trả lời lồng nhau)
function renderReviewsListHtml(reviews) {
    if (!reviews || reviews.length === 0) {
        return `
            <div class="no-reviews-box">
                <p>💬 Chưa có nhận xét nào cho cuốn sách này. Hãy là người đầu tiên chia sẻ cảm nhận của bạn!</p>
            </div>
        `;
    }

    const currentUser = authService.getCurrentUser();

    return reviews.map(r => {
        const likes = Array.isArray(r.likes) ? r.likes : [];
        const replies = Array.isArray(r.replies) ? r.replies : [];
        const hasLiked = currentUser && likes.some(id => String(id) === String(currentUser.id));
        const likeCount = likes.length;

        return `
        <div class="review-item-card" data-review-id="${r.id}">
            <div class="review-item-header">
                <div class="reviewer-avatar">
                    ${(r.userName || 'B')[0].toUpperCase()}
                </div>
                <div class="reviewer-meta">
                    <strong class="reviewer-name">${r.userName || 'Độc giả ẩn danh'}</strong>
                    <div class="reviewer-stars">
                        ${renderStarsHtml(r.rating)}
                        <span class="review-date">${formatTimeAgo(r.createdAt)}</span>
                    </div>
                </div>
            </div>
            <div class="review-content">
                <p>${r.comment || 'Người mua không để lại nhận xét bằng lời.'}</p>
            </div>

            <!-- Thanh tương tác: Nút Like & Trả lời bình luận -->
            <div class="review-actions-bar">
                <button type="button" class="btn-review-action btn-like-review ${hasLiked ? 'liked' : ''}" data-review-id="${r.id}">
                    <span class="like-icon">${hasLiked ? '❤️' : '🤍'}</span>
                    <span class="like-label">${hasLiked ? 'Đã thích' : 'Thích'}</span>
                    <span class="like-count">(${likeCount})</span>
                </button>
                <button type="button" class="btn-review-action btn-toggle-reply" data-review-id="${r.id}">
                    💬 Trả lời ${replies.length > 0 ? `<span class="reply-badge">(${replies.length})</span>` : ''}
                </button>
            </div>

            <!-- Danh sách câu trả lời lồng nhau -->
            <div class="replies-wrapper" id="repliesWrap-${r.id}">
                <div class="replies-list" id="repliesList-${r.id}">
                    ${replies.map(rep => `
                        <div class="reply-item">
                            <div class="reply-avatar">${(rep.userName || 'B')[0].toUpperCase()}</div>
                            <div class="reply-body">
                                <div class="reply-header">
                                    <strong class="reply-name">${rep.userName || 'Bạn đọc'}</strong>
                                    <span class="reply-date">${formatTimeAgo(rep.createdAt)}</span>
                                </div>
                                <div class="reply-text">${rep.comment}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Ô nhập câu trả lời (ẩn mặc định, bấm Trả lời để mở) -->
                <div class="reply-input-box hidden" id="replyBox-${r.id}">
                    <div class="reply-input-group">
                        <input type="text" class="reply-input-field" placeholder="Viết câu trả lời của bạn..." data-review-id="${r.id}" />
                        <button type="button" class="btn-send-reply" data-review-id="${r.id}">Gửi</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// 5.1 Helper sinh giao diện hộp bình luận (Bỏ chặn spam: người dùng thích nhắn bao nhiêu bình luận cũng được)
function renderReviewBoxHtml(currentUser, reviews, product) {
    if (!currentUser) {
        return `
            <div class="login-required-review-box">
                <div class="login-req-icon">💬</div>
                <div class="login-req-content">
                    <h4>Vui lòng đăng nhập để bình luận & đánh giá</h4>
                    <p>Hãy chia sẻ cảm nhận của bạn về cuốn sách để cộng đồng độc giả cùng thảo luận!</p>
                    <a href="./login.html" class="btn-login-to-review">🔑 Đăng nhập ngay</a>
                </div>
            </div>
        `;
    }

    return `
        <div class="review-form-card" id="reviewFormCard">
            <div class="review-form-header">
                <h3>✍️ Viết bình luận & đánh giá của bạn</h3>
                <span class="review-account-tag">👤 <strong>${currentUser.name || currentUser.email}</strong></span>
            </div>
            <form id="reviewForm" class="review-form">
                <div class="form-rating-picker">
                    <label class="rating-label">Mức độ hài lòng của bạn:</label>
                    <div class="star-picker" id="starPicker">
                        <button type="button" class="star-btn active" data-val="1">★</button>
                        <button type="button" class="star-btn active" data-val="2">★</button>
                        <button type="button" class="star-btn active" data-val="3">★</button>
                        <button type="button" class="star-btn active" data-val="4">★</button>
                        <button type="button" class="star-btn active" data-val="5">★</button>
                    </div>
                    <span class="star-hint" id="starHint">Rất tuyệt vời (5 sao)</span>
                </div>

                <div class="form-group-item">
                    <label for="reviewComment">Cảm nhận hoặc nhận xét về cuốn sách:</label>
                    <textarea
                        id="reviewComment"
                        rows="3"
                        placeholder="Hãy chia sẻ cảm nhận về nội dung sách, bài học ý nghĩa, hoặc đặt câu hỏi thảo luận..."
                        required
                    ></textarea>
                </div>

                <div class="form-action-row" style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                    <button type="submit" class="btn-submit-review" id="btnSubmitReview">
                        🚀 Gửi Bình Luận
                    </button>
                    <p class="review-submit-msg" id="reviewSubmitMsg"></p>
                </div>
            </form>
        </div>
    `;
}

// 6. Tải và render toàn bộ trang chi tiết
async function getProductDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        if (loadingElement) loadingElement.classList.add('hidden');
        if (errorElement) {
            errorElement.textContent = 'Mã sản phẩm không hợp lệ hoặc bị thiếu.';
            errorElement.classList.remove('hidden');
        }
        return;
    }

    try {
        if (loadingElement) loadingElement.classList.remove('hidden');
        if (errorElement) errorElement.classList.add('hidden');

        // Tải sản phẩm, đánh giá và cấu hình Sale song song
        const [product, reviews, saleConfig] = await Promise.all([
            productService.getById(id),
            reviewService.getByProductId(id),
            saleService.getConfig().catch(() => null)
        ]);

        currentProduct = product;
        currentReviews = reviews;

        if (loadingElement) loadingElement.classList.add('hidden');

        const stock = getStock(product);
        const isSoldOut = stock === 0;
        const soldCount = Number(product.soldCount) || 0;
        const stats = reviewService.calcStats(reviews);
        const currentUser = authService.getCurrentUser();

        // Kiểm tra xem cuốn sách này có đang trong đợt Sale hay không
        const isSaleCampaignActive = saleService.isSaleActive(saleConfig);
        const priceInfo = saleService.getPriceInfo(product, isSaleCampaignActive);

let detailSaleCountdownTimer = null;

function startDetailSaleCountdown(saleConfig) {
    if (detailSaleCountdownTimer) {
        clearInterval(detailSaleCountdownTimer);
        detailSaleCountdownTimer = null;
    }

    if (!saleConfig) return;

    function tick() {
        const rem = saleService.getTimeRemaining(saleConfig);
        const clockEl = document.querySelector('#detailSaleCountdown');

        if (rem.isExpired) {
            if (detailSaleCountdownTimer) {
                clearInterval(detailSaleCountdownTimer);
                detailSaleCountdownTimer = null;
            }
            // Tải lại trang chi tiết để giá quay về giá gốc
            getProductDetail();
            return;
        }

        if (clockEl) {
            clockEl.textContent = rem.formatted;
        }
    }

    tick();
    detailSaleCountdownTimer = setInterval(tick, 1000);
}

        // Khung giá hiển thị
        const priceBoxHtml = priceInfo.isSale
            ? `
                <div class="detail-sale-banner" id="detailSaleBanner">
                    <div class="detail-sale-banner-left">
                        <span class="live-pulse"></span>
                        <span>⚡ FLASH SALE GIỜ VÀNG</span>
                    </div>
                    <div class="detail-sale-countdown">
                        <span>Kết thúc sau:</span>
                        <strong id="detailSaleCountdown">00:00:00</strong>
                    </div>
                </div>

                <div class="detail-price-box on-sale">
                    <div class="detail-price-row">
                        <span class="detail-price-label">Giá ưu đãi:</span>
                        <span class="detail-price sale-price">${formatPrice(priceInfo.salePrice)}</span>
                        <span class="detail-sale-badge">⚡ GIẢM -${priceInfo.discountPercent}%</span>
                    </div>
                    <div class="detail-price-sub-row">
                        <span class="detail-original-price">Giá gốc: <del>${formatPrice(priceInfo.originalPrice)}</del></span>
                        <span class="detail-saved-pill">Tiết kiệm: ${formatPrice(priceInfo.savedAmount)}</span>
                    </div>
                </div>
              `
            : `
                <div class="detail-price-box">
                    <span class="detail-price-label">Giá bìa:</span>
                    <span class="detail-price">${formatPrice(product.price)}</span>
                </div>
              `;

        // Render toàn bộ nội dung chi tiết và khu vực đánh giá
        detailContainer.innerHTML = `
            <div class="product-detail-card">
                <div class="detail-image-box">
                    <img
                        src="${product.image}"
                        alt="${product.name}"
                        onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80'"
                    >
                    ${priceInfo.isSale ? `<span class="detail-floating-sale-badge">SALE -${priceInfo.discountPercent}%</span>` : ''}
                </div>
                <div class="detail-info">
                    <span class="detail-tag">${product.tag || 'Sách chọn lọc'}</span>
                    <h1>${product.name}</h1>
                    <p class="detail-author">Tác giả: <strong>${product.author || 'Đang cập nhật'}</strong></p>

                    <!-- Thống kê Sao và Số lượng đã bán -->
                    <div class="detail-stat-row">
                        <span class="detail-rating-pill">⭐ ${stats.average} / 5 (${stats.total} đánh giá)</span>
                        <span class="detail-sold-pill">🔥 Đã bán ${soldCount} cuốn</span>
                    </div>

                    ${priceBoxHtml}

                    ${renderStockAndQuantity(product, priceInfo.salePrice)}

                    <h3 class="detail-desc-title">Tóm tắt nội dung:</h3>
                    <p class="detail-description">${product.description || 'Chưa có thông tin mô tả chi tiết cho tựa sách này.'}</p>

                    <div class="detail-actions">
                        <button class="btn-buy" id="btnAddToCart" ${isSoldOut ? 'disabled' : ''}>
                            ${isSoldOut ? '❌ Tạm hết hàng' : '🛒 Thêm vào giỏ hàng'}
                        </button>
                        <button class="btn-buy btn-buy-now" id="btnBuyNow" ${isSoldOut ? 'disabled' : ''}>
                            ⚡ Mua ngay
                        </button>
                        <button type="button" class="btn-wishlist-detail" id="btnWishlistDetail" title="Lưu vào danh sách yêu thích">
                            <span id="detailHeartIcon">🤍</span>
                            <span id="detailWishlistText">Yêu thích</span>
                        </button>
                        <button type="button" class="btn-chat-seller-detail" id="btnChatSellerDetail" title="Nhắn tin với gian hàng">
                            💬 Chat với Shop
                        </button>
                        <a href="../index.html" class="btn-secondary">
                            Tiếp tục xem sách
                        </a>
                    </div>

                    <p class="detail-feedback" id="detailFeedback"></p>
                </div>
            </div>

            <!-- SECTION ĐÁNH GIÁ & NHẬN XÉT -->
            <section class="reviews-section" id="reviewsSection">
                <div class="reviews-section-header">
                    <h2>⭐ Đánh Giá & Nhận Xét Từ Độc Giả</h2>
                    <span class="reviews-sub-label">Những chia sẻ chân thực từ bạn đọc đã mua cuốn sách này</span>
                </div>

                <div class="reviews-overview-box">
                    <div class="overview-rating-score">
                        <span class="score-number">${stats.average}</span>
                        <div class="score-stars">
                            ${renderStarsHtml(stats.average)}
                        </div>
                        <span class="score-count">Dựa trên ${stats.total} lượt đánh giá</span>
                    </div>
                </div>

                <!-- HỘP ĐÁNH GIÁ (FORM / BADGE ĐÃ ĐÁNH GIÁ / ĐĂNG NHẬP) -->
                <div class="review-box-slot" id="reviewBoxSlot">
                    ${renderReviewBoxHtml(currentUser, currentReviews, product)}
                </div>

                <!-- DANH SÁCH BÌNH LUẬN -->
                <div class="reviews-list-container">
                    <h3 class="reviews-list-title">Độc giả nói gì về cuốn sách này (${currentReviews.length}):</h3>
                    <div class="reviews-list" id="reviewsList">
                        ${renderReviewsListHtml(currentReviews)}
                    </div>
                </div>
            </section>
        `;

        if (priceInfo.isSale) {
            startDetailSaleCountdown(saleConfig);
        }

        bindEvents(product, stock, priceInfo);
        bindReviewEvents(product);

    } catch (error) {
        console.error('Không thể lấy chi tiết sản phẩm:', error);
        if (loadingElement) loadingElement.classList.add('hidden');
        if (errorElement) {
            errorElement.textContent = 'Không tìm thấy cuốn sách này trên hệ thống.';
            errorElement.classList.remove('hidden');
        }
    }
}

// 7. Gắn sự kiện cho các nút mua hàng & số lượng
function bindEvents(product, stock, priceInfo = { isSale: false, salePrice: product.price }) {
    const btnAdd = document.querySelector('#btnAddToCart');
    const btnBuyNow = document.querySelector('#btnBuyNow');
    const qtyInput = document.querySelector('#qtyInput');
    const qtyMinus = document.querySelector('#qtyMinus');
    const qtyPlus = document.querySelector('#qtyPlus');
    const totalValue = document.querySelector('#detailTotalValue');
    const feedback = document.querySelector('#detailFeedback');
    const cartCount = document.querySelector('#cartCount');
    const effectiveUnitPrice = Number(priceInfo.salePrice) || Number(product.price);

    function updateCartBadge() {
        if (cartCount) cartCount.textContent = cartService.getTotalCount();
    }

    function getSelectedQty() {
        if (!qtyInput) return 1;
        let qty = parseInt(qtyInput.value, 10);
        if (!Number.isFinite(qty) || qty < 1) qty = 1;
        if (qty > stock) qty = stock;
        qtyInput.value = qty;
        return qty;
    }

    function refreshTotal() {
        if (totalValue) {
            totalValue.textContent = formatPrice(effectiveUnitPrice * getSelectedQty());
        }
    }

    function showFeedback(text, type = 'success') {
        if (!feedback) return;
        feedback.textContent = text;
        feedback.className = `detail-feedback ${type} show`;
    }

    if (qtyMinus) {
        qtyMinus.addEventListener('click', () => {
            qtyInput.value = Math.max(1, getSelectedQty() - 1);
            refreshTotal();
        });
    }

    if (qtyPlus) {
        qtyPlus.addEventListener('click', () => {
            qtyInput.value = Math.min(stock, getSelectedQty() + 1);
            refreshTotal();
            if (parseInt(qtyInput.value, 10) === stock) {
                showFeedback(`Đã đạt tối đa ${stock} cuốn trong kho.`, 'warning');
            }
        });
    }

    if (qtyInput) {
        qtyInput.addEventListener('change', () => {
            getSelectedQty();
            refreshTotal();
        });
        qtyInput.addEventListener('input', refreshTotal);
    }

    refreshTotal();
    updateCartBadge();
    window.addEventListener('cartUpdated', updateCartBadge);

    const productToPurchase = priceInfo.isSale ? { ...product, price: effectiveUnitPrice } : product;

    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            const qty = getSelectedQty();
            const result = cartService.addToCart(productToPurchase, qty);

            if (result.added <= 0) {
                showFeedback(`Bạn đã có tối đa ${stock} cuốn của tựa sách này trong giỏ.`, 'warning');
                return;
            }

            updateCartBadge();
            showFeedback(`✓ Đã thêm ${result.added} cuốn vào giỏ hàng!`, 'success');

            if (result.added < qty) {
                setTimeout(() => {
                    showFeedback(`Chỉ còn ${stock} cuốn trong kho, giỏ hàng đã được giới hạn tối đa.`, 'warning');
                }, 1600);
            }
        });
    }

    if (btnBuyNow) {
        btnBuyNow.addEventListener('click', () => {
            const qty = getSelectedQty();
            const result = cartService.addToCart(productToPurchase, qty);

            if (result.added <= 0) {
                showFeedback(`Bạn đã có tối đa ${stock} cuốn của tựa sách này trong giỏ.`, 'warning');
                return;
            }

            updateCartBadge();
            window.location.href = './cart.html';
        });
    }

    // Xử lý nút Thả tim Yêu thích trên trang chi tiết
    const btnWishlistDetail = document.querySelector('#btnWishlistDetail');
    const detailHeartIcon = document.querySelector('#detailHeartIcon');
    const detailWishlistText = document.querySelector('#detailWishlistText');

    async function syncWishlistState() {
        const user = authService.getCurrentUser();
        if (!user || !btnWishlistDetail) return;
        try {
            const wishlistIds = await wishlistService.getUserWishlistProductIds(user.id);
            const isWishlisted = wishlistIds.has(Number(product.id));
            btnWishlistDetail.classList.toggle('active', isWishlisted);
            if (detailHeartIcon) detailHeartIcon.textContent = isWishlisted ? '❤️' : '🤍';
            if (detailWishlistText) detailWishlistText.textContent = isWishlisted ? 'Đã thích' : 'Yêu thích';
        } catch (e) {
            console.warn('Lỗi kiểm tra wishlist:', e);
        }
    }

    if (btnWishlistDetail) {
        syncWishlistState();
        btnWishlistDetail.addEventListener('click', async () => {
            const user = authService.getCurrentUser();
            if (!user) {
                alert('Vui lòng đăng nhập để lưu cuốn sách này vào danh sách Yêu thích của bạn!');
                window.location.href = './login.html';
                return;
            }

            try {
                btnWishlistDetail.disabled = true;
                const result = await wishlistService.toggleWishlist(user.id, product.id);
                btnWishlistDetail.classList.toggle('active', result.isWishlisted);
                if (detailHeartIcon) detailHeartIcon.textContent = result.isWishlisted ? '❤️' : '🤍';
                if (detailWishlistText) detailWishlistText.textContent = result.isWishlisted ? 'Đã thích' : 'Yêu thích';
                showFeedback(result.isWishlisted ? '❤️ Đã thêm vào danh sách yêu thích của bạn!' : 'Đã xóa khỏi danh sách yêu thích.', 'success');
            } catch (err) {
                console.error('Lỗi khi thao tác wishlist:', err);
                showFeedback('Có lỗi xảy ra, vui lòng thử lại.', 'warning');
            } finally {
                btnWishlistDetail.disabled = false;
            }
        });
    }

    // Xử lý nút Chat với Shop trên trang chi tiết
    const btnChatSellerDetail = document.querySelector('#btnChatSellerDetail');
    if (btnChatSellerDetail) {
        btnChatSellerDetail.addEventListener('click', () => {
            const user = authService.getCurrentUser();
            if (!user) {
                alert('Vui lòng đăng nhập để trao đổi tin nhắn trực tiếp với gian hàng!');
                window.location.href = './login.html';
                return;
            }

            const sellerId = product.sellerId || 101;
            const sellerName = product.sellerName || 'Gian hàng đối tác';
            if (typeof window.openInternalChatWith === 'function') {
                window.openInternalChatWith(sellerId, sellerName);
            }
        });
    }
}

// 8. Gắn sự kiện chọn sao và gửi đánh giá
function bindReviewEvents(product) {
    const starPicker = document.querySelector('#starPicker');
    const starHint = document.querySelector('#starHint');
    const reviewForm = document.querySelector('#reviewForm');
    const reviewerNameInput = document.querySelector('#reviewerName');
    const reviewCommentInput = document.querySelector('#reviewComment');
    const btnSubmit = document.querySelector('#btnSubmitReview');
    const submitMsg = document.querySelector('#reviewSubmitMsg');

    const starHints = {
        1: 'Rất không hài lòng (1 sao)',
        2: 'Không hài lòng (2 sao)',
        3: 'Bình thường (3 sao)',
        4: 'Hài lòng (4 sao)',
        5: 'Rất tuyệt vời (5 sao)'
    };

    function updateStarsUi(starValue) {
        selectedRating = starValue;
        if (!starPicker) return;
        const buttons = starPicker.querySelectorAll('.star-btn');
        buttons.forEach(btn => {
            const val = Number(btn.dataset.val);
            if (val <= starValue) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        if (starHint) starHint.textContent = starHints[starValue] || `${starValue} sao`;
    }

    if (starPicker) {
        starPicker.addEventListener('click', (e) => {
            const btn = e.target.closest('.star-btn');
            if (btn) {
                const val = Number(btn.dataset.val);
                updateStarsUi(val);
            }
        });
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                alert('Vui lòng đăng nhập để gửi bình luận.');
                window.location.href = './login.html';
                return;
            }

            const comment = reviewCommentInput ? reviewCommentInput.value.trim() : '';
            if (!comment) {
                if (submitMsg) {
                    submitMsg.textContent = '⚠️ Vui lòng nhập nội dung cảm nhận của bạn về cuốn sách.';
                    submitMsg.className = 'review-submit-msg error show';
                }
                return;
            }

            try {
                if (btnSubmit) {
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = '⏳ Đang gửi bình luận...';
                }

                const newReview = await reviewService.create({
                    productId: Number(product.id),
                    userId: currentUser.id,
                    userName: currentUser.name || currentUser.email,
                    userEmail: currentUser.email || '',
                    rating: selectedRating,
                    comment,
                    likes: [],
                    replies: [],
                    createdAt: new Date().toISOString()
                });

                // Cập nhật danh sách hiển thị
                currentReviews.unshift(newReview);
                const reviewsList = document.querySelector('#reviewsList');
                if (reviewsList) {
                    reviewsList.innerHTML = renderReviewsListHtml(currentReviews);
                }

                // Cập nhật tiêu đề số lượng bình luận
                const reviewsListTitle = document.querySelector('.reviews-list-title');
                if (reviewsListTitle) {
                    reviewsListTitle.textContent = `Độc giả nói gì về cuốn sách này (${currentReviews.length}):`;
                }

                // Cập nhật lại điểm số trung bình ở overview và header
                const updatedStats = reviewService.calcStats(currentReviews);
                const scoreNumber = document.querySelector('.score-number');
                if (scoreNumber) scoreNumber.textContent = updatedStats.average;
                const scoreStars = document.querySelector('.score-stars');
                if (scoreStars) scoreStars.innerHTML = renderStarsHtml(updatedStats.average);
                const scoreCount = document.querySelector('.score-count');
                if (scoreCount) scoreCount.textContent = `Dựa trên ${updatedStats.total} lượt đánh giá`;

                const ratingPill = document.querySelector('.detail-rating-pill');
                if (ratingPill) ratingPill.textContent = `⭐ ${updatedStats.average} / 5 (${updatedStats.total} đánh giá)`;

                // Làm trống ô nhập nhận xét để người dùng có thể gửi tiếp bình luận mới
                if (reviewCommentInput) {
                    reviewCommentInput.value = '';
                }

                if (submitMsg) {
                    submitMsg.textContent = '🎉 Bình luận của bạn đã được đăng thành công!';
                    submitMsg.className = 'review-submit-msg success show';
                    setTimeout(() => {
                        submitMsg.className = 'review-submit-msg';
                    }, 3500);
                }

            } catch (err) {
                console.error('Lỗi gửi bình luận:', err);
                if (submitMsg) {
                    submitMsg.textContent = `❌ ${err.message || 'Không thể gửi bình luận lúc này, vui lòng thử lại sau.'}`;
                    submitMsg.className = 'review-submit-msg error show';
                }
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = '🚀 Gửi Bình Luận';
                }
            }
        });
    }

    // Sự kiện tương tác trên danh sách bình luận (Thích & Trả lời)
    const reviewsList = document.querySelector('#reviewsList');
    if (reviewsList) {
        reviewsList.addEventListener('click', async (e) => {
            // 1. NÚT LIKE BÌNH LUẬN
            const likeBtn = e.target.closest('.btn-like-review');
            if (likeBtn) {
                const currentUser = authService.getCurrentUser();
                if (!currentUser) {
                    alert('Vui lòng đăng nhập để thích bình luận.');
                    window.location.href = './login.html';
                    return;
                }
                const reviewId = likeBtn.dataset.reviewId;
                const targetReview = currentReviews.find(r => String(r.id) === String(reviewId));
                if (!targetReview) return;

                targetReview.likes = Array.isArray(targetReview.likes) ? targetReview.likes : [];
                const uid = currentUser.id;
                const idx = targetReview.likes.findIndex(id => String(id) === String(uid));
                if (idx > -1) {
                    targetReview.likes.splice(idx, 1);
                } else {
                    targetReview.likes.push(uid);
                }

                // Cập nhật giao diện nút Like ngay tức thì
                const hasLiked = targetReview.likes.some(id => String(id) === String(uid));
                likeBtn.classList.toggle('liked', hasLiked);
                const iconSpan = likeBtn.querySelector('.like-icon');
                if (iconSpan) iconSpan.textContent = hasLiked ? '❤️' : '🤍';
                const labelSpan = likeBtn.querySelector('.like-label');
                if (labelSpan) labelSpan.textContent = hasLiked ? 'Đã thích' : 'Thích';
                const countSpan = likeBtn.querySelector('.like-count');
                if (countSpan) countSpan.textContent = `(${targetReview.likes.length})`;

                // Lưu thay đổi lên backend/API
                reviewService.toggleLike(reviewId, uid);
                return;
            }

            // 2. NÚT MỞ / ĐÓNG HỘP TRẢ LỜI
            const toggleReplyBtn = e.target.closest('.btn-toggle-reply');
            if (toggleReplyBtn) {
                const reviewId = toggleReplyBtn.dataset.reviewId;
                const replyBox = document.querySelector(`#replyBox-${reviewId}`);
                if (replyBox) {
                    replyBox.classList.toggle('hidden');
                    if (!replyBox.classList.contains('hidden')) {
                        const input = replyBox.querySelector('.reply-input-field');
                        if (input) input.focus();
                    }
                }
                return;
            }

            // 3. NÚT GỬI CÂU TRẢ LỜI
            const sendReplyBtn = e.target.closest('.btn-send-reply');
            if (sendReplyBtn) {
                const currentUser = authService.getCurrentUser();
                if (!currentUser) {
                    alert('Vui lòng đăng nhập để trả lời bình luận.');
                    window.location.href = './login.html';
                    return;
                }
                const reviewId = sendReplyBtn.dataset.reviewId;
                const input = document.querySelector(`.reply-input-field[data-review-id="${reviewId}"]`);
                if (!input) return;
                const comment = input.value.trim();
                if (!comment) {
                    input.focus();
                    return;
                }

                sendReplyBtn.disabled = true;
                sendReplyBtn.textContent = '⏳';

                try {
                    const replyData = {
                        userId: currentUser.id,
                        userName: currentUser.name || currentUser.email,
                        comment
                    };
                    await reviewService.addReply(reviewId, replyData);

                    const targetReview = currentReviews.find(r => String(r.id) === String(reviewId));
                    if (targetReview) {
                        targetReview.replies = Array.isArray(targetReview.replies) ? targetReview.replies : [];
                        targetReview.replies.push({
                            id: Date.now(),
                            userId: currentUser.id,
                            userName: currentUser.name || currentUser.email,
                            comment,
                            createdAt: new Date().toISOString()
                        });
                    }

                    // Render lại toàn bộ danh sách để đồng bộ số lượng câu trả lời
                    reviewsList.innerHTML = renderReviewsListHtml(currentReviews);
                } catch (err) {
                    console.error('Lỗi khi gửi phản hồi:', err);
                    alert('Không thể gửi trả lời lúc này, vui lòng thử lại.');
                }
            }
        });

        // Nhấn phím Enter trong ô nhập trả lời
        reviewsList.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.classList.contains('reply-input-field')) {
                e.preventDefault();
                const reviewId = e.target.dataset.reviewId;
                const sendBtn = document.querySelector(`.btn-send-reply[data-review-id="${reviewId}"]`);
                if (sendBtn) sendBtn.click();
            }
        });
    }
}

getProductDetail();
initNotificationBell();
initInternalChat();
initChatbot();