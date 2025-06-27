/**
 * TextControls - Xử lý các điều khiển bàn phím cho text overlay
 */

/**
 * Thiết lập điều khiển bàn phím
 */
function setupKeyboardControls() {
    // Xóa bất kỳ event listener cũ nếu có
    if (this._keydownListener) {
        document.removeEventListener('keydown', this._keydownListener);
    }

    // Tạo hàm xử lý phím mới
    this._keydownListener = (e) => {
        if (!this.selectedTextId) return;
        
        console.log("Phát hiện phím:", e.key);
        
        // Chỉ xử lý khi đang chọn text và không đang trong input
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
            console.log("Đang focus vào input/textarea, bỏ qua");
            return;
        }
        
        const selectedText = this.textItems.find(item => item.id === this.selectedTextId);
        if (!selectedText) {
            console.log("Không tìm thấy text đang chọn");
            return;
        }
        
        // Xử lý phím Delete để xóa text
        if (e.key === 'Delete') {
            console.log("Xóa text với phím Delete");
            this.removeText(this.selectedTextId);
            e.preventDefault();
            return;
        }
        
        const step = e.shiftKey ? 0.01 : 0.005; // Bước di chuyển lớn hoặc nhỏ tùy vào shift
        let moved = false;
        const oldX = selectedText.x;
        const oldY = selectedText.y;
        
        switch (e.key) {
            case 'ArrowLeft':
                selectedText.x = Math.max(0, selectedText.x - step);
                moved = true;
                console.log(`Di chuyển sang trái: ${oldX.toFixed(3)} -> ${selectedText.x.toFixed(3)}`);
                break;
            case 'ArrowRight':
                selectedText.x = Math.min(1, selectedText.x + step);
                moved = true;
                console.log(`Di chuyển sang phải: ${oldX.toFixed(3)} -> ${selectedText.x.toFixed(3)}`);
                break;
            case 'ArrowUp':
                selectedText.y = Math.max(0, selectedText.y - step);
                moved = true;
                console.log(`Di chuyển lên trên: ${oldY.toFixed(3)} -> ${selectedText.y.toFixed(3)}`);
                break;
            case 'ArrowDown':
                selectedText.y = Math.min(1, selectedText.y + step);
                moved = true;
                console.log(`Di chuyển xuống dưới: ${oldY.toFixed(3)} -> ${selectedText.y.toFixed(3)}`);
                break;
        }
        
        if (moved) {
            e.preventDefault();
            console.log("Đã di chuyển text, cập nhật UI");
            
            // Cập nhật UI
            let currentTime = 0;
            if (window.videoEditor?.timeline) {
                if (typeof window.videoEditor.timeline.getCurrentTime === 'function') {
                    currentTime = window.videoEditor.timeline.getCurrentTime();
                } else if (window.videoEditor.timeline.currentTime !== undefined) {
                    currentTime = window.videoEditor.timeline.currentTime;
                }
            }
            this.renderTextItems(currentTime);
            
            // Cập nhật giá trị trong form nếu đang mở
            if (document.getElementById('text-x-position') && document.getElementById('text-y-position')) {
                document.getElementById('text-x-position').value = Math.round(selectedText.x * 100);
                document.getElementById('text-y-position').value = Math.round(selectedText.y * 100);
            }
        }
    };
    
    // Đăng ký event listener
    document.addEventListener('keydown', this._keydownListener);
    console.log("Đã đăng ký điều khiển bàn phím");
}

// Gán module vào window
window.TextControlsModule = {
    setupKeyboardControls
}; 