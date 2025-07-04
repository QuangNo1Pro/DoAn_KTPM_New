/**
 * ImageOverlay - Module quản lý hình ảnh, GIF trên video
 */

// Import các module phụ thuộc
import { renderImageItems, updateImageAtTime, renderImageOnTimeline } from './ImageRender.js';
import { addImage, updateImage, removeImage } from './ImageItem.js';
import { setupDragDrop } from './ImageDragDrop.js';
import { updateImageItemsList, selectImage, showImageEditor, hideImageEditor, bindEvents } from './ImageUI.js';

/**
 * ImageOverlay Class - Quản lý các ảnh trong trình chỉnh sửa video
 */
class ImageOverlay {
    /**
     * Khởi tạo ImageOverlay
     * @param {Object} options - Các tùy chọn
     */
    constructor(options = {}) {
        this.options = {
            container: document.getElementById('image-overlays-container'),
            canvasElement: document.getElementById('preview-canvas'),
            ...options
        };
        
        // Khởi tạo container nếu chưa có
        if (!this.options.container) {
            this.options.container = document.createElement('div');
            this.options.container.id = 'image-overlays-container';
            this.options.container.className = 'position-absolute';
            this.options.container.style.cssText = 'top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 4;';
            
            if (this.options.canvasElement && this.options.canvasElement.parentNode) {
                this.options.canvasElement.parentNode.appendChild(this.options.container);
            } else {
                document.body.appendChild(this.options.container);
            }
        }
        
        // Tham chiếu đến phần tử DOM
        this.container = this.options.container;
        this.canvasElement = this.options.canvasElement;
        
        // Danh sách ảnh
        this.imageItems = [];
        
        // ID của ảnh đang chọn
        this.selectedImageId = null;
        
        // Tham chiếu đến các phần tử UI
        this.itemsList = document.getElementById('image-items-list');
        this.addImageBtn = document.getElementById('add-image-btn');
        this.confirmAddImage = document.getElementById('confirm-add-image');
        this.imageModal = document.getElementById('imageModal');
        
        // Gán các phương thức từ module vào đối tượng
        this.renderImageItems = renderImageItems;
        this.updateImageAtTime = updateImageAtTime;
        this.addImage = addImage;
        this.updateImage = updateImage;
        this.removeImage = removeImage;
        this.updateImageItemsList = updateImageItemsList;
        this.selectImage = selectImage;
        this.showImageEditor = showImageEditor;
        this.hideImageEditor = hideImageEditor;
        this.renderImageOnTimeline = renderImageOnTimeline;
        
        // Khởi tạo
        this.init();
    }
    
    /**
     * Khởi tạo ImageOverlay
     */
    async init() {
        // Khởi tạo sự kiện kéo thả
        setupDragDrop.call(this);
        
        // Gắn các sự kiện UI
        bindEvents.call(this);
        
        console.log('ImageOverlay đã khởi tạo');
    }
    
    /**
     * Lấy danh sách ảnh ở thời điểm cụ thể
     * @param {number} time - Thời gian (giây)
     * @returns {Array} Danh sách ảnh
     */
    getImageItemsAtTime(time) {
        return this.imageItems.filter(item => {
            return time >= item.startTime && time < (item.startTime + item.duration);
        });
    }
    
    /**
     * Lấy tất cả ảnh
     * @returns {Array} Danh sách ảnh
     */
    getImageItems() {
        // Trả về bản sao của mảng imageItems để tránh thay đổi trực tiếp
        return [...this.imageItems].map(item => {
            // Chuyển đổi URL tạm thời thành dữ liệu base64 nếu cần
            if (item.src && item.src.startsWith('blob:')) {
                // Đối với blob URL, cần chuyển đổi thành dữ liệu base64
                return {
                    ...item,
                    // Giữ nguyên src, quá trình xử lý sẽ được thực hiện ở server
                    // Thêm flag để server biết đây là blob URL cần xử lý đặc biệt
                    isLocalImage: true
                };
            }
            return { ...item };
        });
    }
    
    /**
     * Format thời gian thành mm:ss
     * @param {number} seconds - Thời gian (giây)
     * @returns {string} Chuỗi đã format
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Lấy thời gian hiện tại
     * @returns {number} Thời gian hiện tại (giây)
     */
    getCurrentTime() {
        // Cố gắng lấy thời gian từ VideoEditor
        if (window.videoEditor) {
            if (typeof window.videoEditor.getCurrentTime === 'function') {
                return window.videoEditor.getCurrentTime();
            }
            if (window.videoEditor.timeline) {
                if (typeof window.videoEditor.timeline.getCurrentTime === 'function') {
                    return window.videoEditor.timeline.getCurrentTime();
                }
                if (window.videoEditor.timeline.currentTime !== undefined) {
                    return window.videoEditor.timeline.currentTime;
                }
            }
        }
        
        // Nếu không có, trả về 0
        return 0;
    }
    
    /**
     * Cập nhật trạng thái các ảnh theo thời gian
     * @param {number} time - Thời gian hiện tại (giây)
     */
    updateAtTime(time) {
        if (typeof this.updateImageAtTime === 'function') {
            this.updateImageAtTime(time);
        } else if (typeof updateImageAtTime === 'function') {
            updateImageAtTime.call(this, time);
        }
    }
}

// Export function để khởi tạo module
export default async function initImageOverlay() {
    // Kiểm tra nếu chưa có CSS cần thiết, thêm vào
    if (!document.getElementById('image-overlay-styles')) {
        const style = document.createElement('style');
        style.id = 'image-overlay-styles';
        style.textContent = `
            .image-overlay-item {
                position: absolute;
                user-select: none;
                pointer-events: auto;
                cursor: move;
                transform-origin: center;
                border: 2px dashed transparent;
            }
            
            .image-overlay-item.selected {
                border-color: red !important;
                z-index: 9999;
            }
            
            .image-resizer {
                position: absolute;
                width: 10px;
                height: 10px;
                background-color: white;
                border: 1px solid black;
                z-index: 100;
            }
            
            .image-resizer.top-left {
                top: -5px;
                left: -5px;
                cursor: nwse-resize;
            }
            
            .image-resizer.top-right {
                top: -5px;
                right: -5px;
                cursor: nesw-resize;
            }
            
            .image-resizer.bottom-left {
                bottom: -5px;
                left: -5px;
                cursor: nesw-resize;
            }
            
            .image-resizer.bottom-right {
                bottom: -5px;
                right: -5px;
                cursor: nwse-resize;
            }
            
            .image-tooltip {
                position: absolute;
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                pointer-events: none;
                z-index: 9999;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Trả về class để có thể khởi tạo
    window.ImageOverlay = ImageOverlay;
    return ImageOverlay;
} 