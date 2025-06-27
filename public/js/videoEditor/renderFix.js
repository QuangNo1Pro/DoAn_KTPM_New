/**
 * RenderFix.js - Khắc phục vấn đề hiển thị timeline
 * 
 * File này đã được tách thành các module sau:
 * - timelineRenderer.js: Xử lý hiển thị timeline
 * - timelineDragDrop.js: Xử lý kéo thả trên timeline
 * - timelineUtils.js: Các hàm tiện ích cho timeline
 * - uiFixes.js: Sửa lỗi UI chung
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('RenderFix loaded - Phiên bản module');
    
    // Tải các script phụ thuộc
    loadDependencies().then(() => {
        // Sử dụng các module đã tách
        
        // Biến theo dõi interval
        let fixInterval = null;
        
        // Kiểm tra và khắc phục định kỳ với tần suất thấp hơn (15 giây thay vì 5 giây)
        fixInterval = setInterval(() => {
            // Kiểm tra xem người dùng có đang xem trang này không
            if (document.visibilityState === 'hidden') {
                return; // Không thực hiện fix khi tab không hiển thị
            }
            
            if (window.TimelineRenderer) {
                window.TimelineRenderer.checkAndFixTimelineRendering();
            }
        }, 15000);
        
        // Dừng interval khi người dùng rời khỏi trang
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && fixInterval) {
                clearInterval(fixInterval);
                fixInterval = null;
            } else if (document.visibilityState === 'visible' && !fixInterval) {
                // Khôi phục interval khi quay lại trang
                fixInterval = setInterval(() => {
                    if (window.TimelineRenderer) {
                        window.TimelineRenderer.checkAndFixTimelineRendering();
                    }
                }, 15000);
            }
        });
        
        // Khắc phục ban đầu sau 1 giây
        setTimeout(() => {
            if (window.TimelineRenderer) {
                window.TimelineRenderer.fixInitialRendering();
            }
        }, 1000);
        
        // Thêm sự kiện kéo thả cho các track
        setTimeout(() => {
            if (window.TimelineDragDrop) {
                window.TimelineDragDrop.addDragDropEvents();
            }
        }, 1500);
        
        // Áp dụng các fix UI chung
        if (window.UIFixes) {
            window.UIFixes.applyAllUIFixes();
        }
        
        console.log('Tất cả các module RenderFix đã được khởi tạo');
    }).catch(error => {
        console.error('Lỗi khi tải các module RenderFix:', error);
        
        // Fallback nếu có lỗi - sử dụng các hàm cũ với tần suất giảm
        let legacyInterval = null;
        
        legacyInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                legacyCheckAndFixTimelineRendering();
            }
        }, 15000);
        
        // Dừng interval khi không sử dụng
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && legacyInterval) {
                clearInterval(legacyInterval);
                legacyInterval = null;
            } else if (document.visibilityState === 'visible' && !legacyInterval) {
                legacyInterval = setInterval(legacyCheckAndFixTimelineRendering, 15000);
            }
        });
        
        setTimeout(legacyFixInitialRendering, 1000);
    });
});

/**
 * Tải các file JavaScript phụ thuộc
 */
function loadDependencies() {
    const scripts = [
        'timelineRenderer.js',
        'timelineDragDrop.js', 
        'timelineUtils.js',
        'uiFixes.js'
    ];
    
    const promises = scripts.map(script => {
        return new Promise((resolve, reject) => {
            const scriptElement = document.createElement('script');
            
            // Sử dụng đường dẫn tuyệt đối thay vì đường dẫn tương đối
            scriptElement.src = `/js/videoEditor/${script}`;
            
            // Thêm timeout để tránh chờ mãi nếu file không tồn tại
            const timeout = setTimeout(() => {
                console.warn(`Tải ${script} quá thời gian, tiếp tục với fallback`);
                resolve(); // Tiếp tục mà không gây lỗi
            }, 3000);
            
            scriptElement.onload = () => {
                clearTimeout(timeout);
                console.log(`Đã tải thành công: ${script}`);
                resolve();
            };
            
            scriptElement.onerror = (error) => {
                clearTimeout(timeout);
                console.warn(`Không thể tải script: ${script} - tiếp tục với fallback`);
                resolve(); // Tiếp tục thay vì reject để tránh làm hỏng cả chuỗi Promise
            };
            
            document.head.appendChild(scriptElement);
        });
    });
    
    return Promise.all(promises);
}

/**
 * Lấy đường dẫn của script hiện tại
 */
function getCurrentScriptPath() {
    // Tìm script element hiện tại
    const scripts = document.getElementsByTagName('script');
    const currentScript = scripts[scripts.length - 1];
    
    // Lấy đường dẫn
    return currentScript.src;
}

/**
 * Các hàm fallback nếu không tải được module
 */

// Fallback cho fixInitialRendering
function legacyFixInitialRendering() {
    console.warn('Sử dụng hàm legacy fixInitialRendering');
    // Đảm bảo các phần tử cơ bản tồn tại
    legacyEnsureTimelineElements();
    
    // Khắc phục các vấn đề rendering
    if (window.videoEditor && window.videoEditor.timeline) {
        // Cải thiện hiển thị clip bằng cách thêm CSS nếu cần
        legacyAddMissingCss();
        
        // Thêm mã tạo clip thật
        if (window.videoEditor.timeline.clips && 
            window.videoEditor.timeline.clips.length > 0) {
            
            legacyRenderTimelineClips();
        }
        
        // Thông báo
        console.log('Đã áp dụng khắc phục ban đầu cho timeline');
    }
}

// Fallback cho checkAndFixTimelineRendering
function legacyCheckAndFixTimelineRendering() {
    console.warn('Sử dụng hàm legacy checkAndFixTimelineRendering');
    if (!window.videoEditor || !window.videoEditor.timeline) return;
    
    const timeline = window.videoEditor.timeline;
    
    // Kiểm tra các clip đã được hiển thị chưa
    if (timeline.clips && timeline.clips.length > 0) {
        const renderedClips = document.querySelectorAll('.timeline-clip');
        if (renderedClips.length === 0) {
            console.warn('Phát hiện vấn đề: Có clips trong timeline nhưng không hiển thị trên track');
            
            // Gọi hàm render clip từ RenderFix
            legacyRenderTimelineClips();
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
            setTimeout(legacyRenderTimelineClips, 100);
        }
    }
}

// Fallback cho renderTimelineClips
function legacyRenderTimelineClips() {
    console.warn('Sử dụng hàm legacy renderTimelineClips');
    // Cài đặt lại các hàm cũ (phiên bản rút gọn)
    console.log('Sử dụng renderTimelineClips trực tiếp từ timeline.js nếu có');
    
    // Cố gắng sử dụng hàm từ timeline.js nếu có
    if (window.videoEditor && 
        window.videoEditor.timeline && 
        typeof window.videoEditor.timeline.renderClips === 'function') {
        window.videoEditor.timeline.renderClips();
    } else {
        console.error('Không thể render timeline clips - không tìm thấy hàm renderClips');
    }
}

// Fallback cho ensureTimelineElements
function legacyEnsureTimelineElements() {
    console.warn('Sử dụng hàm legacy ensureTimelineElements');
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
}

// Fallback cho addMissingCss
function legacyAddMissingCss() {
    console.warn('Sử dụng hàm legacy addMissingCss');
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
        `;
        document.head.appendChild(styleElement);
        console.log('Đã thêm CSS thiếu cho timeline');
    }
} 