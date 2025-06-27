/**
 * TextDragDrop - Xử lý các sự kiện kéo thả cho text
 */

/**
 * Thêm các sự kiện kéo thả cho text element
 */
function addDragEventForText(element, textItem) {
    // Khởi tạo dragState nếu chưa có
    if (!this.dragState) {
        this.dragState = {
            isDragging: false,
            currentTextId: null,
            startX: 0,
            startY: 0,
            originalX: 0,
            originalY: 0
        };
    }
    
    element.addEventListener('mousedown', (e) => {
        e.preventDefault();
        
        // Lưu trạng thái kéo thả
        this.dragState = {
            isDragging: true,
            currentTextId: textItem.id,
            startX: e.clientX,
            startY: e.clientY,
            originalX: textItem.x,
            originalY: textItem.y
        };
        
        // Thêm class khi đang kéo
        element.classList.add('dragging');
        
        // Đảm bảo không có background
        element.style.backgroundColor = 'transparent';
        
        // Đảm bảo container có pointer events để nhận sự kiện chuột
        if (this.container) {
            this.container.style.pointerEvents = 'auto';
        }
        
        // Hiển thị tọa độ
        const tooltip = document.createElement('div');
        tooltip.className = 'position-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(0,0,0,0.7)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '4px 8px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '1000';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.top = '-30px';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.textContent = `X: ${Math.round(textItem.x * 100)}%, Y: ${Math.round(textItem.y * 100)}%`;
        
        element.appendChild(tooltip);
    });
    
    // Thêm sự kiện toàn tài liệu để theo dõi chuột di chuyển
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
}

/**
 * Xử lý sự kiện chuột di chuyển
 */
function handleMouseMove(e) {
    // Đảm bảo dragState đã được khởi tạo
    if (!this.dragState) {
        this.dragState = {
            isDragging: false,
            currentTextId: null,
            startX: 0,
            startY: 0,
            originalX: 0,
            originalY: 0
        };
        return;
    }
    
    if (!this.dragState.isDragging) return;
    
    const { currentTextId, startX, startY, originalX, originalY } = this.dragState;
    
    // Đảm bảo container tồn tại
    if (!this.container) {
        console.warn('Container không tồn tại trong handleMouseMove');
        return;
    }
    
    const canvasWidth = this.container.offsetWidth;
    const canvasHeight = this.container.offsetHeight;
    
    // Tính khoảng cách di chuyển
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // Tính tỉ lệ di chuyển
    const newX = Math.max(0, Math.min(1, originalX + deltaX / canvasWidth));
    const newY = Math.max(0, Math.min(1, originalY + deltaY / canvasHeight));
    
    // Đảm bảo textItems tồn tại
    if (!this.textItems || !Array.isArray(this.textItems)) {
        console.warn('textItems không tồn tại hoặc không phải array');
        return;
    }
    
    // Tìm text item và cập nhật
    const textItem = this.textItems.find(item => item.id === currentTextId);
    if (textItem) {
        textItem.x = newX;
        textItem.y = newY;
        
        // Cập nhật UI - Kiểm tra nếu getCurrentTime là hàm
        let currentTime = 0;
        if (window.videoEditor?.timeline) {
            if (typeof window.videoEditor.timeline.getCurrentTime === 'function') {
                currentTime = window.videoEditor.timeline.getCurrentTime();
            } else if (window.videoEditor.timeline.currentTime !== undefined) {
                currentTime = window.videoEditor.timeline.currentTime;
            }
        }
        
        // Chỉ gọi renderTextItems nếu nó tồn tại
        if (typeof this.renderTextItems === 'function') {
            this.renderTextItems(currentTime);
        }
        
        // Cập nhật tọa độ trong form nếu đang mở
        if (document.getElementById('text-editor') && !document.getElementById('text-editor').classList.contains('d-none')) {
            const xPosInput = document.getElementById('text-x-position');
            const yPosInput = document.getElementById('text-y-position');
            
            if (xPosInput) xPosInput.value = Math.round(newX * 100);
            if (yPosInput) yPosInput.value = Math.round(newY * 100);
        }
    }
}

/**
 * Xử lý sự kiện chuột thả ra
 */
function handleMouseUp(e) {
    // Đảm bảo dragState đã được khởi tạo
    if (!this.dragState) {
        this.dragState = {
            isDragging: false,
            currentTextId: null,
            startX: 0,
            startY: 0,
            originalX: 0,
            originalY: 0
        };
        return;
    }
    
    if (!this.dragState.isDragging) return;
    
    // Đảm bảo container tồn tại
    if (!this.container) {
        console.warn('Container không tồn tại trong handleMouseUp');
        return;
    }
    
    // Tìm phần tử đang kéo và xóa class
    const textElement = this.container.querySelector(`.text-overlay-item[data-text-id="${this.dragState.currentTextId}"]`);
    if (textElement) {
        textElement.classList.remove('dragging');
        
        // Xóa tooltip
        const tooltip = textElement.querySelector('.position-tooltip');
        if (tooltip) textElement.removeChild(tooltip);
        
        // Đảm bảo pointerEvents trở lại none sau khi kéo
        if (this.selectedTextId !== this.dragState.currentTextId) {
            textElement.style.pointerEvents = 'none';
        }
    }
    
    // Đảm bảo container trở lại trạng thái không nhận pointer events
    if (this.container) {
        this.container.style.pointerEvents = 'none';
    }
    
    // Reset trạng thái kéo
    this.dragState = {
        isDragging: false,
        currentTextId: null,
        startX: 0,
        startY: 0,
        originalX: 0,
        originalY: 0
    };
}

// Gán module vào window
window.TextDragDropModule = {
    addDragEventForText,
    handleMouseMove,
    handleMouseUp
}; 