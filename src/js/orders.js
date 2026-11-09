import { orderService } from '../services/orderService.js';
import { authService } from '../services/authService.js';
import { productService } from '../services/productService.js';
import { reviewService } from '../services/reviewService.js';
import { formatPrice } from '../utils/format.js';
import { initChatbot } from './chatWidget.js';
import { initNotificationBell } from './notificationBell.js';
import './themeToggle.js';

// DOM Elements
const ordersContainer = document.querySelector('#ordersContainer');
const emptyOrders = document.querySelector('#emptyOrders');
const loading = document.querySelector('#loading');
const errorEl = document.querySelector('#error');
const searchOrderInput = document.querySelector('#searchOrderInput');
const userNameText = document.querySelector('#userNameText');

// Elements modal đánh giá
const reviewOrderModal = document.querySelector('#reviewOrderModal');
const btnCloseReviewModal = document.querySelector('#btnCloseReviewModal');
const btnSkipReview = document.querySelector('#btnSkipReview');
const orderReviewForm = document.querySelector('#orderReviewForm');
const orderReviewItemsList = document.querySelector('#orderReviewItemsList');

// Elements modal xem chi tiết & xuất hóa đơn PDF
const invoiceModal = document.querySelector('#invoiceModal');
const invoiceSheet = document.querySelector('#invoiceSheet');
const btnPrintInvoice = document.querySelector('#btnPrintInvoice');
const btnExportInvoicePdf = document.querySelector('#btnExportInvoicePdf');
const btnCloseInvoiceModal = document.querySelector('#btnCloseInvoiceModal');

let allUserOrders = [];
let currentReviewingOrder = null;
let currentViewingOrder = null;
let isExportingPdf = false; // Cờ khóa chống bấm nhiều lần xuất nhiều file PDF

// Hàm mở Modal đánh giá đơn hàng (Kiểm tra 1 tài khoản chỉ được đánh giá 1 lần)
async function openReviewModal(order) {
    if (!reviewOrderModal || !orderReviewItemsList || !order || !order.items) return;
    currentReviewingOrder = order;

    const user = authService.getCurrentUser();
    let allReviews = [];
    try {
        allReviews = await reviewService.getAll();
    } catch (e) {
        console.warn('Không thể tải danh sách review để kiểm tra:', e);
    }

    let unreviewedCount = 0;
    let html = '';

    order.items.forEach((item, index) => {
        // Lấy danh sách review của sản phẩm này và kiểm tra xem tài khoản đã đánh giá chưa
        const itemReviews = allReviews.filter(r => Number(r.productId) === Number(item.id));
        const userReview = reviewService.getUserReview(itemReviews, user);

        if (userReview) {
            html += `
                <div class="review-order-product-card already-reviewed" data-product-id="${item.id}" data-already-reviewed="true">
                    <div class="product-mini-info">
                        <img src="${item.image}" alt="${item.name}">
                        <div>
                            <strong>${item.name}</strong>
                            <div class="badge-already-reviewed">
                                <span>✓ Bạn đã đánh giá (${userReview.rating}★)</span>
                            </div>
                        </div>
                    </div>
                    <p class="already-reviewed-desc">💡 Mỗi tài khoản chỉ được đánh giá 1 lần duy nhất. Bạn đã gửi nhận xét cho cuốn sách này trước đó.</p>
                </div>
            `;
        } else {
            unreviewedCount++;
            html += `
                <div class="review-order-product-card" data-product-id="${item.id}">
                    <div class="product-mini-info">
                        <img src="${item.image}" alt="${item.name}">
                        <div>
                            <strong>${item.name}</strong>
                            <span>Số lượng mua: x${item.quantity}</span>
                        </div>
                    </div>

                    <div class="item-rating-row">
                        <label>Mức độ hài lòng:</label>
                        <div class="item-star-picker" data-item-index="${index}">
                            <button type="button" class="star-btn active" data-val="1">★</button>
                            <button type="button" class="star-btn active" data-val="2">★</button>
                            <button type="button" class="star-btn active" data-val="3">★</button>
                            <button type="button" class="star-btn active" data-val="4">★</button>
                            <button type="button" class="star-btn active" data-val="5">★</button>
                        </div>
                        <span class="item-star-hint" id="hint-${index}">5 sao (Rất tốt)</span>
                    </div>

                    <div class="item-comment-field">
                        <textarea 
                            name="comment_${item.id}" 
                            rows="2" 
                            placeholder="Để lại vài dòng nhận xét về cuốn sách này..."
                        ></textarea>
                    </div>
                </div>
            `;
        }
    });

    orderReviewItemsList.innerHTML = html;

    const modalTitle = reviewOrderModal.querySelector('.order-review-modal-header h3');
    const submitBtn = orderReviewForm ? orderReviewForm.querySelector('.btn-confirm-review') : null;

    if (unreviewedCount === 0) {
        if (modalTitle) modalTitle.textContent = '🎉 Bạn Đã Đánh Giá Tất Cả Sách Trong Đơn';
        if (submitBtn) {
            submitBtn.style.display = 'none';
        }
    } else {
        if (modalTitle) modalTitle.textContent = '⭐ Đánh Giá Sản Phẩm Vừa Mua';
        if (submitBtn) {
            submitBtn.style.display = '';
            submitBtn.textContent = `🚀 Gửi Đánh Giá (${unreviewedCount} cuốn sách)`;
        }
    }

    reviewOrderModal.classList.add('active');
}

function closeReviewModal() {
    if (reviewOrderModal) {
        reviewOrderModal.classList.remove('active');
    }
    currentReviewingOrder = null;
}

if (btnCloseReviewModal) {
    btnCloseReviewModal.addEventListener('click', closeReviewModal);
}
if (btnSkipReview) {
    btnSkipReview.addEventListener('click', closeReviewModal);
}

// Bắt sự kiện chọn sao trên từng sản phẩm trong modal
if (orderReviewItemsList) {
    orderReviewItemsList.addEventListener('click', (e) => {
        const btn = e.target.closest('.star-btn');
        if (!btn) return;

        const picker = btn.closest('.item-star-picker');
        if (!picker) return;

        const val = Number(btn.dataset.val);
        const index = picker.dataset.itemIndex;
        const allBtns = picker.querySelectorAll('.star-btn');

        allBtns.forEach(b => {
            if (Number(b.dataset.val) <= val) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        picker.dataset.selectedVal = val;
        const hintEl = document.querySelector(`#hint-${index}`);
        if (hintEl) {
            hintEl.textContent = `${val} sao`;
        }
    });
}

// Bắt sự kiện submit form đánh giá đơn hàng
if (orderReviewForm) {
    orderReviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentReviewingOrder || !currentReviewingOrder.items) return;

        const user = authService.getCurrentUser();
        const reviewerName = user ? (user.name || user.email) : (currentReviewingOrder.receiverName || 'Độc giả');
        const userEmail = user ? (user.email || '') : (currentReviewingOrder.userEmail || '');
        const userId = user ? user.id : (currentReviewingOrder.userId || null);

        // Chỉ gửi đánh giá cho những sản phẩm chưa từng được đánh giá
        const unreviewedCards = Array.from(orderReviewItemsList.querySelectorAll('.review-order-product-card:not([data-already-reviewed="true"])'));

        if (unreviewedCards.length === 0) {
            alert('Bạn đã đánh giá tất cả các cuốn sách trong đơn hàng này rồi!');
            closeReviewModal();
            return;
        }

        const submitBtn = orderReviewForm.querySelector('.btn-confirm-review');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang gửi đánh giá...';
        }

        try {
            let submittedCount = 0;
            for (const card of unreviewedCards) {
                const prodId = Number(card.dataset.productId);
                const picker = card.querySelector('.item-star-picker');
                const rating = picker && picker.dataset.selectedVal ? Number(picker.dataset.selectedVal) : 5;
                const textarea = card.querySelector('textarea');
                const comment = textarea && textarea.value.trim() ? textarea.value.trim() : 'Sách chất lượng tốt, giao hàng cẩn thận!';

                try {
                    await reviewService.create({
                        productId: prodId,
                        userId: userId,
                        userName: reviewerName,
                        userEmail: userEmail,
                        rating,
                        comment,
                        orderCode: currentReviewingOrder.orderCode,
                        createdAt: new Date().toISOString()
                    });
                    submittedCount++;
                } catch (reviewErr) {
                    console.warn(`Bỏ qua sách #${prodId}:`, reviewErr.message);
                }
            }

            if (submittedCount > 0) {
                alert(`✓ Cảm ơn bạn rất nhiều! Đã ghi nhận ${submittedCount} đánh giá mới của bạn.`);
            } else {
                alert('Tài khoản của bạn đã đánh giá các cuốn sách này trước đó.');
            }
            closeReviewModal();
        } catch (err) {
            console.error('Lỗi khi gửi đánh giá đơn hàng:', err);
            alert('Không thể lưu đánh giá lúc này, vui lòng thử lại sau.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Gửi Đánh Giá';
            }
        }
    });
}

// 1. Đồng bộ thông tin người dùng
const currentUser = authService.getCurrentUser();
const userAvatarOrders = document.querySelector('#userAvatarOrders');
if (currentUser && userNameText) {
    userNameText.textContent = currentUser.name || currentUser.email;
    if (userAvatarOrders && currentUser.avatar) {
        userAvatarOrders.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">`;
    }
}

// 2. Định dạng ngày tháng
function formatDate(dateString) {
    if (!dateString) return 'Vừa đặt';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
}

// 3. Lấy class màu sắc và nhãn hiển thị theo trạng thái đơn
function getOrderStatusInfo(order) {
    const status = (order.status || '').toLowerCase();
    const isVietQr = order.paymentMethod === 'VIETQR' || order.isPaid === true;

    if (status.includes('hoàn thành') || status.includes('đã giao')) {
        return {
            statusClass: 'status-delivered',
            statusText: 'Hoàn thành'
        };
    }

    if (status.includes('hủy')) {
        return {
            statusClass: 'status-cancelled',
            statusText: 'Đã hủy'
        };
    }

    // Yêu cầu: Đơn hàng thanh toán QR nếu chưa giao hàng thì phải ở trạng thái Đang giao hàng
    if (isVietQr) {
        return {
            statusClass: 'status-shipping',
            statusText: 'Đang giao hàng'
        };
    }

    if (status.includes('đang giao')) {
        return {
            statusClass: 'status-shipping',
            statusText: 'Đang giao hàng'
        };
    }

    return {
        statusClass: 'status-pending',
        statusText: 'Chờ xác nhận (COD)'
    };
}

// ============ TẠO & HIỂN THỊ TỜ HÓA ĐƠN ĐIỆN TỬ ============
function renderInvoiceSheet(order) {
    if (!invoiceSheet || !order) return;

    const isPaid = order.paymentMethod === 'VIETQR' || order.isPaid === true || (order.status || '').toLowerCase().includes('đã thanh toán');
    const paymentLabel = order.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR (Đã thanh toán)' : 'Thanh toán tiền mặt khi nhận hàng (COD)';
    const formattedDate = formatDate(order.createdAt);
    const items = order.items || [];
    const subTotal = Number(order.subTotal) || items.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
    const shippingFee = order.shippingFee !== undefined ? Number(order.shippingFee) : (subTotal >= 250000 ? 0 : 30000);
    const totalAmount = Number(order.totalAmount) || (subTotal + shippingFee);

    const rowsHtml = items.map((item, index) => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        return `
            <tr>
                <td style="text-align: center; font-weight: 700;">${index + 1}</td>
                <td>
                    <strong style="color: #0f172a; display: block; font-size: 0.95rem;">${item.name}</strong>
                    <span style="font-size: 0.8rem; color: #64748b;">${item.author ? `Tác giả: ${item.author}` : 'Sách chọn lọc'}</span>
                </td>
                <td style="text-align: center; font-weight: 700;">x${item.quantity}</td>
                <td style="text-align: right; color: #475569;">${formatPrice(item.price)}</td>
                <td style="text-align: right; font-weight: 800; color: #0f172a;">${formatPrice(itemTotal)}</td>
            </tr>
        `;
    }).join('');

    invoiceSheet.innerHTML = `
        <!-- HEADER CỬA HÀNG -->
        <div class="inv-top-header">
            <div class="inv-store-info">
                <h2>📚 NHÀ SÁCH TRÍ TUỆ</h2>
                <p class="inv-slogan">Khơi Nguồn Tri Thức &bull; Nâng Tầm Trí Tuệ</p>
                <p>📍 Địa chỉ: 123 Đường Sách Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM</p>
                <p>📞 Hotline: 1900 6868 &bull; ✉️ Email: hotro@trituebook.vn</p>
            </div>
            <div class="inv-meta-info">
                <div class="inv-doc-title">HÓA ĐƠN BÁN HÀNG</div>
                <div class="inv-meta-line">Mã hóa đơn: <strong>#${order.orderCode}</strong></div>
                <div class="inv-meta-line">Ngày lập: <strong>${formattedDate}</strong></div>
                <div class="inv-meta-line">Trạng thái: <strong style="color: ${isPaid ? '#059669' : '#d97706'}; font-weight: 900;">${isPaid ? 'ĐÃ THANH TOÁN (VIETQR)' : 'CHƯA THANH TOÁN'}</strong></div>
            </div>
        </div>

        <!-- THÔNG TIN KHÁCH HÀNG & GIAO HÀNG -->
        <div class="inv-customer-card">
            <div class="inv-cust-col">
                <p><strong>Khách hàng:</strong> ${order.receiverName || 'Quý khách hàng'}</p>
                <p><strong>Số điện thoại:</strong> ${order.receiverPhone || '---'}</p>
                <p><strong>Tài khoản Email:</strong> ${order.userEmail || 'Khách vãng lai'}</p>
            </div>
            <div class="inv-cust-col">
                <p><strong>Địa chỉ giao:</strong> ${order.receiverAddress || 'Nhận tại quầy'}</p>
                <p><strong>Phương thức:</strong> ${paymentLabel}</p>
                <p><strong>Ghi chú đơn:</strong> ${order.receiverNote || 'Không có'}</p>
            </div>
        </div>

        <!-- BẢNG DANH SÁCH SÁCH -->
        <table class="inv-table">
            <thead>
                <tr>
                    <th style="width: 50px; text-align: center;">STT</th>
                    <th>Tên Sách / Tác Phẩm</th>
                    <th style="width: 80px; text-align: center;">Số lượng</th>
                    <th style="width: 120px; text-align: right;">Đơn giá</th>
                    <th style="width: 140px; text-align: right;">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        <!-- TỔNG KẾT HÓA ĐƠN -->
        <div class="inv-totals-box">
            <div class="inv-totals-table">
                <div class="inv-totals-row">
                    <span>Tạm tính tiền sách:</span>
                    <span>${formatPrice(subTotal)}</span>
                </div>
                <div class="inv-totals-row">
                    <span>Phí vận chuyển giao hàng:</span>
                    <span>${shippingFee === 0 ? '<strong style="color: #059669;">Miễn phí</strong>' : formatPrice(shippingFee)}</span>
                </div>
                <div class="inv-totals-row grand-total">
                    <span>TỔNG CỘNG THANH TOÁN:</span>
                    <span>${formatPrice(totalAmount)}</span>
                </div>
            </div>
        </div>

        <!-- FOOTER & CON DẤU MỘC ĐIỆN TỬ -->
        <div class="inv-footer-area">
            <div class="inv-note-box">
                <p>❤️ <em>Cảm ơn Quý khách đã mua sách tại Nhà Sách Trí Tuệ!</em></p>
                <p>• Hóa đơn điện tử có giá trị bảo hành, đổi trả sách trong vòng 7 ngày kể từ ngày nhận sách.</p>
                <p>• Mọi thắc mắc xin vui lòng liên hệ tổng đài <strong>1900 6868</strong> để được hỗ trợ tốt nhất.</p>
            </div>
            <div class="inv-sign-box">
                <div class="inv-sign-title">ĐẠI DIỆN NHÀ SÁCH</div>
                <div class="inv-sign-sub">(Ký & Đóng dấu điện tử)</div>
                <div class="digital-stamp">
                    NHÀ SÁCH TRÍ TUỆ<br>
                    ${isPaid ? '★ ĐÃ THANH TOÁN (VIETQR) ★' : 'CHỜ THANH TOÁN'}<br>
                    XÁC THỰC HỆ THỐNG
                </div>
            </div>
        </div>
    `;
}

function openInvoiceModal(order) {
    if (!invoiceModal || !order) return;
    currentViewingOrder = order;
    renderInvoiceSheet(order);
    invoiceModal.classList.add('active');
}

function closeInvoiceModal() {
    if (invoiceModal) {
        invoiceModal.classList.remove('active');
    }
    currentViewingOrder = null;
}

if (btnCloseInvoiceModal) {
    btnCloseInvoiceModal.addEventListener('click', closeInvoiceModal);
}

// Bắt sự kiện In hóa đơn
if (btnPrintInvoice) {
    btnPrintInvoice.addEventListener('click', () => {
        window.print();
    });
}

// Bắt sự kiện Xuất Hóa Đơn PDF (Có ràng buộc chặt chẽ tránh bấm nhiều lần xuất nhiều file)
if (btnExportInvoicePdf) {
    btnExportInvoicePdf.addEventListener('click', async () => {
        // RÀNG BUỘC 1: Nếu đang trong tiến trình xuất file thì bỏ qua lập tức
        if (isExportingPdf) return;
        if (!currentViewingOrder) {
            alert('Không tìm thấy thông tin đơn hàng để xuất hóa đơn.');
            return;
        }

        // RÀNG BUỘC 2: Bật cờ khóa, vô hiệu hóa nút bấm và cập nhật giao diện thông báo
        isExportingPdf = true;
        btnExportInvoicePdf.disabled = true;
        const originalHtml = btnExportInvoicePdf.innerHTML;
        btnExportInvoicePdf.innerHTML = '⏳ Đang tạo file PDF, vui lòng chờ...';

        try {
            const sheet = document.getElementById('invoiceSheet');
            if (!sheet) throw new Error('Không tìm thấy khung hóa đơn');

            const opt = {
                margin: [8, 8, 8, 8],
                filename: `HoaDon_${currentViewingOrder.orderCode}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            let html2pdfLib = window.html2pdf;
            if (!html2pdfLib) {
                try {
                    const mod = await import('html2pdf.js');
                    html2pdfLib = mod.default || mod;
                } catch (e) {
                    console.warn('Không thể nạp html2pdf từ npm:', e);
                }
            }

            if (typeof html2pdfLib === 'function') {
                await html2pdfLib().set(opt).from(sheet).save();
                btnExportInvoicePdf.innerHTML = '✓ Đã xuất PDF thành công!';
            } else {
                window.print();
                btnExportInvoicePdf.innerHTML = '🖨️ Đã mở hộp thoại in PDF!';
            }
        } catch (err) {
            console.error('Lỗi khi xuất PDF:', err);
            alert('Không thể tạo file PDF lúc này, bạn có thể chọn nút In hóa đơn để lưu PDF từ trình duyệt.');
        } finally {
            // RÀNG BUỘC 3: Giữ nút bị khóa thêm 2.5 giây để tránh việc người dùng nhấp đúp hoặc liên tục xuất trùng
            setTimeout(() => {
                isExportingPdf = false;
                btnExportInvoicePdf.disabled = false;
                btnExportInvoicePdf.innerHTML = originalHtml;
            }, 2500);
        }
    });
}

// 4. Render danh sách đơn hàng
function renderOrders(orders) {
    if (!ordersContainer) return;

    if (!orders || orders.length === 0) {
        ordersContainer.innerHTML = '';
        if (emptyOrders) emptyOrders.style.display = 'block';
        return;
    }

    if (emptyOrders) emptyOrders.style.display = 'none';

    // Sắp xếp đơn hàng mới nhất lên đầu
    const sorted = [...orders].reverse();

    ordersContainer.innerHTML = sorted.map(order => {
        const { statusClass, statusText } = getOrderStatusInfo(order);
        const formattedDate = formatDate(order.createdAt);
        const items = order.items || [];
        const isVietQr = order.paymentMethod === 'VIETQR' || order.isPaid === true;

        const isCompleted = order.status === 'Hoàn thành' || (order.status || '').toLowerCase().includes('hoàn thành');
        const isCancelled = (order.status || '').toLowerCase().includes('hủy');
        const isPendingCod = !isVietQr && (order.status || '').toLowerCase().includes('chờ xác nhận');

        let actionsHtml = `
            <button type="button" class="btn-view-invoice" data-order-id="${order.id}">
                📄 Chi tiết & Hóa đơn PDF
            </button>
        `;

        if (isCompleted) {
            actionsHtml += `<span class="badge-status-done">✓ Đã nhận hàng & Hoàn thành</span>`;
        } else if (isCancelled) {
            actionsHtml += `<span class="badge-status-cancelled">Đơn hàng đã bị hủy</span>`;
        } else {
            // Đơn đang giao (kể cả VietQR hay COD) đều có nút xác nhận nhận hàng
            actionsHtml += `
                ${isPendingCod ? `<button type="button" class="btn-cancel-user-order" data-order-id="${order.id}" data-order-code="${order.orderCode}">Hủy đơn hàng</button>` : ''}
                <button type="button" class="btn-confirm-received" data-order-id="${order.id}" data-order-code="${order.orderCode}">
                    📦 Xác nhận đã nhận hàng
                </button>
            `;
        }

        const itemsHtml = items.map(item => `
            <div class="order-item-row">
                <div class="item-thumb">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <div class="item-meta">
                        Số lượng: <strong>x${item.quantity}</strong> &bull; Đơn giá: ${formatPrice(item.price)}
                    </div>
                </div>
                <div class="item-subtotal">
                    ${formatPrice(item.price * item.quantity)}
                </div>
            </div>
        `).join('');

        return `
            <article class="order-card" data-code="${order.orderCode}">
                <div class="order-header">
                    <div class="order-code-wrap">
                        <span class="order-code">#${order.orderCode}</span>
                        <span class="order-date">📅 ${formattedDate}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        ${isVietQr ? `<span class="badge-paid-vietqr">✓ Đã thanh toán (VietQR)</span>` : ''}
                        <span class="status-badge ${statusClass}">
                            ● ${statusText}
                        </span>
                    </div>
                </div>

                <div class="order-body">
                    <div class="order-items-list">
                        ${itemsHtml}
                    </div>

                    <div class="order-info-grid">
                        <div class="info-box">
                            <strong>Người nhận:</strong>
                            <span>${order.receiverName} (${order.receiverPhone})</span>
                        </div>
                        <div class="info-box">
                            <strong>Địa chỉ giao:</strong>
                            <span>${order.receiverAddress}</span>
                        </div>
                    </div>
                </div>

                <div class="order-footer">
                    <div class="payment-method-badge">
                        💳 ${isVietQr ? 'Chuyển khoản VietQR (Đã thanh toán)' : 'Thanh toán tiền mặt khi nhận hàng (COD)'}
                    </div>
                    <div class="total-wrap">
                        <span class="total-label">Tổng thanh toán:</span>
                        <span class="total-val">${formatPrice(order.totalAmount)}</span>
                    </div>
                </div>

                <div class="order-bottom-bar">
                    ${actionsHtml}
                </div>
            </article>
        `;
    }).join('');
}

// 5. Tải dữ liệu đơn hàng
async function loadOrders() {
    try {
        if (loading) loading.style.display = 'block';
        if (errorEl) errorEl.style.display = 'none';

        const orders = await orderService.getAllOrders();

        if (loading) loading.style.display = 'none';

        // Lọc đơn hàng của người dùng hiện tại
        if (currentUser) {
            allUserOrders = orders.filter(o => 
                (o.userId && Number(o.userId) === Number(currentUser.id)) ||
                (o.userEmail && o.userEmail.toLowerCase() === currentUser.email?.toLowerCase()) ||
                (o.receiverName && o.receiverName.toLowerCase() === currentUser.name?.toLowerCase())
            );

            // Nếu user chưa có đơn nào gắn id, hiển thị toàn bộ đơn để kiểm tra
            if (allUserOrders.length === 0 && orders.length > 0) {
                allUserOrders = orders;
            }
        } else {
            // Khách chưa đăng nhập: hiển thị tất cả các đơn hàng vừa tạo trên hệ thống
            allUserOrders = orders;
        }

        renderOrders(allUserOrders);

    } catch (err) {
        console.error('Không thể tải đơn hàng:', err);
        if (loading) loading.style.display = 'none';
        if (errorEl) errorEl.style.display = 'block';
    }
}

// 6. Tìm kiếm theo mã đơn hoặc số điện thoại
if (searchOrderInput) {
    searchOrderInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
            renderOrders(allUserOrders);
            return;
        }

        const filtered = allUserOrders.filter(order => {
            const code = (order.orderCode || '').toLowerCase();
            const phone = (order.receiverPhone || '').toLowerCase();
            const name = (order.receiverName || '').toLowerCase();
            return code.includes(query) || phone.includes(query) || name.includes(query);
        });

        renderOrders(filtered);
    });
}

// 7. Xử lý sự kiện "Xác nhận đã nhận hàng" và "Hủy đơn" từ phía người dùng
if (ordersContainer) {
    ordersContainer.addEventListener('click', async (e) => {
        // Nút: Xác nhận đã nhận hàng
        const btnConfirm = e.target.closest('.btn-confirm-received');
        if (btnConfirm) {
            const orderId = btnConfirm.dataset.orderId;
            const orderCode = btnConfirm.dataset.orderCode;

            if (confirm(`Bạn xác nhận đã nhận được sách và muốn hoàn thành đơn hàng #${orderCode}?`)) {
                try {
                    btnConfirm.disabled = true;
                    btnConfirm.textContent = 'Đang xử lý...';

                    // Cập nhật trạng thái thành "Hoàn thành"
                    await orderService.updateStatus(orderId, 'Hoàn thành');

                    // Cập nhật dữ liệu trên bộ nhớ cục bộ
                    const target = allUserOrders.find(o => Number(o.id) === Number(orderId));
                    if (target) {
                        target.status = 'Hoàn thành';

                        // Tăng số lượng đã bán cho các sách trong đơn hàng
                        if (target.items && Array.isArray(target.items)) {
                            target.items.forEach(item => {
                                productService.increaseSoldCount(item.id, item.quantity || 1).catch(e => console.warn(e));
                            });
                        }
                    }

                    renderOrders(allUserOrders);

                    // Mở Modal đánh giá sản phẩm cho người dùng
                    if (target && target.items && target.items.length > 0) {
                        setTimeout(() => {
                            openReviewModal(target);
                        }, 500);
                    } else {
                        alert(`✓ Chúc mừng bạn! Đơn hàng #${orderCode} đã hoàn thành.`);
                    }
                } catch (err) {
                    console.error('Lỗi khi xác nhận nhận hàng:', err);
                    alert('Không thể cập nhật trạng thái đơn hàng. Vui lòng kiểm tra lại kết nối!');
                    btnConfirm.disabled = false;
                    btnConfirm.textContent = '📦 Xác nhận đã nhận hàng';
                }
            }
            return;
        }

        // Nút: Xem chi tiết & Xuất hóa đơn PDF
        const btnViewInv = e.target.closest('.btn-view-invoice');
        if (btnViewInv) {
            const orderId = btnViewInv.dataset.orderId;
            const target = allUserOrders.find(o => Number(o.id) === Number(orderId));
            if (target) {
                openInvoiceModal(target);
            }
            return;
        }

        // Nút: Hủy đơn hàng (khi còn ở trạng thái Chờ xác nhận)
        const btnCancel = e.target.closest('.btn-cancel-user-order');
        if (btnCancel) {
            const orderId = btnCancel.dataset.orderId;
            const orderCode = btnCancel.dataset.orderCode;

            if (confirm(`Bạn có chắc chắn muốn hủy đơn hàng #${orderCode}?`)) {
                try {
                    btnCancel.disabled = true;
                    btnCancel.textContent = 'Đang hủy...';

                    await orderService.updateStatus(orderId, 'Đã hủy');

                    const target = allUserOrders.find(o => Number(o.id) === Number(orderId));
                    if (target) target.status = 'Đã hủy';

                    renderOrders(allUserOrders);
                    alert(`✓ Đơn hàng #${orderCode} đã được hủy.`);
                } catch (err) {
                    console.error('Lỗi khi hủy đơn hàng:', err);
                    alert('Không thể hủy đơn hàng. Vui lòng thử lại!');
                    btnCancel.disabled = false;
                    btnCancel.textContent = 'Hủy đơn hàng';
                }
            }
            return;
        }
    });
}

// Đóng modal khi click ra ngoài overlay
if (invoiceModal) {
    invoiceModal.addEventListener('click', (e) => {
        if (e.target === invoiceModal) {
            closeInvoiceModal();
        }
    });
}

if (reviewOrderModal) {
    reviewOrderModal.addEventListener('click', (e) => {
        if (e.target === reviewOrderModal) {
            closeReviewModal();
        }
    });
}

// Đóng modal bằng phím ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (invoiceModal && invoiceModal.classList.contains('active')) {
            closeInvoiceModal();
        }
        if (reviewOrderModal && reviewOrderModal.classList.contains('active')) {
            closeReviewModal();
        }
    }
});

loadOrders();
initNotificationBell();
initChatbot();
