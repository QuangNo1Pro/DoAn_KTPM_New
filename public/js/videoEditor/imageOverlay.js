/**
 * imageOverlay.js - Tệp khởi tạo cho module imageOverlay
 * 
 * Module này quản lý hình ảnh và GIF trong trình chỉnh sửa video
 */

// Biến toàn cục để theo dõi trạng thái module
window.imageOverlayLoaded = false;

/**
 * Khởi tạo module ImageOverlay
 * @returns {Promise<Object>} Đối tượng ImageOverlay đã khởi tạo
 */
window.initImageOverlay = async function() {
    // Nếu đã load rồi, trả về instance hiện có
    if (window.imageOverlayLoaded && window.ImageOverlay) {
        console.log('ImageOverlay đã được tải trước đó');
        return window.ImageOverlay;
    }
    
    try {
        // Tải module chính
        const module = await import('./imageOverlay/index.js').catch(e => {
            console.error('Lỗi khi tải ImageOverlay:', e);
            throw e;
        });
        
        // Khởi tạo module
        const ImageOverlayClass = await module.default();
        
        // Đánh dấu đã tải
        window.imageOverlayLoaded = true;
        
        console.log('ImageOverlay đã được tải thành công');
        return ImageOverlayClass;
    } catch (error) {
        console.error('Lỗi khi khởi tạo ImageOverlay:', error);
        
        // Tạo phiên bản giả nếu không load được
        console.warn('Tạo phiên bản giả ImageOverlay');
        
        // Class giả
        window.ImageOverlay = class DummyImageOverlay {
            constructor() {
                this.imageItems = [];
                console.warn('Đang sử dụng phiên bản giả ImageOverlay');
            }
            
            updateAtTime() {}
            addImage() { return { id: 'dummy-' + Date.now() }; }
            removeImage() {}
            renderImageItems() {}
            getImageItemsAtTime() { return []; }
            getImageItems() { return []; }
        };
        
        // Đánh dấu đã tải
        window.imageOverlayLoaded = true;
        
        return window.ImageOverlay;
    }
};

// Thông báo cho ứng dụng biết module đã được tải
if (window.moduleLoaded) {
    window.moduleLoaded('imageOverlay');
}

// Tự động khởi tạo khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra xem có phần tử container không
    const hasContainer = document.getElementById('image-overlays-container') || 
                        document.getElementById('preview-canvas');
    
    // Nếu có container, tự động khởi tạo
    if (hasContainer) {
        window.initImageOverlay().then(ImageOverlayClass => {
            // Tạo instance và lưu vào biến toàn cục
            if (!window.imageOverlay && ImageOverlayClass) {
                try {
                    window.imageOverlay = new ImageOverlayClass();
                    console.log('ImageOverlay đã được khởi tạo tự động');
                } catch (error) {
                    console.error('Lỗi khi khởi tạo ImageOverlay:', error);
                }
            }
        }).catch(error => {
            console.warn('Không thể tải ImageOverlay:', error);
        });
    }
}); 