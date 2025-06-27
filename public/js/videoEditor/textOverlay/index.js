/**
 * TextOverlay - Module chính tích hợp tất cả các thành phần
 * Module này kết hợp tất cả các module con thành một class TextOverlay hoàn chỉnh
 */

// Biến toàn cục để kiểm soát quá trình tải
window.textOverlayModuleState = window.textOverlayModuleState || {
    isLoading: false,
    isLoaded: false,
    loadPromise: null
};

// Sửa lại cách import để hoạt động với script thông thường
function loadModules() {
    console.log("Khởi tạo loadModules() để tạo TextOverlay");
    
    // Các module được load riêng biệt và đã gán tới window
    const TextOverlayCore = window.TextOverlayCore;
    const TextTrack = window.TextTrackModule;
    const TextItem = window.TextItemModule;
    const TextRender = window.TextRenderModule;
    const TextDragDrop = window.TextDragDropModule;
    const TextUI = window.TextUIModule;
    const TextControls = window.TextControlsModule;

    // Kiểm tra các module cần thiết
    const missingModules = [];
    if (!TextOverlayCore) missingModules.push('TextOverlayCore');
    if (!TextTrack) missingModules.push('TextTrack');
    if (!TextItem) missingModules.push('TextItem');
    if (!TextRender) missingModules.push('TextRender');
    if (!TextDragDrop) missingModules.push('TextDragDrop');
    if (!TextUI) missingModules.push('TextUI');
    if (!TextControls) missingModules.push('TextControls');
    
    if (missingModules.length > 0) {
        console.error(`Các module sau chưa được tải: ${missingModules.join(', ')}`);
        return null;
    }
    
    console.log("Tất cả các module cần thiết đã được tìm thấy");

    // Kiểm tra nếu TextOverlay đã được khởi tạo trước đó
    if (window.TextOverlay) {
        console.log("TextOverlay đã tồn tại, trả về instance hiện có");
        return window.TextOverlay;
    }

    /**
     * TextOverlay - Quản lý các chữ chồng lên video
     */
    try {
        class TextOverlay extends TextOverlayCore {
            constructor(options) {
                super(options);
                console.log("TextOverlay constructor được gọi");
            }
        }

        // Thêm các phương thức từ các module
        if (TextTrack) Object.assign(TextOverlay.prototype, TextTrack);
        if (TextItem) Object.assign(TextOverlay.prototype, TextItem);
        if (TextRender) Object.assign(TextOverlay.prototype, TextRender);
        if (TextDragDrop) Object.assign(TextOverlay.prototype, TextDragDrop);
        if (TextUI) Object.assign(TextOverlay.prototype, TextUI);
        if (TextControls) Object.assign(TextOverlay.prototype, TextControls);

        // Export class
        console.log("Gán TextOverlay vào window object");
        window.TextOverlay = TextOverlay;
        
        // Thông báo rằng module đã sẵn sàng
        if (typeof window.moduleLoaded === 'function') {
            window.moduleLoaded('TextOverlay');
        }

        // Cập nhật trạng thái
        window.textOverlayModuleState.isLoaded = true;
        window.textOverlayModuleState.isLoading = false;

        console.log("TextOverlay đã được khởi tạo thành công");
        return TextOverlay;
    } catch (error) {
        console.error("LỖI khi khởi tạo TextOverlay:", error);
        window.textOverlayModuleState.isLoading = false;
        return null;
    }
}

// Load các module con trước
function loadSubModules() {
    // Nếu đã load hoàn tất, trả về TextOverlay hiện có
    if (window.textOverlayModuleState.isLoaded && window.TextOverlay) {
        console.log("TextOverlay đã được tải trước đó");
        return Promise.resolve(window.TextOverlay);
    }
    
    // Nếu đang load, trả về promise hiện tại
    if (window.textOverlayModuleState.isLoading && window.textOverlayModuleState.loadPromise) {
        console.log("TextOverlay đang được tải, đợi tiến trình hiện tại");
        return window.textOverlayModuleState.loadPromise;
    }
    
    console.log("Bắt đầu tải các sub-module cho TextOverlay");
    window.textOverlayModuleState.isLoading = true;
    
    const modulesToLoad = [
        '/js/videoEditor/textOverlay/TextOverlayCore.js',
        '/js/videoEditor/textOverlay/TextTrack.js',
        '/js/videoEditor/textOverlay/TextItem.js',
        '/js/videoEditor/textOverlay/TextRender.js',
        '/js/videoEditor/textOverlay/TextDragDrop.js',
        '/js/videoEditor/textOverlay/TextUI.js',
        '/js/videoEditor/textOverlay/TextControls.js'
    ];

    // Filter out already loaded modules
    const modulesToLoadFiltered = modulesToLoad.filter(moduleUrl => {
        const moduleName = moduleUrl.split('/').pop().replace('.js', '');
        return !window[moduleName] && !window[`${moduleName}Module`];
    });

    if (modulesToLoadFiltered.length === 0) {
        console.log('Tất cả module con đã được tải trước đó, bắt đầu khởi tạo TextOverlay');
        return Promise.resolve(loadModules());
    }

    // Tạo một promise để theo dõi quá trình tải modules
    const loadPromise = new Promise((resolve) => {
        let loadedCount = 0;
        const totalModules = modulesToLoadFiltered.length;
        
        const checkAllLoaded = () => {
            if (loadedCount === totalModules) {
                console.log('Tất cả module con đã được tải, bắt đầu khởi tạo TextOverlay');
                setTimeout(() => {
                    const result = loadModules();
                    resolve(result);
                }, 50); // Đợi ít hơn để không làm chậm quá trình
            }
        };
        
        if (totalModules === 0) {
            // Nếu không có module nào cần tải
            setTimeout(() => {
                const result = loadModules();
                resolve(result);
            }, 0);
            return;
        }
        
        modulesToLoadFiltered.forEach((moduleUrl) => {
            // Kiểm tra xem script đã được tải chưa
            const existingScript = document.querySelector(`script[src="${moduleUrl}"]`);
            if (existingScript) {
                loadedCount++;
                console.log(`Module ${moduleUrl} đã tồn tại, bỏ qua (${loadedCount}/${totalModules})`);
                checkAllLoaded();
                return;
            }
            
            const script = document.createElement('script');
            script.src = moduleUrl;
            script.async = false; // Đảm bảo thứ tự tải
            
            script.onload = function() {
                loadedCount++;
                console.log(`Đã tải module ${moduleUrl} (${loadedCount}/${totalModules})`);
                checkAllLoaded();
            };
            
            script.onerror = function() {
                console.error(`Lỗi khi tải module ${moduleUrl}`);
                loadedCount++; // Vẫn tăng số lượng để tiếp tục quá trình
                checkAllLoaded();
            };
            
            document.head.appendChild(script);
        });
    });
    
    // Lưu promise để có thể tái sử dụng
    window.textOverlayModuleState.loadPromise = loadPromise;
    
    return loadPromise;
}

// Khởi tạo TextOverlay ngay khi tải xong
window.initTextOverlay = function() {
    console.log("Bắt đầu khởi tạo TextOverlay từ hàm initTextOverlay");
    
    // Thêm thông báo cho người dùng
    const notificationArea = document.createElement('div');
    notificationArea.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-size: 14px;
        z-index: 9999;
        transition: opacity 0.3s;
    `;
    notificationArea.textContent = 'Đang tải module TextOverlay...';
    document.body.appendChild(notificationArea);
    
    return loadSubModules()
        .then(textOverlay => {
            if (textOverlay) {
                notificationArea.textContent = 'TextOverlay đã sẵn sàng!';
                setTimeout(() => {
                    notificationArea.style.opacity = '0';
                    setTimeout(() => {
                        if (notificationArea.parentNode) {
                            notificationArea.parentNode.removeChild(notificationArea);
                        }
                    }, 300);
                }, 2000);
                return textOverlay;
            } else {
                notificationArea.textContent = 'Lỗi tải TextOverlay!';
                notificationArea.style.backgroundColor = 'rgba(255,0,0,0.7)';
                return null;
            }
        })
        .catch(error => {
            console.error("Lỗi khi tải TextOverlay:", error);
            notificationArea.textContent = 'Lỗi tải TextOverlay!';
            notificationArea.style.backgroundColor = 'rgba(255,0,0,0.7)';
            return null;
        });
};

// Bắt đầu quá trình tải (nhưng không khởi tạo hai lần)
console.log("TextOverlay index.js đang chạy");
if (!window.textOverlayModuleState.isLoaded && !window.textOverlayModuleState.isLoading) {
    loadSubModules().then(textOverlay => {
        if (textOverlay) {
            console.log("TextOverlay đã sẵn sàng, đã gán vào window.TextOverlay");
            
            // Thông báo rằng module đã sẵn sàng
            if (typeof window.moduleLoaded === 'function') {
                window.moduleLoaded('TextOverlay');
            }
        } else {
            console.error("Không thể khởi tạo TextOverlay");
        }
    });
} else {
    console.log("TextOverlay đang được tải hoặc đã được tải trước đó");
}