/**
 * Tiện ích debug cho Video Editor
 */
class DebugHelper {
    
    /**
     * Khởi tạo DebugHelper
     */
    constructor() {
        this.debugBox = null;
        this.init();
    }
    
    /**
     * Khởi tạo
     */
    init() {
        // Tạo nút toggle debug
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Debug';
        toggleButton.style.position = 'fixed';
        toggleButton.style.bottom = '10px';
        toggleButton.style.right = '10px';
        toggleButton.style.zIndex = '10000';
        toggleButton.style.padding = '5px 10px';
        toggleButton.style.backgroundColor = '#f44336';
        toggleButton.style.color = 'white';
        toggleButton.style.border = 'none';
        toggleButton.style.borderRadius = '5px';
        toggleButton.style.cursor = 'pointer';
        
        // Thêm sự kiện click
        toggleButton.addEventListener('click', () => {
            this.createDebugInfo();
        });
        
        document.body.appendChild(toggleButton);
    }
    
    /**
     * Tạo và hiển thị thông tin debug
     */
    createDebugInfo() {
        // Kiểm tra nếu đã có debug box thì xóa đi
        if (this.debugBox) {
            document.body.removeChild(this.debugBox);
            this.debugBox = null;
            return;
        }
        
        // Tạo debug box
        this.debugBox = document.createElement('div');
        this.debugBox.style.position = 'fixed';
        this.debugBox.style.top = '50px';
        this.debugBox.style.right = '10px';
        this.debugBox.style.width = '300px';
        this.debugBox.style.maxHeight = '500px';
        this.debugBox.style.overflowY = 'auto';
        this.debugBox.style.backgroundColor = 'rgba(0,0,0,0.8)';
        this.debugBox.style.color = 'white';
        this.debugBox.style.padding = '10px';
        this.debugBox.style.borderRadius = '5px';
        this.debugBox.style.zIndex = '10000';
        this.debugBox.style.fontFamily = 'monospace';
        this.debugBox.style.fontSize = '12px';
        
        // Thêm tiêu đề
        const title = document.createElement('h3');
        title.textContent = 'Debug Info';
        title.style.color = '#ff9800';
        title.style.marginTop = '0';
        this.debugBox.appendChild(title);
        
        // Kiểm tra timeline từ window.editor hoặc window.videoEditor
        const timeline = this.getTimelineObject();
        
        if (timeline) {
            // Thông tin chung
            this.addInfo('Timeline Duration', `${timeline.duration.toFixed(2)}s`);
            this.addInfo('Pixels Per Second', timeline.pixelsPerSecond);
            this.addInfo('Current Time', `${timeline.currentTime.toFixed(2)}s`);
            this.addInfo('Clips Count', timeline.clips ? timeline.clips.length : 0);
            
            // Thông tin chi tiết về từng clip
            if (timeline.clips && timeline.clips.length > 0) {
                timeline.clips.forEach((clip, index) => {
                    const clipHeader = document.createElement('h4');
                    clipHeader.textContent = `Clip ${index + 1}: ${clip.name || clip.id}`;
                    clipHeader.style.color = '#4caf50';
                    clipHeader.style.marginBottom = '5px';
                    this.debugBox.appendChild(clipHeader);
                    
                    // Chi tiết clip
                    this.addInfo('ID', clip.id);
                    this.addInfo('Type', clip.type);
                    this.addInfo('Start Time', `${clip.startTime.toFixed(2)}s`);
                    this.addInfo('Duration', `${clip.duration.toFixed(2)}s`);
                    this.addInfo('Image Path', clip.imagePath || 'N/A');
                    
                    // Tính toán vị trí trên timeline
                    const startPos = clip.startTime * timeline.pixelsPerSecond;
                    const width = clip.duration * timeline.pixelsPerSecond;
                    this.addInfo('Position', `${startPos.toFixed(0)}px (left) × ${width.toFixed(0)}px (width)`);
                    
                    // Nút để highlight clip này trên timeline
                    const highlightBtn = document.createElement('button');
                    highlightBtn.textContent = 'Highlight';
                    highlightBtn.style.marginTop = '5px';
                    highlightBtn.style.padding = '2px 5px';
                    highlightBtn.style.backgroundColor = '#2196F3';
                    highlightBtn.style.color = 'white';
                    highlightBtn.style.border = 'none';
                    highlightBtn.style.borderRadius = '3px';
                    highlightBtn.style.cursor = 'pointer';
                    
                    highlightBtn.addEventListener('click', () => {
                        this.highlightClip(clip.id);
                    });
                    
                    this.debugBox.appendChild(highlightBtn);
                    
                    // Thêm dòng ngăn cách
                    const divider = document.createElement('hr');
                    divider.style.borderColor = '#555';
                    divider.style.margin = '10px 0';
                    this.debugBox.appendChild(divider);
                });
            } else {
                this.addInfo('Clips', 'No clips found');
            }
            
            // Thêm nút refresh
            const refreshBtn = document.createElement('button');
            refreshBtn.textContent = 'Refresh Info';
            refreshBtn.style.padding = '5px 10px';
            refreshBtn.style.backgroundColor = '#9c27b0';
            refreshBtn.style.color = 'white';
            refreshBtn.style.border = 'none';
            refreshBtn.style.borderRadius = '3px';
            refreshBtn.style.cursor = 'pointer';
            refreshBtn.style.display = 'block';
            refreshBtn.style.margin = '10px auto';
            
            refreshBtn.addEventListener('click', () => {
                document.body.removeChild(this.debugBox);
                this.debugBox = null;
                this.createDebugInfo();
            });
            
            this.debugBox.appendChild(refreshBtn);
        } else {
            // Thêm thông tin về window.Timeline
            if (window.Timeline) {
                this.addInfo('Global Timeline', 'Đã tồn tại');
            } else {
                this.addInfo('Global Timeline', 'Không tồn tại');
            }
            
            this.addInfo('Error', 'Timeline instance not found');
            this.addInfo('VideoEditor', window.videoEditor ? 'Đã tồn tại' : 'Không tồn tại');
            this.addInfo('Editor', window.editor ? 'Đã tồn tại' : 'Không tồn tại');
        }
        
        document.body.appendChild(this.debugBox);
    }
    
    /**
     * Lấy đối tượng Timeline từ các nguồn khác nhau
     */
    getTimelineObject() {
        if (window.videoEditor && window.videoEditor.timeline) {
            return window.videoEditor.timeline;
        }
        if (window.editor && window.editor.timeline) {
            return window.editor.timeline;
        }
        // Nếu có Timeline trực tiếp (có thể là đối tượng singleton)
        if (window.Timeline && window.Timeline.instance) {
            return window.Timeline.instance;
        }
        return null;
    }
    
    /**
     * Thêm thông tin vào debug box
     */
    addInfo(label, value) {
        const info = document.createElement('div');
        info.style.marginBottom = '5px';
        info.innerHTML = `<strong>${label}:</strong> <span>${value}</span>`;
        this.debugBox.appendChild(info);
    }
    
    /**
     * Highlight clip trên timeline
     */
    highlightClip(clipId) {
        // Loại bỏ highlight cũ
        document.querySelectorAll('.timeline-clip-highlight').forEach(el => {
            el.classList.remove('timeline-clip-highlight');
        });
        
        // Highlight clip mới
        const clipElement = document.querySelector(`.timeline-clip[data-clip-id="${clipId}"]`);
        if (clipElement) {
            // Thêm class để highlight
            clipElement.classList.add('timeline-clip-highlight');
            
            // Cuộn đến clip
            const timeline = document.getElementById('timeline-container');
            if (timeline) {
                timeline.scrollLeft = clipElement.offsetLeft - 100;
            }
            
            // Tự động bỏ highlight sau 3 giây
            setTimeout(() => {
                clipElement.classList.remove('timeline-clip-highlight');
            }, 3000);
        }
    }
}

// Tạo instance khi document đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    window.debugHelper = new DebugHelper();
});

/**
 * Debug.js - Hỗ trợ debug cho VideoEditor
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Debug.js loaded');
    
    // Chờ một chút để các thành phần khác được khởi tạo
    setTimeout(() => {
        // Kiểm tra DOM
        console.group('Debug DOM Elements');
        console.log('Timeline Container:', document.getElementById('timeline-container'));
        console.log('Timeline Tracks:', document.getElementById('timeline-tracks'));
        console.log('Video Track:', document.getElementById('video-track'));
        console.log('Audio Track:', document.getElementById('audio-track'));
        console.log('Text Track:', document.getElementById('text-track'));
        console.log('Query Selector Video Track:', document.querySelector('.timeline-track[data-track-type="video"]'));
        console.log('Query Selector Audio Track:', document.querySelector('.timeline-track[data-track-type="audio"]'));
        console.groupEnd();
        
        // Kiểm tra VideoEditor
        console.log('VideoEditor object:', window.videoEditor);
        console.log('Editor object:', window.editor);
        console.log('Timeline class:', window.Timeline);
        
        // Kiểm tra timeline từ nhiều nguồn
        const timeline = getTimelineInstance();
        if (timeline) {
            console.group('Timeline Info');
            console.log('Timeline Object:', timeline);
            console.log('Timeline Clips:', timeline.clips);
            console.log('Timeline Tracks Container:', timeline.tracksContainer);
            console.groupEnd();
            
            // Thêm debug overlay
            addDebugOverlay();
        } else {
            console.warn('Timeline not initialized yet');
        }
    }, 2000); // Đợi 2 giây để đảm bảo mọi thứ đã được tải
});

/**
 * Lấy instance của Timeline từ nhiều nguồn khác nhau
 */
function getTimelineInstance() {
    if (window.videoEditor && window.videoEditor.timeline) {
        return window.videoEditor.timeline;
    }
    if (window.editor && window.editor.timeline) {
        return window.editor.timeline;
    }
    // Nếu có Timeline trực tiếp (có thể là đối tượng singleton)
    if (window.Timeline && window.Timeline.instance) {
        return window.Timeline.instance;
    }
    return null;
}

/**
 * Thêm overlay hiển thị thông tin debug
 */
function addDebugOverlay() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.bottom = '10px';
    overlay.style.right = '10px';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.color = '#fff';
    overlay.style.padding = '10px';
    overlay.style.borderRadius = '5px';
    overlay.style.zIndex = '9999';
    overlay.style.maxWidth = '500px';
    overlay.style.maxHeight = '300px';
    overlay.style.overflow = 'auto';
    overlay.style.fontSize = '12px';
    overlay.style.fontFamily = 'monospace';
    
    const header = document.createElement('div');
    header.textContent = 'DEBUG INFO';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '5px';
    header.style.borderBottom = '1px solid #fff';
    header.style.paddingBottom = '3px';
    overlay.appendChild(header);
    
    const content = document.createElement('div');
    content.id = 'debug-overlay-content';
    overlay.appendChild(content);
    
    document.body.appendChild(overlay);
    
    // Cập nhật nội dung
    updateDebugOverlay();
    
    // Cập nhật định kỳ
    setInterval(updateDebugOverlay, 1000);
}

/**
 * Cập nhật nội dung của debug overlay
 */
function updateDebugOverlay() {
    const content = document.getElementById('debug-overlay-content');
    if (!content) return;
    
    let html = '';
    
    // Kiểm tra DOM
    html += `<div>Timeline Container: ${document.getElementById('timeline-container') ? 'OK' : 'Missing'}</div>`;
    html += `<div>Timeline Tracks: ${document.getElementById('timeline-tracks') ? 'OK' : 'Missing'}</div>`;
    html += `<div>Video Track: ${document.getElementById('video-track') ? 'OK' : 'Missing'}</div>`;
    html += `<div>Audio Track: ${document.getElementById('audio-track') ? 'OK' : 'Missing'}</div>`;
    html += `<div>Text Track: ${document.getElementById('text-track') ? 'OK' : 'Missing'}</div>`;
    
    // Kiểm tra timeline
    const timeline = getTimelineInstance();
    if (timeline) {
        html += '<hr>';
        html += `<div>Timeline Clips: ${timeline.clips ? timeline.clips.length : 0}</div>`;
        
        // Hiển thị thông tin từng clip
        if (timeline.clips && timeline.clips.length > 0) {
            timeline.clips.forEach((clip, index) => {
                html += `<div>Clip ${index+1}: ${clip.id} (${clip.type}) - ${clip.startTime}s to ${clip.startTime + clip.duration}s</div>`;
            });
        }
        
        // Kiểm tra có clip nào hiển thị không
        const clipElements = document.querySelectorAll('.timeline-clip');
        html += `<div>Rendered Clips: ${clipElements.length}</div>`;
    } else {
        html += '<hr>';
        html += '<div style="color: #f88;">Timeline not initialized</div>';
        html += `<div>VideoEditor: ${window.videoEditor ? 'Found' : 'Not found'}</div>`;
        html += `<div>Editor: ${window.editor ? 'Found' : 'Not found'}</div>`;
        html += `<div>Timeline class: ${window.Timeline ? 'Found' : 'Not found'}</div>`;
    }
    
    content.innerHTML = html;
}

// Hack: Thêm các bước khắc phục vấn đề
window.fixTimelineTracks = function() {
    console.log('Attempting to fix timeline tracks...');
    
    // Lấy container
    const container = document.getElementById('timeline-container');
    const tracksContainer = document.getElementById('timeline-tracks');
    
    if (!container) {
        console.error('Cannot fix: timeline-container not found');
        return;
    }
    
    if (!tracksContainer) {
        console.log('Creating new tracks container');
        const newTracksContainer = document.createElement('div');
        newTracksContainer.id = 'timeline-tracks';
        newTracksContainer.className = 'timeline-tracks';
        container.appendChild(newTracksContainer);
    }
    
    // Tìm timeline từ nhiều nguồn
    const timeline = getTimelineInstance();
    
    // Tạo lại các track
    if (timeline) {
        // Gọi hàm tạo tracks
        timeline.createTracks();
        
        // Render lại clips
        if (typeof timeline.renderClips === 'function') {
            timeline.renderClips();
        }
        
        console.log('Fix applied. Please check if the issue is resolved.');
    } else {
        console.error('Cannot fix: videoEditor.timeline not initialized');
    }
};

// Gọi hàm khắc phục sau 3 giây
setTimeout(() => {
    console.log('Auto-applying timeline fix...');
    window.fixTimelineTracks();
}, 3000); 