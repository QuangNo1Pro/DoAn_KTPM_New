/**
 * TextUI - Quản lý giao diện người dùng cho text overlay
 */

/**
 * Cập nhật danh sách chữ trong panel
 */
function updateTextItemsList() {
    if (!this.itemsList) return;
    
    this.itemsList.innerHTML = '';
    
    this.textItems.forEach(item => {
        const element = document.createElement('button');
        element.className = `list-group-item list-group-item-action ${this.selectedTextId === item.id ? 'active' : ''}`;
        element.dataset.textId = item.id;
        element.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>${item.content.substring(0, 15)}${item.content.length > 15 ? '...' : ''}</span>
                <span class="badge bg-info">${this.formatTime(item.startTime)}</span>
            </div>
        `;
        
        element.addEventListener('click', () => {
            this.selectText(item.id);
        });
        
        this.itemsList.appendChild(element);
    });
}

/**
 * Chọn chữ để chỉnh sửa
 */
function selectText(textId) {
    this.selectedTextId = textId;
    
    // Cập nhật UI
    this.updateTextItemsList();
    
    // Hiển thị editor cho text
    this.showTextEditor();
    
    console.log(`Đã chọn text: ${textId}`);
    
    // Focus vào container video để bắt phím
    setTimeout(() => {
        // Loại bỏ focus từ bất kỳ input nào
        if (document.activeElement) {
            document.activeElement.blur();
        }
        
        // Focus vào container video
        const videoContainer = document.getElementById('preview-container');
        if (videoContainer) {
            videoContainer.focus();
            videoContainer.setAttribute('tabindex', '0'); // Để có thể nhận focus
            console.log("Đã focus vào container video");
        }
    }, 100);
}

/**
 * Hiển thị editor cho chữ đang chọn
 */
function showTextEditor() {
    const textEditor = document.getElementById('text-editor');
    if (!textEditor) return;
    
    const selectedText = this.textItems.find(item => item.id === this.selectedTextId);
    
    if (selectedText) {
        document.getElementById('text-content').value = selectedText.content;
        document.getElementById('text-font').value = selectedText.font;
        document.getElementById('text-size').value = selectedText.size;
        document.getElementById('text-color').value = selectedText.color;
        document.getElementById('text-position').value = selectedText.position;
        document.getElementById('text-start-time').value = selectedText.startTime;
        document.getElementById('text-duration').value = selectedText.duration;
        document.getElementById('text-animation').checked = selectedText.animation;
        
        // Thêm trường nhập liệu cho vị trí x, y
        if (!document.getElementById('text-x-position')) {
            const positionGroup = document.getElementById('text-position').closest('.mb-3');
            
            const xyPositionGroup = document.createElement('div');
            xyPositionGroup.className = 'mb-3';
            xyPositionGroup.innerHTML = `
                <label class="form-label">Vị trí tùy chỉnh (%):</label>
                <div class="input-group">
                    <span class="input-group-text">X:</span>
                    <input type="number" class="form-control" id="text-x-position" min="0" max="100" value="${Math.round(selectedText.x * 100)}">
                    <span class="input-group-text">Y:</span>
                    <input type="number" class="form-control" id="text-y-position" min="0" max="100" value="${Math.round(selectedText.y * 100)}">
                </div>
                <small class="form-text text-muted">Kéo văn bản trực tiếp trên màn hình hoặc điều chỉnh giá trị ở đây</small>
            `;
            
            positionGroup.after(xyPositionGroup);
        } else {
            document.getElementById('text-x-position').value = Math.round(selectedText.x * 100);
            document.getElementById('text-y-position').value = Math.round(selectedText.y * 100);
        }
        
        textEditor.classList.remove('d-none');
        
        // Render lại để hiển thị viền cho text đang chọn
        // Kiểm tra nếu getCurrentTime là hàm
        let currentTime = 0;
        if (window.videoEditor?.timeline) {
            if (typeof window.videoEditor.timeline.getCurrentTime === 'function') {
                currentTime = window.videoEditor.timeline.getCurrentTime();
            } else if (window.videoEditor.timeline.currentTime !== undefined) {
                currentTime = window.videoEditor.timeline.currentTime;
            }
        }
        this.renderTextItems(currentTime);
    } else {
        textEditor.classList.add('d-none');
    }
}

/**
 * Ẩn editor chữ
 */
function hideTextEditor() {
    const textEditor = document.getElementById('text-editor');
    if (textEditor) {
        textEditor.classList.add('d-none');
    }
}

/**
 * Gắn các sự kiện
 */
function bindEvents() {
    // Sự kiện thêm chữ
    if (this.addTextBtn) {
        this.addTextBtn.addEventListener('click', () => {
            // Mở modal thêm chữ
            const modal = new bootstrap.Modal(this.textModal);
            modal.show();
        });
    }
    
    // Sự kiện xác nhận thêm chữ
    if (this.confirmAddText) {
        this.confirmAddText.addEventListener('click', () => {
            const content = document.getElementById('new-text-content').value;
            const position = document.getElementById('new-text-position').value;
            
            if (content.trim()) {
                this.addText({
                    content,
                    position
                });
                
                // Đóng modal
                const modalInstance = bootstrap.Modal.getInstance(this.textModal);
                modalInstance.hide();
                
                // Đảm bảo xóa backdrop và các class modal
                setTimeout(() => {
                    // Xóa lớp modal-backdrop khỏi body nếu còn sót lại
                    const modalBackdrops = document.querySelectorAll('.modal-backdrop');
                    modalBackdrops.forEach(backdrop => {
                        backdrop.remove();
                    });
                    
                    // Xóa các class và style trên body
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                }, 300);
                
                // Reset form
                document.getElementById('new-text-content').value = '';
            }
        });
    }
    
    // Thêm sự kiện khi modal đóng để đảm bảo xóa backdrop
    if (this.textModal) {
        this.textModal.addEventListener('hidden.bs.modal', () => {
            // Xóa lớp modal-backdrop khỏi body nếu còn sót lại
            const modalBackdrops = document.querySelectorAll('.modal-backdrop');
            modalBackdrops.forEach(backdrop => {
                backdrop.remove();
            });
            
            // Xóa các class và style trên body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
    }
    
    // Sự kiện áp dụng thay đổi cho chữ
    document.getElementById('apply-text-changes')?.addEventListener('click', () => {
        if (!this.selectedTextId) return;
        
        const content = document.getElementById('text-content').value;
        const font = document.getElementById('text-font').value;
        const size = parseInt(document.getElementById('text-size').value);
        const color = document.getElementById('text-color').value;
        const position = document.getElementById('text-position').value;
        const startTime = parseFloat(document.getElementById('text-start-time').value);
        const duration = parseFloat(document.getElementById('text-duration').value);
        const animation = document.getElementById('text-animation').checked;
        
        // Lấy vị trí tùy chỉnh nếu có
        let x = 0.5;
        let y = 0.5;
        
        if (document.getElementById('text-x-position') && document.getElementById('text-y-position')) {
            x = parseInt(document.getElementById('text-x-position').value) / 100;
            y = parseInt(document.getElementById('text-y-position').value) / 100;
        }
        
        // Điều chỉnh giới hạn
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));
        
        this.updateText(this.selectedTextId, {
            content, font, size, color, position, startTime, duration, animation, x, y
        });
    });
    
    // Sự kiện xóa chữ
    document.getElementById('delete-text-item')?.addEventListener('click', () => {
        if (this.selectedTextId) {
            this.removeText(this.selectedTextId);
        }
    });
}

// Gán module vào window
window.TextUIModule = {
    updateTextItemsList,
    selectText,
    showTextEditor,
    hideTextEditor,
    bindEvents
}; 