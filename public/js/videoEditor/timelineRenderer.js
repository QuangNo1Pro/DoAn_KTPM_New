/**
 * timelineRenderer.js - Xử lý hiển thị timeline
 */

/**
 * Render các clip lên timeline
 * @param {Object} timeline - Đối tượng timeline
 */
function renderTimelineClips(timeline) {
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
        if (window.TimelineDragDrop && typeof window.TimelineDragDrop.addClipEvents === 'function') {
            window.TimelineDragDrop.addClipEvents(clipElement, clip, timeline);
        }
    });
    
    console.log(`Đã render ${timeline.clips.length} clips lên giao diện`);
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
            
            // Gọi hàm render clip từ TimelineRenderer
            renderTimelineClips(timeline);
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
            setTimeout(() => renderTimelineClips(timeline), 100);
        }
    }
}

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
            
            renderTimelineClips(window.videoEditor.timeline);
        }
        
        // Thông báo
        console.log('Đã áp dụng khắc phục ban đầu cho timeline');
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

// Export các hàm để có thể sử dụng từ module khác
window.TimelineRenderer = {
    renderTimelineClips,
    checkAndFixTimelineRendering,
    fixInitialRendering,
    ensureTimelineElements,
    addMissingCss
}; 