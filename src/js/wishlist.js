import { authService } from '../services/authService.js';
import { cartService } from '../services/cartService.js';
import { wishlistService } from '../services/wishlistService.js';
import { saleService } from '../services/saleService.js';
import { formatPrice } from '../utils/format.js';
import { initChatbot } from './chatWidget.js';
import { initNotificationBell } from './notificationBell.js';
import './themeToggle.js';

// DOM Elements
const wishlistLoading = document.querySelector('#wishlistLoading');
const wishlistLoginRequired = document.querySelector('#wishlistLoginRequired');
const wishlistEmpty = document.querySelector('#wishlistEmpty');
const wishlistGrid = document.querySelector('#wishlistGrid');
const wishlistActionsWrap = document.querySelector('#wishlistActionsWrap');
const btnAddAllToCart = document.querySelector('#btnAddAllToCart');
const btnClearWishlist = document.querySelector('#btnClearWishlist');
const cartCount = document.querySelector('#cartCount');
const wishlistToast = document.querySelector('#wishlistToast');

let currentUser = null;
let currentWishlist = [];

// Toast thông báo
let toastTimeout = null;
function showToast(message, icon = '✅') {
    if (!wishlistToast) return;
    if (toastTimeout) clearTimeout(toastTimeout);

    wishlistToast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    wishlistToast.classList.remove('hidden');

    toastTimeout = setTimeout(() => {
        wishlistToast.classList.add('hidden');
    }, 3200);
}

// Cập nhật số lượng giỏ hàng trên Header
function updateCartCountBadge() {
    if (!cartCount) return;
    const cart = cartService.getCart();
    const totalQty = (cart || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    cartCount.textContent = totalQty;
}

// Render danh sách thẻ sách yêu thích
function renderWishlistGrid(items) {
    if (!wishlistGrid) return;

    if (!items || items.length === 0) {
        wishlistGrid.classList.add('hidden');
        if (wishlistActionsWrap) wishlistActionsWrap.style.display = 'none';
        if (wishlistEmpty) wishlistEmpty.classList.remove('hidden');
        return;
    }

    if (wishlistEmpty) wishlistEmpty.classList.add('hidden');
    if (wishlistActionsWrap) wishlistActionsWrap.style.display = 'flex';
    wishlistGrid.classList.remove('hidden');

    wishlistGrid.innerHTML = items.map(item => {
        const prod = item.product;
        if (!prod) return '';

        const priceInfo = saleService.getPriceInfo(prod);
        const isSoldOut = Number(prod.stock) <= 0;

        return `
            <article class="wishlist-card" id="wishlist-card-${prod.id}">
                <div class="wishlist-card-media">
                    <img src="${prod.image}" alt="${prod.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80'">
                    <span class="wishlist-card-tag">${prod.tag || 'Sách hay'}</span>
                    <button type="button" class="btn-remove-wishlist-item" data-id="${prod.id}" title="Xóa khỏi danh sách yêu thích" aria-label="Bỏ thích">
                        ✕
                    </button>
                </div>
                <div class="wishlist-card-body">
                    <p class="wishlist-book-author">${prod.author || 'Tác giả tuyển chọn'}</p>
                    <h3 class="wishlist-book-title" title="${prod.name}">
                        <a href="./product-detail.html?id=${prod.id}">
                            ${prod.name}
                        </a>
                    </h3>
                    <div class="wishlist-price-row">
                        <span class="wishlist-price">${formatPrice(priceInfo.salePrice || prod.price)}</span>
                        ${priceInfo.isSale ? `<span class="wishlist-price-old">${formatPrice(priceInfo.originalPrice)}</span>` : ''}
                    </div>
                    <div class="wishlist-card-actions">
                        <button type="button" class="btn-wishlist-add-cart btn-add-cart" data-id="${prod.id}" ${isSoldOut ? 'disabled' : ''}>
                            ${isSoldOut ? '❌ Tạm hết hàng' : '🛒 Thêm vào giỏ'}
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// Tải dữ liệu từ Wishlist Service
async function loadWishlist() {
    currentUser = authService.getCurrentUser();
    if (!currentUser) {
        if (wishlistLoading) wishlistLoading.classList.add('hidden');
        if (wishlistLoginRequired) wishlistLoginRequired.classList.remove('hidden');
        return;
    }

    try {
        if (wishlistLoading) wishlistLoading.classList.remove('hidden');
        currentWishlist = await wishlistService.getUserWishlist(currentUser.id);
        if (wishlistLoading) wishlistLoading.classList.add('hidden');
        renderWishlistGrid(currentWishlist);
    } catch (err) {
        console.error('Lỗi nạp sách yêu thích:', err);
        if (wishlistLoading) wishlistLoading.classList.add('hidden');
        if (wishlistEmpty) wishlistEmpty.classList.remove('hidden');
    }
}

// Bắt sự kiện Click trên lưới sách yêu thích (Thêm vào giỏ / Bỏ thích)
if (wishlistGrid) {
    wishlistGrid.addEventListener('click', async (e) => {
        // Nút xóa mục yêu thích
        const removeBtn = e.target.closest('.btn-remove-wishlist-item');
        if (removeBtn) {
            const prodId = Number(removeBtn.getAttribute('data-id'));
            try {
                removeBtn.disabled = true;
                await wishlistService.removeFromWishlist(currentUser.id, prodId);
                
                // Hiệu ứng fade out thẻ
                const cardEl = document.getElementById(`wishlist-card-${prodId}`);
                if (cardEl) {
                    cardEl.style.transition = 'all 0.3s ease';
                    cardEl.style.opacity = '0';
                    cardEl.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        cardEl.remove();
                        currentWishlist = currentWishlist.filter(item => Number(item.productId) !== prodId);
                        if (currentWishlist.length === 0) {
                            renderWishlistGrid([]);
                        }
                    }, 300);
                }
                showToast('Đã xóa sách khỏi danh sách yêu thích.', '🗑️');
            } catch (err) {
                console.error('Lỗi khi xóa khỏi yêu thích:', err);
                showToast('Không thể xóa sách, vui lòng thử lại.', '⚠️');
            }
            return;
        }

        // Nút thêm vào giỏ hàng
        const addCartBtn = e.target.closest('.btn-add-cart');
        if (addCartBtn) {
            const prodId = Number(addCartBtn.getAttribute('data-id'));
            const targetItem = currentWishlist.find(i => Number(i.productId) === prodId);
            if (targetItem && targetItem.product) {
                cartService.addToCart(targetItem.product, 1);
                updateCartCountBadge();
                showToast(`Đã thêm "${targetItem.product.name}" vào giỏ hàng!`, '🛒');
            }
        }
    });
}

// Thêm tất cả sách trong wishlist vào giỏ hàng
if (btnAddAllToCart) {
    btnAddAllToCart.addEventListener('click', () => {
        if (!currentWishlist || currentWishlist.length === 0) return;

        let addedCount = 0;
        currentWishlist.forEach(item => {
            if (item.product && Number(item.product.stock) > 0) {
                cartService.addToCart(item.product, 1);
                addedCount++;
            }
        });

        updateCartCountBadge();
        showToast(`Đã thêm thành công ${addedCount} cuốn sách vào giỏ hàng!`, '🎉');
    });
}

// Xóa toàn bộ danh sách yêu thích
if (btnClearWishlist) {
    btnClearWishlist.addEventListener('click', async () => {
        if (!currentWishlist || currentWishlist.length === 0) return;
        const confirmClear = window.confirm('Bạn có chắc chắn muốn xóa toàn bộ sách khỏi danh sách yêu thích không?');
        if (!confirmClear) return;

        try {
            btnClearWishlist.disabled = true;
            for (const item of currentWishlist) {
                await wishlistService.removeFromWishlist(currentUser.id, item.productId);
            }
            currentWishlist = [];
            renderWishlistGrid([]);
            showToast('Đã dọn sạch danh sách yêu thích.', '🗑️');
        } catch (err) {
            console.error('Lỗi xóa toàn bộ wishlist:', err);
            showToast('Không thể xóa toàn bộ danh sách.', '⚠️');
        } finally {
            btnClearWishlist.disabled = false;
        }
    });
}

// Khởi chạy
loadWishlist();
updateCartCountBadge();
initNotificationBell();
initChatbot();
