/**
 * Tiện ích Tải lên & Xử lý Ảnh Chuyên nghiệp (Image Uploader Utility)
 * Hỗ trợ:
 * - Kéo thả (Drag & Drop) và nạp file ảnh từ thiết bị
 * - Tự động nén và tối ưu hóa kích thước bằng HTML5 Canvas (giảm dung lượng, tăng tốc độ)
 * - Chuyển đổi thành Data URL (Base64) để lưu trữ đồng bộ và hiển thị tức thì
 * - Xem trước trực tiếp (Live Preview) với tên file, kích thước và trạng thái
 * - Hỗ trợ song song cả chế độ dán URL trực tiếp
 */

/**
 * Nén và đổi kích thước file ảnh về chuẩn bìa sách (tối đa maxWidth x maxHeight)
 * @param {File} file File ảnh người dùng chọn
 * @param {number} maxWidth Chiều rộng tối đa (mặc định 900px)
 * @param {number} maxHeight Chiều cao tối đa (mặc định 1200px)
 * @param {number} quality Chất lượng nén 0.1 - 1.0 (mặc định 0.85)
 * @returns {Promise<string>} Base64 Data URL của ảnh đã tối ưu
 */
export function compressAndReadFile(file, maxWidth = 900, maxHeight = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('Không có file ảnh được cung cấp.'));
    }

    // Nếu là SVG hoặc GIF động, giữ nguyên định dạng gốc
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Tính toán tỷ lệ co giãn nếu kích thước vượt quá giới hạn
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Bật làm mịn ảnh
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Xuất ra dạng jpeg/png tối ưu
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, quality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        // Dự phòng: trả về Data URL gốc nếu không vẽ được lên canvas
        resolve(e.target.result);
      };

      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Định dạng dung lượng byte ra KB / MB
 * @param {number} bytes 
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Khởi tạo Bộ tải ảnh bìa (Image Uploader Component)
 * @param {Object} config Cấu hình các phần tử DOM và callbacks
 * @returns {Object} Đối tượng điều khiển uploader: { setImage, getImageValue, reset, getFileName }
 */
export function setupImageUploader({
  dropzoneEl,
  fileInputEl,
  previewContainerEl,
  previewImgEl,
  fileNameEl,
  fileSizeEl,
  btnChangeEl,
  btnRemoveEl,
  urlInputEl,
  toggleUrlBtnEl,
  urlWrapEl,
  onImageChange
}) {
  let currentImageDataUrl = '';
  let currentFileName = '';

  function updatePreview(src, name = '', sizeText = '', isUrl = false) {
    currentImageDataUrl = src;
    currentFileName = name;

    if (src) {
      if (previewImgEl) previewImgEl.src = src;
      if (fileNameEl) fileNameEl.textContent = name || (isUrl ? 'Ảnh từ đường dẫn URL' : 'Ảnh bìa sách');
      if (fileSizeEl) fileSizeEl.textContent = sizeText ? `• ${sizeText}` : '';
      if (previewContainerEl) previewContainerEl.style.display = 'flex';
      if (dropzoneEl) dropzoneEl.style.display = 'none';

      // Cập nhật giá trị vào url input nếu cần
      if (urlInputEl && isUrl) {
        urlInputEl.value = src;
      }
    } else {
      if (previewContainerEl) previewContainerEl.style.display = 'none';
      if (dropzoneEl) dropzoneEl.style.display = 'flex';
      if (previewImgEl) previewImgEl.src = '';
      if (fileNameEl) fileNameEl.textContent = '';
      if (fileSizeEl) fileSizeEl.textContent = '';
      if (fileInputEl) fileInputEl.value = '';
    }

    if (typeof onImageChange === 'function') {
      onImageChange(currentImageDataUrl, { fileName: currentFileName, isUrl });
    }
  }

  // 1. Xử lý khi chọn file qua input file
  async function handleFile(file) {
    if (!file) return;

    // Kiểm tra định dạng
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Tệp bạn chọn không phải là hình ảnh hợp lệ (chỉ hỗ trợ JPG, PNG, WEBP, GIF, SVG).');
      return;
    }

    // Giới hạn 8MB
    if (file.size > 8 * 1024 * 1024) {
      alert('⚠️ Dung lượng ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 8MB.');
      return;
    }

    try {
      const originalSize = formatFileSize(file.size);
      const dataUrl = await compressAndReadFile(file);
      updatePreview(dataUrl, file.name, originalSize, false);
      if (urlInputEl) urlInputEl.value = dataUrl;
    } catch (err) {
      console.error('Lỗi đọc ảnh:', err);
      alert('Không thể đọc file ảnh. Vui lòng thử lại với ảnh khác.');
    }
  }

  if (fileInputEl) {
    fileInputEl.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) handleFile(file);
    });
  }

  // 2. Kéo thả (Drag & Drop) vào Dropzone
  if (dropzoneEl) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.remove('drag-over');
      });
    });

    dropzoneEl.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt && dt.files && dt.files[0];
      if (file) {
        handleFile(file);
      }
    });

    // Bấm vào dropzone kích hoạt input file
    dropzoneEl.addEventListener('click', (e) => {
      if (e.target !== fileInputEl && fileInputEl) {
        fileInputEl.click();
      }
    });
  }

  // 3. Đổi ảnh / Xóa ảnh
  if (btnChangeEl && fileInputEl) {
    btnChangeEl.addEventListener('click', () => {
      fileInputEl.click();
    });
  }

  if (btnRemoveEl) {
    btnRemoveEl.addEventListener('click', () => {
      updatePreview('', '', '', false);
      if (urlInputEl) urlInputEl.value = '';
    });
  }

  // 4. Nhập URL thủ công
  if (urlInputEl) {
    urlInputEl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image'))) {
        updatePreview(val, 'Ảnh từ đường dẫn URL', '', true);
      }
    });
  }

  // 5. Bật tắt ô nhập URL
  if (toggleUrlBtnEl && urlWrapEl) {
    toggleUrlBtnEl.addEventListener('click', () => {
      const isHidden = urlWrapEl.style.display === 'none';
      urlWrapEl.style.display = isHidden ? 'block' : 'none';
      toggleUrlBtnEl.textContent = isHidden 
        ? '▲ Thu gọn ô nhập URL' 
        : '🔗 Hoặc nhập đường dẫn ảnh từ URL trực tiếp';
    });
  }

  return {
    setImage: (urlOrDataUrl, name = '') => {
      if (!urlOrDataUrl) {
        updatePreview('', '', '', false);
        return;
      }
      const isDataUrl = urlOrDataUrl.startsWith('data:image');
      const isHttp = urlOrDataUrl.startsWith('http://') || urlOrDataUrl.startsWith('https://');
      const displayName = name || (isHttp ? 'Ảnh trực tuyến' : 'Ảnh bìa sách');
      updatePreview(urlOrDataUrl, displayName, '', isHttp);
    },
    getImageValue: () => {
      return currentImageDataUrl || (urlInputEl ? urlInputEl.value.trim() : '');
    },
    getFileName: () => currentFileName,
    reset: () => {
      updatePreview('', '', '', false);
      if (urlInputEl) urlInputEl.value = '';
      if (urlWrapEl) urlWrapEl.style.display = 'none';
      if (toggleUrlBtnEl) toggleUrlBtnEl.textContent = '🔗 Hoặc nhập đường dẫn ảnh từ URL trực tiếp';
    }
  };
}
