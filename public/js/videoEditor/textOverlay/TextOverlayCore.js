/**
 * TextOverlayCore - Lớp cơ sở cho TextOverlay
 */
class TextOverlayCore {
    constructor(options = {}) {
        console.log("Khởi tạo TextOverlayCore");
        
        // Thiết lập các thuộc tính
        this.container = options.container || document.getElementById('text-overlays-container');
        this.canvasElement = options.canvasElement || document.getElementById('preview-canvas');
        this.textItems = options.textItems || [];
        this.selectedTextId = null;
        
        // Các phần tử UI
        this.itemsList = document.getElementById('text-items-list');
        this.addTextBtn = document.getElementById('add-text-btn');
        this.textModal = document.getElementById('textModal');
        this.confirmAddText = document.getElementById('confirm-add-text');
        
        // Đảm bảo container luôn trong suốt
        if (this.container) {
            this.container.style.background = 'transparent';
            this.container.style.backgroundColor = 'transparent';
            this.container.style.backdropFilter = 'none';
            this.container.style.webkitBackdropFilter = 'none';
            this.container.style.mixBlendMode = 'normal';
            this.container.style.pointerEvents = 'none';
            this.container.style.zIndex = '10';
            
            // Xóa bỏ bất kỳ thuộc tính nào có thể gây ra màn hình đen
            const clearStyles = [
                'background-color', 'backdrop-filter', 'filter',
                'opacity', 'background-image', 'box-shadow'
            ];
            
            clearStyles.forEach(style => {
                this.container.style.removeProperty(style);
            });
        }
        
        // Khởi tạo các thành phần
        this.init();
    }
    
    /**
     * Khởi tạo
     */
    init() {
        try {
            console.log("Khởi tạo TextOverlay");
            
            // Kiểm tra xem container có tồn tại không
            if (!this.container) {
                console.error("Không tìm thấy container cho text overlays");
                return;
            }
            
            // Gắn các sự kiện
            if (typeof this.bindEvents === 'function') {
                this.bindEvents();
            }
            
            // Thiết lập điều khiển bàn phím
            if (typeof this.setupKeyboardControls === 'function') {
                this.setupKeyboardControls();
            }
            
            console.log("Đã khởi tạo TextOverlay thành công");
        } catch (error) {
            console.error("Lỗi khi khởi tạo TextOverlay:", error);
        }
    }
    
    /**
     * Cập nhật text overlays tại thời điểm cụ thể
     */
    updateAtTime(currentTime) {
        if (typeof this.renderTextItems === 'function') {
            this.renderTextItems(currentTime);
        } else {
            console.error("Phương thức renderTextItems chưa được định nghĩa");
        }
    }
    
    /**
     * Format thời gian
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

// Export class
window.TextOverlayCore = TextOverlayCore; 