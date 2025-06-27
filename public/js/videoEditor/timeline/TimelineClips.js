/**
 * TimelineClips.js - Quản lý các clip trong timeline
 */
import { updateRuler, createTracks, updatePlayhead, updateTimeDisplays, showClipEditor, hideClipEditor } from './TimelineUI.js';

/**
 * Thêm clip vào timeline với thời lượng cụ thể
 */
export function addClipWithTimeConstraint(timeline, clip, duration, startAtTime = null) {
    console.log('Thêm clip:', clip, duration, startAtTime);
    
    // Xác định ID cho clip nếu chưa có
    if (!clip.id) {
        clip.id = `clip-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    
    // Thiết lập thời lượng cho clip
    clip.duration = duration;
    
    // Xác định thời điểm bắt đầu
    if (startAtTime === null) {
        // Nếu không chỉ định, thêm vào cuối timeline
        clip.startTime = timeline.duration;
    } else {
        // Nếu chỉ định, sử dụng thời điểm được chỉ định
        clip.startTime = startAtTime;
    }
    
    // Đảm bảo có thuộc tính type
    if (!clip.type) {
        clip.type = 'video';
    }
    
    // Thêm clip vào danh sách
    timeline.clips.push(clip);
    
    // Cập nhật thời lượng timeline
    updateTimelineDuration(timeline);
    
    // Render lại các clips
    renderClips(timeline);
    
    // Thêm vào danh sách bên panel
    updateClipsList(timeline);
    
    console.log(`Đã thêm clip với duration ${duration}s tại ${clip.startTime}s. ID: ${clip.id}`);
    return clip.id;
}

/**
 * Cập nhật thời lượng timeline dựa trên clips
 */
export function updateTimelineDuration(timeline) {
    if (timeline.clips.length === 0) {
        // Nếu không có clip, sử dụng thời lượng mặc định
        timeline.duration = timeline.options.duration;
    } else {
        // Tính thời lượng dựa trên clip có endTime lớn nhất
        const maxEndTime = calculateMaxEndTime(timeline.clips);
        
        // Cập nhật thời lượng timeline
        timeline.duration = maxEndTime;
        
        // Log debug info
        if (timeline.addDebugBox) {
            // timeline.addDebugBox(`Timeline duration updated to: ${timeline.duration} seconds`);
        }
        
        // Kích hoạt sự kiện nếu có
        const event = new CustomEvent('timelineDurationChanged', { 
            detail: { duration: timeline.duration } 
        });
        if (timeline.container) {
            timeline.container.dispatchEvent(event);
        }
    }
    
    // Cập nhật UI
    updateRuler(timeline);
    createTracks(timeline);
    
    // Cập nhật hiển thị thời lượng
    updateTimeDisplays(timeline);
    
    // Cập nhật thanh seek
    const seekBar = document.getElementById('timeline-seek');
    if (seekBar) {
        seekBar.max = timeline.duration;
    }
    
    if (timeline.addDebugBox) {
        // timeline.addDebugBox(`Timeline duration updated to: ${timeline.duration} seconds`);
    }
}

/**
 * Cập nhật clip trong timeline
 */
export function updateClip(timeline, clipId, newProperties) {
    const clipIndex = timeline.clips.findIndex(clip => clip.id === clipId);
    
    if (clipIndex !== -1) {
        timeline.clips[clipIndex] = { ...timeline.clips[clipIndex], ...newProperties };
        
        // Cập nhật thời lượng timeline nếu cần
        updateTimelineDuration(timeline);
        
        renderClips(timeline);
        updateClipsList(timeline);
    }
}

/**
 * Xóa clip khỏi timeline
 */
export function removeClip(timeline, clipId) {
    const clipIndex = timeline.clips.findIndex(clip => clip.id === clipId);
    
    if (clipIndex !== -1) {
        timeline.clips.splice(clipIndex, 1);
        
        // Cập nhật thời lượng timeline
        updateTimelineDuration(timeline);
        
        renderClips(timeline);
        updateClipsList(timeline);
        
        // Nếu đang xóa clip đang chọn
        if (timeline.selectedClipId === clipId) {
            timeline.selectedClipId = null;
            hideClipEditor();
        }
    }
}

/**
 * Render tất cả clips lên timeline
 */
export function renderClips(timeline) {
    console.log("Đang render các clips trên timeline:", timeline.clips);
    
    // Xóa các clips hiện tại
    const clipElements = document.querySelectorAll('.timeline-clip');
    clipElements.forEach(el => el.remove());
    
    // Thêm debug box
    if (timeline.addDebugBox) {
        // timeline.addDebugBox(`Rendering ${timeline.clips.length} clips`);
    }
    
    // Render lại clips
    timeline.clips.forEach((clip, index) => {
        // Tính toán vị trí và kích thước
        const startPosition = clip.startTime * timeline.pixelsPerSecond;
        const width = clip.duration * timeline.pixelsPerSecond;
        
        if (timeline.addDebugBox) {
            // timeline.addDebugBox(`Clip ${index+1}: startPos=${startPosition}px, width=${width}px`);
        }
        
        // Tạo element cho clip
        const clipElement = document.createElement('div');
        clipElement.className = 'timeline-clip';
        clipElement.id = `clip-element-${clip.id}`;
        clipElement.dataset.clipId = clip.id;
        clipElement.style.position = 'absolute';
        clipElement.style.left = `${startPosition}px`;
        clipElement.style.width = `${width}px`;
        clipElement.style.height = '90%';
        clipElement.style.top = '5%';
        clipElement.style.overflow = 'hidden';
        clipElement.style.border = '1px solid white';
        clipElement.style.zIndex = '50';
        
        // Thêm thuộc tính cho kéo thả
        clipElement.setAttribute('draggable', 'true');
        
        // Thêm hiệu ứng riêng cho từng loại clip
        if (clip.type === 'video') {
            clipElement.style.backgroundColor = '#4285f4';
            clipElement.style.borderRadius = '3px';
            clipElement.style.cursor = 'move'; // Thay đổi con trỏ thành move để chỉ ra clip có thể di chuyển
            clipElement.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
            // Thêm hình ảnh thumbnail nếu có
            if (clip.imagePath) {
                try {
                    const thumbnailContainer = document.createElement('div');
                    thumbnailContainer.className = 'timeline-thumbnail';
                    thumbnailContainer.style.position = 'absolute';
                    thumbnailContainer.style.left = '0';
                    thumbnailContainer.style.top = '0';
                    thumbnailContainer.style.width = '100%';
                    thumbnailContainer.style.height = '70%';
                    thumbnailContainer.style.overflow = 'hidden';
                    thumbnailContainer.style.display = 'flex';
                    thumbnailContainer.style.justifyContent = 'center';
                    thumbnailContainer.style.alignItems = 'center';
                    thumbnailContainer.style.backgroundColor = '#000';
                    
                    const thumbnail = document.createElement('img');
                    // Đảm bảo rằng đường dẫn hình ảnh chính xác
                    thumbnail.src = clip.imagePath.startsWith('/') ? clip.imagePath : convertImagePath(clip.imagePath);
                    thumbnail.style.width = '100%';
                    thumbnail.style.height = '100%';
                    thumbnail.style.objectFit = 'cover';
                    thumbnail.style.opacity = '0.8';
                    thumbnail.alt = clip.name || `Clip ${clip.id}`;
                    
                    // Xử lý lỗi tải hình ảnh
                    thumbnail.onerror = (e) => {
                        console.warn(`Không thể tải thumbnail cho clip ${clip.id}:`, e);
                        thumbnail.style.display = 'none';
                        
                        // Hiển thị nhãn cho clip
                        const fallbackLabel = document.createElement('div');
                        fallbackLabel.textContent = clip.name || `Clip ${clip.id.split('-')[1]}`;
                        fallbackLabel.style.color = 'white';
                        fallbackLabel.style.textAlign = 'center';
                        fallbackLabel.style.padding = '5px';
                        thumbnailContainer.appendChild(fallbackLabel);
                    };
                    
                    thumbnailContainer.appendChild(thumbnail);
                    clipElement.appendChild(thumbnailContainer);
                } catch (err) {
                    console.error("Lỗi khi render thumbnail:", err);
                }
            }
        } else if (clip.type === 'audio') {
            clipElement.style.backgroundColor = '#34a853';
            clipElement.style.borderRadius = '3px';
            clipElement.style.cursor = 'move'; // Thay đổi con trỏ thành move để chỉ ra clip có thể di chuyển
            clipElement.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
            
            // Tạo hiệu ứng dạng sóng âm
            const waveformContainer = document.createElement('div');
            waveformContainer.className = 'audio-waveform';
            waveformContainer.style.position = 'absolute';
            waveformContainer.style.left = '0';
            waveformContainer.style.top = '0';
            waveformContainer.style.width = '100%';
            waveformContainer.style.height = '70%';
            waveformContainer.style.display = 'flex';
            waveformContainer.style.justifyContent = 'space-evenly';
            waveformContainer.style.alignItems = 'center';
            
            // Tạo các thanh biểu diễn sóng âm
            const barCount = Math.max(5, Math.floor(width / 5)); // Số thanh phụ thuộc vào chiều rộng
            for (let i = 0; i < barCount; i++) {
                const bar = document.createElement('div');
                const height = 10 + Math.random() * 60; // Chiều cao ngẫu nhiên từ 10% đến 70%
                bar.style.width = '2px';
                bar.style.height = `${height}%`;
                bar.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                waveformContainer.appendChild(bar);
            }
            
            clipElement.appendChild(waveformContainer);
        } else if (clip.type === 'text') {
            clipElement.style.backgroundColor = '#fbbc05';
            clipElement.style.borderRadius = '3px';
            clipElement.style.cursor = 'move'; // Thay đổi con trỏ thành move để chỉ ra clip có thể di chuyển
            clipElement.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
        }
        
        // Thêm label
        const label = document.createElement('div');
        label.className = 'clip-label';
        label.textContent = clip.name || `Clip ${clip.id.split('-')[1]}`;
        label.style.padding = '5px';
        label.style.fontSize = '12px';
        label.style.color = 'white';
        label.style.whiteSpace = 'nowrap';
        label.style.overflow = 'hidden';
        label.style.textOverflow = 'ellipsis';
        label.style.position = 'absolute';
        label.style.bottom = '0';
        label.style.left = '0';
        label.style.width = '100%';
        label.style.backgroundColor = 'rgba(0,0,0,0.6)';
        clipElement.appendChild(label);
        
        // Nếu clip đang được chọn
        if (timeline.selectedClipId === clip.id) {
            clipElement.style.boxShadow = '0 0 0 2px #ff0000';
        }
        
        // Tìm và thêm vào track tương ứng
        const track = getTrackByType(timeline, clip.type);
        if (track) {
            track.appendChild(clipElement);
            if (timeline.addDebugBox) {
                // timeline.addDebugBox(`Clip ${clip.id} added to track ${clip.type}`);
            }
        } else {
            if (timeline.addDebugBox) {
                // timeline.addDebugBox(`ERROR: No track for type ${clip.type}`);
            }
            
            // Thử tìm track bằng ID
            const trackById = document.getElementById(`${clip.type}-track`);
            if (trackById) {
                trackById.appendChild(clipElement);
                if (timeline.addDebugBox) {
                    // timeline.addDebugBox(`Clip ${clip.id} added to track by ID: ${clip.type}-track`);
                }
            } else {
                // Thêm vào track mặc định (track đầu tiên) nếu không tìm thấy track phù hợp
                const anyTrack = document.querySelector('.timeline-track');
                if (anyTrack) {
                    anyTrack.appendChild(clipElement);
                    if (timeline.addDebugBox) {
                        // timeline.addDebugBox(`Clip ${clip.id} added to default track as fallback`);
                    }
                } else {
                    if (timeline.addDebugBox) {
                        // timeline.addDebugBox(`CRITICAL ERROR: No tracks available to add clip ${clip.id}`);
                    }
                }
            }
        }
        
        // Sự kiện click
        clipElement.addEventListener('click', (e) => {
            // Ngăn sự kiện lan truyền đến các phần tử khác khi click
            e.stopPropagation();
            selectClip(timeline, clip.id);
        });
        
        // Sự kiện kéo thả sẽ được thêm từ TimelineDragDrop.js
    });
    
    // Empty clips case
    if (!timeline.clips || timeline.clips.length === 0) {
        if (timeline.addDebugBox) {
            // timeline.addDebugBox("No clips to render");
        }
        return;
    }
}

/**
 * Cập nhật danh sách clips trong panel
 */
export function updateClipsList(timeline) {
    const clipsList = document.getElementById('clips-list');
    if (!clipsList) return;
    
    clipsList.innerHTML = '';
    
    timeline.clips.forEach(clip => {
        const item = document.createElement('button');
        item.className = `list-group-item list-group-item-action ${timeline.selectedClipId === clip.id ? 'active' : ''}`;
        item.dataset.clipId = clip.id;
        item.setAttribute('draggable', 'true');
        item.style.cursor = 'move';
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>${clip.name || `Clip ${clip.id.split('-')[1]}`}</span>
                <span class="badge bg-secondary">${formatTime(clip.duration)}</span>
            </div>
        `;
        
        // Sự kiện click
        item.addEventListener('click', () => {
            selectClip(timeline, clip.id);
        });
        
        // Sự kiện kéo thả sẽ được thêm từ TimelineDragDrop.js
        
        clipsList.appendChild(item);
    });
    
    return clipsList;
}

/**
 * Chuyển đổi đường dẫn ảnh thành URL hiển thị được
 */
export function convertImagePath(path) {
    if (!path) return '';
    
    // Nếu là URL đầy đủ, giữ nguyên
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    
    // Nếu là đường dẫn tương đối bắt đầu bằng '/', giữ nguyên
    if (path.startsWith('/')) {
        return path;
    }
    
    // Nếu là đường dẫn có chứa giao thức file://, chuyển thành đường dẫn tương đối
    if (path.includes('file://')) {
        const fileName = path.split('/').pop();
        return `/temp/${fileName}`;
    }
    
    // Mặc định giữ nguyên
    return path;
}

/**
 * Chọn clip để chỉnh sửa
 */
export function selectClip(timeline, clipId) {
    timeline.selectedClipId = clipId;
    
    // Cập nhật UI
    renderClips(timeline);
    updateClipsList(timeline);
    
    // Hiển thị editor cho clip
    showClipEditor(timeline);
}

/**
 * Format thời gian thành chuỗi mm:ss
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function calculateMaxEndTime(clips) {
    let maxEndTime = 0;
    let clipWithMaxEnd = null;
    
    for (const clip of clips) {
        const endTime = clip.startTime + clip.duration;
        if (endTime > maxEndTime) {
            maxEndTime = endTime;
            clipWithMaxEnd = clip;
        }
    }
    
    return maxEndTime;
}

function getTrackByType(timeline, type) {
    const track = document.querySelector(`.timeline-track[data-track-type="${type}"]`);
    return track;
} 