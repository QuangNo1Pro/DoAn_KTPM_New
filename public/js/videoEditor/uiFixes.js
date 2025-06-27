/**
 * uiFixes.js - Sửa các lỗi UI chung
 */

/**
 * Fix vấn đề modal backdrop không tự xóa
 */
function fixModalBackdrop() {
    // Lắng nghe sự kiện khi bất kỳ modal nào đóng
    document.body.addEventListener('hidden.bs.modal', function(event) {
        console.log('Modal đóng, kiểm tra và xóa backdrop');
        
        // Tìm và xóa tất cả modal-backdrop
        setTimeout(function() {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            if (backdrops.length > 0) {
                console.log(`Tìm thấy ${backdrops.length} backdrop, đang xóa...`);
                backdrops.forEach(backdrop => backdrop.remove());
                
                // Xóa các class và style trên body
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }
        }, 300);
    });
    
    // Đã xóa nút Fix Màn Hình
}

/**
 * Fix vấn đề text overlay container - Cải thiện hiệu suất
 */
function fixTextOverlayContainer() {
    const container = document.getElementById('text-overlays-container');
    if (!container) {
        console.log("Không tìm thấy text-overlays-container");
        return;
    }
    
    console.log("Đang cài đặt style cố định cho container text overlay");
    
    // Đặt các style một lần duy nhất để đảm bảo container luôn trong suốt
    container.style.cssText = `
        background: transparent !important;
        background-color: transparent !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        mix-blend-mode: normal !important;
        pointer-events: none;
        z-index: 10;
    `;
    
    // Chỉ theo dõi những thay đổi thực sự về style và class, với cấu hình tối ưu
    const observer = new MutationObserver((mutations) => {
        let needsUpdate = false;
        
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && 
               (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                needsUpdate = true;
                break;
            }
        }
        
        // Chỉ cập nhật khi thực sự cần thiết
        if (needsUpdate) {
            console.log("Phát hiện thay đổi style, đảm bảo container vẫn trong suốt");
            
            // Áp dụng lại các style quan trọng
            container.style.background = 'transparent';
            container.style.backgroundColor = 'transparent';
            container.style.backdropFilter = 'none';
            container.style.webkitBackdropFilter = 'none';
        }
    });
    
    // Cấu hình observer hiệu quả hơn - chỉ quan sát thuộc tính
    observer.observe(container, { 
        attributes: true,
        attributeFilter: ['style', 'class'],
        subtree: false
    });
    
    console.log("Đã cài đặt observer nhẹ hơn cho text overlay container");
}

/**
 * Áp dụng tất cả các fix UI
 */
function applyAllUIFixes() {
    fixModalBackdrop();
    
    // Chỉ áp dụng fixTextOverlayContainer sau khi trang đã tải hoàn toàn
    if (document.readyState === 'complete') {
        fixTextOverlayContainer();
    } else {
        window.addEventListener('load', fixTextOverlayContainer);
    }
    
    console.log('Đã áp dụng tất cả các fix UI');
}

// Export các hàm để có thể sử dụng từ module khác
window.UIFixes = {
    fixModalBackdrop,
    fixTextOverlayContainer,
    applyAllUIFixes
}; 