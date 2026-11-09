import { authService } from '../services/authService.js';
import { orderService } from '../services/orderService.js';
import { wishlistService } from '../services/wishlistService.js';
import { compressAndReadFile } from '../utils/imageUpload.js';
import { initChatbot } from './chatWidget.js';
import { initNotificationBell } from './notificationBell.js';
import { initInternalChat } from './internalChat.js';
import './themeToggle.js';

// DOM Elements
const profileAlert = document.querySelector('#profileAlert');
const roleBadgeTop = document.querySelector('#roleBadgeTop');
const avatarCircle = document.querySelector('#avatarCircle');
const userAvatarImg = document.querySelector('#userAvatarImg');
const avatarInitials = document.querySelector('#avatarInitials');
const avatarFileInput = document.querySelector('#avatarFileInput');
const btnUploadAvatar = document.querySelector('#btnUploadAvatar');
const btnAvatarUrl = document.querySelector('#btnAvatarUrl');
const btnRemoveAvatar = document.querySelector('#btnRemoveAvatar');
const avatarUrlBox = document.querySelector('#avatarUrlBox');
const inputAvatarUrl = document.querySelector('#inputAvatarUrl');
const btnApplyAvatarUrl = document.querySelector('#btnApplyAvatarUrl');
const btnCancelAvatarUrl = document.querySelector('#btnCancelAvatarUrl');

const userDisplayName = document.querySelector('#userDisplayName');
const userEmailText = document.querySelector('#userEmailText');
const userRoleDetail = document.querySelector('#userRoleDetail');
const userOrdersCount = document.querySelector('#userOrdersCount');
const userWishlistCount = document.querySelector('#userWishlistCount');

const tabNavItems = document.querySelectorAll('.sidebar-nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');

// Profile Form
const profileForm = document.querySelector('#profileForm');
const inputName = document.querySelector('#inputName');
const inputEmail = document.querySelector('#inputEmail');
const inputPhone = document.querySelector('#inputPhone');
const selectGender = document.querySelector('#selectGender');
const inputDob = document.querySelector('#inputDob');
const inputRoleDisplay = document.querySelector('#inputRoleDisplay');
const inputAddress = document.querySelector('#inputAddress');
const inputBio = document.querySelector('#inputBio');
const btnSaveProfile = document.querySelector('#btnSaveProfile');

// Password Form
const passwordForm = document.querySelector('#passwordForm');
const inputOldPassword = document.querySelector('#inputOldPassword');
const inputNewPassword = document.querySelector('#inputNewPassword');
const inputConfirmPassword = document.querySelector('#inputConfirmPassword');
const btnChangePassword = document.querySelector('#btnChangePassword');

// Shortcuts
const sellerShortcutCard = document.querySelector('#sellerShortcutCard');
const adminShortcutCard = document.querySelector('#adminShortcutCard');
const btnLogoutTop = document.querySelector('#btnLogoutTop');

let currentUser = null;

// Hiển thị thông báo Alert Toast
function showAlert(message, type = 'success', duration = 4000) {
    if (!profileAlert) return;
    profileAlert.className = `alert-box alert-${type}`;
    profileAlert.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span> <span>${message}</span>`;
    profileAlert.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (duration > 0) {
        setTimeout(() => {
            profileAlert.classList.add('hidden');
        }, duration);
    }
}

// Chuyển đổi tên vai trò thân thiện
function getRoleLabel(role) {
    switch (role) {
        case 'admin':
            return { title: 'Quản trị viên (Admin)', badgeClass: 'role-admin' };
        case 'seller':
            return { title: 'Kênh Người Bán (Seller)', badgeClass: 'role-seller' };
        default:
            return { title: 'Thành viên (Khách hàng)', badgeClass: 'role-customer' };
    }
}

// Cập nhật hiển thị Avatar
function renderAvatar(avatarUrl, name, email) {
    const displayName = name || email || 'U';
    const initialChar = displayName.trim().charAt(0).toUpperCase();

    if (avatarUrl && avatarUrl.trim() !== '') {
        userAvatarImg.src = avatarUrl;
        userAvatarImg.classList.remove('hidden');
        avatarInitials.classList.add('hidden');
        userAvatarImg.onerror = () => {
            // Nếu ảnh lỗi đường link
            userAvatarImg.classList.add('hidden');
            avatarInitials.classList.remove('hidden');
            avatarInitials.textContent = initialChar;
        };
    } else {
        userAvatarImg.classList.add('hidden');
        avatarInitials.classList.remove('hidden');
        avatarInitials.textContent = initialChar;
    }
}

// Nạp dữ liệu tài khoản
async function initUserProfile() {
    currentUser = authService.getCurrentUser();
    if (!currentUser) {
        alert('Vui lòng đăng nhập để xem và quản trị hồ sơ cá nhân của bạn!');
        window.location.href = './login.html';
        return;
    }

    try {
        // Lấy dữ liệu mới nhất từ máy chủ
        const freshData = await authService.getUserById(currentUser.id);
        if (freshData) {
            currentUser = { ...currentUser, ...freshData };
        }
    } catch (err) {
        console.warn('Không thể đồng bộ dữ liệu mới nhất từ máy chủ, sử dụng bộ nhớ tạm:', err);
    }

    populateUserData(currentUser);
    loadUserOrderStats(currentUser);
    loadUserWishlistStats(currentUser);
}

// Điền thông tin vào giao diện
function populateUserData(user) {
    const roleInfo = getRoleLabel(user.role);

    // Tiêu đề & Badges
    if (roleBadgeTop) {
        roleBadgeTop.textContent = roleInfo.title;
        roleBadgeTop.className = `badge-role ${roleInfo.badgeClass}`;
    }

    // Sidebar Summary
    const displayName = user.shopName || user.name || user.email;
    if (userDisplayName) userDisplayName.textContent = displayName;
    if (userEmailText) userEmailText.textContent = user.email || 'Chưa cập nhật email';
    if (userRoleDetail) userRoleDetail.textContent = roleInfo.title;

    // Render Avatar
    renderAvatar(user.avatar, displayName, user.email);

    // Form Personal Info
    if (inputName) inputName.value = user.name || '';
    if (inputEmail) inputEmail.value = user.email || '';
    if (inputPhone) inputPhone.value = user.phone || user.shopPhone || '';
    if (selectGender) selectGender.value = user.gender || '';
    if (inputDob) inputDob.value = user.dob || '';
    if (inputRoleDisplay) inputRoleDisplay.value = roleInfo.title;
    if (inputAddress) inputAddress.value = user.address || user.shopAddress || '';
    if (inputBio) inputBio.value = user.bio || '';

    // Shortcuts phân quyền
    if (user.role === 'admin') {
        if (adminShortcutCard) adminShortcutCard.classList.remove('hidden');
        if (sellerShortcutCard) sellerShortcutCard.classList.remove('hidden');
    } else if (user.role === 'seller') {
        if (sellerShortcutCard) sellerShortcutCard.classList.remove('hidden');
    }
}

// Tải số lượng đơn hàng của người dùng
async function loadUserOrderStats(user) {
    if (!userOrdersCount) return;
    try {
        const orders = await orderService.getAllOrders();
        if (Array.isArray(orders)) {
            const userOrders = orders.filter(o => 
                (o.userId && String(o.userId) === String(user.id)) ||
                (o.customerEmail && o.customerEmail.toLowerCase() === (user.email || '').toLowerCase()) ||
                (o.phone && o.phone === user.phone)
            );
            userOrdersCount.textContent = `${userOrders.length} đơn`;
        }
    } catch (e) {
        console.warn('Không thể tải thống kê đơn hàng:', e);
        userOrdersCount.textContent = '0 đơn';
    }
}

// Tải số lượng sách yêu thích của người dùng
async function loadUserWishlistStats(user) {
    if (!userWishlistCount) return;
    try {
        const wishlist = await wishlistService.getUserWishlist(user.id);
        userWishlistCount.textContent = `${(wishlist || []).length} cuốn`;
    } catch (e) {
        console.warn('Không thể tải thống kê sách yêu thích:', e);
        userWishlistCount.textContent = '0 cuốn';
    }
}

// Quản lý chuyển Tabs
tabNavItems.forEach(btn => {
    btn.addEventListener('click', () => {
        tabNavItems.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetTabId = btn.getAttribute('data-tab');
        const targetPane = document.getElementById(targetTabId);
        if (targetPane) targetPane.classList.add('active');
    });
});

// Nút mở hộp nhập Avatar qua URL
if (btnAvatarUrl && avatarUrlBox) {
    btnAvatarUrl.addEventListener('click', () => {
        avatarUrlBox.classList.toggle('hidden');
        if (!avatarUrlBox.classList.contains('hidden') && inputAvatarUrl) {
            inputAvatarUrl.focus();
        }
    });
}

if (btnCancelAvatarUrl && avatarUrlBox) {
    btnCancelAvatarUrl.addEventListener('click', () => {
        avatarUrlBox.classList.add('hidden');
    });
}

// Áp dụng ảnh đại diện từ link URL
if (btnApplyAvatarUrl && inputAvatarUrl) {
    btnApplyAvatarUrl.addEventListener('click', async () => {
        const url = inputAvatarUrl.value.trim();
        if (!url) {
            showAlert('Vui lòng nhập đường dẫn URL hình ảnh hợp lệ!', 'danger');
            return;
        }

        try {
            btnApplyAvatarUrl.disabled = true;
            btnApplyAvatarUrl.textContent = 'Đang kiểm tra...';

            // Cập nhật thông tin qua authService
            const updated = await authService.updateProfile(currentUser.id, { avatar: url });
            currentUser = updated;
            renderAvatar(url, currentUser.name, currentUser.email);
            avatarUrlBox.classList.add('hidden');
            inputAvatarUrl.value = '';
            showAlert('Đã cập nhật ảnh đại diện từ URL thành công!', 'success');
        } catch (error) {
            console.error('Lỗi khi cập nhật avatar từ URL:', error);
            showAlert('Không thể cập nhật ảnh đại diện. Vui lòng kiểm tra lại đường dẫn!', 'danger');
        } finally {
            btnApplyAvatarUrl.disabled = false;
            btnApplyAvatarUrl.textContent = 'Áp dụng';
        }
    });
}

// Nút chọn file ảnh từ máy
if (btnUploadAvatar && avatarFileInput) {
    btnUploadAvatar.addEventListener('click', () => {
        avatarFileInput.click();
    });
}

// Xử lý nạp file ảnh trực tiếp từ máy tính / điện thoại
if (avatarFileInput) {
    avatarFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showAlert('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP, GIF)!', 'danger');
            return;
        }

        try {
            showAlert('Đang xử lý và tối ưu hóa ảnh đại diện...', 'success', 2000);
            // Nén ảnh về kích thước vuông 400x400 với chất lượng cao
            const dataUrl = await compressAndReadFile(file, 400, 400, 0.88);

            // Cập nhật lên máy chủ
            const updated = await authService.updateProfile(currentUser.id, { avatar: dataUrl });
            currentUser = updated;
            renderAvatar(dataUrl, currentUser.name, currentUser.email);
            showAlert('Đã tải lên và cập nhật ảnh đại diện thành công!', 'success');
        } catch (error) {
            console.error('Lỗi tải file ảnh đại diện:', error);
            showAlert('Lỗi xử lý file ảnh: ' + (error.message || 'Không thể đọc file.'), 'danger');
        } finally {
            avatarFileInput.value = '';
        }
    });
}

// Xử lý gỡ ảnh đại diện
if (btnRemoveAvatar) {
    btnRemoveAvatar.addEventListener('click', async () => {
        if (!currentUser.avatar) {
            showAlert('Bạn đang sử dụng ảnh đại diện mặc định.', 'danger');
            return;
        }

        const confirmRemove = window.confirm('Bạn có chắc chắn muốn gỡ ảnh đại diện và trở về mặc định không?');
        if (!confirmRemove) return;

        try {
            const updated = await authService.updateProfile(currentUser.id, { avatar: '' });
            currentUser = updated;
            renderAvatar('', currentUser.name, currentUser.email);
            showAlert('Đã gỡ ảnh đại diện về mặc định thành công!', 'success');
        } catch (error) {
            console.error('Lỗi khi gỡ avatar:', error);
            showAlert('Không thể gỡ ảnh đại diện. Vui lòng thử lại!', 'danger');
        }
    });
}

// Xử lý Submit Form Cập nhật thông tin cá nhân
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = inputName.value.trim();
        const phone = inputPhone.value.trim();
        const gender = selectGender.value;
        const dob = inputDob.value;
        const address = inputAddress.value.trim();
        const bio = inputBio.value.trim();

        if (!name) {
            showAlert('Họ và tên không được để trống!', 'danger');
            inputName.focus();
            return;
        }

        try {
            if (btnSaveProfile) {
                btnSaveProfile.disabled = true;
                btnSaveProfile.textContent = '⏳ Đang lưu hồ sơ...';
            }

            const updatePayload = {
                name,
                phone,
                gender,
                dob,
                address,
                bio
            };

            const updatedUser = await authService.updateProfile(currentUser.id, updatePayload);
            currentUser = updatedUser;
            populateUserData(currentUser);
            showAlert('Hồ sơ cá nhân đã được lưu và cập nhật thành công!', 'success');
        } catch (error) {
            console.error('Lỗi lưu thông tin hồ sơ:', error);
            showAlert('Lỗi khi lưu thông tin: ' + (error.message || 'Vui lòng thử lại sau.'), 'danger');
        } finally {
            if (btnSaveProfile) {
                btnSaveProfile.disabled = false;
                btnSaveProfile.textContent = '💾 Lưu thay đổi hồ sơ';
            }
        }
    });
}

// Nút hoàn tác form thông tin
const btnResetProfile = document.querySelector('#btnResetProfile');
if (btnResetProfile) {
    btnResetProfile.addEventListener('click', (e) => {
        e.preventDefault();
        populateUserData(currentUser);
        showAlert('Đã khôi phục các giá trị ban đầu của bạn.', 'success', 2500);
    });
}

// Bật/tắt ẩn hiện mật khẩu (Eye button)
document.querySelectorAll('.btn-toggle-eye').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const targetInput = document.getElementById(targetId);
        if (!targetInput) return;

        if (targetInput.type === 'password') {
            targetInput.type = 'text';
            btn.textContent = '🙈';
        } else {
            targetInput.type = 'password';
            btn.textContent = '👁️';
        }
    });
});

// Xử lý Submit Form Đổi mật khẩu
if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const oldPass = inputOldPassword.value;
        const newPass = inputNewPassword.value;
        const confirmPass = inputConfirmPassword.value;

        if (!oldPass) {
            showAlert('Vui lòng nhập mật khẩu hiện tại của bạn!', 'danger');
            inputOldPassword.focus();
            return;
        }

        if (!newPass || newPass.length < 6) {
            showAlert('Mật khẩu mới phải có tối thiểu 6 ký tự!', 'danger');
            inputNewPassword.focus();
            return;
        }

        if (newPass !== confirmPass) {
            showAlert('Xác nhận mật khẩu mới không khớp! Vui lòng nhập lại chính xác.', 'danger');
            inputConfirmPassword.focus();
            return;
        }

        if (oldPass === newPass) {
            showAlert('Mật khẩu mới không được trùng với mật khẩu cũ hiện tại!', 'danger');
            inputNewPassword.focus();
            return;
        }

        try {
            if (btnChangePassword) {
                btnChangePassword.disabled = true;
                btnChangePassword.textContent = '⏳ Đang xác thực & đổi mật khẩu...';
            }

            await authService.changePassword(currentUser.id, oldPass, newPass);
            passwordForm.reset();
            showAlert('Đổi mật khẩu thành công! Mật khẩu mới của bạn đã có hiệu lực.', 'success', 5000);
        } catch (error) {
            console.error('Lỗi khi đổi mật khẩu:', error);
            showAlert(error.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại!', 'danger');
        } finally {
            if (btnChangePassword) {
                btnChangePassword.disabled = false;
                btnChangePassword.textContent = '🔑 Cập nhật mật khẩu';
            }
        }
    });
}

// Nút Đăng xuất ở Header
if (btnLogoutTop) {
    btnLogoutTop.addEventListener('click', () => {
        if (window.confirm('Bạn có muốn đăng xuất khỏi tài khoản không?')) {
            authService.logout();
            window.location.href = '../index.html';
        }
    });
}

// Khởi tạo trang
initUserProfile();
initNotificationBell();
initInternalChat();
initChatbot();

const btnOpenProfileChat = document.querySelector('#btnOpenProfileChat');
if (btnOpenProfileChat) {
    btnOpenProfileChat.addEventListener('click', () => {
        const trigger = document.querySelector('#btnOpenInternalChat');
        if (trigger) trigger.click();
    });
}

