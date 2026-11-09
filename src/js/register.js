import { authService } from '../services/authService.js';
import './themeToggle.js';

const registerForm = document.querySelector('#registerForm');
const registerMessage = document.querySelector('#registerMessage');
const message = document.querySelector('#message');
const roleRadios = document.querySelectorAll('input[name="accountRole"]');
const sellerExtraFields = document.querySelector('#sellerExtraFields');
const labelRoleCustomer = document.querySelector('#labelRoleCustomer');
const labelRoleSeller = document.querySelector('#labelRoleSeller');

// Xử lý chuyển đổi giao diện khi chọn Người mua / Người bán
roleRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        const isSeller = radio.value === 'seller';
        if (sellerExtraFields) {
            sellerExtraFields.style.display = isSeller ? 'block' : 'none';
        }
        if (labelRoleCustomer && labelRoleSeller) {
            if (isSeller) {
                labelRoleCustomer.style.borderColor = '#e2e8f0';
                labelRoleCustomer.style.background = '#f8fafc';
                labelRoleCustomer.style.color = '#64748b';

                labelRoleSeller.style.borderColor = '#10b981';
                labelRoleSeller.style.background = '#ecfdf5';
                labelRoleSeller.style.color = '#047857';
            } else {
                labelRoleCustomer.style.borderColor = '#4f46e5';
                labelRoleCustomer.style.background = '#eef2ff';
                labelRoleCustomer.style.color = '#4338ca';

                labelRoleSeller.style.borderColor = '#e2e8f0';
                labelRoleSeller.style.background = '#f8fafc';
                labelRoleSeller.style.color = '#64748b';
            }
        }
    });
});

function showMessage(text, isSuccess = false) {
    if (registerMessage) {
        registerMessage.textContent = text;
        registerMessage.className = isSuccess ? 'message success' : 'message error';
        registerMessage.style.display = 'block';
    }
    if (message) {
        message.textContent = text;
    }
}

registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const selectedRole = document.querySelector('input[name="accountRole"]:checked')?.value || 'customer';
    const isSeller = selectedRole === 'seller';

    const name = document.querySelector('#name')?.value.trim();
    const email = document.querySelector('#email')?.value.trim();
    const password = document.querySelector('#password')?.value;
    const confirmPassword = document.querySelector('#confirmPassword')?.value;

    const shopName = document.querySelector('#shopName')?.value.trim();
    const shopPhone = document.querySelector('#shopPhone')?.value.trim();
    const shopAddress = document.querySelector('#shopAddress')?.value.trim();

    if (!name || !email || !password || !confirmPassword) {
        showMessage('Vui lòng nhập đầy đủ các trường thông tin.');
        return;
    }

    if (isSeller && (!shopName || !shopPhone || !shopAddress)) {
        showMessage('Đối tác bán hàng vui lòng nhập đầy đủ Tên gian hàng, Số điện thoại và Địa chỉ kho!');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!');
        return;
    }

    if (password.length < 6) {
        showMessage('Mật khẩu phải có độ dài tối thiểu từ 6 ký tự.');
        return;
    }

    try {
        // Kiểm tra xem email đã được đăng ký trước đó chưa
        const isExists = await authService.checkEmailExists(email);

        if (isExists) {
            showMessage('Email này đã được sử dụng. Vui lòng chọn email khác!');
            return;
        }

        // Tạo đối tượng user mới
        const newUser = {
            name,
            email,
            password,
            role: isSeller ? 'seller' : 'customer'
        };

        if (isSeller) {
            newUser.shopName = shopName;
            newUser.shopPhone = shopPhone;
            newUser.shopAddress = shopAddress;
            newUser.shopStatus = 'active';
        }

        // Gửi request đăng ký qua authService
        await authService.register(newUser);

        const successText = isSeller 
            ? 'Đăng ký gian hàng thành công! Đang chuyển đến trang đăng nhập...'
            : 'Đăng ký tài khoản thành công! Đang chuyển đến trang đăng nhập...';

        showMessage(successText, true);
        registerForm.reset();

        // Chuyển hướng sang trang đăng nhập sau 1.2s
        setTimeout(() => {
            window.location.href = './login.html';
        }, 1200);

    } catch (error) {
        console.error('Lỗi khi đăng ký:', error);
        showMessage('Không thể kết nối đến máy chủ.');
    }
});
