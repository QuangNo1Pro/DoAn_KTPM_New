/**
 * ImageItem - Module xử lý các phần tử ảnh trong trình chỉnh sửa video
 */

/**
 * Tạo một đối tượng ảnh mới
 * @param {Object} props - Thuộc tính của ảnh
 * @returns {Object} Đối tượng ảnh đã tạo
 */
export function createImageItem(props = {}) {
    // Khởi tạo ID ngẫu nhiên nếu không có
    const id = props.id || `img-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Trả về đối tượng ảnh với các giá trị mặc định
    return {
        id,
        src: props.src || '',       // Đường dẫn ảnh
        type: props.type || 'image', // 'image' hoặc 'gif'
        x: props.x !== undefined ? props.x : 0.5,     // Vị trí X (0-1)
        y: props.y !== undefined ? props.y : 0.5,     // Vị trí Y (0-1)
        width: props.width || 0.3,  // Độ rộng (0-1, tỉ lệ so với canvas)
        height: props.height || 0.3, // Chiều cao (0-1, tỉ lệ so với canvas)
        rotation: props.rotation || 0, // Góc xoay (độ)
        opacity: props.opacity !== undefined ? props.opacity : 1, // Độ mờ (0-1)
        startTime: props.startTime || 0, // Thời điểm bắt đầu hiển thị (giây)
        duration: props.duration || 3,   // Thời lượng hiển thị (giây)
        animation: props.animation || 'none', // Hiệu ứng xuất hiện
        scale: props.scale || 1,    // Tỉ lệ thu phóng
        name: props.name || `Ảnh ${id.split('-')[1]}` // Tên hiển thị
    };
}

/**
 * Thêm ảnh mới vào overlay
 * @this {ImageOverlay} Đối tượng ImageOverlay
 * @param {Object} imageProps - Thuộc tính ảnh
 * @returns {Object} Đối tượng ảnh đã thêm
 */
export function addImage(imageProps) {
    // Tạo đối tượng ảnh mới
    const imageItem = createImageItem(imageProps);
    
    // Thêm vào danh sách
    this.imageItems.push(imageItem);
    
    // Cập nhật UI
    if (typeof this.updateImageItemsList === 'function') {
        this.updateImageItemsList();
    } else if (typeof updateImageItemsList === 'function') {
        updateImageItemsList.call(this);
    }
    
    // Render lại
    const currentTime = this.getCurrentTime ? this.getCurrentTime() : 0;
    this.renderImageItems(currentTime);
    
    // Render ảnh lên timeline
    if (typeof this.renderImageOnTimeline === 'function') {
        this.renderImageOnTimeline(imageItem);
    } else if (typeof renderImageOnTimeline === 'function') {
        // Thử import module và gọi hàm
        import('./ImageRender.js').then(module => {
            if (module.renderImageOnTimeline) {
                module.renderImageOnTimeline.call(this, imageItem);
            }
        }).catch(err => {
            console.error('Không thể tải module ImageRender:', err);
        });
    }
    
    console.log(`Đã thêm ảnh: ${imageItem.id}`);
    
    // Tự động chọn ảnh mới thêm
    if (typeof this.selectImage === 'function') {
        this.selectImage(imageItem.id);
    }
    
    // Kích hoạt sự kiện khi thêm ảnh nếu có callback
    if (this.options.onImageAdded && typeof this.options.onImageAdded === 'function') {
        this.options.onImageAdded(imageItem);
    }
    
    return imageItem;
}

/**
 * Cập nhật thuộc tính ảnh
 * @this {ImageOverlay} Đối tượng ImageOverlay
 * @param {string} imageId - ID của ảnh cần cập nhật
 * @param {Object} imageProps - Các thuộc tính mới
 * @returns {Object|null} Đối tượng ảnh đã cập nhật hoặc null nếu không tìm thấy
 */
export function updateImage(imageId, imageProps) {
    // Tìm ảnh cần cập nhật
    const imageIndex = this.imageItems.findIndex(item => item.id === imageId);
    
    // Nếu không tìm thấy, trả về null
    if (imageIndex === -1) {
        console.warn(`Không tìm thấy ảnh có ID: ${imageId}`);
        return null;
    }
    
    // Cập nhật thuộc tính
    const updatedImage = {
        ...this.imageItems[imageIndex],
        ...imageProps
    };
    
    // Lưu lại vào danh sách
    this.imageItems[imageIndex] = updatedImage;
    
    // Cập nhật UI
    if (typeof this.updateImageItemsList === 'function') {
        this.updateImageItemsList();
    } else if (typeof updateImageItemsList === 'function') {
        updateImageItemsList.call(this);
    }
    
    // Render lại
    const currentTime = this.getCurrentTime ? this.getCurrentTime() : 0;
    this.renderImageItems(currentTime);
    
    // Cập nhật ảnh trên timeline
    if (typeof this.renderImageOnTimeline === 'function') {
        this.renderImageOnTimeline(updatedImage);
    } else if (typeof renderImageOnTimeline === 'function') {
        // Thử import module và gọi hàm
        import('./ImageRender.js').then(module => {
            if (module.renderImageOnTimeline) {
                module.renderImageOnTimeline.call(this, updatedImage);
            }
        }).catch(err => {
            console.error('Không thể tải module ImageRender:', err);
        });
    }
    
    console.log(`Đã cập nhật ảnh: ${imageId}`);
    
    // Kích hoạt sự kiện khi cập nhật ảnh nếu có callback
    if (this.options.onImageUpdated && typeof this.options.onImageUpdated === 'function') {
        this.options.onImageUpdated(updatedImage);
    }
    
    return updatedImage;
}

/**
 * Xóa ảnh
 * @this {ImageOverlay} Đối tượng ImageOverlay
 * @param {string} imageId - ID của ảnh cần xóa
 * @returns {boolean} Kết quả xóa
 */
export function removeImage(imageId) {
    // Tìm ảnh cần xóa
    const imageIndex = this.imageItems.findIndex(item => item.id === imageId);
    
    // Nếu không tìm thấy, trả về false
    if (imageIndex === -1) {
        console.warn(`Không tìm thấy ảnh có ID: ${imageId}`);
        return false;
    }
    
    // Lưu ảnh để callback
    const removedImage = this.imageItems[imageIndex];
    
    // Xóa khỏi danh sách
    this.imageItems.splice(imageIndex, 1);
    
    // Nếu đang chọn ảnh này, bỏ chọn
    if (this.selectedImageId === imageId) {
        this.selectedImageId = null;
        if (typeof this.hideImageEditor === 'function') {
            this.hideImageEditor();
        } else if (typeof hideImageEditor === 'function') {
            hideImageEditor.call(this);
        }
    }
    
    // Xóa phần tử DOM của ảnh nếu có
    const imageElement = document.getElementById(`image-overlay-${imageId}`);
    if (imageElement) {
        imageElement.remove();
    }
    
    // Xóa clip trên timeline
    const timelineClip = document.getElementById(`timeline-image-${imageId}`);
    if (timelineClip) {
        timelineClip.remove();
    }
    
    // Cập nhật UI
    if (typeof this.updateImageItemsList === 'function') {
        this.updateImageItemsList();
    } else if (typeof updateImageItemsList === 'function') {
        updateImageItemsList.call(this);
    }
    
    // Render lại
    const currentTime = this.getCurrentTime ? this.getCurrentTime() : 0;
    this.renderImageItems(currentTime);
    
    console.log(`Đã xóa ảnh: ${imageId}`);
    
    // Kích hoạt sự kiện khi xóa ảnh nếu có callback
    if (this.options.onImageRemoved && typeof this.options.onImageRemoved === 'function') {
        this.options.onImageRemoved(removedImage);
    }
    
    return true;
}

/**
 * Lấy thời gian hiện tại từ VideoEditor
 * @this {ImageOverlay} Đối tượng ImageOverlay
 * @returns {number} Thời gian hiện tại (giây)
 */
export function getCurrentTime() {
    // Cố gắng lấy thời gian từ VideoEditor
    if (window.videoEditor?.timeline) {
        if (typeof window.videoEditor.timeline.getCurrentTime === 'function') {
            return window.videoEditor.timeline.getCurrentTime();
        }
        if (typeof window.videoEditor.getCurrentTime === 'function') {
            return window.videoEditor.getCurrentTime();
        }
        if (window.videoEditor.timeline.currentTime !== undefined) {
            return window.videoEditor.timeline.currentTime;
        }
    }
    
    // Nếu không có, trả về 0
    return 0;
} 