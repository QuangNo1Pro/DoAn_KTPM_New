/**
 * ExportManager - Quản lý việc xuất và lưu video
 */
class ExportManager {
    constructor(options = {}) {
        this.videoData = options.videoData;
        this.timeline = options.timeline;
        this.dataConverter = options.dataConverter;
        this.retryCount = 0;
        this.maxRetries = 3; // Số lần thử lại tối đa
        this.retryDelay = 1000; // Độ trễ giữa các lần thử (ms)
    }

    /**
     * Lưu thay đổi
     */
    saveChanges() {
        // Thu thập dữ liệu từ timeline, text overlay và effects
        const exportData = this.dataConverter.exportData();
        
        // Cập nhật dữ liệu vào sessionStorage
        const sessionData = {
            sessionId: this.videoData.sessionId,
            parts: exportData
        };
        
        sessionStorage.setItem('videoEditedData', JSON.stringify(sessionData));
        
        // Kiểm tra kết nối trước khi gọi API
        if (!navigator.onLine) {
            console.warn('Đang offline. Dữ liệu đã được lưu trong sessionStorage.');
            return Promise.resolve({ 
                success: true, 
                offline: true,
                message: 'Dữ liệu đã được lưu tạm thời. Sẽ được đồng bộ khi có kết nối internet.'
            });
        }
        
        // Gửi yêu cầu lưu dữ liệu với retry logic
        return this.fetchWithRetry('/api/advanced-video/save-video-edits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sessionData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Đã lưu thay đổi thành công');
                return { success: true };
            } else {
                console.error('Lỗi khi lưu thay đổi:', data.error);
                return { success: false, error: data.error };
            }
        })
        .catch(error => {
            console.error('Lỗi khi gọi API lưu dữ liệu:', error);
            
            // Khi gặp lỗi kết nối, vẫn coi như thành công vì dữ liệu đã được lưu ở client
            // và server có thể đã xử lý nhưng không trả về phản hồi
            return { 
                success: true, 
                error: error.message,
                offline: !navigator.onLine,
                localSaved: true,
                message: 'Đã lưu dữ liệu cục bộ, nhưng không nhận được phản hồi từ máy chủ.'
            };
        });
    }

    /**
     * Fetch với retry tự động
     */
    fetchWithRetry(url, options, retries = this.maxRetries, delay = this.retryDelay) {
        return new Promise((resolve, reject) => {
            const attempt = () => {
                fetch(url, options)
                    .then(resolve)
                    .catch(error => {
                        if (retries === 0) {
                            reject(error);
                            return;
                        }
                        
                        console.log(`Đang thử lại (${this.maxRetries - retries + 1}/${this.maxRetries})...`);
                        setTimeout(() => {
                            attempt();
                        }, delay);
                        
                        retries--;
                    });
            };
            
            attempt();
        });
    }

    /**
     * Xuất video
     */
    exportVideo(exportCallback) {
        console.log('Bắt đầu quá trình xuất video...');
        
        // Đảm bảo TextOverlay đã được tải hoàn tất trước khi xuất video
        const ensureTextOverlayLoaded = () => {
            return new Promise((resolve) => {
                if (!this.dataConverter || !this.dataConverter.textOverlay) {
                    console.warn('Không tìm thấy đối tượng TextOverlay, sẽ xuất video không có text');
                    resolve(false);
                    return;
                }
                
                // Kiểm tra nếu TextOverlay đã sẵn sàng
                if (typeof this.dataConverter.textOverlay.getTextItems === 'function') {
                    const textItems = this.dataConverter.textOverlay.getTextItems();
                    console.log('Text items sẵn sàng để xuất:', textItems);
                    resolve(true);
                    return;
                }
                
                // Nếu textOverlay chưa tải xong, kiểm tra thuộc tính textItems trực tiếp
                if (this.dataConverter.textOverlay.textItems && Array.isArray(this.dataConverter.textOverlay.textItems)) {
                    console.log('Đối tượng TextOverlay.textItems sẵn sàng:', this.dataConverter.textOverlay.textItems);
                    resolve(true);
                    return;
                }
                
                // Nếu chưa sẵn sàng và có hàm moduleLoaded, đợi module được tải xong
                if (window.textOverlayModuleState && !window.textOverlayModuleState.isLoaded) {
                    console.log('Đang đợi TextOverlay module được tải xong...');
                    
                    // Đặt timeout để tránh đợi quá lâu
                    setTimeout(() => {
                        console.warn('Đã đạt timeout khi đợi TextOverlay, tiếp tục xuất video');
                        resolve(false);
                    }, 2000);
                    
                    // Kiểm tra mỗi 100ms xem module đã tải xong chưa
                    const checkInterval = setInterval(() => {
                        if (window.textOverlayModuleState && window.textOverlayModuleState.isLoaded) {
                            clearInterval(checkInterval);
                            console.log('TextOverlay module đã tải xong, tiếp tục xuất video');
                            resolve(true);
                        }
                    }, 100);
                } else {
                    // Không có cách nào để đợi, tiếp tục xuất
                    resolve(false);
                }
            });
        };

        // Lưu cấu hình hiện tại
        this.saveChanges()
            .catch(error => {
                console.warn('Không thể lưu thay đổi trước khi xuất:', error);
            });
        
        // Đảm bảo TextOverlay đã được tải trước khi tiếp tục
        return ensureTextOverlayLoaded()
            .then(() => {
                // DEBUG: Kiểm tra dữ liệu trước khi gửi
                const sessionId = this.videoData.sessionId;
                const parts = this.dataConverter.exportData();
                
                console.log('DEBUG - Request Data:', {
                    sessionId: sessionId,
                    sessionIdType: typeof sessionId,
                    parts: parts,
                    partsLength: parts.length
                });
                
                // Kiểm tra dữ liệu
                if (!sessionId) {
                    const result = { 
                        success: false, 
                        error: 'Thiếu sessionId' 
                    };
                    
                    if (exportCallback) exportCallback(result);
                    return Promise.resolve(result);
                }
                
                if (!parts || parts.length === 0) {
                    const result = { 
                        success: false, 
                        error: 'Không có dữ liệu clips để xuất' 
                    };
                    
                    if (exportCallback) exportCallback(result);
                    return Promise.resolve(result);
                }
                
                // Kiểm tra kết nối
                if (!navigator.onLine) {
                    const result = {
                        success: false,
                        error: 'Không có kết nối internet. Vui lòng thử lại sau.',
                        offline: true
                    };
                    
                    if (exportCallback) exportCallback(result);
                    return Promise.resolve(result);
                }
                
                // Gửi yêu cầu tạo video với retry
                return this.fetchWithRetry('/api/advanced-video/create-edited-video', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        parts: parts
                    })
                })
                .then(async response => {
                    // Kiểm tra nếu response không thành công
                    if (!response.ok) {
                        // Lấy text để xem nội dung lỗi chi tiết
                        const errorText = await response.text();
                        console.error('DEBUG - Response Error Text:', errorText);
                        
                        try {
                            // Thử parse JSON
                            const errorJson = JSON.parse(errorText);
                            throw new Error(`Lỗi kết nối: ${response.status} ${response.statusText}. Chi tiết: ${errorJson.error || errorText}`);
                        } catch (e) {
                            // Nếu không phải JSON, trả về text nguyên bản
                            throw new Error(`Lỗi kết nối: ${response.status} ${response.statusText}. Chi tiết: ${errorText}`);
                        }
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        // Trả về kết quả
                        const result = {
                            success: true,
                            videoUrl: data.videoUrl
                        };
                        
                        if (exportCallback) exportCallback(result);
                        return result;
                    } else {
                        // Hiển thị lỗi
                        console.error('Lỗi từ server:', data.error);
                        const result = {
                            success: false,
                            error: data.error || 'Không xác định'
                        };
                        
                        if (exportCallback) exportCallback(result);
                        return result;
                    }
                })
                .catch(error => {
                    console.error('Lỗi khi gọi API tạo video:', error);
                    
                    const result = {
                        success: false,
                        error: error.message,
                        offline: !navigator.onLine,
                        message: 'Không nhận được phản hồi từ máy chủ.'
                    };
                    
                    if (exportCallback) exportCallback(result);
                    return result;
                });
            });
    }
}

// Export để các module khác có thể sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportManager;
} else {
    window.ExportManager = ExportManager;
}