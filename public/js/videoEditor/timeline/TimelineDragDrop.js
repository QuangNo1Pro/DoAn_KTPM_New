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
    const originalType = clip.type;
    
    // Tìm clip liên quan (audio cho video hoặc ngược lại)
    let relatedClip = null;
    if (clip.type === 'video') {
        relatedClip = timeline.clips.find(c => c.type === 'audio' && c.id === `audio_${clip.id}`);
    } else if (clip.type === 'audio' && clip.id.startsWith('audio_')) {
        const videoId = clip.id.replace('audio_', '');
        relatedClip = timeline.clips.find(c => c.type === 'video' && c.id === videoId);
    }
    
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
    const adjustedStartTime = getAvailableStartTime(timeline, clip, newStartTime, trackType);
    
    // Cập nhật thời gian bắt đầu cho clip chính
    clip.startTime = adjustedStartTime;
    
    // Cập nhật thời gian bắt đầu cho clip liên quan nếu có
    if (relatedClip) {
        relatedClip.startTime = adjustedStartTime;
        
        // Nếu clip gốc đã đổi loại, đổi loại của clip liên quan
        if (clip.type !== originalType) {
            if (originalType === 'video') {
                relatedClip.type = 'video';
            } else if (originalType === 'audio') {
                relatedClip.type = 'audio';
            }
        }
    }
    
    // Sắp xếp lại clips theo thứ tự thời gian
    timeline.clips.sort((a, b) => a.startTime - b.startTime);
    
    // Tính toán thời lượng mới của timeline dựa trên clip được kéo
    const clipEndTime = adjustedStartTime + clip.duration;
    if (clipEndTime > timeline.duration) {
        timeline.duration = clipEndTime;
        
        // Cập nhật UI sau khi thay đổi thời lượng
        if (timeline.updateRuler) {
            timeline.updateRuler();
            timeline.createTracks();
        }
        
        // Cập nhật hiển thị thời lượng
        if (timeline.updateTimeDisplays) {
            timeline.updateTimeDisplays();
        }
        
        // Kích hoạt sự kiện để thông báo thời lượng đã thay đổi
        const event = new CustomEvent('timelineDurationChanged', { 
            detail: { duration: timeline.duration } 
        });
        timeline.container.dispatchEvent(event);
        
        // Cập nhật thanh seek
        const seekBar = document.getElementById('timeline-seek');
        if (seekBar) {
            seekBar.max = timeline.duration;
        }
    }
    
    // Cập nhật thời lượng timeline - QUAN TRỌNG
    if (timeline.updateTimelineDuration) {
        timeline.updateTimelineDuration();
    }
    
    // Render lại các clips
    renderClips(timeline);
    updateClipsList(timeline);
    
    timeline.addDebugBox(`Đã di chuyển clip ${clipId} và clip liên quan đến vị trí mới: ${adjustedStartTime.toFixed(1)}s`);
}

/**
 * Tìm vị trí bắt đầu khả dụng gần nhất
 */
export function getAvailableStartTime(timeline, currentClip, desiredStartTime, trackType) {
    // Xác định loại clip liên quan
    let relatedType = null;
    if (currentClip.type === 'video' || trackType === 'video') {
        relatedType = 'audio';
    } else if (currentClip.type === 'audio' || trackType === 'audio') {
        relatedType = 'video';
    }

    // Lấy danh sách các clip cùng loại và clip liên quan, ngoại trừ clip hiện tại
    const sameTypeClips = timeline.clips.filter(clip => 
        clip.type === trackType && 
        clip.id !== currentClip.id &&
        (currentClip.type === 'audio' ? !clip.id.startsWith('audio_' + currentClip.id.replace('audio_', '')) : true)
    );

    const relatedClips = relatedType ? timeline.clips.filter(clip => 
        clip.type === relatedType && 
        clip.id !== (currentClip.type === 'video' ? `audio_${currentClip.id}` : currentClip.id.replace('audio_', ''))
    ) : [];

    // Nếu không có clip nào khác, trả về thời gian mong muốn
    if (sameTypeClips.length === 0 && relatedClips.length === 0) {
        return desiredStartTime;
    }

    // Tính thời điểm kết thúc của clip hiện tại nếu đặt ở vị trí mong muốn
    const desiredEndTime = desiredStartTime + currentClip.duration;

    // Kiểm tra xung đột với tất cả các clip liên quan
    const allClipsToCheck = [...sameTypeClips, ...relatedClips];
    
    // Sắp xếp các clip theo thời gian bắt đầu
    allClipsToCheck.sort((a, b) => a.startTime - b.startTime);

    let safeStartTime = desiredStartTime;

    for (const clip of allClipsToCheck) {
        const clipEndTime = clip.startTime + clip.duration;

        // Kiểm tra xung đột
        if (
            (safeStartTime >= clip.startTime && safeStartTime < clipEndTime) || 
            (safeStartTime + currentClip.duration > clip.startTime && safeStartTime + currentClip.duration <= clipEndTime) ||
            (safeStartTime <= clip.startTime && safeStartTime + currentClip.duration >= clipEndTime)
        ) {
            // Nếu có xung đột, thử đặt sau clip này
            safeStartTime = clipEndTime;
        }
    }

    return safeStartTime;
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
    
    // Sắp xếp lại thời gian cho cả video và audio clips
    const allClips = [...videoClips, ...audioClips];
    allClips.sort((a, b) => a.startTime - b.startTime);
    
    for (const clip of allClips) {
        clip.startTime = currentStartTime;
        currentStartTime += clip.duration;
    }
    
    // Cập nhật thời lượng timeline
    if (timeline.updateTimelineDuration) {
        timeline.updateTimelineDuration();
    }
} 