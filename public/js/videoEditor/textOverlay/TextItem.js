/**
 * TextItem - Quản lý các text items
 */

/**
 * Thêm chữ mới
 */
function addText(textOptions) {
    const defaultOptions = {
        id: `text-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        content: 'Văn bản mẫu',
        font: 'Arial',
        size: 24,
        color: '#ffffff',
        position: 'middle',
        startTime: 0,
        duration: 3,
        animation: false,
        x: 0.5,  // Tỉ lệ x (0-1)
        y: 0.5   // Tỉ lệ y (0-1)
    };

    const textItem = { ...defaultOptions, ...textOptions };
    
    // Đặt vị trí x, y dựa vào position nếu không được cung cấp
    if (!textOptions.hasOwnProperty('x') || !textOptions.hasOwnProperty('y')) {
        switch(textItem.position) {
            case 'top':
                textItem.y = 0.1;
                textItem.x = 0.5;
                break;
            case 'bottom':
                textItem.y = 0.8;
                textItem.x = 0.5;
                break;
            default: // middle
                textItem.y = 0.5;
                textItem.x = 0.5;
        }
    }

    // Thêm vào danh sách
    this.textItems.push(textItem);
    
    // Cập nhật UI
    this.renderTextItems();
    this.updateTextItemsList();
    
    // Render text item lên timeline
    this.renderTextItemOnTimeline(textItem);
    
    return textItem.id;
}

/**
 * Cập nhật chữ đã có
 */
function updateText(textId, newOptions) {
    const textIndex = this.textItems.findIndex(item => item.id === textId);
    
    if (textIndex !== -1) {
        this.textItems[textIndex] = { ...this.textItems[textIndex], ...newOptions };
        
        // Cập nhật UI
        this.renderTextItems();
        this.updateTextItemsList();
        
        // Cập nhật clip trên timeline
        this.updateTextItemOnTimeline(this.textItems[textIndex]);
    }
}

/**
 * Xóa chữ
 */
function removeText(textId) {
    const textIndex = this.textItems.findIndex(item => item.id === textId);
    
    if (textIndex !== -1) {
        // Xóa clip khỏi timeline trước
        this.removeTextItemFromTimeline(this.textItems[textIndex]);
        
        // Xóa từ danh sách
        this.textItems.splice(textIndex, 1);
        
        // Cập nhật UI
        this.renderTextItems();
        this.updateTextItemsList();
        
        // Nếu đang xóa item đang chọn
        if (this.selectedTextId === textId) {
            this.selectedTextId = null;
            this.hideTextEditor();
        }
    }
}

/**
 * Lấy tất cả các text items
 */
function getTextItems() {
    return this.textItems || [];
}

// Gán module vào window
window.TextItemModule = {
    addText,
    updateText,
    removeText,
    getTextItems
}; 