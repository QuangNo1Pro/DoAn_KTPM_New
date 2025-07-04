/**
 * videoEditor.js - File khởi tạo cho hệ thống chỉnh sửa video
 * 
 * File này là điểm vào chính cho hệ thống chỉnh sửa video.
 * Nó sẽ tải tất cả các module cần thiết và khởi tạo VideoEditorCore.
 */

// Hàm global để kiểm tra video mới nhất
window.checkLastCreatedVideo = function() {
    if (window.videoEditor) {
        window.videoEditor.checkLastCreatedVideo();
    } else {
        console.error('VideoEditor chưa được khởi tạo');
        alert('Trình chỉnh sửa video chưa sẵn sàng, vui lòng tải lại trang');
    }
};

// Kiểm tra kết nối internet
window.checkConnection = function() {
    if (!navigator.onLine) {
        // Hiển thị thông báo ngoại tuyến
        showOfflineMessage();
    }
    
    // Thêm event listeners cho sự kiện online/offline
    window.addEventListener('online', function() {
        hideOfflineMessage();
        console.log('Đã kết nối lại internet');
    });
    
    window.addEventListener('offline', function() {
        showOfflineMessage();
        console.log('Đã mất kết nối internet');
    });
};

// Hiển thị thông báo ngoại tuyến
function showOfflineMessage() {
    // Kiểm tra xem đã có thông báo chưa
    if (document.getElementById('offline-alert')) return;
    
    // Tạo thông báo
    const alertDiv = document.createElement('div');
    alertDiv.id = 'offline-alert';
    alertDiv.className = 'alert alert-warning position-fixed bottom-0 start-0 m-3';
    alertDiv.innerHTML = '<i class="bi bi-wifi-off"></i> Bạn đang ở chế độ ngoại tuyến. Một số tính năng có thể không hoạt động.';
    alertDiv.style.zIndex = '9999';
    
    // Thêm vào body
    document.body.appendChild(alertDiv);
}

// Ẩn thông báo ngoại tuyến
function hideOfflineMessage() {
    const alertDiv = document.getElementById('offline-alert');
    if (alertDiv) {
        alertDiv.remove();
    }
}

// Hiển thị thông báo lỗi
function showErrorMessage(message) {
    console.error(message);
    
    // Kiểm tra xem đã có thông báo chưa
    if (document.getElementById('error-alert')) {
        document.getElementById('error-alert').remove();
    }
    
    // Tạo thông báo
    const alertDiv = document.createElement('div');
    alertDiv.id = 'error-alert';
    alertDiv.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x m-3';
    alertDiv.innerHTML = '<i class="bi bi-exclamation-triangle"></i> ' + message;
    alertDiv.style.zIndex = '9999';
    
    // Thêm nút đóng
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close';
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.onclick = function() {
        alertDiv.remove();
    };
    
    alertDiv.appendChild(closeButton);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
    
    // Thêm vào body
    document.body.appendChild(alertDiv);
}

// Theo dõi các module đã tải
window.loadedModules = window.loadedModules || {};

// Hàm được gọi khi một module được tải xong
window.moduleLoaded = function(moduleName) {
    console.log(`Module ${moduleName} đã được tải xong`);
    window.loadedModules[moduleName] = true;
};

// Khởi tạo khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    console.log('Đang khởi tạo hệ thống chỉnh sửa video...');
    
    // Kiểm tra kết nối internet
    window.checkConnection();
    
    // Đảm bảo tất cả các thành phần cần thiết đã tải xong
    const requiredClasses = [
        'Timeline', 'EffectsManager',
        'MediaLoader', 'PreviewManager', 'VideoDataConverter', 'ExportManager', 'VideoEditorCore'
    ];
    
    // TextOverlay là tùy chọn
    const optionalClasses = ['TextOverlay'];
    
    let retryCount = 0;
    const maxRetries = 5;
    
    const checkDependencies = () => {
        const missingDeps = requiredClasses.filter(cls => !window[cls]);
        if (missingDeps.length > 0) {
            console.warn('Đang chờ các module bắt buộc:', missingDeps.join(', '));
            
            // Hiển thị thông báo nếu thử quá nhiều lần
            retryCount++;
            if (retryCount >= maxRetries) {
                showErrorMessage('Không thể tải một số module bắt buộc: ' + missingDeps.join(', ') + '. Vui lòng tải lại trang.');
                return;
            }
            
            setTimeout(checkDependencies, 500); // Giảm thời gian chờ giữa các lần thử
            return;
        }
        
        // Kiểm tra các module tùy chọn
        optionalClasses.forEach(cls => {
            if (!window[cls]) {
                console.warn(`Không tìm thấy module tùy chọn: ${cls}, sẽ sử dụng phiên bản giả nếu cần`);
            }
        });
        
        // Tạo instance global để các thành phần khác có thể truy cập
        console.log('Khởi tạo VideoEditorCore');
        try {
            window.editor = new VideoEditorCore();
        } catch (error) {
            console.error('Lỗi khi khởi tạo VideoEditorCore:', error);
            showErrorMessage('Có lỗi khi khởi tạo trình chỉnh sửa video. Vui lòng tải lại trang.');
        }
    };
    
    // Bắt đầu kiểm tra dependencies
    checkDependencies();
    
    // Xử lý lỗi chung
    window.addEventListener('error', function(e) {
        console.error("Có lỗi xảy ra:", e.error || e.message);
        
        // Hiển thị thông báo lỗi nếu nghiêm trọng
        if (e.error && (e.error.toString().includes('fetch') || e.error.toString().includes('network'))) {
            showErrorMessage('Lỗi kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.');
        }
    });
});

// Music Preview Handler (gộp hoàn chỉnh)
document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('bg-music-select');
    const previewBtn = document.getElementById('preview-music-btn');
    const stopBtn = document.getElementById('stop-music-btn');
    const volumeSlider = document.getElementById('bg-music-volume');
    const previewAudio = document.getElementById('bg-music-preview');
    const startInput = document.getElementById('music-start-time');
    const endInput = document.getElementById('music-end-time');
    const confirmBtn = document.getElementById('confirm-music-range-btn');

    if (!select || !previewBtn || !stopBtn || !volumeSlider || !previewAudio) return;

    // Khi nhấn "Nghe Thử"
    previewBtn.addEventListener('click', () => {
        const file = select.value;
        if (!file) return;

        const start = parseFloat(startInput?.value || '0');
        const end = parseFloat(endInput?.value || '99999');

        previewAudio.src = `/music/${file}`;
        previewAudio.volume = parseFloat(volumeSlider.value || '0.5');
        previewAudio.currentTime = start;
        previewAudio.style.display = 'block';
        previewAudio.play().catch(err => console.error('Không thể phát nhạc:', err));

        // Tự động dừng khi đến thời điểm kết thúc đã chọn
        const checkEnd = () => {
            if (previewAudio.currentTime >= end) {
                previewAudio.pause();
                previewAudio.currentTime = start;
            }
        };
        previewAudio.removeEventListener('timeupdate', checkEnd); // tránh chồng hàm
        previewAudio.addEventListener('timeupdate', checkEnd);
    });

    // Khi nhấn "Dừng"
    stopBtn.addEventListener('click', () => {
        const start = parseFloat(startInput?.value || '0');
        previewAudio.pause();
        previewAudio.currentTime = start;
    });

    // Khi thay đổi âm lượng
    volumeSlider.addEventListener('input', () => {
        previewAudio.volume = parseFloat(volumeSlider.value || '0.5');
    });

    // Khi xác nhận đoạn nhạc
    if (confirmBtn && startInput && endInput) {
        confirmBtn.addEventListener('click', () => {
            const start = parseFloat(startInput.value);
            const end = parseFloat(endInput.value);

            if (isNaN(start) || isNaN(end) || start >= end) {
                alert('Vui lòng nhập khoảng thời gian hợp lệ');
                return;
            }

            alert(`✅ Đã chọn đoạn nhạc từ ${start} đến ${end} giây.`);
        });
    }
});

