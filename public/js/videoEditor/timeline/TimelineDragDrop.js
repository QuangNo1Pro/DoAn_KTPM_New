/**
 * TimelineDragDrop.js - Chức năng kéo thả cho timeline
 */
import { renderClips, updateClipsList } from './TimelineClips.js';

/**
 * Thêm chức năng kéo thả cho timeline
 */
export function initializeDragDrop(timeline) {
    // Thêm sự kiện kéo thả cho các clip trên timeline
    addDragDropEventsToClips(timeline);
    
    // Thêm sự kiện kéo thả cho các track
    const tracks = document.querySelectorAll('.timeline-track');
    tracks.forEach(track => {
        addDropEventsToTrack(timeline, track, track.dataset.trackType);
    });
    
    // Thêm chức năng kéo thả cho danh sách clip
    addDragDropEventsToClipsList(timeline);
}

/**
 * Thêm sự kiện kéo thả cho các clip đã render
 */
export function addDragDropEventsToClips(timeline) {
    const clipElements = document.querySelectorAll('.timeline-clip');
    
    clipElements.forEach(clipElement => {
        const clipId = clipElement.dataset.clipId;
        
        clipElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', clipId);
            e.dataTransfer.effectAllowed = 'move';
            clipElement.style.opacity = '0.5';
            clipElement.classList.add('dragging');
            
            // Chọn clip khi bắt đầu kéo
            if (timeline.selectClip) {
                timeline.selectClip(clipId);
            }
        });
        
        clipElement.addEventListener('dragend', (e) => {
            clipElement.style.opacity = '1';
            clipElement.classList.remove('dragging');
        });
    });
}

/**
 * Thêm sự kiện kéo thả vào track
 */
export function addDropEventsToTrack(timeline, track, trackType) {
    track.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        track.classList.add('drag-over');
        
        // Hiển thị vị trí có thể thả
        const rect = track.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const snapTime = getSnappedTimeFromPosition(timeline, mouseX);
        
        // Hiển thị vạch chỉ vị trí drop
        showDropPosition(timeline, track, mouseX);
    });
    
    track.addEventListener('dragleave', () => {
        track.classList.remove('drag-over');
        // Xóa vạch chỉ vị trí drop
        hideDropPosition();
    });
    
    track.addEventListener('drop', (e) => {
        e.preventDefault();
        track.classList.remove('drag-over');
        hideDropPosition();
        
        const clipId = e.dataTransfer.getData('text/plain');
        if (!clipId) return;
        
        const rect = track.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const dropTime = getSnappedTimeFromPosition(timeline, mouseX);
        
        // Di chuyển clip đến vị trí mới
        moveClipToPosition(timeline, clipId, trackType, dropTime);
    });
}

/**
 * Thêm chức năng kéo thả vào danh sách clips
 */
export function addDragDropEventsToClipsList(timeline) {
    const clipsList = document.getElementById('clips-list');
    if (!clipsList) return;
    
    clipsList.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Tìm phần tử gần nhất có thể thả
        const closestItem = findClosestDropTarget(e.clientY, clipsList);
        
        // Làm nổi bật vị trí có thể thả
        highlightDropTarget(closestItem);
    });
    
    clipsList.addEventListener('dragleave', () => {
        // Xóa vùng highlight
        removeDropTargetHighlight();
    });
    
    clipsList.addEventListener('drop', (e) => {
        e.preventDefault();
        removeDropTargetHighlight();
        
        const clipId = e.dataTransfer.getData('text/plain');
        if (!clipId) return;
        
        // Tìm phần tử gần nhất có thể thả
        const closestItem = findClosestDropTarget(e.clientY, clipsList);
        if (!closestItem) return;
        
        // Lấy ID của clip đích
        const targetClipId = closestItem.dataset.clipId;
        if (targetClipId === clipId) return; // Không di chuyển đến chính nó
        
        // Tìm chỉ số của clip cần di chuyển và clip đích
        const sourceIndex = timeline.clips.findIndex(clip => clip.id === clipId);
        const targetIndex = timeline.clips.findIndex(clip => clip.id === targetClipId);
        
        // Di chuyển clip trong danh sách
        if (sourceIndex !== -1 && targetIndex !== -1) {
            const [movedClip] = timeline.clips.splice(sourceIndex, 1);
            timeline.clips.splice(targetIndex, 0, movedClip);
            
            // Sắp xếp lại startTime của các clip
            reorderClipsStartTimes(timeline);
            
            // Render lại
            renderClips(timeline);
            updateClipsList(timeline);
            
            timeline.addDebugBox(`Đã di chuyển clip ${clipId} đến vị trí mới trong danh sách`);
        }
    });
    
    // Thêm sự kiện kéo thả cho từng mục trong danh sách
    const clipItems = clipsList.querySelectorAll('.list-group-item');
    clipItems.forEach(item => {
        const clipId = item.dataset.clipId;
        
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', clipId);
            e.dataTransfer.effectAllowed = 'move';
            item.style.opacity = '0.5';
            item.classList.add('dragging');
            
            // Chọn clip khi bắt đầu kéo
            if (timeline.selectClip) {
                timeline.selectClip(clipId);
            }
        });
        
        item.addEventListener('dragend', () => {
            item.style.opacity = '1';
            item.classList.remove('dragging');
        });
    });
}

/**
 * Hiển thị vạch chỉ vị trí drop
 */
export function showDropPosition(timeline, track, positionX) {
    // Tạo hoặc cập nhật vạch chỉ vị trí
    let dropIndicator = document.getElementById('drop-position-indicator');
    if (!dropIndicator) {
        dropIndicator = document.createElement('div');
        dropIndicator.id = 'drop-position-indicator';
        dropIndicator.style.position = 'absolute';
        dropIndicator.style.width = '2px';
        dropIndicator.style.backgroundColor = '#ff0000';
        dropIndicator.style.zIndex = '100';
        dropIndicator.style.pointerEvents = 'none';
        document.getElementById('timeline-tracks').appendChild(dropIndicator);
    }
    
    const trackRect = track.getBoundingClientRect();
    dropIndicator.style.height = `${trackRect.height}px`;
    dropIndicator.style.top = '0';
    dropIndicator.style.left = `${positionX}px`;
    dropIndicator.style.display = 'block';
}

/**
 * Ẩn vạch chỉ vị trí drop
 */
export function hideDropPosition() {
    const dropIndicator = document.getElementById('drop-position-indicator');
    if (dropIndicator) {
        dropIndicator.style.display = 'none';
    }
}

/**
 * Lấy vị trí thời gian đã làm tròn từ vị trí pixel
 */
export function getSnappedTimeFromPosition(timeline, positionX) {
    // Chuyển đổi vị trí pixel thành thời gian
    let time = positionX / timeline.pixelsPerSecond;
    
    // Làm tròn đến 0.5 giây gần nhất để dễ căn chỉnh
    time = Math.round(time * 2) / 2;
    
    // Đảm bảo không âm và không vượt quá thời lượng
    return Math.max(0, Math.min(time, timeline.duration));
}

/**
 * Di chuyển clip đến vị trí mới
 */
export function moveClipToPosition(timeline, clipId, trackType, newStartTime) {
    // Tìm clip trong danh sách
    const clipIndex = timeline.clips.findIndex(clip => clip.id === clipId);
    if (clipIndex === -1) return;
    
    const clip = timeline.clips[clipIndex];
    
    // Nếu là clip audio và được kéo vào track video (hoặc ngược lại), cần xử lý đặc biệt
    if (clip.type !== trackType) {
        if ((clip.type === 'audio' && trackType === 'video') || 
            (clip.type === 'video' && trackType === 'audio')) {
            // Cho phép kéo giữa audio và video
            clip.type = trackType;
        } else {
            // Không cho phép kéo text clip vào video/audio hoặc ngược lại
            timeline.addDebugBox(`Không thể kéo clip loại ${clip.type} vào track ${trackType}`);
            return;
        }
    }
    
    // Kiểm tra trước khi di chuyển, đảm bảo không chồng lên clip khác
    // Nếu clip chồng lên clip khác, điều chỉnh vị trí bắt đầu
    const adjustedStartTime = getAvailableStartTime(timeline, clip, newStartTime, trackType);
    
    // Cập nhật thời gian bắt đầu
    clip.startTime = adjustedStartTime;
    
    // Sắp xếp lại clips theo thứ tự thời gian
    timeline.clips.sort((a, b) => a.startTime - b.startTime);
    
    // Render lại các clips
    renderClips(timeline);
    updateClipsList(timeline);
    
    timeline.addDebugBox(`Đã di chuyển clip ${clipId} đến vị trí mới: ${adjustedStartTime.toFixed(1)}s`);
}

/**
 * Tìm vị trí bắt đầu khả dụng gần nhất
 */
export function getAvailableStartTime(timeline, currentClip, desiredStartTime, trackType) {
    // Lấy danh sách các clip cùng loại, ngoại trừ clip hiện tại
    const sameTypeClips = timeline.clips.filter(clip => 
        clip.type === trackType && clip.id !== currentClip.id
    );
    
    // Nếu không có clip nào khác cùng loại, trả về thời gian mong muốn
    if (sameTypeClips.length === 0) {
        return desiredStartTime;
    }
    
    // Tính thời điểm kết thúc của clip hiện tại nếu đặt ở vị trí mong muốn
    const desiredEndTime = desiredStartTime + currentClip.duration;
    
    // Kiểm tra xem có xung đột với clip nào không
    for (const clip of sameTypeClips) {
        // Nếu có xung đột (clip hiện tại nằm giữa clip khác)
        if (
            (desiredStartTime >= clip.startTime && desiredStartTime < clip.startTime + clip.duration) || 
            (desiredEndTime > clip.startTime && desiredEndTime <= clip.startTime + clip.duration) ||
            (desiredStartTime <= clip.startTime && desiredEndTime >= clip.startTime + clip.duration)
        ) {
            // Thử đặt clip sau clip đang xung đột
            return clip.startTime + clip.duration;
        }
    }
    
    // Nếu không có xung đột, trả về thời gian mong muốn
    return desiredStartTime;
}

/**
 * Tìm phần tử gần nhất để thả clip
 */
export function findClosestDropTarget(clientY, container) {
    // Lấy tất cả các phần tử là clip trong danh sách
    const items = Array.from(container.querySelectorAll('.list-group-item'));
    if (items.length === 0) return null;
    
    // Tìm phần tử gần nhất
    let closestItem = null;
    let closestDistance = Infinity;
    
    for (const item of items) {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const distance = Math.abs(clientY - itemCenter);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestItem = item;
        }
    }
    
    return closestItem;
}

/**
 * Làm nổi bật vị trí có thể thả
 */
export function highlightDropTarget(targetItem) {
    // Xóa vùng highlight cũ trước
    removeDropTargetHighlight();
    
    if (targetItem) {
        targetItem.classList.add('drop-target');
        targetItem.style.borderTop = '2px solid #007bff';
    }
}

/**
 * Xóa vùng highlight của vị trí có thể thả
 */
export function removeDropTargetHighlight() {
    const items = document.querySelectorAll('.list-group-item.drop-target');
    items.forEach(item => {
        item.classList.remove('drop-target');
        item.style.borderTop = '';
    });
}

/**
 * Sắp xếp lại thời gian bắt đầu của các clip dựa trên thứ tự mới
 */
export function reorderClipsStartTimes(timeline) {
    let currentStartTime = 0;
    
    // Nhóm clips theo type
    const videoClips = timeline.clips.filter(clip => clip.type === 'video');
    const audioClips = timeline.clips.filter(clip => clip.type === 'audio');
    const textClips = timeline.clips.filter(clip => clip.type === 'text');
    
    // Sắp xếp lại thời gian cho video clips
    for (const clip of videoClips) {
        clip.startTime = currentStartTime;
        currentStartTime += clip.duration;
    }
    
    // Đặt lại thời gian bắt đầu cho audio
    currentStartTime = 0;
    for (const clip of audioClips) {
        clip.startTime = currentStartTime;
        currentStartTime += clip.duration;
    }
    
    // Cập nhật thời lượng timeline
    if (timeline.updateTimelineDuration) {
        timeline.updateTimelineDuration();
    }
} 