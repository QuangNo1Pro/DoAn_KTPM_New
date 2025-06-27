/**
 * timelineDragDrop.js - Xử lý kéo thả trên timeline
 */

/**
 * Thêm sự kiện kéo thả cho các track
 */
function addDragDropEvents() {
    const videoTrack = document.getElementById('video-track');
    const audioTrack = document.getElementById('audio-track');
    const textTrack = document.getElementById('text-track');
    
    const tracks = [videoTrack, audioTrack, textTrack].filter(Boolean);
    if (tracks.length === 0) return;
    
    // Lưu trữ điểm bắt đầu kéo để tính toán chính xác hơn
    let dragStartOffsetX = 0;
    let draggedClipId = null;
    
    tracks.forEach(track => {
        // Lấy loại track
        const trackType = track.dataset.trackType;
        
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
            
            const timeline = window.videoEditor?.timeline;
            if (!timeline) return;
            
            // Lấy ID clip đang kéo
            const clipId = e.dataTransfer.getData('text/plain');
            if (!clipId) return;
            
            // Lấy offset từ dataTransfer nếu có
            let offsetX = parseInt(e.dataTransfer.getData('offset-x')) || 0;
            
            // Tìm clip trong danh sách
            const clipIndex = timeline.clips.findIndex(c => c.id === clipId);
            if (clipIndex === -1) return;
            
            const clip = timeline.clips[clipIndex];
            
            // Tính toán vị trí mới dựa trên điểm thả
            const trackRect = track.getBoundingClientRect();
            
            // Tính toán vị trí thả, điều chỉnh theo offset của điểm bắt đầu kéo
            let dropPosition = e.clientX - trackRect.left + track.scrollLeft - offsetX;
            
            // Chuyển đổi pixel sang giây
            let newStartTime = dropPosition / timeline.pixelsPerSecond;
            
            // Làm tròn đến 0.1 giây để dễ đọc
            newStartTime = Math.max(0, Math.round(newStartTime * 10) / 10);
            
            console.log(`Thử di chuyển clip ${clipId} đến vị trí ${newStartTime.toFixed(2)}s trên track ${trackType}`);
            
            // Kiểm tra loại track có phù hợp với loại clip không
            if (clip.type !== trackType && !(clip.type === 'video' && trackType === 'audio')) {
                console.warn(`Không thể thả clip loại ${clip.type} vào track ${trackType}`);
                return;
            }
            
            // Kiểm tra va chạm với các clip khác trên cùng track
            const newEndTime = newStartTime + clip.duration;
            const moveClipType = trackType === 'audio' ? 'audio' : clip.type;
            const hasCollision = timeline.clips.some(otherClip => {
                // Bỏ qua chính clip đang kéo
                if (otherClip.id === clipId) return false;
                
                // Chỉ kiểm tra clip cùng loại trên cùng track
                if (otherClip.type !== moveClipType) return false;
                
                const otherEndTime = otherClip.startTime + otherClip.duration;
                
                // Kiểm tra xem có giao nhau không
                return (newStartTime < otherEndTime && newEndTime > otherClip.startTime);
            });
            
            if (hasCollision) {
                console.warn("Phát hiện va chạm với clip khác, tìm vị trí thay thế...");
                
                // Tìm vị trí kết thúc của clip gần nhất ở phía trước
                const clipsOnSameTrack = timeline.clips.filter(c => c.id !== clipId && c.type === moveClipType);
                
                // Sắp xếp theo thứ tự thời gian
                clipsOnSameTrack.sort((a, b) => a.startTime - b.startTime);
                
                // Tìm vị trí an toàn
                let safePosition = 0;
                
                for (const otherClip of clipsOnSameTrack) {
                    const otherEndTime = otherClip.startTime + otherClip.duration;
                    
                    // Nếu có đủ không gian giữa vị trí hiện tại và clip tiếp theo
                    if (safePosition + clip.duration <= otherClip.startTime) {
                        break; // Đã tìm được vị trí an toàn
                    }
                    
                    // Không thì di chuyển đến vị trí sau clip hiện tại
                    safePosition = otherEndTime;
                }
                
                // Cập nhật vị trí mới
                newStartTime = safePosition;
                console.log(`Đã điều chỉnh vị trí đến ${newStartTime.toFixed(2)}s để tránh va chạm`);
            }
            
            // Cập nhật vị trí và loại của clip
            const oldPosition = clip.startTime;
            clip.startTime = newStartTime;
            
            if (trackType !== clip.type && clip.type === 'video' && trackType === 'audio') {
                // Nếu kéo clip video sang track audio, chuyển thành clip audio
                console.log(`Chuyển clip ${clipId} từ loại video sang audio`);
                clip.type = 'audio';
            }
            
            // Thông báo
            console.log(`Đã di chuyển clip ${clipId} từ ${oldPosition}s đến ${newStartTime}s`);
            
            // Render lại clip
            if (window.TimelineRenderer) {
                window.TimelineRenderer.renderTimelineClips(timeline);
            } else {
                // Fallback nếu TimelineRenderer chưa được tải
                renderTimelineClips(timeline);
            }
        });
    });
    
    console.log('Đã thêm sự kiện kéo thả cho các track');
}

/**
 * Thêm sự kiện cho clip
 */
function addClipEvents(clipElement, clip, timeline) {
    // Sự kiện click
    clipElement.addEventListener('click', (e) => {
        // Bỏ chọn clip khác
        document.querySelectorAll('.timeline-clip.selected').forEach(el => {
            if (el !== clipElement) {
                el.classList.remove('selected');
            }
        });
        
        // Chọn clip này
        clipElement.classList.toggle('selected');
        
        // Cập nhật ID clip đang chọn nếu có
        if (timeline.selectedClipId !== undefined) {
            timeline.selectedClipId = clipElement.classList.contains('selected') ? clip.id : null;
        }
        
        e.stopPropagation();
    });
    
    // Làm cho clip có thể kéo thả
    clipElement.draggable = true;
    
    // Khi bắt đầu kéo
    clipElement.addEventListener('dragstart', (e) => {
        // Lưu ID clip đang kéo
        e.dataTransfer.setData('text/plain', clip.id);
        clipElement.classList.add('dragging');
        
        // Tính toán chính xác điểm bắt đầu kéo để điều chỉnh vị trí thả
        const rect = clipElement.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        e.dataTransfer.setData('offset-x', offsetX.toString());
        
        console.log(`Bắt đầu kéo clip ${clip.id} (${clip.type}), điểm bắt đầu: ${offsetX}px`);
        
        // Thêm hiệu ứng ghost image khi kéo
        const ghostImage = clipElement.cloneNode(true);
        ghostImage.style.width = '100px';
        ghostImage.style.height = '40px';
        ghostImage.style.opacity = '0.7';
        ghostImage.style.position = 'absolute';
        ghostImage.style.top = '-1000px';
        document.body.appendChild(ghostImage);
        
        // Thêm hiệu ứng ghost image và đặt vị trí điểm kéo
        e.dataTransfer.setDragImage(ghostImage, offsetX, 20);
        
        // Xóa ghost image sau khi đã thiết lập
        setTimeout(() => {
            document.body.removeChild(ghostImage);
        }, 0);
    });
    
    // Khi kết thúc kéo
    clipElement.addEventListener('dragend', () => {
        clipElement.classList.remove('dragging');
    });
    
    // Thêm chức năng di chuyển bằng chuột (có thể chọn thay vì dùng drag/drop)
    let isDragging = false;
    let startX = 0;
    let originalLeft = 0;
    
    clipElement.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Chỉ xử lý click chuột trái
        
        // Nếu người dùng đang nhấn Ctrl hoặc Shift thì chỉ chọn không kéo
        if (e.ctrlKey || e.shiftKey) return;
        
        isDragging = true;
        startX = e.clientX;
        originalLeft = parseInt(clipElement.style.left) || 0;
        
        // Thêm lớp CSS cho clip đang kéo
        clipElement.classList.add('moving');
        
        // Chọn clip này
        document.querySelectorAll('.timeline-clip.selected').forEach(el => {
            if (el !== clipElement) el.classList.remove('selected');
        });
        clipElement.classList.add('selected');
        
        // Ngăn chọn văn bản trong quá trình kéo
        e.preventDefault();
        
        // Cập nhật ID clip đang chọn
        if (timeline.selectedClipId !== undefined) {
            timeline.selectedClipId = clip.id;
        }
    });
    
    // Thêm sự kiện khi di chuyển chuột trên toàn tài liệu
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const diffX = e.clientX - startX;
        const newLeft = originalLeft + diffX;
        
        if (newLeft >= 0) {
            clipElement.style.left = `${newLeft}px`;
            
            // Cập nhật vị trí thời gian của clip (nhưng chưa lưu vào dữ liệu)
            const newStartTime = newLeft / timeline.pixelsPerSecond;
            const timeDisplay = document.createElement('div');
            timeDisplay.className = 'time-tooltip';
            timeDisplay.textContent = `${newStartTime.toFixed(2)}s`;
            timeDisplay.style.position = 'absolute';
            timeDisplay.style.bottom = '-20px';
            timeDisplay.style.left = '50%';
            timeDisplay.style.transform = 'translateX(-50%)';
            timeDisplay.style.background = 'black';
            timeDisplay.style.color = 'white';
            timeDisplay.style.padding = '2px 4px';
            timeDisplay.style.borderRadius = '2px';
            timeDisplay.style.fontSize = '10px';
            timeDisplay.style.zIndex = '1000';
            
            // Kiểm tra va chạm khi đang di chuyển
            const newEndTime = newStartTime + clip.duration;
            const hasCollision = timeline.clips.some(otherClip => {
                // Bỏ qua chính clip đang kéo
                if (otherClip.id === clip.id) return false;
                
                // Chỉ kiểm tra clip cùng loại
                if (otherClip.type !== clip.type) return false;
                
                const otherEndTime = otherClip.startTime + otherClip.duration;
                
                // Kiểm tra xem có giao nhau không
                return (newStartTime < otherEndTime && newEndTime > otherClip.startTime);
            });
            
            // Hiển thị cảnh báo nếu có va chạm
            if (hasCollision) {
                timeDisplay.style.backgroundColor = 'rgba(255,0,0,0.8)';
                timeDisplay.textContent += ' ⚠️';
                clipElement.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.7)';
            } else {
                clipElement.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.7)';
            }
            
            // Xóa tooltip cũ nếu có
            const oldTooltip = clipElement.querySelector('.time-tooltip');
            if (oldTooltip) clipElement.removeChild(oldTooltip);
            
            clipElement.appendChild(timeDisplay);
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        
        isDragging = false;
        clipElement.classList.remove('moving');
        
        // Xóa tooltip
        const tooltip = clipElement.querySelector('.time-tooltip');
        if (tooltip) clipElement.removeChild(tooltip);
        
        // Cập nhật vị trí thực tế của clip trong dữ liệu
        const newLeft = parseInt(clipElement.style.left) || 0;
        let newStartTime = Math.max(0, Math.round((newLeft / timeline.pixelsPerSecond) * 10) / 10);
        
        // Kiểm tra va chạm trước khi cập nhật vị trí
        const newEndTime = newStartTime + clip.duration;
        const clipCollision = window.TimelineUtils ? 
            window.TimelineUtils.findClipCollision(clip, newStartTime, timeline.clips) : 
            null;
        
        if (clipCollision) {
            console.warn(`Phát hiện va chạm với clip ${clipCollision.id}, tìm vị trí an toàn...`);
            
            // Tìm vị trí an toàn gần nhất
            const safePosition = window.TimelineUtils ?
                window.TimelineUtils.findSafePosition(clip, timeline.clips) :
                0;
            
            newStartTime = safePosition;
            
            console.log(`Đã điều chỉnh vị trí đến ${newStartTime.toFixed(2)}s để tránh va chạm`);
        }
        
        if (newStartTime !== clip.startTime) {
            clip.startTime = newStartTime;
            console.log(`Đã di chuyển clip ${clip.id} đến vị trí ${newStartTime.toFixed(2)}s`);
            
            // Render lại tất cả clip để đảm bảo tính nhất quán
            if (window.TimelineRenderer) {
                window.TimelineRenderer.renderTimelineClips(timeline);
            } else {
                // Fallback nếu TimelineRenderer chưa được tải
                renderTimelineClips(timeline);
            }
        }
    });
    
    // Xử lý các phím tắt khi clip được chọn
    clipElement.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Xóa clip
            if (window.TimelineUtils) {
                window.TimelineUtils.removeClip(clip.id);
            }
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            // Di chuyển clip sang trái
            clip.startTime = Math.max(0, clip.startTime - 0.1);
            if (window.TimelineRenderer) {
                window.TimelineRenderer.renderTimelineClips(timeline);
            }
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            // Di chuyển clip sang phải
            clip.startTime += 0.1;
            if (window.TimelineRenderer) {
                window.TimelineRenderer.renderTimelineClips(timeline);
            }
            e.preventDefault();
        } else if (e.key === 'ArrowUp' && e.ctrlKey) {
            // Di chuyển clip lên track trên (nếu có thể)
            if (clip.type === 'audio' && timeline.clips.some(c => c.id === clip.id)) {
                clip.type = 'video';
                if (window.TimelineRenderer) {
                    window.TimelineRenderer.renderTimelineClips(timeline);
                }
                e.preventDefault();
            }
        } else if (e.key === 'ArrowDown' && e.ctrlKey) {
            // Di chuyển clip xuống track dưới (nếu có thể)
            if (clip.type === 'video' && timeline.clips.some(c => c.id === clip.id)) {
                clip.type = 'audio';
                if (window.TimelineRenderer) {
                    window.TimelineRenderer.renderTimelineClips(timeline);
                }
                e.preventDefault();
            }
        }
    });
    
    // Cho phép clip có thể focus để nhận sự kiện keyboard
    clipElement.setAttribute('tabindex', '0');
    
    // Thêm tooltip hiển thị thời gian khi hover
    clipElement.addEventListener('mouseenter', () => {
        const timeTooltip = document.createElement('div');
        timeTooltip.className = 'time-tooltip';
        timeTooltip.textContent = `${clip.startTime.toFixed(2)}s - ${(clip.startTime + clip.duration).toFixed(2)}s`;
        timeTooltip.style.position = 'absolute';
        timeTooltip.style.bottom = '-20px';
        timeTooltip.style.left = '50%';
        timeTooltip.style.transform = 'translateX(-50%)';
        timeTooltip.style.background = 'rgba(0,0,0,0.8)';
        timeTooltip.style.color = 'white';
        timeTooltip.style.padding = '2px 4px';
        timeTooltip.style.borderRadius = '2px';
        timeTooltip.style.fontSize = '10px';
        timeTooltip.style.whiteSpace = 'nowrap';
        clipElement.appendChild(timeTooltip);
    });
    
    clipElement.addEventListener('mouseleave', () => {
        const tooltip = clipElement.querySelector('.time-tooltip');
        if (tooltip) clipElement.removeChild(tooltip);
    });
}

// Export các hàm để có thể sử dụng từ module khác
window.TimelineDragDrop = {
    addDragDropEvents,
    addClipEvents
}; 