import { authService } from '../services/authService.js';
import './themeToggle.js';

const loginForm = document.querySelector('#loginForm');
const loginMessage = document.querySelector('#loginMessage');
const message = document.querySelector('#message');

function showMessage(text, isSuccess = false) {
    if (loginMessage) {
        loginMessage.textContent = text;
        loginMessage.className = isSuccess ? 'message success' : 'message error';
        loginMessage.style.display = 'block';
    }
    if (message) {
        message.textContent = text;
    }
}

loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const emailInput = document.querySelector('#email');
    const passwordInput = document.querySelector('#password');

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
        showMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
        return;
    }

    try {
        const user = await authService.login(email, password);

        showMessage(`Đăng nhập thành công! Chào mừng ${user.name}...`, true);

        // Chuyển hướng theo vai trò: Admin sang admin.html, Seller sang seller.html, khách sang index.html
        setTimeout(() => {
            if (user.role === 'admin') {
                window.location.href = './admin.html';
            } else if (user.role === 'seller') {
                window.location.href = './seller.html';
            } else {
                window.location.href = '../index.html';
            }
        }, 800);

    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        showMessage(error.message || 'Không thể kết nối đến server (hãy chắc chắn json-server đang chạy).');
    }
});

/* ========================================================
   LOGIC DEMO KHÔI PHỤC MẬT KHẨU QUA GMAIL (OTP)
   ======================================================== */
const forgotModal = document.querySelector('#forgotPasswordModal');
const btnOpenForgot = document.querySelector('#btnOpenForgotPassword');
const btnCloseForgot = document.querySelector('#btnCloseForgotModal');
const forgotMessage = document.querySelector('#forgotMessage');

// Form 3 bước
const step1Form = document.querySelector('#forgotStep1Form');
const step2Form = document.querySelector('#forgotStep2Form');
const step3Form = document.querySelector('#forgotStep3Form');

// Step indicators
const ind1 = document.querySelector('#stepIndicator1');
const ind2 = document.querySelector('#stepIndicator2');
const ind3 = document.querySelector('#stepIndicator3');
const line1 = document.querySelector('#stepLine1');
const line2 = document.querySelector('#stepLine2');

// Inputs & Components
const forgotEmailInput = document.querySelector('#forgotEmail');
const otpInput = document.querySelector('#otpInput');
const newPasswordInput = document.querySelector('#newPassword');
const confirmNewPasswordInput = document.querySelector('#confirmNewPassword');
const simTargetEmail = document.querySelector('#simTargetEmail');
const simOtpCode = document.querySelector('#simOtpCode');
const btnAutoFillOtp = document.querySelector('#btnAutoFillOtp');
const btnResendOtp = document.querySelector('#btnResendOtp');
const btnBackToStep1 = document.querySelector('#btnBackToStep1');
const otpTimer = document.querySelector('#otpTimer');

// State của quy trình khôi phục
let currentResetUser = null;
let currentOtp = '';
let otpExpireTimestamp = 0;
let resendTimerInterval = null;

function showForgotMessage(text, isSuccess = false) {
    if (forgotMessage) {
        forgotMessage.textContent = text;
        forgotMessage.className = isSuccess ? 'message success' : 'message error';
        forgotMessage.style.display = 'block';
    }
}

function clearForgotMessage() {
    if (forgotMessage) {
        forgotMessage.textContent = '';
        forgotMessage.style.display = 'none';
    }
}

// Chuyển bước trong modal
function setStep(step) {
    clearForgotMessage();

    // Reset forms
    if (step1Form) step1Form.style.display = step === 1 ? 'block' : 'none';
    if (step2Form) step2Form.style.display = step === 2 ? 'block' : 'none';
    if (step3Form) step3Form.style.display = step === 3 ? 'block' : 'none';

    // Update indicators
    if (ind1 && ind2 && ind3 && line1 && line2) {
        ind1.className = `forgot-step-item ${step === 1 ? 'active' : (step > 1 ? 'completed' : '')}`;
        line1.className = `step-line ${step >= 2 ? 'active' : ''}`;
        ind2.className = `forgot-step-item ${step === 2 ? 'active' : (step > 2 ? 'completed' : '')}`;
        line2.className = `step-line ${step >= 3 ? 'active' : ''}`;
        ind3.className = `forgot-step-item ${step === 3 ? 'active' : ''}`;
    }

    if (step === 2) {
        if (otpInput) {
            otpInput.value = '';
            otpInput.focus();
        }
    } else if (step === 3) {
        if (newPasswordInput) {
            newPasswordInput.value = '';
            newPasswordInput.focus();
        }
        if (confirmNewPasswordInput) confirmNewPasswordInput.value = '';
    }
}

// Bắt đầu đếm ngược gửi lại mã OTP (60s)
function startResendCountdown() {
    if (resendTimerInterval) clearInterval(resendTimerInterval);

    let timeLeft = 60;
    if (btnResendOtp) btnResendOtp.disabled = true;
    if (otpTimer) otpTimer.textContent = `${timeLeft}s`;

    resendTimerInterval = setInterval(() => {
        timeLeft--;
        if (otpTimer) otpTimer.textContent = `${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(resendTimerInterval);
            if (btnResendOtp) {
                btnResendOtp.disabled = false;
                btnResendOtp.textContent = 'Gửi lại mã OTP';
            }
            if (otpTimer) otpTimer.textContent = 'Hết hạn';
        }
    }, 1000);
}

// Tạo mã OTP ngẫu nhiên 6 số và giả lập gửi mail
function generateAndSendSimulatedOtp(email) {
    currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpExpireTimestamp = Date.now() + 3 * 60 * 1000; // Hiệu lực 3 phút

    if (simTargetEmail) simTargetEmail.textContent = email;
    if (simOtpCode) simOtpCode.textContent = currentOtp;

    startResendCountdown();
}

// Mở modal
btnOpenForgot?.addEventListener('click', (e) => {
    e.preventDefault();
    if (forgotModal) forgotModal.style.display = 'flex';
    setStep(1);
    if (forgotEmailInput) {
        // Điền sẵn email đang nhập ở form chính nếu có
        const currentEmail = document.querySelector('#email')?.value.trim();
        if (currentEmail) forgotEmailInput.value = currentEmail;
        forgotEmailInput.focus();
    }
});

// Đóng modal
function closeForgotModal() {
    if (forgotModal) forgotModal.style.display = 'none';
    if (resendTimerInterval) clearInterval(resendTimerInterval);
    currentResetUser = null;
    currentOtp = '';
    clearForgotMessage();
}

btnCloseForgotModal?.addEventListener('click', closeForgotModal);

forgotModal?.addEventListener('click', (e) => {
    if (e.target === forgotModal) closeForgotModal();
});

// BƯỚC 1: Submit tìm email
step1Form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearForgotMessage();

    const email = forgotEmailInput?.value.trim().toLowerCase();
    if (!email) {
        showForgotMessage('Vui lòng nhập địa chỉ Gmail.');
        return;
    }

    const btnSubmit = step1Form.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Đang kiểm tra tài khoản...';
    }

    try {
        const user = await authService.findUserByEmail(email);

        if (!user) {
            showForgotMessage('⚠️ Không tìm thấy tài khoản nào khớp với email này trong hệ thống.');
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Gửi mã xác thực OTP →';
            }
            return;
        }

        currentResetUser = user;
        generateAndSendSimulatedOtp(user.email);
        setStep(2);

    } catch (error) {
        console.error('Lỗi kiểm tra email:', error);
        showForgotMessage('Lỗi kết nối máy chủ, vui lòng thử lại.');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Gửi mã xác thực OTP →';
        }
    }
});

// BƯỚC 2: Tự động điền mã OTP
btnAutoFillOtp?.addEventListener('click', () => {
    if (otpInput && currentOtp) {
        otpInput.value = currentOtp;
        clearForgotMessage();
    }
});

// BƯỚC 2: Gửi lại mã
btnResendOtp?.addEventListener('click', () => {
    if (currentResetUser) {
        generateAndSendSimulatedOtp(currentResetUser.email);
        showForgotMessage('Đã tạo và gửi lại mã OTP mới!', true);
    }
});

// BƯỚC 2: Quay lại bước 1
btnBackToStep1?.addEventListener('click', () => {
    setStep(1);
});

// BƯỚC 2: Submit xác nhận mã OTP
step2Form?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearForgotMessage();

    const enteredOtp = otpInput?.value.trim();

    if (Date.now() > otpExpireTimestamp) {
        showForgotMessage('Mã OTP đã hết hiệu lực. Vui lòng bấm "Gửi lại mã"!');
        return;
    }

    if (enteredOtp !== currentOtp) {
        showForgotMessage('❌ Mã OTP không chính xác. Vui lòng kiểm tra lại!');
        return;
    }

    // OTP chính xác, chuyển bước 3
    setStep(3);
});

// BƯỚC 3: Submit đổi mật khẩu mới
step3Form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearForgotMessage();

    const newPass = newPasswordInput?.value;
    const confirmPass = confirmNewPasswordInput?.value;

    if (!newPass || newPass.length < 6) {
        showForgotMessage('Mật khẩu mới phải có ít nhất 6 ký tự.');
        return;
    }

    if (newPass !== confirmPass) {
        showForgotMessage('Mật khẩu xác nhận không khớp, vui lòng nhập lại.');
        return;
    }

    const btnSubmit = step3Form.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Đang lưu mật khẩu...';
    }

    try {
        await authService.resetPassword(currentResetUser.id, newPass);

        // Hiển thị thông báo thành công và chuyển thông tin sang form đăng nhập
        closeForgotModal();

        const mainEmailInput = document.querySelector('#email');
        const mainPasswordInput = document.querySelector('#password');

        if (mainEmailInput) mainEmailInput.value = currentResetUser.email;
        if (mainPasswordInput) mainPasswordInput.value = newPass;

        showMessage(`🎉 Đặt lại mật khẩu thành công cho ${currentResetUser.name}! Bạn có thể nhấn Đăng nhập ngay.`, true);

    } catch (error) {
        console.error('Lỗi khi đổi mật khẩu:', error);
        showForgotMessage('Không thể cập nhật mật khẩu vào máy chủ, vui lòng thử lại.');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Lưu mật khẩu mới & Đăng nhập';
        }
    }
});

// Chọn nhanh tài khoản demo 3 phân quyền
document.querySelectorAll('.btn-quick-fill').forEach(btn => {
    btn.addEventListener('click', () => {
        const emailInput = document.querySelector('#email');
        const passwordInput = document.querySelector('#password');
        if (emailInput) emailInput.value = btn.dataset.email;
        if (passwordInput) passwordInput.value = btn.dataset.pass;
    });
});

