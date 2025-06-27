/**
 * TextTrack - Quản lý track text trên timeline
 */

// Tạo track cho text nếu chưa có
function createTextTrackIfNeeded() {
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
function addDropEventToTextTrack(track) {
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
 * Render chữ lên timeline
 */
function renderTextItemOnTimeline(textItem) {
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
function updateTextItemOnTimeline(textItem) {
    // Render lại để cập nhật
    this.renderTextItemOnTimeline(textItem);
}

/**
 * Xóa clip chữ khỏi timeline
 */
function removeTextItemFromTimeline(textItem) {
    const textTrack = document.getElementById('text-track');
    if (!textTrack) return;
    
    const timelineItem = textTrack.querySelector(`.timeline-clip[data-text-id="${textItem.id}"]`);
    if (timelineItem) timelineItem.remove();
}

/**
 * Thêm sự kiện kéo thả cho clip chữ
 */
function addDragEventsToTextClip(clipElement, textItem) {
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

// Gán module vào window
window.TextTrackModule = {
    createTextTrackIfNeeded,
    addDropEventToTextTrack,
    renderTextItemOnTimeline,
    updateTextItemOnTimeline,
    removeTextItemFromTimeline,
    addDragEventsToTextClip
}; 