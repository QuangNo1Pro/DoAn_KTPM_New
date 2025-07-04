/**
 * TimelineUI.js - Xử lý giao diện người dùng và các sự kiện
 */
export function initializeUI(timeline) {
    // Tạo thước đo thời gian
    updateRuler(timeline);
    
    // Tạo các track cho timeline
    createTracks(timeline);
    
    // Đặt vị trí playhead ban đầu
    updatePlayhead(timeline);
}

/**
 * Cập nhật thước đo thời gian
 */
export function updateRuler(timeline) {
    if (!timeline.ruler) return;
    
    // Ẩn thước đo thời gian hoàn toàn
    timeline.ruler.style.display = 'none';
    
    // Tính toán tổng chiều rộng
    const totalWidth = timeline.duration * timeline.pixelsPerSecond;
    timeline.ruler.style.width = `${totalWidth}px`;
}

/**
 * Tạo các track cho timeline
 */
export function createTracks(timeline) {
    if (!timeline.tracksContainer) {
        console.error("Không tìm thấy container cho tracks");
        return;
    }
    
    console.log("Tạo các track cho timeline");
    
    // Xóa các track cũ
    timeline.tracksContainer.innerHTML = '';
    
    // Tính toán tổng chiều rộng dựa trên thời lượng và tỷ lệ pixel/giây
    const totalWidth = Math.max(800, timeline.duration * timeline.pixelsPerSecond);
    
    // Track cho video
    const videoTrack = document.createElement('div');
    videoTrack.className = 'timeline-track video-track';
    videoTrack.id = 'video-track';
    videoTrack.style.height = '60px';
    videoTrack.style.width = `${totalWidth}px`;
    videoTrack.style.position = 'relative';
    videoTrack.style.backgroundColor = '#2d2d2d';
    videoTrack.style.borderBottom = '1px solid #444';
    videoTrack.dataset.trackType = 'video';
    
    // Thêm label cho track
    const videoLabel = document.createElement('div');
    videoLabel.textContent = 'Video';
    videoLabel.className = 'track-label';
    videoTrack.appendChild(videoLabel);
    
    // Track cho audio
    const audioTrack = document.createElement('div');
    audioTrack.className = 'timeline-track audio-track';
    audioTrack.id = 'audio-track';
    audioTrack.style.height = '40px';
    audioTrack.style.width = `${totalWidth}px`;
    audioTrack.style.position = 'relative';
    audioTrack.style.backgroundColor = '#252525';
    audioTrack.style.borderBottom = '1px solid #444';
    audioTrack.dataset.trackType = 'audio';
    
    // Thêm label cho track
    const audioLabel = document.createElement('div');
    audioLabel.textContent = 'Audio';
    audioLabel.className = 'track-label';
    audioTrack.appendChild(audioLabel);
    
    // Track cho text
    const textTrack = document.createElement('div');
    textTrack.className = 'timeline-track text-track';
    textTrack.id = 'text-track';
    textTrack.style.height = '40px';
    textTrack.style.width = `${totalWidth}px`;
    textTrack.style.position = 'relative';
    textTrack.style.backgroundColor = '#2d2d2d';
    textTrack.dataset.trackType = 'text';
    
    // Thêm label cho track
    const textLabel = document.createElement('div');
    textLabel.textContent = 'Text';
    textLabel.className = 'track-label';
    textTrack.appendChild(textLabel);
    
    // Thêm vào container
    timeline.tracksContainer.appendChild(videoTrack);
    timeline.tracksContainer.appendChild(audioTrack);
    timeline.tracksContainer.appendChild(textTrack);
    
    console.log("Đã thêm tracks: video, audio, text");
    
    // Thêm đường kẻ dọc cho mỗi mốc thời gian chính
    for (let i = 0; i <= timeline.duration; i += 5) {
        if (i === 0) continue; // Bỏ qua mốc 0s
        
        const timeLine = document.createElement('div');
        timeLine.style.position = 'absolute';
        timeLine.style.left = `${i * timeline.pixelsPerSecond}px`;
        timeLine.style.top = '0';
        timeLine.style.width = '1px';
        timeLine.style.height = '100%';
        timeLine.style.backgroundColor = i % 10 === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)';
        timeLine.style.pointerEvents = 'none';
        timeLine.style.zIndex = '1';
        
        // Thêm vào từng track
        videoTrack.appendChild(timeLine.cloneNode(true));
        audioTrack.appendChild(timeLine.cloneNode(true));
        textTrack.appendChild(timeLine.cloneNode(true));
    }
    
    // Thêm debug info
    console.log(`Đã tạo tracks với độ rộng: ${totalWidth}px`);
    
    return {
        videoTrack,
        audioTrack,
        textTrack
    };
}

/**
 * Cập nhật vị trí của playhead
 */
export function updatePlayhead(timeline) {
    if (!timeline.playhead) return;
    
    // Tính toán vị trí của playhead dựa trên thời gian hiện tại
    const position = timeline.currentTime * timeline.pixelsPerSecond;
    
    // Cập nhật vị trí của playhead
    timeline.playhead.style.left = `${position}px`;
    
    // Tự động cuộn theo playhead nếu bật chế độ autoScroll
    if (timeline.options.autoScroll && timeline.isPlaying) {
        // Lấy vị trí của container
        const containerRect = timeline.container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        
        // Kiểm tra nếu playhead đã đi ra ngoài vùng nhìn thấy
        if (position > timeline.container.scrollLeft + containerWidth * 0.8) {
            // Cuộn để playhead nằm ở khoảng 1/3 của khung nhìn
            timeline.container.scrollLeft = position - containerWidth / 3;
        } else if (position < timeline.container.scrollLeft + containerWidth * 0.2) {
            // Cuộn về trước nếu playhead quá gần mép trái
            timeline.container.scrollLeft = Math.max(0, position - containerWidth / 3);
        }
    }
    
    // Không xử lý việc dừng phát ở đây, để cho TimelinePlayback.js xử lý
    // Điều này giúp tránh việc dừng phát khi kéo clip qua bên phải
}

/**
 * Cập nhật các hiển thị thời gian
 */
export function updateTimeDisplays(timeline) {
    // Cập nhật hiển thị thời gian hiện tại
    const currentTimeElement = document.getElementById('timeline-current-time');
    if (currentTimeElement) {
        currentTimeElement.textContent = formatTimeDetailed(timeline.currentTime);
    }
    
    // Cập nhật hiển thị thời lượng
    const durationElement = document.getElementById('timeline-duration');
    if (durationElement) {
        durationElement.textContent = formatTimeDetailed(timeline.duration);
    }
    
    // Cập nhật thanh seek
    const seekBar = document.getElementById('timeline-seek');
    if (seekBar) {
        seekBar.max = timeline.duration;
        seekBar.value = timeline.currentTime;
    }
}

/**
 * Hiển thị editor cho clip đang chọn
 */
export function showClipEditor(timeline) {
    const clipEditor = document.getElementById('clip-editor');
    if (!clipEditor) return;
    
    const selectedClip = timeline.clips.find(clip => clip.id === timeline.selectedClipId);
    
    if (selectedClip) {
        document.getElementById('clip-duration').value = selectedClip.duration;
        document.getElementById('clip-start-time').value = selectedClip.startTime;
        document.getElementById('clip-transition').value = selectedClip.transition || 'none';
        
        clipEditor.classList.remove('d-none');
    } else {
        clipEditor.classList.add('d-none');
    }
}

/**
 * Ẩn editor clip
 */
export function hideClipEditor() {
    const clipEditor = document.getElementById('clip-editor');
    if (clipEditor) {
        clipEditor.classList.add('d-none');
    }
}

/**
 * Format thời gian thành chuỗi mm:ss
 */
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format thời gian với chi tiết hơn (mm:ss.ms)
 */
export function formatTimeDetailed(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
} 