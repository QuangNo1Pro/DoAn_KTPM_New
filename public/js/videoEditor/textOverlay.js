/**
 * Quản lý các chữ chồng lên video
 */
class TextOverlay {
    constructor(options = {}) {
        // Cài đặt mặc định
        this.options = Object.assign({
            container: '#text-overlays-container',
            canvas: '#preview-canvas',
            itemsList: '#text-items-list',
            addTextBtn: '#add-text-btn',
            textModal: '#textModal',
            confirmAddText: '#confirm-add-text'
        }, options);

        // Các thuộc tính
        this.textItems = [];
        this.selectedTextId = null;
        this.canvasElement = document.querySelector(this.options.canvas);
        this.container = document.querySelector(this.options.container);
        this.itemsList = document.querySelector(this.options.itemsList);
        this.addTextBtn = document.querySelector(this.options.addTextBtn);
        this.textModal = document.querySelector(this.options.textModal);
        this.confirmAddText = document.querySelector(this.options.confirmAddText);
        
        // Theo dõi trạng thái kéo thả
        this.dragState = {
            isDragging: false,
            currentTextId: null,
            startX: 0,
            startY: 0,
            originalX: 0,
            originalY: 0
        };

        // Khởi tạo
        this.init();
    }

    /**
     * Khởi tạo TextOverlay
     */
    init() {
        this.bindEvents();
        this.createTextTrackIfNeeded();
        this.setupKeyboardControls();
    }

    /**
     * Tạo track cho text nếu chưa có
     */
    createTextTrackIfNeeded() {
        // Kiểm tra xem đã có track cho text chưa
        const tracksContainer = document.getElementById('timeline-tracks');
        if (!tracksContainer) return;
        
        let textTrack = document.getElementById('text-track');
        
        // Nếu chưa có, tạo mới
        if (!textTrack) {
            textTrack = document.createElement('div');
            textTrack.id = 'text-track';
            textTrack.className = 'timeline-track';
            textTrack.dataset.trackType = 'text';
            textTrack.style.height = '40px';
            textTrack.style.background = 'rgba(50, 50, 255, 0.2)';
            textTrack.style.borderBottom = '1px solid #555';
            textTrack.style.position = 'relative';
            
            // Thêm tiêu đề cho track
            const trackLabel = document.createElement('div');
            trackLabel.className = 'track-label';
            trackLabel.innerHTML = 'Chữ';
            trackLabel.style.position = 'absolute';
            trackLabel.style.left = '5px';
            trackLabel.style.top = '50%';
            trackLabel.style.transform = 'translateY(-50%)';
            trackLabel.style.color = '#fff';
            trackLabel.style.fontSize = '12px';
            trackLabel.style.pointerEvents = 'none';
            
            textTrack.appendChild(trackLabel);
            
            // Thêm vào container
            tracksContainer.appendChild(textTrack);
            
            // Thêm sự kiện drop cho track
            this.addDropEventToTextTrack(textTrack);
        }
    }
    
    /**
     * Thêm sự kiện drop cho text track
     */
    addDropEventToTextTrack(track) {
        // Thêm sự kiện khi kéo clip qua track
        track.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            track.classList.add('dragover');
        });
        
        track.addEventListener('dragleave', () => {
            track.classList.remove('dragover');
        });
        
        // Thêm sự kiện drop (thả clip)
        track.addEventListener('drop', (e) => {
            e.preventDefault();
            track.classList.remove('dragover');
            
            // Lấy ID text đang kéo
            const textId = e.dataTransfer.getData('text/plain');
            if (!textId || !textId.startsWith('text-')) return;
            
            // Tìm text trong danh sách
            const textItem = this.textItems.find(t => t.id === textId);
            if (!textItem) return;
            
            // Tính toán vị trí mới dựa trên điểm thả
            const trackRect = track.getBoundingClientRect();
            
            // Tính toán vị trí thả
            let dropPosition = e.clientX - trackRect.left + track.scrollLeft;
            
            // Chuyển đổi pixel sang giây
            const pixelsPerSecond = window.videoEditor?.timeline?.pixelsPerSecond || 100;
            let newStartTime = dropPosition / pixelsPerSecond;
            
            // Làm tròn đến 0.1 giây
            newStartTime = Math.max(0, Math.round(newStartTime * 10) / 10);
            
            console.log(`Di chuyển text ${textId} đến thời điểm ${newStartTime.toFixed(2)}s`);
            
            // Cập nhật thời gian của text
            this.updateText(textId, { startTime: newStartTime });
            
            // Render lại timeline nếu cần
            if (window.videoEditor && window.videoEditor.timeline) {
                window.videoEditor.timeline.render();
            }
        });
    }

    /**
     * Thêm chữ mới
     */
    addText(textOptions) {
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
    updateText(textId, newOptions) {
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
    removeText(textId) {
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
     * Render chữ lên timeline
     */
    renderTextItemOnTimeline(textItem) {
        const textTrack = document.getElementById('text-track');
        if (!textTrack) return;
        
        // Xóa clip cũ nếu đã có
        const existingItem = textTrack.querySelector(`.timeline-clip[data-text-id="${textItem.id}"]`);
        if (existingItem) existingItem.remove();
        
        // Tạo clip trên timeline
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-clip text-clip';
        timelineItem.dataset.textId = textItem.id;
        timelineItem.setAttribute('draggable', 'true');
        
        // Tính toán vị trí và kích thước
        const pixelsPerSecond = window.videoEditor?.timeline?.pixelsPerSecond || 100;
        timelineItem.style.left = `${textItem.startTime * pixelsPerSecond}px`;
        timelineItem.style.width = `${textItem.duration * pixelsPerSecond}px`;
        timelineItem.style.position = 'absolute';
        timelineItem.style.top = '4px';
        timelineItem.style.height = 'calc(100% - 8px)';
        timelineItem.style.backgroundColor = 'rgba(100, 100, 255, 0.6)';
        timelineItem.style.borderRadius = '4px';
        timelineItem.style.overflow = 'hidden';
        timelineItem.style.cursor = 'move';
        timelineItem.style.whiteSpace = 'nowrap';
        timelineItem.style.textOverflow = 'ellipsis';
        
        // Thêm nội dung cho clip
        const clipContent = document.createElement('div');
        clipContent.className = 'clip-content';
        clipContent.style.padding = '2px 6px';
        clipContent.style.fontSize = '10px';
        clipContent.style.color = 'white';
        clipContent.style.overflow = 'hidden';
        clipContent.style.textOverflow = 'ellipsis';
        clipContent.textContent = textItem.content.substring(0, 15) + (textItem.content.length > 15 ? '...' : '');
        
        timelineItem.appendChild(clipContent);
        
        // Thêm events kéo thả
        this.addDragEventsToTextClip(timelineItem, textItem);
        
        // Thêm vào track
        textTrack.appendChild(timelineItem);
    }
    
    /**
     * Cập nhật clip chữ trên timeline
     */
    updateTextItemOnTimeline(textItem) {
        // Render lại để cập nhật
        this.renderTextItemOnTimeline(textItem);
    }
    
    /**
     * Xóa clip chữ khỏi timeline
     */
    removeTextItemFromTimeline(textItem) {
        const textTrack = document.getElementById('text-track');
        if (!textTrack) return;
        
        const timelineItem = textTrack.querySelector(`.timeline-clip[data-text-id="${textItem.id}"]`);
        if (timelineItem) timelineItem.remove();
    }
    
    /**
     * Thêm sự kiện kéo thả cho clip chữ
     */
    addDragEventsToTextClip(clipElement, textItem) {
        clipElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', textItem.id);
            e.dataTransfer.effectAllowed = 'move';
            clipElement.style.opacity = '0.5';
            clipElement.classList.add('dragging');
            
            // Lưu offset của điểm click để đặt chính xác
            const rect = clipElement.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            e.dataTransfer.setData('offset-x', offsetX);
        });
        
        clipElement.addEventListener('dragend', () => {
            clipElement.style.opacity = '1';
            clipElement.classList.remove('dragging');
        });
        
        // Thêm sự kiện click để chọn
        clipElement.addEventListener('click', () => {
            this.selectText(textItem.id);
        });
    }

    /**
     * Render các chữ lên màn hình
     */
    renderTextItems(currentTime = 0) {
        if (!this.container) return;
        
        // Xóa các text overlays hiện tại
        this.container.innerHTML = '';
        
        // Lấy kích thước canvas
        const canvasWidth = this.canvasElement ? this.canvasElement.offsetWidth : this.container.offsetWidth;
        const canvasHeight = this.canvasElement ? this.canvasElement.offsetHeight : this.container.offsetHeight;
        
        // Lọc và render các text items đang hiển thị tại thời điểm hiện tại
        const visibleItems = this.textItems.filter(item => 
            currentTime >= item.startTime && currentTime < (item.startTime + item.duration)
        );
        
        visibleItems.forEach(item => {
            const textElement = document.createElement('div');
            textElement.className = 'text-overlay-item';
            textElement.dataset.textId = item.id;
            textElement.style.position = 'absolute';
            textElement.style.color = item.color;
            textElement.style.fontFamily = item.font;
            textElement.style.fontSize = `${item.size}px`;
            
            // Thiết lập nội dung
            textElement.textContent = item.content;
            
            // Thiết lập vị trí dựa trên tỉ lệ x, y
            const xPos = item.x * canvasWidth;
            const yPos = item.y * canvasHeight;
            
            textElement.style.left = `${xPos}px`;
            textElement.style.top = `${yPos}px`;
            textElement.style.transform = 'translate(-50%, -50%)';
            textElement.style.textAlign = 'center';
            textElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.7)';
            textElement.style.padding = '10px';
            textElement.style.zIndex = '100';
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
                this.addDragEventForText(textElement, item);
            }
            
            // Thêm vào container
            this.container.appendChild(textElement);
        });
    }

    /**
     * Thêm các sự kiện kéo thả cho text element
     */
    addDragEventForText(element, textItem) {
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
    handleMouseMove(e) {
        if (!this.dragState.isDragging) return;
        
        const { startX, startY, originalX, originalY, currentTextId } = this.dragState;
        
        // Lấy kích thước canvas
        const canvasWidth = this.canvasElement ? this.canvasElement.offsetWidth : this.container.offsetWidth;
        const canvasHeight = this.canvasElement ? this.canvasElement.offsetHeight : this.container.offsetHeight;
        
        // Tính toán vị trí mới
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // Tính tỉ lệ di chuyển
        const newX = Math.max(0, Math.min(1, originalX + deltaX / canvasWidth));
        const newY = Math.max(0, Math.min(1, originalY + deltaY / canvasHeight));
        
        // Tìm text item và cập nhật
        const textItem = this.textItems.find(item => item.id === currentTextId);
        if (textItem) {
            textItem.x = newX;
            textItem.y = newY;
            
            // Cập nhật UI
            this.renderTextItems(window.videoEditor?.timeline?.getCurrentTime() || 0);
            
            // Cập nhật tọa độ trong form nếu đang mở
            if (document.getElementById('text-editor') && !document.getElementById('text-editor').classList.contains('d-none')) {
                document.getElementById('text-x-position').value = Math.round(newX * 100);
                document.getElementById('text-y-position').value = Math.round(newY * 100);
            }
        }
    }
    
    /**
     * Xử lý sự kiện chuột thả ra
     */
    handleMouseUp(e) {
        if (!this.dragState.isDragging) return;
        
        // Tìm phần tử đang kéo và xóa class
        const textElement = this.container.querySelector(`.text-overlay-item[data-text-id="${this.dragState.currentTextId}"]`);
        if (textElement) {
            textElement.classList.remove('dragging');
            
            // Xóa tooltip
            const tooltip = textElement.querySelector('.position-tooltip');
            if (tooltip) textElement.removeChild(tooltip);
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

    /**
     * Cập nhật danh sách chữ trong panel
     */
    updateTextItemsList() {
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
    selectText(textId) {
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
    showTextEditor() {
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
            this.renderTextItems(window.videoEditor?.timeline?.getCurrentTime() || 0);
        } else {
            textEditor.classList.add('d-none');
        }
    }

    /**
     * Ẩn editor chữ
     */
    hideTextEditor() {
        const textEditor = document.getElementById('text-editor');
        if (textEditor) {
            textEditor.classList.add('d-none');
        }
    }

    /**
     * Thiết lập điều khiển bàn phím
     */
    setupKeyboardControls() {
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
                this.renderTextItems(window.videoEditor?.timeline?.getCurrentTime() || 0);
                
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

    /**
     * Gắn các sự kiện
     */
    bindEvents() {
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
                    bootstrap.Modal.getInstance(this.textModal).hide();
                    
                    // Reset form
                    document.getElementById('new-text-content').value = '';
                }
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

    /**
     * Cập nhật hiển thị chữ theo thời gian hiện tại
     */
    updateAtTime(currentTime) {
        this.renderTextItems(currentTime);
    }

    /**
     * Format thời gian thành chuỗi mm:ss
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Lấy danh sách chữ
     */
    getTextItems() {
        return [...this.textItems];
    }
}

// Export class
window.TextOverlay = TextOverlay; 