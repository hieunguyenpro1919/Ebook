import * as XLSX from 'xlsx';

/**
 * Tiện ích Nhập dữ liệu sách hàng loạt từ file Excel (.xlsx) chuẩn
 */
export const excelImportUtil = {
    /**
     * Tải file Excel mẫu chuẩn (.xlsx) để người dùng điền dữ liệu
     * @param {Array} categories Danh mục sách hiện có trong hệ thống
     */
    downloadTemplate(categories = []) {
        const catNames = categories.map(c => c.name).join(', ') || 'Văn học - Tiểu thuyết, Kỹ năng sống, Công nghệ, Kinh tế';

        // Dữ liệu mẫu
        const templateData = [
            {
                "Tên sách (*)": "Đắc Nhân Tâm (Bản Mới)",
                "Tác giả (*)": "Dale Carnegie",
                "Thể loại (*)": categories[1] ? categories[1].name : "Kỹ năng sống & Phát triển",
                "Giá bán (VNĐ) (*)": 89000,
                "Số lượng tồn kho (*)": 50,
                "Giảm giá (%)": 10,
                "Mô tả ngắn": "Nghệ thuật thu phục lòng người và đối nhân xử thế kinh điển mọi thời đại.",
                "Đường dẫn ảnh bìa (URL)": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80"
            },
            {
                "Tên sách (*)": "Lập Trình Web Hiện Đại Với Node.js",
                "Tác giả (*)": "Nguyễn Văn Chuyên",
                "Thể loại (*)": categories[2] ? categories[2].name : "Công nghệ & Lập trình",
                "Giá bán (VNĐ) (*)": 145000,
                "Số lượng tồn kho (*)": 40,
                "Giảm giá (%)": 5,
                "Mô tả ngắn": "Hướng dẫn xây dựng ứng dụng Web Fullstack từ cơ bản đến nâng cao.",
                "Đường dẫn ảnh bìa (URL)": "https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=800&q=80"
            },
            {
                "Tên sách (*)": "Tuổi Trẻ Đáng Giá Bao Nhiêu",
                "Tác giả (*)": "Rosie Nguyễn",
                "Thể loại (*)": categories[0] ? categories[0].name : "Văn học - Tiểu thuyết",
                "Giá bán (VNĐ) (*)": 75000,
                "Số lượng tồn kho (*)": 35,
                "Giảm giá (%)": 0,
                "Mô tả ngắn": "Cuốn sách truyền cảm hứng sống đẹp, cống hiến và trưởng thành cho giới trẻ.",
                "Đường dẫn ảnh bìa (URL)": "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80"
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);

        // Thiết lập độ rộng các cột cho đẹp mắt
        ws['!cols'] = [
            { wch: 32 }, // Tên sách
            { wch: 22 }, // Tác giả
            { wch: 26 }, // Thể loại
            { wch: 18 }, // Giá bán
            { wch: 20 }, // Tồn kho
            { wch: 14 }, // Giảm giá
            { wch: 45 }, // Mô tả
            { wch: 40 }  // Ảnh bìa
        ];

        // Tạo trang Hướng dẫn (Sheet 2)
        const instructionData = [
            { "HƯỚNG DẪN NHẬP DỮ LIỆU EXCEL": "QUY TẮC BẮT BUỘC:" },
            { "HƯỚNG DẪN NHẬP DỮ LIỆU EXCEL": "1. Các cột có dấu (*) là thông tin bắt buộc, không được để trống." },
            { "HƯỚNG DẪN NHẬP DỮ LIỆU EXCEL": "2. Cột Giá bán và Tồn kho phải là số nguyên dương lớn hơn 0." },
            { "HƯỚNG DẪN NHẬP DỮ LIỆU EXCEL": "3. Cột Giảm giá (%) nằm trong khoảng từ 0 đến 90." },
            { "HƯỚNG DẪN NHẬP DỮ LIỆU EXCEL": `4. Tên thể loại nên trùng khớp với danh mục trên web: ${catNames}.` },
            { "HƯỚNG DẪN NHẬP DỮ LIỆU EXCEL": "5. Ảnh bìa có thể điền link URL ảnh trực tiếp hoặc để trống để nhận ảnh mặc định." }
        ];
        const wsGuide = XLSX.utils.json_to_sheet(instructionData);
        wsGuide['!cols'] = [{ wch: 80 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Nhap");
        XLSX.utils.book_append_sheet(wb, wsGuide, "Huong_Dan");

        XLSX.writeFile(wb, "Mau_Nhap_Sach_Hang_Loat_TriTueBook.xlsx");
    },

    /**
     * Đọc và phân tích file Excel do người dùng tải lên
     * @param {File} file File .xlsx hoặc .xls
     * @param {Array} categories Danh mục sách hiện có
     * @returns {Promise<{ validRows: Array, invalidRows: Array, total: number }>}
     */
    parseExcel(file, categories = []) {
        return new Promise((resolve, reject) => {
            if (!file) {
                return reject(new Error('Vui lòng chọn một file Excel (.xlsx hoặc .xls).'));
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                    if (!rows || rows.length === 0) {
                        return reject(new Error('File Excel rỗng hoặc không có dữ liệu ở trang tính đầu tiên.'));
                    }

                    const validRows = [];
                    const invalidRows = [];

                    // Chuẩn bị map tìm kiếm thể loại (theo tên chữ thường và ID)
                    const catMap = new Map();
                    categories.forEach(c => {
                        catMap.set(c.name.trim().toLowerCase(), c.id);
                        catMap.set(String(c.id), c.id);
                    });

                    const defaultCatId = categories.length > 0 ? categories[0].id : 1;

                    rows.forEach((row, index) => {
                        const rowNum = index + 2; // Dòng 1 là tiêu đề cột

                        // Lấy giá trị linh hoạt theo nhiều dạng tên cột
                        const name = (row['Tên sách (*)'] || row['Tên sách'] || row['Tựa sách'] || row['name'] || '').toString().trim();
                        const author = (row['Tác giả (*)'] || row['Tác giả'] || row['author'] || '').toString().trim();
                        const catRaw = (row['Thể loại (*)'] || row['Thể loại'] || row['category'] || '').toString().trim();
                        const priceRaw = row['Giá bán (VNĐ) (*)'] || row['Giá bán'] || row['Giá'] || row['price'];
                        const stockRaw = row['Số lượng tồn kho (*)'] || row['Tồn kho'] || row['Số lượng'] || row['stock'];
                        const discountRaw = row['Giảm giá (%)'] || row['Giảm giá'] || row['discountPercent'] || 0;
                        const desc = (row['Mô tả ngắn'] || row['Mô tả'] || row['description'] || '').toString().trim();
                        const imageRaw = (row['Đường dẫn ảnh bìa (URL)'] || row['Ảnh bìa'] || row['Ảnh'] || row['image'] || '').toString().trim();

                        const errors = [];

                        if (!name) errors.push('Thiếu Tên sách');
                        if (!author) errors.push('Thiếu Tác giả');

                        const price = Number(priceRaw);
                        if (!Number.isFinite(price) || price <= 0) {
                            errors.push('Giá bán không hợp lệ (phải > 0)');
                        }

                        const stock = Number(stockRaw);
                        if (!Number.isFinite(stock) || stock < 0) {
                            errors.push('Số lượng tồn kho không hợp lệ (phải >= 0)');
                        }

                        const discount = Number(discountRaw);
                        const discountPercent = (Number.isFinite(discount) && discount >= 0 && discount <= 90) ? discount : 0;

                        // Tìm Category ID phù hợp
                        let categoryId = defaultCatId;
                        let categoryName = categories[0] ? categories[0].name : 'Văn học - Tiểu thuyết';

                        if (catRaw) {
                            const matchedId = catMap.get(catRaw.toLowerCase());
                            if (matchedId) {
                                categoryId = matchedId;
                                const foundCat = categories.find(c => c.id === matchedId);
                                if (foundCat) categoryName = foundCat.name;
                            } else {
                                // Tìm kiếm gần đúng
                                const partial = categories.find(c => c.name.toLowerCase().includes(catRaw.toLowerCase()) || catRaw.toLowerCase().includes(c.name.toLowerCase()));
                                if (partial) {
                                    categoryId = partial.id;
                                    categoryName = partial.name;
                                }
                            }
                        }

                        // Ảnh bìa mặc định nếu không điền
                        const image = imageRaw || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80';

                        if (errors.length > 0) {
                            invalidRows.push({
                                rowNum,
                                raw: row,
                                name: name || '(Chưa điền tên sách)',
                                author: author || '(Chưa điền)',
                                errors: errors.join(', ')
                            });
                        } else {
                            validRows.push({
                                rowNum,
                                name,
                                author,
                                categoryId,
                                categoryName,
                                price,
                                stock,
                                discountPercent,
                                description: desc || `Tác phẩm ${name} của tác giả ${author}.`,
                                image,
                                tag: categoryName.split('-')[0].trim(),
                                isNew: true,
                                importDate: new Date().toISOString()
                            });
                        }
                    });

                    resolve({
                        validRows,
                        invalidRows,
                        total: rows.length
                    });

                } catch (err) {
                    reject(new Error('Lỗi khi đọc file Excel: ' + (err.message || 'File không đúng định dạng.')));
                }
            };

            reader.onerror = () => reject(new Error('Không thể đọc file từ thiết bị của bạn.'));
            reader.readAsArrayBuffer(file);
        });
    }
};

