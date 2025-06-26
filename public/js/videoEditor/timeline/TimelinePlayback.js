/**
 * TimelinePlayback.js - Xử lý phát/dừng video trong timeline
 */
import { updatePlayhead, updateTimeDisplays } from './TimelineUI.js';

/**
 * Thiết lập thời gian hiện tại
 */
export function setCurrentTime(timeline, time) {
    // Đảm bảo thời gian không vượt quá thời lượng tổng thể
    timeline.currentTime = Math.max(0, Math.min(time, timeline.duration));
    updatePlayhead(timeline);
    
    // Cập nhật hiển thị thời gian
    updateTimeDisplays(timeline);
    
    // Gọi callback (nếu có)
    if (typeof timeline.options.onTimeUpdate === 'function') {
        timeline.options.onTimeUpdate(timeline.currentTime);
    }
}

/**
 * Bắt đầu phát preview
 */
export function play(timeline) {
    if (timeline.isPlaying) return;
    
    // Nếu đã ở cuối, quay về đầu
    if (timeline.currentTime >= timeline.duration) {
        setCurrentTime(timeline, 0);
    }
    
    timeline.isPlaying = true;
    const startTime = performance.now() - (timeline.currentTime * 1000);
    
    const updatePlayback = (timestamp) => {
        if (!timeline.isPlaying) return;
        
        const elapsedSeconds = (timestamp - startTime) / 1000;
        
        // Lấy thời lượng hiện tại của timeline - QUAN TRỌNG
        // Điều này đảm bảo chúng ta luôn sử dụng thời lượng mới nhất sau khi kéo clip
        const currentDuration = timeline.duration;
        
        // Kiểm tra nếu đã đến cuối timeline
        if (elapsedSeconds >= currentDuration) {
            console.log(`Phát hết: elapsedSeconds=${elapsedSeconds}, duration=${currentDuration}`);
            setCurrentTime(timeline, currentDuration);
            timeline.isPlaying = false;
            
            // Cập nhật UI nút phát/dừng
            const togglePlayBtn = document.getElementById('timeline-toggle-play');
            if (togglePlayBtn) {
                togglePlayBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
            }
            
            // Gửi sự kiện khi phát hết
            const event = new CustomEvent('timelineEnded');
            timeline.container.dispatchEvent(event);
            return;
        }
        
        setCurrentTime(timeline, elapsedSeconds);
        
        // Tiếp tục vòng lặp phát nếu chưa kết thúc
        if (timeline.isPlaying) {
            timeline.playbackTimer = requestAnimationFrame(updatePlayback);
        }
    };
    
    timeline.playbackTimer = requestAnimationFrame(updatePlayback);
}

/**
 * Dừng phát preview
 */
export function pause(timeline) {
    timeline.isPlaying = false;
    
    if (timeline.playbackTimer) {
        cancelAnimationFrame(timeline.playbackTimer);
        timeline.playbackTimer = null;
    }
}

/**
 * Gắn các sự kiện phát/dừng
 */
export function bindPlaybackEvents(timeline) {
    // Sự kiện thanh tìm kiếm thời gian (timeline seek)
    const seekBar = document.getElementById('timeline-seek');
    if (seekBar) {
        seekBar.addEventListener('input', () => {
            setCurrentTime(timeline, parseFloat(seekBar.value));
        });
    }
    
    // Sự kiện nút phát/dừng
    const togglePlayBtn = document.getElementById('timeline-toggle-play');
    if (togglePlayBtn) {
        togglePlayBtn.addEventListener('click', () => {
            if (timeline.isPlaying) {
                pause(timeline);
                togglePlayBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
            } else {
                play(timeline);
                togglePlayBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
            }
        });
    }
    
    // Click vào ruler để thay đổi thời gian
    if (timeline.ruler) {
        timeline.ruler.addEventListener('click', (e) => {
            const rect = timeline.ruler.getBoundingClientRect();
            const clickPosition = e.clientX - rect.left;
            const time = clickPosition / timeline.pixelsPerSecond;
            
            setCurrentTime(timeline, time);
        });
    }
    
    // Cập nhật ban đầu cho hiển thị thời gian
    updateTimeDisplays(timeline);
}

/**
 * Zoom timeline
 */
export function zoom(timeline, factor) {
    const minZoom = timeline.options.minZoom || 50;
    const maxZoom = timeline.options.maxZoom || 300;
    const newZoom = timeline.pixelsPerSecond * factor;
    
    // Giới hạn mức zoom
    if (newZoom >= minZoom && newZoom <= maxZoom) {
        timeline.pixelsPerSecond = newZoom;
        
        // Cập nhật UI
        if (timeline.updateRuler) {
            timeline.updateRuler();
            timeline.createTracks();
            timeline.renderClips();
            timeline.updatePlayhead();
        }
    }
}