/**
 * TextOverlay - File tạo và khởi tạo TextOverlay class
 * File này tải tất cả các module cần thiết và tạo class TextOverlay
 */

// Tạo và khởi tạo TextOverlay
(function() {
    console.log('Bắt đầu khởi tạo TextOverlay');
    
    // Đánh dấu đang tải
    window.TextOverlayLoading = true;
    
    // Danh sách các module cần tải
    const modulesToLoad = [
        '/js/videoEditor/textOverlay/TextOverlayCore.js',
        '/js/videoEditor/textOverlay/TextTrack.js', 
        '/js/videoEditor/textOverlay/TextItem.js',
        '/js/videoEditor/textOverlay/TextRender.js',
        '/js/videoEditor/textOverlay/TextDragDrop.js',
        '/js/videoEditor/textOverlay/TextUI.js',
        '/js/videoEditor/textOverlay/TextControls.js'
    ];
    
    let loadedCount = 0;
    const totalModules = modulesToLoad.length;
    
    // Tải tất cả các module
    modulesToLoad.forEach(moduleUrl => {
        const script = document.createElement('script');
        script.src = moduleUrl;
        script.async = false; // Tải theo thứ tự

        script.onload = function() {
            loadedCount++;
            console.log(`Đã tải module ${moduleUrl} (${loadedCount}/${totalModules})`);
            
            // Nếu tất cả đã tải xong, tạo TextOverlay
            if (loadedCount === totalModules) {
                setTimeout(createTextOverlay, 100); // Đợi thêm 100ms để đảm bảo tất cả scripts đã chạy
            }
        };
        
        document.head.appendChild(script);
    });
    
    // Tạo và khởi tạo TextOverlay class
    function createTextOverlay() {
        try {
            console.log('Đang tạo TextOverlay class');
            
            // Kiểm tra các module cần thiết
            if (!window.TextOverlayCore) {
                throw new Error('TextOverlayCore không tồn tại');
            }
            
            // Tạo class TextOverlay
            class TextOverlay extends window.TextOverlayCore {
                constructor(options) {
                    super(options);
                }
            }
            
            // Thêm các phương thức từ các module
            if (window.TextTrackModule) Object.assign(TextOverlay.prototype, window.TextTrackModule);
            if (window.TextItemModule) Object.assign(TextOverlay.prototype, window.TextItemModule);
            if (window.TextRenderModule) Object.assign(TextOverlay.prototype, window.TextRenderModule);
            if (window.TextDragDropModule) Object.assign(TextOverlay.prototype, window.TextDragDropModule);
            if (window.TextUIModule) Object.assign(TextOverlay.prototype, window.TextUIModule);
            if (window.TextControlsModule) Object.assign(TextOverlay.prototype, window.TextControlsModule);
            
            // Gán TextOverlay vào window
            window.TextOverlay = TextOverlay;
            window.TextOverlayLoaded = true;
            
            console.log('TextOverlay đã được tạo và gán vào window thành công');
            
            // Thông báo
            window.dispatchEvent(new CustomEvent('textoverlayloaded'));
        } catch (error) {
            console.error('Lỗi khi tạo TextOverlay:', error);
        }
    }
})(); 