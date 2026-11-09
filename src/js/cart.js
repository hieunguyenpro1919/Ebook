import { cartService } from '../services/cartService.js';
import { orderService } from '../services/orderService.js';
import { productService } from '../services/productService.js';
import { authService } from '../services/authService.js';
import { couponService } from '../services/couponService.js';
import { formatPrice } from '../utils/format.js';
import { initChatbot } from './chatWidget.js';
import { initNotificationBell } from './notificationBell.js';
import './themeToggle.js';

// DOM Elements
const cartList = document.querySelector('#cartList');
const emptyCart = document.querySelector('#emptyCart');
const cartHeaderRow = document.querySelector('#cartHeaderRow');
const summaryCard = document.querySelector('#summaryCard');
const btnClearCart = document.querySelector('#btnClearCart');
const cartTotalItemsCount = document.querySelector('#cartTotalItemsCount');
const subTotalEl = document.querySelector('#subTotal');
const shippingFeeEl = document.querySelector('#shippingFee');
const totalPayEl = document.querySelector('#totalPay');

// Coupon Elements
const couponInput = document.querySelector('#couponInput');
const btnApplyCoupon = document.querySelector('#btnApplyCoupon');
const btnRemoveCoupon = document.querySelector('#btnRemoveCoupon');
const couponFeedback = document.querySelector('#couponFeedback');
const discountRow = document.querySelector('#discountRow');
const appliedCouponCode = document.querySelector('#appliedCouponCode');
const discountAmountEl = document.querySelector('#discountAmount');
const couponSuggestions = document.querySelector('#couponSuggestions');

let appliedCoupon = null;
let currentDiscountAmount = 0;

// Form & Modal Elements
const checkoutForm = document.querySelector('#checkoutForm');
const receiverName = document.querySelector('#receiverName');
const receiverPhone = document.querySelector('#receiverPhone');
const receiverAddress = document.querySelector('#receiverAddress');
const receiverNote = document.querySelector('#receiverNote');

const qrModal = document.querySelector('#qrModal');
const qrBox = document.querySelector('#qrBox');
const qrImage = document.querySelector('#qrImage');
const qrAmountText = document.querySelector('#qrAmountText');
const qrContentText = document.querySelector('#qrContentText');
const qrVerifyingBox = document.querySelector('#qrVerifyingBox');
const qrVerifyingStatusText = document.querySelector('#qrVerifyingStatusText');
const verifyProgressFill = document.querySelector('#verifyProgressFill');
const verifyCountdownText = document.querySelector('#verifyCountdownText');
const btnConfirmPaid = document.querySelector('#btnConfirmPaid');
const btnCloseQr = document.querySelector('#btnCloseQr');

const successModal = document.querySelector('#successModal');
const successOrderCode = document.querySelector('#successOrderCode');

let pendingOrder = null;
let isVerifyingPayment = false;

// Hàm đặt lại trạng thái ban đầu của Modal QR
function resetQrModalState() {
    if (qrBox) qrBox.style.display = 'flex';
    if (qrVerifyingBox) qrVerifyingBox.style.display = 'none';
    if (btnConfirmPaid) {
        btnConfirmPaid.disabled = false;
        btnConfirmPaid.innerHTML = '🔄 Xác nhận chuyển khoản';
    }
    if (btnCloseQr) {
        btnCloseQr.disabled = false;
        btnCloseQr.style.display = 'inline-block';
    }
    if (verifyProgressFill) verifyProgressFill.style.width = '0%';
}

// 1. Tự động điền thông tin nếu người dùng đã đăng nhập (Đồng bộ từ Hồ sơ cá nhân)
function setupUserInfo() {
    const user = authService.getCurrentUser();
    if (user) {
        if (receiverName && !receiverName.value) receiverName.value = user.name || '';
        if (receiverPhone && !receiverPhone.value) receiverPhone.value = user.phone || user.shopPhone || '';
        if (receiverAddress && !receiverAddress.value) receiverAddress.value = user.address || user.shopAddress || '';
    }
}

// Cập nhật giao diện giảm giá Coupon
function updateDiscountUi(code, amount) {
    if (discountRow) {
        if (amount > 0 && code) {
            discountRow.classList.remove('hidden');
            if (appliedCouponCode) appliedCouponCode.textContent = code;
            if (discountAmountEl) discountAmountEl.textContent = `-${formatPrice(amount)}`;
            if (btnRemoveCoupon) btnRemoveCoupon.classList.remove('hidden');
        } else {
            discountRow.classList.add('hidden');
            if (btnRemoveCoupon) btnRemoveCoupon.classList.add('hidden');
        }
    }
}

// Hiển thị thông điệp phản hồi Coupon
function showCouponFeedback(text, type = 'success') {
    if (!couponFeedback) return;
    couponFeedback.textContent = text;
    couponFeedback.className = `coupon-feedback ${type}`;
    couponFeedback.classList.remove('hidden');
}

// 2. Render toàn bộ danh sách giỏ hàng
async function renderCart() {
    const cart = cartService.getCart();
    const totalCount = cartService.getTotalCount();
    const subTotal = cartService.getTotalPrice();

    if (cartTotalItemsCount) cartTotalItemsCount.textContent = totalCount;

    // Khi giỏ hàng trống
    if (cart.length === 0) {
        if (cartList) cartList.innerHTML = '';
        if (cartHeaderRow) cartHeaderRow.style.display = 'none';
        if (summaryCard) summaryCard.style.display = 'none';
        if (emptyCart) emptyCart.style.display = 'block';
        appliedCoupon = null;
        currentDiscountAmount = 0;
        updateDiscountUi(null, 0);
        return;
    }

    // Khi giỏ hàng có sản phẩm
    if (emptyCart) emptyCart.style.display = 'none';
    if (cartHeaderRow) cartHeaderRow.style.display = 'flex';
    if (summaryCard) summaryCard.style.display = 'block';

    // Tính toán phí ship (Đơn hàng từ 250k miễn phí ship)
    const shippingFee = subTotal >= 250000 ? 0 : 30000;

    // Kiểm tra lại tính hợp lệ của mã giảm giá khi số lượng trong giỏ thay đổi
    if (appliedCoupon) {
        const check = await couponService.applyCoupon(appliedCoupon.code, subTotal, shippingFee);
        if (check.isValid) {
            currentDiscountAmount = check.discountAmount;
            updateDiscountUi(appliedCoupon.code, currentDiscountAmount);
        } else {
            appliedCoupon = null;
            currentDiscountAmount = 0;
            updateDiscountUi(null, 0);
            showCouponFeedback(check.message, 'error');
        }
    } else {
        currentDiscountAmount = 0;
        updateDiscountUi(null, 0);
    }

    const finalTotal = Math.max(0, subTotal + shippingFee - currentDiscountAmount);

    if (subTotalEl) subTotalEl.textContent = formatPrice(subTotal);
    if (shippingFeeEl) {
        shippingFeeEl.textContent = shippingFee === 0 ? 'Miễn phí (Đơn > 250k)' : formatPrice(shippingFee);
        shippingFeeEl.style.color = shippingFee === 0 ? '#10b981' : 'inherit';
        shippingFeeEl.style.fontWeight = shippingFee === 0 ? '700' : 'normal';
    }
    if (totalPayEl) totalPayEl.textContent = formatPrice(finalTotal);

    // Render các thẻ sản phẩm trong giỏ
    if (cartList) {
        cartList.innerHTML = cart.map(item => {
            const itemTotal = Number(item.price) * Number(item.quantity);
            // Số lượng tồn kho ghi kèm trong giỏ (sản phẩm cũ không có thì coi như không giới hạn)
            const hasStock = item.stock !== undefined && item.stock !== null && Number.isFinite(Number(item.stock));
            const stock = hasStock ? Number(item.stock) : Infinity;
            const isMaxedOut = hasStock && item.quantity >= stock;

            return `
                <div class="cart-item ${isMaxedOut ? 'item-maxed' : ''}">
                    <div class="item-thumb">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="item-info">
                        <h4>${item.name}</h4>
                        <div class="item-unit-price">${formatPrice(item.price)}</div>
                        ${hasStock ? `<div class="item-stock-note ${isMaxedOut ? 'note-max' : ''}">
                            ${isMaxedOut ? '⚠️ Đã đạt số lượng tồn kho tối đa' : `Kho còn ${stock} cuốn`}
                        </div>` : ''}
                    </div>
                    <div class="quantity-control">
                        <button class="qty-btn btn-decrease" data-id="${item.id}" type="button" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
                        <input type="number" class="qty-input" data-id="${item.id}" value="${item.quantity}"
                               min="1" ${hasStock ? `max="${stock}"` : 'max="99"'} inputmode="numeric">
                        <button class="qty-btn btn-increase" data-id="${item.id}" type="button" ${isMaxedOut ? 'disabled' : ''}>+</button>
                    </div>
                    <div class="item-total-price">
                        ${formatPrice(itemTotal)}
                    </div>
                    <button class="btn-remove-item" data-id="${item.id}" title="Xóa khỏi giỏ" type="button">
                        🗑️
                    </button>
                </div>
            `;
        }).join('');
    }
}

// 3. Xử lý tăng / giảm / xóa sản phẩm (Event Delegation)
if (cartList) {
    cartList.addEventListener('click', (e) => {
        const target = e.target;
        const productId = target.dataset.id;
        if (!productId) return;

        const cart = cartService.getCart();
        const item = cart.find(i => Number(i.id) === Number(productId));
        if (!item) return;

        if (target.classList.contains('btn-decrease')) {
            cartService.updateQuantity(productId, item.quantity - 1);
            renderCart();
        } else if (target.classList.contains('btn-increase')) {
            cartService.updateQuantity(productId, item.quantity + 1);
            renderCart();
        } else if (target.classList.contains('btn-remove-item')) {
            cartService.removeFromCart(productId);
            renderCart();
        }
    });

    cartList.addEventListener('change', (e) => {
        if (e.target.classList.contains('qty-input')) {
            const productId = e.target.dataset.id;
            const newQty = parseInt(e.target.value) || 1;
            cartService.updateQuantity(productId, newQty);
            renderCart();
        }
    });
}

// 4. Xóa toàn bộ giỏ hàng
if (btnClearCart) {
    btnClearCart.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn xóa tất cả sản phẩm khỏi giỏ hàng không?')) {
            cartService.clearCart();
            renderCart();
        }
    });
}

// 5. Xử lý đặt hàng & thanh toán
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const cart = cartService.getCart();
        if (cart.length === 0) {
            alert('Giỏ hàng đang trống, vui lòng chọn sách trước khi đặt hàng!');
            return;
        }

        const subTotal = cartService.getTotalPrice();
        const shippingFee = subTotal >= 250000 ? 0 : 30000;
        const finalTotal = Math.max(0, subTotal + shippingFee - currentDiscountAmount);

        // Sinh mã đơn hàng ngẫu nhiên: DH + 6 số
        const orderCode = 'DH' + Math.floor(100000 + Math.random() * 900000);
        const paymentMethodEl = document.querySelector('input[name="paymentMethod"]:checked');
        const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'COD';

        const currentUser = authService.getCurrentUser();

        const orderData = {
            orderCode,
            userId: currentUser ? currentUser.id : null,
            userEmail: currentUser ? (currentUser.email || '') : '',
            receiverName: receiverName.value.trim(),
            receiverPhone: receiverPhone.value.trim(),
            receiverAddress: receiverAddress.value.trim(),
            receiverNote: receiverNote ? receiverNote.value.trim() : '',
            items: cart,
            subTotal,
            shippingFee,
            couponCode: appliedCoupon ? appliedCoupon.code : null,
            discountAmount: currentDiscountAmount,
            totalAmount: finalTotal,
            paymentMethod,
            // Yêu cầu: Đơn VietQR ghi nhận Đã thanh toán, trạng thái ban đầu là 'Đang giao hàng', đến khi giao xong người dùng xác nhận mới là 'Hoàn thành'
            status: paymentMethod === 'VIETQR' ? 'Đang giao hàng' : 'Chờ xác nhận (COD)',
            isPaid: paymentMethod === 'VIETQR',
            paymentStatus: paymentMethod === 'VIETQR' ? 'Đã thanh toán (VietQR)' : 'Chờ thanh toán khi nhận hàng (COD)',
            createdAt: new Date().toISOString()
        };

        // Nếu chọn thanh toán qua VietQR
        if (paymentMethod === 'VIETQR') {
            pendingOrder = orderData;
            // Tạo link QR động chuẩn VietQR
            const qrUrl = `https://api.vietqr.io/image/970422-0901234567-compact2.jpg?amount=${finalTotal}&addInfo=${orderCode}&accountName=NHA%20SACH%20TRI%20TUE`;

            if (qrImage) qrImage.src = qrUrl;
            if (qrAmountText) qrAmountText.textContent = formatPrice(finalTotal);
            if (qrContentText) qrContentText.textContent = orderCode;

            resetQrModalState();
            if (qrModal) qrModal.classList.add('active');
            return;
        }

        // Nếu chọn COD: tiến hành lưu đơn hàng ngay
        await completeOrder(orderData);
    });
}

// 6. Trừ tồn kho theo từng món trong đơn hàng
// Gọi trước khi xóa giỏ vì cần đọc product.stock đã lưu trong giỏ
async function reduceStock(items) {
    for (const item of items) {
        // Sản phẩm không lưu khi thêm vào giỏ thì không có tồn kho để trừ
        if (item.stock === undefined || item.stock === null) continue;

        const remaining = Number(item.stock) - Number(item.quantity);

        try {
            await productService.updateStock(item.id, remaining < 0 ? 0 : remaining);
        } catch (err) {
            console.warn(`Không trừ được tồn kho sản phẩm ${item.id}:`, err);
        }
    }
}

// 7. Hoàn tất đơn hàng (Gọi Node.js Backend chạy Transaction Stored Procedure trừ kho & tạo đơn)
async function completeOrder(orderData) {
    try {
        const createdOrder = await orderService.createOrder(orderData);
        const finalCode = (createdOrder && createdOrder.orderCode) ? createdOrder.orderCode : orderData.orderCode;

        // Xóa sạch giỏ hàng khi và chỉ khi server xác nhận đơn thành công
        cartService.clearCart();
        renderCart();

        // Ẩn modal QR nếu đang mở
        if (qrModal) qrModal.classList.remove('active');

        // Hiển thị modal đặt hàng thành công
        if (successOrderCode) successOrderCode.textContent = finalCode;
        const successModalDesc = document.querySelector('#successModalDesc');
        if (successModalDesc) {
            if (orderData.paymentMethod === 'VIETQR') {
                successModalDesc.innerHTML = `🎉 <strong>Đã xác nhận thanh toán thành công!</strong><br>Đơn hàng <strong>#${finalCode}</strong> đã được hệ thống xác nhận thanh toán qua VietQR.<br>Trạng thái hiện tại: <span style="color: #0284c7; font-weight: 800;">🚚 Đang giao hàng</span>.<br>Bạn có thể xem chi tiết và xuất hóa đơn PDF bất cứ lúc nào.`;
            } else {
                successModalDesc.innerHTML = `Đơn hàng <strong>#${finalCode}</strong> đã được tạo thành công ở trạng thái: <span style="color: #d97706; font-weight: 800;">⏳ Chờ xác nhận (COD)</span>.`;
            }
        }
        if (successModal) successModal.classList.add('active');
    } catch (err) {
        console.error('Lỗi khi đặt hàng:', err);
        const errMsg = err.response?.data?.message || err.message || 'Không thể tạo đơn hàng. Vui lòng thử lại sau!';
        alert(`❌ Đặt hàng thất bại: ${errMsg}`);
    }
}

// 8. Sự kiện modal QR: Bấm "Xác nhận chuyển khoản", xoay vòng 5s giả lập đối soát ngân hàng
if (btnConfirmPaid) {
    btnConfirmPaid.addEventListener('click', async () => {
        if (!pendingOrder || isVerifyingPayment) return;
        isVerifyingPayment = true;

        // 1. Chuyển giao diện sang chế độ xoay vòng xác thực
        btnConfirmPaid.disabled = true;
        btnConfirmPaid.innerHTML = '⏳ Đang đối soát với ngân hàng...';
        if (btnCloseQr) {
            btnCloseQr.disabled = true;
            btnCloseQr.style.display = 'none';
        }
        if (qrBox) qrBox.style.display = 'none';
        if (qrVerifyingBox) qrVerifyingBox.style.display = 'flex';

        // 2. Chạy đếm ngược và thanh tiến trình 5 giây giả lập đối soát
        const totalDuration = 5000; // 5 giây
        const intervalTime = 100; // 100ms cập nhật 1 lần
        let elapsed = 0;

        const updateStatusText = (remainingSec) => {
            if (!qrVerifyingStatusText || !verifyCountdownText) return;
            verifyCountdownText.textContent = `Vui lòng chờ trong giây lát (${remainingSec}s)...`;

            if (remainingSec >= 5) {
                qrVerifyingStatusText.textContent = 'Đang kết nối cổng thanh toán Napas & MBBank...';
            } else if (remainingSec === 4) {
                qrVerifyingStatusText.textContent = `Đang tìm kiếm biến động số dư theo mã #${pendingOrder.orderCode}...`;
            } else if (remainingSec === 3) {
                qrVerifyingStatusText.textContent = 'Đã tìm thấy giao dịch chuyển khoản phù hợp!';
            } else if (remainingSec === 2) {
                qrVerifyingStatusText.textContent = `Đang xác thực số tiền ${formatPrice(pendingOrder.totalAmount)}...`;
            } else if (remainingSec <= 1) {
                qrVerifyingStatusText.textContent = '✓ Giao dịch hợp lệ! Đang hoàn tất đơn hàng...';
            }
        };

        updateStatusText(5);

        await new Promise((resolve) => {
            const timer = setInterval(() => {
                elapsed += intervalTime;
                const percent = Math.min(100, Math.round((elapsed / totalDuration) * 100));
                if (verifyProgressFill) verifyProgressFill.style.width = `${percent}%`;

                const remainingSec = Math.max(1, Math.ceil((totalDuration - elapsed) / 1000));
                updateStatusText(remainingSec);

                if (elapsed >= totalDuration) {
                    clearInterval(timer);
                    resolve();
                }
            }, intervalTime);
        });

        // 3. Hoàn tất đơn hàng và hiển thị thông báo đã xác nhận thanh toán
        await completeOrder(pendingOrder);
        isVerifyingPayment = false;
        resetQrModalState();
    });
}

if (btnCloseQr) {
    btnCloseQr.addEventListener('click', () => {
        if (!isVerifyingPayment && qrModal) {
            qrModal.classList.remove('active');
            resetQrModalState();
        }
    });
}

// 6. Xử lý nhập và chọn mã giảm giá (Coupon / Voucher)
function setupCouponHandlers() {
    // Nút Áp dụng mã
    if (btnApplyCoupon && couponInput) {
        btnApplyCoupon.addEventListener('click', async () => {
            const code = couponInput.value.trim();
            if (!code) {
                showCouponFeedback('Vui lòng nhập mã giảm giá.', 'error');
                return;
            }

            const subTotal = cartService.getTotalPrice();
            const shippingFee = subTotal >= 250000 ? 0 : 30000;

            btnApplyCoupon.disabled = true;
            btnApplyCoupon.textContent = 'Đang kiểm tra...';

            try {
                const result = await couponService.applyCoupon(code, subTotal, shippingFee);
                if (result.isValid) {
                    appliedCoupon = result.coupon;
                    currentDiscountAmount = result.discountAmount;
                    updateDiscountUi(appliedCoupon.code, currentDiscountAmount);
                    showCouponFeedback(result.message, 'success');
                    renderCart();
                } else {
                    appliedCoupon = null;
                    currentDiscountAmount = 0;
                    updateDiscountUi(null, 0);
                    showCouponFeedback(result.message, 'error');
                    renderCart();
                }
            } catch (err) {
                console.error('Lỗi áp dụng voucher:', err);
                showCouponFeedback('Không thể kiểm tra mã giảm giá vào lúc này.', 'error');
            } finally {
                btnApplyCoupon.disabled = false;
                btnApplyCoupon.textContent = 'Áp dụng';
            }
        });
    }

    // Nút Gỡ mã
    if (btnRemoveCoupon) {
        btnRemoveCoupon.addEventListener('click', () => {
            appliedCoupon = null;
            currentDiscountAmount = 0;
            if (couponInput) couponInput.value = '';
            updateDiscountUi(null, 0);
            showCouponFeedback('Đã gỡ mã giảm giá.', 'success');
            renderCart();
        });
    }

    // Tải và hiển thị danh sách gợi ý mã
    loadCouponSuggestions();
}

// Nạp danh sách mã gợi ý
async function loadCouponSuggestions() {
    if (!couponSuggestions) return;
    try {
        const coupons = await couponService.getActiveCoupons();
        if (!coupons || coupons.length === 0) {
            couponSuggestions.style.display = 'none';
            return;
        }

        couponSuggestions.innerHTML = coupons.map(c => `
            <button type="button" class="coupon-chip" data-code="${c.code}" title="${c.description}">
                <span>🎟️</span> <strong>${c.code}</strong>
                <span>(${c.discountType === 'percent' ? `-${c.discountValue}%` : (c.discountType === 'shipping' ? 'Freeship' : `-${formatPrice(c.discountValue)}`)})</span>
            </button>
        `).join('');

        couponSuggestions.querySelectorAll('.coupon-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const code = chip.getAttribute('data-code');
                if (couponInput && code) {
                    couponInput.value = code;
                    btnApplyCoupon?.click();
                }
            });
        });
    } catch (e) {
        console.warn('Lỗi hiển thị gợi ý coupon:', e);
    }
}

// Khởi chạy giỏ hàng
setupUserInfo();
renderCart();
setupCouponHandlers();
initNotificationBell();
initChatbot();
