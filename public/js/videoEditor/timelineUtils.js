/**
 * timelineUtils.js - Các hàm tiện ích cho timeline
 */

/**
 * Tìm clip có va chạm
 * @param {Object} currentClip - Clip hiện tại
 * @param {Number} newStartTime - Thời gian bắt đầu mới
 * @param {Array} allClips - Tất cả các clip
 * @returns {Object|null} Clip bị va chạm hoặc null nếu không có va chạm
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
 * @param {Object} clip - Clip cần tìm vị trí
 * @param {Array} allClips - Tất cả các clip
 * @returns {Number} Vị trí thời gian an toàn
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

/**
 * Xóa clip khỏi timeline
 * @param {String} clipId - ID của clip cần xóa
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
    if (window.TimelineRenderer && window.TimelineRenderer.renderTimelineClips) {
        window.TimelineRenderer.renderTimelineClips(timeline);
    }
}

// Export các hàm để có thể sử dụng từ module khác
window.TimelineUtils = {
    findClipCollision,
    findSafePosition,
    removeClip
}; 