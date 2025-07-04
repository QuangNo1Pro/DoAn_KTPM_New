/**
 * ImageDragDrop - Module xử lý kéo thả và thay đổi kích thước cho ảnh
 */

/**
 * Thiết lập sự kiện kéo thả cho ảnh
 * @this {ImageOverlay} Đối tượng ImageOverlay
 */
export function setupDragDrop() {
    // Lưu tham chiếu this để sử dụng trong event listeners
    const self = this;
    
    // Đối tượng lưu trạng thái kéo thả
    const dragState = {
        isDragging: false,
        isResizing: false,
        startX: 0,
        startY: 0,
        originalX: 0,
        originalY: 0,
        originalWidth: 0,
        originalHeight: 0,
        currentImageId: null,
        resizeDirection: null
    };
    
    // Xử lý sự kiện click vào ảnh
    this.container.addEventListener('mousedown', function(e) {
        // Tìm phần tử ảnh được click
        const imageElement = findImageElement(e.target);
        
        // Kiểm tra xem đang click vào điểm resize không
        const resizeHandle = e.target.closest('.image-resizer');
        
        if (resizeHandle) {
            // Nếu click vào điểm resize, bắt đầu resize
            handleResizeStart(e, imageElement, resizeHandle, dragState, self);
        } else if (imageElement) {
            // Nếu click vào ảnh, bắt đầu kéo thả
            handleDragStart(e, imageElement, dragState, self);
        }
    });
    
    // Xử lý sự kiện di chuyển chuột
    document.addEventListener('mousemove', function(e) {
        if (dragState.isDragging) {
            // Nếu đang kéo, di chuyển ảnh
            handleDragMove(e, dragState, self);
        } else if (dragState.isResizing) {
            // Nếu đang resize, thay đổi kích thước ảnh
            handleResizeMove(e, dragState, self);
        }
    });
    
    // Xử lý sự kiện thả chuột
    document.addEventListener('mouseup', function() {
        if (dragState.isDragging || dragState.isResizing) {
            // Nếu đang kéo hoặc resize, kết thúc
            handleDragOrResizeEnd(dragState, self);
        }
    });
    
    // Xử lý sự kiện rời khỏi cửa sổ
    document.addEventListener('mouseleave', function() {
        if (dragState.isDragging || dragState.isResizing) {
            // Nếu đang kéo hoặc resize, kết thúc
            handleDragOrResizeEnd(dragState, self);
        }
    });
}

/**
 * Tìm phần tử ảnh từ phần tử được click
 * @param {HTMLElement} target - Phần tử được click
 * @returns {HTMLElement|null} Phần tử ảnh hoặc null nếu không tìm thấy
 */
function findImageElement(target) {
    // Nếu click vào chính phần tử ảnh
    if (target.classList.contains('image-overlay-item')) {
        return target;
    }
    
    // Nếu click vào con của phần tử ảnh
    return target.closest('.image-overlay-item');
}

/**
 * Xử lý bắt đầu kéo ảnh
 * @param {MouseEvent} e - Sự kiện chuột
 * @param {HTMLElement} imageElement - Phần tử ảnh
 * @param {Object} dragState - Trạng thái kéo thả
 * @param {ImageOverlay} self - Đối tượng ImageOverlay
 */
function handleDragStart(e, imageElement, dragState, self) {
    e.preventDefault();
    
    // Lấy ID của ảnh
    const imageId = imageElement.dataset.imageId;
    if (!imageId) return;
    
    // Chọn ảnh này
    self.selectImage(imageId);
    
    // Lưu trạng thái ban đầu
    dragState.isDragging = true;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    dragState.currentImageId = imageId;
    
    // Lấy đối tượng ảnh
    const imageItem = self.imageItems.find(item => item.id === imageId);
    if (!imageItem) return;
    
    // Lưu vị trí ban đầu
    dragState.originalX = imageItem.x;
    dragState.originalY = imageItem.y;
    
    // Thêm class đang kéo
    imageElement.classList.add('dragging');
    
    // Tạo tooltip hiển thị vị trí
    createPositionTooltip(imageElement, imageItem);
}

/**
 * Xử lý di chuyển chuột khi đang kéo
 * @param {MouseEvent} e - Sự kiện chuột
 * @param {Object} dragState - Trạng thái kéo thả
 * @param {ImageOverlay} self - Đối tượng ImageOverlay
 */
function handleDragMove(e, dragState, self) {
    e.preventDefault();
    
    // Tính toán khoảng cách di chuyển
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    
    // Lấy kích thước container
    const container = self.container;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    // Tính toán vị trí mới (tỉ lệ 0-1)
    let newX = dragState.originalX + (deltaX / containerWidth);
    let newY = dragState.originalY + (deltaY / containerHeight);
    
    // Giới hạn trong container
    newX = Math.max(0, Math.min(1, newX));
    newY = Math.max(0, Math.min(1, newY));
    
    // Cập nhật vị trí ảnh
    const imageItem = self.imageItems.find(item => item.id === dragState.currentImageId);
    if (imageItem) {
        // Cập nhật đối tượng ảnh
        imageItem.x = newX;
        imageItem.y = newY;
        
        // Cập nhật vị trí hiển thị
        const imageElement = document.getElementById(`image-overlay-${dragState.currentImageId}`);
        if (imageElement) {
            // Tính toán vị trí pixel
            const left = (newX * containerWidth) - ((imageItem.width * containerWidth) / 2);
            const top = (newY * containerHeight) - ((imageItem.height * containerHeight) / 2);
            
            // Cập nhật style
            imageElement.style.left = `${left}px`;
            imageElement.style.top = `${top}px`;
            
            // Cập nhật tooltip
            updatePositionTooltip(imageElement, imageItem);
        }
        
        // Cập nhật các trường input nếu có
        updatePositionInputs(imageItem);
    }
}

/**
 * Xử lý bắt đầu resize ảnh
 * @param {MouseEvent} e - Sự kiện chuột
 * @param {HTMLElement} imageElement - Phần tử ảnh
 * @param {HTMLElement} resizeHandle - Điểm resize được click
 * @param {Object} dragState - Trạng thái kéo thả
 * @param {ImageOverlay} self - Đối tượng ImageOverlay
 */
function handleResizeStart(e, imageElement, resizeHandle, dragState, self) {
    e.preventDefault();
    
    // Lấy ID của ảnh
    const imageId = imageElement.dataset.imageId;
    if (!imageId) return;
    
    // Chọn ảnh này
    self.selectImage(imageId);
    
    // Lưu trạng thái ban đầu
    dragState.isResizing = true;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    dragState.currentImageId = imageId;
    
    // Xác định hướng resize
    dragState.resizeDirection = resizeHandle.className.replace('image-resizer ', '');
    
    // Lấy đối tượng ảnh
    const imageItem = self.imageItems.find(item => item.id === imageId);
    if (!imageItem) return;
    
    // Lưu kích thước và vị trí ban đầu
    dragState.originalWidth = imageItem.width;
    dragState.originalHeight = imageItem.height;
    dragState.originalX = imageItem.x;
    dragState.originalY = imageItem.y;
    
    // Thêm class đang resize
    imageElement.classList.add('resizing');
    
    // Tạo tooltip hiển thị kích thước
    createSizeTooltip(imageElement, imageItem);
}

/**
 * Xử lý di chuyển chuột khi đang resize
 * @param {MouseEvent} e - Sự kiện chuột
 * @param {Object} dragState - Trạng thái kéo thả
 * @param {ImageOverlay} self - Đối tượng ImageOverlay
 */
function handleResizeMove(e, dragState, self) {
    e.preventDefault();
    
    // Tính toán khoảng cách di chuyển
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    
    // Lấy kích thước container
    const container = self.container;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    // Lấy đối tượng ảnh
    const imageItem = self.imageItems.find(item => item.id === dragState.currentImageId);
    if (!imageItem) return;
    
    // Tính toán kích thước và vị trí mới dựa trên hướng resize
    let newWidth = dragState.originalWidth;
    let newHeight = dragState.originalHeight;
    let newX = dragState.originalX;
    let newY = dragState.originalY;
    
    // Xử lý theo hướng resize
    switch (dragState.resizeDirection) {
        case 'top-left':
            // Tăng kích thước, giảm vị trí
            newWidth = Math.max(0.05, dragState.originalWidth - (deltaX / containerWidth) * 2);
            newHeight = Math.max(0.05, dragState.originalHeight - (deltaY / containerHeight) * 2);
            newX = dragState.originalX + (deltaX / containerWidth);
            newY = dragState.originalY + (deltaY / containerHeight);
            break;
        case 'top-right':
            // Tăng kích thước, giảm vị trí Y
            newWidth = Math.max(0.05, dragState.originalWidth + (deltaX / containerWidth) * 2);
            newHeight = Math.max(0.05, dragState.originalHeight - (deltaY / containerHeight) * 2);
            newY = dragState.originalY + (deltaY / containerHeight);
            break;
        case 'bottom-left':
            // Tăng kích thước, giảm vị trí X
            newWidth = Math.max(0.05, dragState.originalWidth - (deltaX / containerWidth) * 2);
            newHeight = Math.max(0.05, dragState.originalHeight + (deltaY / containerHeight) * 2);
            newX = dragState.originalX + (deltaX / containerWidth);
            break;
        case 'bottom-right':
            // Chỉ tăng kích thước
            newWidth = Math.max(0.05, dragState.originalWidth + (deltaX / containerWidth) * 2);
            newHeight = Math.max(0.05, dragState.originalHeight + (deltaY / containerHeight) * 2);
            break;
    }
    
    // Giới hạn kích thước
    newWidth = Math.max(0.05, Math.min(1, newWidth));
    newHeight = Math.max(0.05, Math.min(1, newHeight));
    
    // Giới hạn vị trí
    newX = Math.max(0, Math.min(1, newX));
    newY = Math.max(0, Math.min(1, newY));
    
    // Cập nhật đối tượng ảnh
    imageItem.width = newWidth;
    imageItem.height = newHeight;
    imageItem.x = newX;
    imageItem.y = newY;
    
    // Cập nhật hiển thị
    const imageElement = document.getElementById(`image-overlay-${dragState.currentImageId}`);
    if (imageElement) {
        // Tính toán vị trí pixel
        const left = (newX * containerWidth) - ((newWidth * containerWidth) / 2);
        const top = (newY * containerHeight) - ((newHeight * containerHeight) / 2);
        
        // Cập nhật style
        imageElement.style.width = `${newWidth * containerWidth}px`;
        imageElement.style.height = `${newHeight * containerHeight}px`;
        imageElement.style.left = `${left}px`;
        imageElement.style.top = `${top}px`;
        
        // Cập nhật tooltip
        updateSizeTooltip(imageElement, imageItem);
    }
}

/**
 * Xử lý kết thúc kéo hoặc resize
 * @param {Object} dragState - Trạng thái kéo thả
 * @param {ImageOverlay} self - Đối tượng ImageOverlay
 */
function handleDragOrResizeEnd(dragState, self) {
    // Xóa class đang kéo/resize
    const imageElement = document.getElementById(`image-overlay-${dragState.currentImageId}`);
    if (imageElement) {
        imageElement.classList.remove('dragging', 'resizing');
        
        // Xóa tooltip
        const tooltip = imageElement.querySelector('.image-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
    
    // Reset trạng thái
    dragState.isDragging = false;
    dragState.isResizing = false;
    dragState.currentImageId = null;
    dragState.resizeDirection = null;
}

/**
 * Tạo tooltip hiển thị vị trí
 * @param {HTMLElement} imageElement - Phần tử ảnh
 * @param {Object} imageItem - Đối tượng ảnh
 */
function createPositionTooltip(imageElement, imageItem) {
    // Xóa tooltip cũ nếu có
    const oldTooltip = imageElement.querySelector('.image-tooltip');
    if (oldTooltip) {
        oldTooltip.remove();
    }
    
    // Tạo tooltip mới
    const tooltip = document.createElement('div');
    tooltip.className = 'image-tooltip';
    tooltip.style.top = '-25px';
    tooltip.style.left = '0';
    tooltip.textContent = `X: ${Math.round(imageItem.x * 100)}%, Y: ${Math.round(imageItem.y * 100)}%`;
    
    imageElement.appendChild(tooltip);
}

/**
 * Cập nhật tooltip vị trí
 * @param {HTMLElement} imageElement - Phần tử ảnh
 * @param {Object} imageItem - Đối tượng ảnh
 */
function updatePositionTooltip(imageElement, imageItem) {
    const tooltip = imageElement.querySelector('.image-tooltip');
    if (tooltip) {
        tooltip.textContent = `X: ${Math.round(imageItem.x * 100)}%, Y: ${Math.round(imageItem.y * 100)}%`;
    }
}

/**
 * Tạo tooltip hiển thị kích thước
 * @param {HTMLElement} imageElement - Phần tử ảnh
 * @param {Object} imageItem - Đối tượng ảnh
 */
function createSizeTooltip(imageElement, imageItem) {
    // Xóa tooltip cũ nếu có
    const oldTooltip = imageElement.querySelector('.image-tooltip');
    if (oldTooltip) {
        oldTooltip.remove();
    }
    
    // Tạo tooltip mới
    const tooltip = document.createElement('div');
    tooltip.className = 'image-tooltip';
    tooltip.style.top = '-25px';
    tooltip.style.left = '0';
    tooltip.textContent = `W: ${Math.round(imageItem.width * 100)}%, H: ${Math.round(imageItem.height * 100)}%`;
    
    imageElement.appendChild(tooltip);
}

/**
 * Cập nhật tooltip kích thước
 * @param {HTMLElement} imageElement - Phần tử ảnh
 * @param {Object} imageItem - Đối tượng ảnh
 */
function updateSizeTooltip(imageElement, imageItem) {
    const tooltip = imageElement.querySelector('.image-tooltip');
    if (tooltip) {
        tooltip.textContent = `W: ${Math.round(imageItem.width * 100)}%, H: ${Math.round(imageItem.height * 100)}%`;
    }
}

/**
 * Cập nhật các trường input vị trí
 * @param {Object} imageItem - Đối tượng ảnh
 */
function updatePositionInputs(imageItem) {
    // Cập nhật trường input X nếu có
    const xInput = document.getElementById('image-x-position');
    if (xInput) {
        xInput.value = Math.round(imageItem.x * 100);
    }
    
    // Cập nhật trường input Y nếu có
    const yInput = document.getElementById('image-y-position');
    if (yInput) {
        yInput.value = Math.round(imageItem.y * 100);
    }
} 