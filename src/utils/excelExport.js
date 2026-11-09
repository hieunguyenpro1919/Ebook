import * as XLSX from 'xlsx';

/**
 * Tiện ích xuất dữ liệu sách ra file Excel (.xlsx) chuẩn cho Admin & Seller
 */
export const excelExportUtil = {
    /**
     * Xuất danh sách sách toàn sàn (Dành cho Admin)
     * @param {Array} books Danh sách sách cần xuất
     * @param {Array} categories Danh mục sách
     */
    exportAdminBooks(books, categories = []) {
        if (!books || books.length === 0) {
            alert('⚠️ Không có sản phẩm nào để xuất ra file Excel.');
            return;
        }

        const worksheetData = books.map((book, index) => {
            const cat = categories.find(c => Number(c.id) === Number(book.categoryId));
            const catName = cat ? cat.name : 'Khác';
            const stock = Number(book.stock !== undefined ? book.stock : 0);
            const discount = Number(book.discountPercent || 0);

            let stockStatus = 'Còn hàng';
            if (stock <= 0) stockStatus = 'Hết hàng (0)';
            else if (stock < 10) stockStatus = `Sắp hết (${stock})`;

            return {
                "STT": index + 1,
                "Mã sách": book.id,
                "Tên tác phẩm": book.name || '',
                "Tác giả": book.author || 'Chưa cập nhật',
                "Thể loại": catName,
                "Nguồn sách / Nhà bán": book.sellerName || 'NXB Trẻ Official',
                "Giá niêm yết (₫)": Number(book.price || 0),
                "Giảm giá (%)": discount > 0 ? `${discount}%` : 'Không',
                "Tồn kho thực tế": stock,
                "Số lượng đã bán": Number(book.soldCount || 0),
                "Trạng thái kho": stockStatus,
                "Khuyến mãi": (book.onSale && discount > 0) ? 'Đang Flash Sale' : 'Giá thường',
                "Ngày nhập kho": book.importDate ? new Date(book.importDate).toLocaleDateString('vi-VN') : '',
                "Link hình ảnh": book.image || ''
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);

        // Thiết lập độ rộng cột (Column Widths) trực quan
        worksheet['!cols'] = [
            { wch: 6 },  // STT
            { wch: 10 }, // Mã sách
            { wch: 38 }, // Tên tác phẩm
            { wch: 24 }, // Tác giả
            { wch: 22 }, // Thể loại
            { wch: 24 }, // Nhà bán
            { wch: 16 }, // Giá niêm yết
            { wch: 14 }, // Giảm giá
            { wch: 16 }, // Tồn kho
            { wch: 16 }, // Đã bán
            { wch: 18 }, // Trạng thái kho
            { wch: 16 }, // Khuyến mãi
            { wch: 15 }, // Ngày nhập
            { wch: 45 }  // Link ảnh
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Kho Sách Toàn Sàn");

        const dateStr = getFormattedDate();
        const fileName = `danh_sach_sach_toan_san_${dateStr}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    },

    /**
     * Xuất danh sách sách của riêng một Gian Hàng (Dành cho Seller)
     * @param {Array} books Danh sách sách của shop
     * @param {Array} categories Danh mục sách
     * @param {string} shopName Tên gian hàng
     */
    exportSellerBooks(books, categories = [], shopName = 'gian_hang') {
        if (!books || books.length === 0) {
            alert('⚠️ Gian hàng của bạn hiện chưa có sách để xuất ra file Excel.');
            return;
        }

        const worksheetData = books.map((book, index) => {
            const cat = categories.find(c => Number(c.id) === Number(book.categoryId));
            const catName = cat ? cat.name : 'Khác';
            const stock = Number(book.stock !== undefined ? book.stock : 0);
            const discount = Number(book.discountPercent || 0);
            const price = Number(book.price || 0);
            const soldCount = Number(book.soldCount || 0);
            const estimatedRevenue = price * soldCount;

            let stockStatus = 'Còn hàng';
            if (stock <= 0) stockStatus = 'Hết hàng (0)';
            else if (stock < 10) stockStatus = `Sắp hết (${stock})`;

            return {
                "STT": index + 1,
                "Mã sách": book.id,
                "Tên tác phẩm": book.name || '',
                "Tác giả": book.author || 'Chưa cập nhật',
                "Thể loại": catName,
                "Giá niêm yết (₫)": price,
                "Giảm giá (%)": discount > 0 ? `${discount}%` : 'Không',
                "Tồn kho thực tế": stock,
                "Số lượng đã bán": soldCount,
                "Doanh thu ước tính (₫)": estimatedRevenue,
                "Trạng thái kho": stockStatus,
                "Khuyến mãi": (book.onSale && discount > 0) ? 'Đang Sale' : 'Không',
                "Link hình ảnh": book.image || ''
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);

        // Thiết lập độ rộng cột trực quan
        worksheet['!cols'] = [
            { wch: 6 },  // STT
            { wch: 10 }, // Mã sách
            { wch: 38 }, // Tên tác phẩm
            { wch: 24 }, // Tác giả
            { wch: 22 }, // Thể loại
            { wch: 16 }, // Giá niêm yết
            { wch: 14 }, // Giảm giá
            { wch: 16 }, // Tồn kho
            { wch: 16 }, // Đã bán
            { wch: 22 }, // Doanh thu ước tính
            { wch: 18 }, // Trạng thái kho
            { wch: 16 }, // Khuyến mãi
            { wch: 45 }  // Link ảnh
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sách Gian Hàng");

        const dateStr = getFormattedDate();
        const safeShopName = (shopName || 'shop').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_').toLowerCase();
        const fileName = `danh_sach_sach_${safeShopName}_${dateStr}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    }
};

function getFormattedDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${y}${m}${d}_${h}${min}`;
}
