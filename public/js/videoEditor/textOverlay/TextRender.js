/**
 * TextRender - Hiển thị các chữ trên canvas
 */

/**
 * Render các chữ lên màn hình
 */
function renderTextItems(currentTime = 0) {
    if (!this.container) return;
    
    try {
        console.log("Bắt đầu render text overlays tại thời điểm:", currentTime);
        
        // Xóa các text overlays hiện tại
        this.container.innerHTML = '';
        
        // Đặt z-index cao hơn cho container để đảm bảo text hiển thị đè lên video
        this.container.style.position = 'absolute';
        this.container.style.zIndex = '10';
        
        // Đảm bảo container không phải màu đen và hoàn toàn trong suốt
        this.container.style.background = 'transparent';
        this.container.style.backgroundColor = 'transparent';
        this.container.style.pointerEvents = 'none';
        this.container.style.backdropFilter = 'none';
        this.container.style.webkitBackdropFilter = 'none';
        this.container.style.mixBlendMode = 'normal';
        
        // Xóa bỏ bất kỳ thuộc tính nào có thể gây ra màn hình đen
        const clearStyles = [
            'background-color', 'backdrop-filter', 'filter',
            'opacity', 'background-image', 'box-shadow'
        ];
        
        clearStyles.forEach(style => {
            this.container.style.removeProperty(style);
        });
        
        // Lấy kích thước canvas
        const canvasWidth = this.canvasElement ? this.canvasElement.offsetWidth : this.container.offsetWidth;
        const canvasHeight = this.canvasElement ? this.canvasElement.offsetHeight : this.container.offsetHeight;
        
        console.log(`Kích thước canvas: ${canvasWidth}x${canvasHeight}`);
        
        // Kiểm tra kích thước hợp lệ
        if (!canvasWidth || !canvasHeight) {
            console.warn('Kích thước canvas không hợp lệ:', canvasWidth, canvasHeight);
            return;
        }
        
        // Lọc và render các text items đang hiển thị tại thời điểm hiện tại
        const visibleItems = this.textItems.filter(item => 
            currentTime >= item.startTime && currentTime < (item.startTime + item.duration)
        );
        
        console.log(`Có ${visibleItems.length} text item hiển thị tại thời điểm ${currentTime}`);
        
        visibleItems.forEach((item, index) => {
            if (!item || !item.id) {
                console.warn('Text item không hợp lệ:', item);
                return; // Bỏ qua item không hợp lệ
            }
            
            try {
                console.log(`Render text item ${index + 1}:`, item.content);
                
                const textElement = document.createElement('div');
                textElement.className = 'text-overlay-item';
                textElement.dataset.textId = item.id;
                
                // Thiết lập style với !important để tránh bị ghi đè
                textElement.style.position = 'absolute';
                textElement.style.color = item.color || '#ffffff';
                textElement.style.fontFamily = item.font || 'Arial';
                textElement.style.fontSize = `${item.size || 24}px`;
                textElement.style.zIndex = '15';
                textElement.style.background = 'transparent';
                textElement.style.backgroundColor = 'transparent';
                
                // Thiết lập nội dung
                textElement.textContent = item.content || '';
                
                // Thiết lập vị trí dựa trên tỉ lệ x, y
                const xPos = (item.x || 0.5) * canvasWidth;
                const yPos = (item.y || 0.5) * canvasHeight;
                
                // Áp dụng vị trí
                textElement.style.left = `${xPos}px`;
                textElement.style.top = `${yPos}px`;
                textElement.style.transform = 'translate(-50%, -50%)';
                textElement.style.textAlign = 'center';
                textElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.7)';
                textElement.style.padding = '10px';
                textElement.style.width = 'auto';
                textElement.style.maxWidth = '80%';
                
                // Thêm viền để dễ thấy khi chỉnh sửa
                if (this.selectedTextId === item.id) {
                    textElement.style.outline = '2px dashed white';
                    textElement.style.cursor = 'move';
                    textElement.style.pointerEvents = 'all'; // Cho phép tương tác
                } else {
                    textElement.style.pointerEvents = 'none'; // Không tương tác khi không chọn
                }
                
                // Thêm animation nếu được yêu cầu
                if (item.animation) {
                    const progress = (currentTime - item.startTime) / item.duration;
                    
                    if (progress < 0.3) {
                        // Animation xuất hiện
                        const fadeInProgress = progress / 0.3;
                        textElement.style.opacity = fadeInProgress;
                        textElement.style.transform = `translate(-50%, -50%) scale(${0.8 + (fadeInProgress * 0.2)})`;
                    } else if (progress > 0.7) {
                        // Animation biến mất
                        const fadeOutProgress = (progress - 0.7) / 0.3;
                        textElement.style.opacity = 1 - fadeOutProgress;
                    }
                }
                
                // Thêm sự kiện kéo thả cho text element
                if (this.selectedTextId === item.id) {
                    try {
                        this.addDragEventForText(textElement, item);
                    } catch (dragError) {
                        console.error('Lỗi khi thêm sự kiện kéo thả:', dragError);
                    }
                }
                
                // Thêm vào container
                this.container.appendChild(textElement);
                console.log(`Đã render text item: ${item.content}`);
                
            } catch (itemError) {
                console.error('Lỗi khi tạo text item:', itemError, item);
            }
        });
        
        console.log("Hoàn thành render text overlays");
        
    } catch (error) {
        console.error('Lỗi khi render text items:', error);
        
        // Hiển thị thông báo lỗi
        if (typeof window.showErrorMessage === 'function') {
            window.showErrorMessage('Có lỗi khi hiển thị chữ. Vui lòng thử lại.');
        }
    }
}

// Gán module vào window
window.TextRenderModule = {
    renderTextItems
}; 