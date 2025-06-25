/**
 * TimelineUtil.js - Các tiện ích và hàm trợ giúp
 */

/**
 * Gắn các sự kiện chung
 */
export function bindCommonEvents(timeline) {
    // Zoom in
    const zoomInBtn = document.getElementById('timeline-zoom-in');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (timeline.zoom) {
                timeline.zoom(1.2);
            }
        });
    }
    
    // Zoom out
    const zoomOutBtn = document.getElementById('timeline-zoom-out');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (timeline.zoom) {
                timeline.zoom(0.8);
            }
        });
    }
    
    // Sự kiện cập nhật clip
    document.getElementById('apply-clip-changes')?.addEventListener('click', () => {
        if (!timeline.selectedClipId) return;
        
        const duration = parseFloat(document.getElementById('clip-duration').value);
        const startTime = parseFloat(document.getElementById('clip-start-time').value);
        const transition = document.getElementById('clip-transition').value;
        
        if (timeline.updateClip) {
            timeline.updateClip(timeline.selectedClipId, { duration, startTime, transition });
        }
    });
}

/**
 * Ghi đè các phương thức trên đối tượng timeline
 */
export function applyMixins(timeline, modules) {
    // Gắn các phương thức từ các module vào đối tượng timeline
    Object.keys(modules).forEach(key => {
        timeline[key] = modules[key].bind(null, timeline);
    });
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

/**
 * Deep clone một đối tượng
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Tạo ID ngẫu nhiên duy nhất
 */
export function generateUniqueId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
} 