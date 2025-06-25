/**
 * RenderFix.js - Khắc phục vấn đề hiển thị timeline
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('RenderFix loaded');
    
    // Kiểm tra và khắc phục định kỳ
    setInterval(checkAndFixTimelineRendering, 1000);
    
    // Khắc phục ban đầu sau 1 giây
    setTimeout(fixInitialRendering, 1000);
    
    // Thêm sự kiện kéo thả cho các track
    setTimeout(addDragDropEvents, 1500);
});

/**
 * Khắc phục vấn đề ban đầu
 */
function fixInitialRendering() {
    // Đảm bảo các phần tử cơ bản tồn tại
    ensureTimelineElements();
    
    // Khắc phục các vấn đề rendering
    if (window.videoEditor && window.videoEditor.timeline) {
        // Cải thiện hiển thị clip bằng cách thêm CSS nếu cần
        addMissingCss();
        
        // Thêm mã tạo clip thật
        if (window.videoEditor.timeline.clips && 
            window.videoEditor.timeline.clips.length > 0) {
            
            renderTimelineClips();
        }
        
        // Thông báo
        console.log('Đã áp dụng khắc phục ban đầu cho timeline');
    }
}

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
            renderTimelineClips();
        });
    });
    
    console.log('Đã thêm sự kiện kéo thả cho các track');
}

/**
 * Render các clip lên timeline (khắc phục cho renderClips)
 */
function renderTimelineClips() {
    const timeline = window.videoEditor.timeline;
    if (!timeline || !timeline.clips || timeline.clips.length === 0) {
        return;
    }
    
    // Xóa clip cũ trên tất cả các track nếu có
    document.querySelectorAll('.timeline-clip').forEach(el => {
        el.remove();
    });
    
    // Lấy các track container
    const videoTrack = document.getElementById('video-track');
    const audioTrack = document.getElementById('audio-track');
    const textTrack = document.getElementById('text-track');
    
    if (!videoTrack || !audioTrack || !textTrack) {
        console.error("Không tìm thấy các track container");
        return;
    }
    
    // Render từng clip
    timeline.clips.forEach(clip => {
        // Xác định track phù hợp
        let trackElement;
        let clipClass = 'timeline-clip';
        
        switch (clip.type) {
            case 'video':
                trackElement = videoTrack;
                clipClass += ' video-clip';
                break;
            case 'audio':
                trackElement = audioTrack;
                clipClass += ' audio-clip';
                break;
            case 'text':
                trackElement = textTrack;
                clipClass += ' text-clip';
                break;
            default:
                console.warn(`Loại clip không hợp lệ: ${clip.type}`);
                return;
        }
        
        // Tạo element cho clip
        const clipElement = document.createElement('div');
        clipElement.className = clipClass;
        clipElement.dataset.clipId = clip.id;
        clipElement.style.position = 'absolute';
        clipElement.style.height = '80%';
        clipElement.style.top = '10%';
        
        // Vị trí và kích thước
        const startPos = clip.startTime * timeline.pixelsPerSecond;
        const width = clip.duration * timeline.pixelsPerSecond;
        
        clipElement.style.left = `${startPos}px`;
        clipElement.style.width = `${width}px`;
        
        // Màu sắc và viền
        if (clip.type === 'video') {
            clipElement.style.backgroundColor = '#4285f4'; // Xanh dương cho video
            
            // Thêm thumbnail nếu có
            if (clip.imagePath) {
                clipElement.style.backgroundImage = `url('${clip.imagePath}')`;
                clipElement.style.backgroundSize = 'cover';
                clipElement.style.backgroundPosition = 'center';
            }
        } else if (clip.type === 'audio') {
            clipElement.style.backgroundColor = '#34a853'; // Xanh lá cho audio
        } else {
            clipElement.style.backgroundColor = '#fbbc05'; // Vàng cho text
        }
        
        clipElement.style.borderRadius = '3px';
        clipElement.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
        
        // Thêm tên clip
        const clipName = document.createElement('div');
        clipName.className = 'clip-name';
        clipName.textContent = clip.name || clip.id;
        clipName.style.color = 'white';
        clipName.style.fontSize = '12px';
        clipName.style.padding = '4px';
        clipName.style.overflow = 'hidden';
        clipName.style.textOverflow = 'ellipsis';
        clipName.style.whiteSpace = 'nowrap';
        clipName.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
        clipElement.appendChild(clipName);
        
        // Thêm vào track
        trackElement.appendChild(clipElement);
        
        // Thêm sự kiện cho clip
        addClipEvents(clipElement, clip, timeline);
    });
    
    console.log(`Đã render ${timeline.clips.length} clips lên giao diện`);
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
        const clipCollision = findClipCollision(clip, newStartTime, timeline.clips);
        
        if (clipCollision) {
            console.warn(`Phát hiện va chạm với clip ${clipCollision.id}, tìm vị trí an toàn...`);
            
            // Tìm vị trí an toàn gần nhất
            const safePosition = findSafePosition(clip, timeline.clips);
            newStartTime = safePosition;
            
            console.log(`Đã điều chỉnh vị trí đến ${newStartTime.toFixed(2)}s để tránh va chạm`);
        }
        
        if (newStartTime !== clip.startTime) {
            clip.startTime = newStartTime;
            console.log(`Đã di chuyển clip ${clip.id} đến vị trí ${newStartTime.toFixed(2)}s`);
            
            // Render lại tất cả clip để đảm bảo tính nhất quán
            renderTimelineClips();
        }
    });
    
    // Xử lý các phím tắt khi clip được chọn
    clipElement.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Xóa clip
            removeClip(clip.id);
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            // Di chuyển clip sang trái
            clip.startTime = Math.max(0, clip.startTime - 0.1);
            renderTimelineClips();
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            // Di chuyển clip sang phải
            clip.startTime += 0.1;
            renderTimelineClips();
            e.preventDefault();
        } else if (e.key === 'ArrowUp' && e.ctrlKey) {
            // Di chuyển clip lên track trên (nếu có thể)
            if (clip.type === 'audio' && timeline.clips.some(c => c.id === clip.id)) {
                clip.type = 'video';
                renderTimelineClips();
                e.preventDefault();
            }
        } else if (e.key === 'ArrowDown' && e.ctrlKey) {
            // Di chuyển clip xuống track dưới (nếu có thể)
            if (clip.type === 'video' && timeline.clips.some(c => c.id === clip.id)) {
                clip.type = 'audio';
                renderTimelineClips();
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

/**
 * Xóa clip khỏi timeline
 */
function removeClip(clipId) {
    const timeline = window.videoEditor?.timeline;
    if (!timeline) return;
    
    const index = timeline.clips.findIndex(c => c.id === clipId);
    if (index === -1) return;
    
    console.log(`Xóa clip ${clipId} khỏi timeline`);
    timeline.clips.splice(index, 1);
    
    // Cập nhật timeline
    if (typeof timeline.updateTimelineDuration === 'function') {
        timeline.updateTimelineDuration();
    }
    
    // Render lại
    renderTimelineClips();
}

/**
 * Kiểm tra và khắc phục vấn đề hiển thị timeline
 */
function checkAndFixTimelineRendering() {
    if (!window.videoEditor || !window.videoEditor.timeline) return;
    
    const timeline = window.videoEditor.timeline;
    
    // Kiểm tra các clip đã được hiển thị chưa
    if (timeline.clips && timeline.clips.length > 0) {
        const renderedClips = document.querySelectorAll('.timeline-clip');
        if (renderedClips.length === 0) {
            console.warn('Phát hiện vấn đề: Có clips trong timeline nhưng không hiển thị trên track');
            
            // Gọi hàm render clip từ RenderFix
            renderTimelineClips();
        }
    }
    
    // Kiểm tra các track
    const videoTrack = document.getElementById('video-track');
    const audioTrack = document.getElementById('audio-track');
    
    if (!videoTrack || !audioTrack) {
        console.warn('Phát hiện vấn đề: Thiếu các track timeline');
        
        // Thử tạo lại tracks
        if (timeline.createTracks) {
            console.log('Đang tạo lại tracks...');
            timeline.createTracks();
            
            // Render lại clips sau khi tạo tracks
            setTimeout(renderTimelineClips, 100);
        }
    }
}

/**
 * Đảm bảo các phần tử cơ bản của timeline tồn tại
 */
function ensureTimelineElements() {
    // Kiểm tra container chính
    const timelineContainer = document.getElementById('timeline-container');
    if (!timelineContainer) {
        console.error('Không tìm thấy timeline-container');
        return;
    }
    
    // Kiểm tra tracks container
    let tracksContainer = document.getElementById('timeline-tracks');
    if (!tracksContainer) {
        console.log('Tạo mới tracks container');
        tracksContainer = document.createElement('div');
        tracksContainer.id = 'timeline-tracks';
        tracksContainer.className = 'timeline-tracks';
        timelineContainer.appendChild(tracksContainer);
    }
    
    // Kiểm tra ruler
    let ruler = document.getElementById('timeline-ruler');
    if (!ruler) {
        console.log('Tạo mới timeline ruler');
        const rulerContainer = document.createElement('div');
        rulerContainer.className = 'd-flex align-items-center mb-2';
        
        const zoomOut = document.createElement('button');
        zoomOut.id = 'timeline-zoom-out';
        zoomOut.className = 'btn btn-sm btn-outline-secondary me-2';
        zoomOut.innerHTML = '<i class="bi bi-zoom-out"></i>';
        
        ruler = document.createElement('div');
        ruler.id = 'timeline-ruler';
        ruler.className = 'timeline-ruler flex-grow-1 position-relative';
        
        const zoomIn = document.createElement('button');
        zoomIn.id = 'timeline-zoom-in';
        zoomIn.className = 'btn btn-sm btn-outline-secondary ms-2';
        zoomIn.innerHTML = '<i class="bi bi-zoom-in"></i>';
        
        rulerContainer.appendChild(zoomOut);
        rulerContainer.appendChild(ruler);
        rulerContainer.appendChild(zoomIn);
        
        timelineContainer.insertBefore(rulerContainer, tracksContainer);
    }
    
    // Kiểm tra playhead
    let playhead = document.getElementById('timeline-playhead');
    if (!playhead) {
        console.log('Tạo mới timeline playhead');
        playhead = document.createElement('div');
        playhead.id = 'timeline-playhead';
        playhead.className = 'timeline-playhead';
        playhead.style.position = 'absolute';
        playhead.style.width = '2px';
        playhead.style.backgroundColor = 'red';
        playhead.style.height = '100%';
        playhead.style.top = '0';
        playhead.style.left = '0';
        playhead.style.pointerEvents = 'none';
        playhead.style.zIndex = '200';
        
        timelineContainer.appendChild(playhead);
    }
}

/**
 * Thêm CSS cần thiết nếu thiếu
 */
function addMissingCss() {
    // Kiểm tra xem có CSS cho timeline-tracks không
    const styles = document.styleSheets;
    let timelineTracksStyleExists = false;
    
    for (let i = 0; i < styles.length; i++) {
        try {
            const rules = styles[i].cssRules || styles[i].rules;
            for (let j = 0; j < rules.length; j++) {
                if (rules[j].selectorText && rules[j].selectorText.includes('.timeline-tracks')) {
                    timelineTracksStyleExists = true;
                    break;
                }
            }
            if (timelineTracksStyleExists) break;
        } catch (e) {
            // Có thể xảy ra lỗi khi truy cập cssRules của stylesheet từ nguồn khác
            continue;
        }
    }
    
    // Nếu không có style cho timeline-tracks, thêm mới
    if (!timelineTracksStyleExists) {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .timeline-tracks {
                position: relative;
                min-height: 150px;
                border: 1px solid #666;
                border-radius: 4px;
                background-color: #333;
                overflow-x: auto;
                overflow-y: hidden;
                margin-bottom: 10px;
            }
            
            .timeline-track {
                position: relative;
                width: 100%;
                min-height: 40px;
                margin-bottom: 1px;
            }
            
            .timeline-clip {
                position: absolute;
                top: 5%;
                height: 90%;
                background-color: #4285f4;
                border-radius: 3px;
                cursor: pointer;
                overflow: hidden;
                border: 1px solid white;
                z-index: 50;
            }
            
            .timeline-clip.selected {
                box-shadow: 0 0 0 2px #fff, 0 0 3px 3px rgba(255, 255, 255, 0.5);
                z-index: 55;
            }
            
            .timeline-clip.dragging {
                opacity: 0.7;
                z-index: 60;
            }
            
            .timeline-clip.moving {
                opacity: 0.8;
                z-index: 65;
                cursor: move;
                box-shadow: 0 0 10px rgba(255, 255, 255, 0.7);
                transition: box-shadow 0.1s;
            }
            
            .timeline-track.dragover {
                background-color: rgba(255,255,255,0.1);
            }
            
            .track-label {
                position: absolute;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
                padding: 2px 5px;
                color: white;
                font-size: 12px;
                background-color: rgba(0, 0, 0, 0.5);
                border-radius: 3px;
                z-index: 10;
                pointer-events: none;
            }
            
            .clip-label {
                padding: 5px;
                font-size: 12px;
                color: white;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                background-color: rgba(0,0,0,0.6);
            }
            
            .timeline-ruler {
                height: 30px;
                position: relative;
                background-color: #333;
                border-bottom: 1px solid #555;
            }
            
            .timeline-playhead {
                position: absolute;
                width: 2px;
                background-color: red;
                height: 100%;
                top: 0;
                left: 0;
                pointer-events: none;
                z-index: 200;
            }
            
            .video-clip {
                background-color: #4285f4;
            }
            
            .audio-clip {
                background-color: #34a853;
            }
            
            .text-clip {
                background-color: #fbbc05;
            }
        `;
        document.head.appendChild(styleElement);
        console.log('Đã thêm CSS thiếu cho timeline');
    }
}

/**
 * Tìm clip có va chạm
 */
function findClipCollision(currentClip, newStartTime, allClips) {
    const newEndTime = newStartTime + currentClip.duration;
    
    // Tìm clip đầu tiên va chạm với vị trí mới
    return allClips.find(otherClip => {
        // Bỏ qua chính clip đang kiểm tra
        if (otherClip.id === currentClip.id) return false;
        
        // Chỉ kiểm tra clip cùng loại
        if (otherClip.type !== currentClip.type) return false;
        
        const otherEndTime = otherClip.startTime + otherClip.duration;
        
        // Kiểm tra xem có giao nhau không
        return (newStartTime < otherEndTime && newEndTime > otherClip.startTime);
    });
}

/**
 * Tìm vị trí an toàn để đặt clip
 */
function findSafePosition(clip, allClips) {
    // Lấy các clip cùng loại, trừ chính clip đang xét
    const clipsOnSameTrack = allClips.filter(c => 
        c.id !== clip.id && c.type === clip.type
    );
    
    // Sắp xếp theo thứ tự thời gian
    clipsOnSameTrack.sort((a, b) => a.startTime - b.startTime);
    
    // Nếu không có clip nào khác, trả về vị trí 0
    if (clipsOnSameTrack.length === 0) return 0;
    
    // Kiểm tra nếu có thể đặt vào vị trí 0
    if (clipsOnSameTrack[0].startTime >= clip.duration) {
        return 0;
    }
    
    // Tìm khoảng trống giữa các clip
    for (let i = 0; i < clipsOnSameTrack.length - 1; i++) {
        const currentClip = clipsOnSameTrack[i];
        const nextClip = clipsOnSameTrack[i + 1];
        
        const gapStart = currentClip.startTime + currentClip.duration;
        const gapEnd = nextClip.startTime;
        const gapSize = gapEnd - gapStart;
        
        // Nếu khoảng trống đủ lớn cho clip
        if (gapSize >= clip.duration) {
            return gapStart;
        }
    }
    
    // Nếu không có khoảng trống phù hợp, đặt vào cuối
    const lastClip = clipsOnSameTrack[clipsOnSameTrack.length - 1];
    return lastClip.startTime + lastClip.duration;
} 