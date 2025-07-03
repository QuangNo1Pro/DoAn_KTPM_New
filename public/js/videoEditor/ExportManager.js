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
        
        // Thêm biến khóa xuất video
        this.isExportingVideo = false;
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
        // Nếu đang xuất video, bỏ qua yêu cầu mới
        if (this.isExportingVideo) {
            console.log('Đang trong quá trình xuất video, vui lòng đợi...');
            if (exportCallback) exportCallback({
                success: false,
                error: 'Đang trong quá trình xuất video, vui lòng đợi...'
            });
            return Promise.resolve();
        }
        
        // Khóa để không cho gọi lại
        this.isExportingVideo = true;
        
        console.log('Bắt đầu quá trình xuất video...');
        
        // Đảm bảo TextOverlay đã được tải hoàn tất trước khi xuất video
        const ensureTextOverlayLoaded = () => {
            return new Promise((resolve) => {
                // Kiểm tra nếu dataConverter hoặc textOverlay không tồn tại
                if (!this.dataConverter) {
                    console.error('Không tìm thấy dataConverter, không thể xuất text');
                    resolve(false);
                    return;
                }
                
                // Kiểm tra nếu TextOverlay chưa được khởi tạo
                if (!this.dataConverter.textOverlay) {
                    console.warn('TextOverlay chưa được khởi tạo, thử lấy từ window.videoEditor');
                    
                    // Thử lấy từ window.videoEditor hoặc window.editor
                    const editorInstance = window.videoEditor || window.editor;
                    
                    if (editorInstance && editorInstance.textOverlay) {
                        console.log('Đã tìm thấy textOverlay từ editorInstance');
                        this.dataConverter.textOverlay = editorInstance.textOverlay;
                    } else {
                        console.warn('Không tìm thấy đối tượng TextOverlay, sẽ xuất video không có text');
                        resolve(false);
                        return;
                    }
                }
                
                // Kiểm tra và log trạng thái của textOverlay
                console.log('TextOverlay state:', {
                    hasTextOverlay: !!this.dataConverter.textOverlay,
                    hasGetTextItemsMethod: typeof this.dataConverter.textOverlay.getTextItems === 'function',
                    hasTextItemsProperty: !!(this.dataConverter.textOverlay.textItems),
                    textItemsLength: this.dataConverter.textOverlay.textItems ? this.dataConverter.textOverlay.textItems.length : 0
                });
                
                // Kiểm tra nếu TextOverlay đã sẵn sàng và có phương thức getTextItems
                if (typeof this.dataConverter.textOverlay.getTextItems === 'function') {
                    try {
                        const textItems = this.dataConverter.textOverlay.getTextItems();
                        console.log('Text items sẵn sàng để xuất:', textItems);
                        
                        // Log cụ thể số lượng text items tìm thấy
                        if (textItems && textItems.length > 0) {
                            console.log(`Đã tìm thấy ${textItems.length} text items để xuất`);
                        } else {
                            console.warn('Không tìm thấy text items, mảng rỗng hoặc null');
                        }
                        
                        resolve(true);
                    } catch (error) {
                        console.error('Lỗi khi gọi getTextItems:', error);
                        resolve(false);
                    }
                    return;
                }
                
                // Nếu không có phương thức getTextItems, thử kiểm tra thuộc tính textItems trực tiếp
                if (this.dataConverter.textOverlay.textItems) {
                    if (Array.isArray(this.dataConverter.textOverlay.textItems)) {
                        console.log('Đối tượng TextOverlay.textItems sẵn sàng:', this.dataConverter.textOverlay.textItems);
                        
                        // Log cụ thể số lượng text items tìm thấy
                        if (this.dataConverter.textOverlay.textItems.length > 0) {
                            console.log(`Đã tìm thấy ${this.dataConverter.textOverlay.textItems.length} text items từ thuộc tính trực tiếp`);
                        } else {
                            console.warn('Thuộc tính textItems tồn tại nhưng mảng rỗng');
                        }
                    } else {
                        console.warn('Thuộc tính textItems tồn tại nhưng không phải là mảng');
                    }
                    resolve(true);
                    return;
                }
                
                // Nếu chưa sẵn sàng, thử đợi một khoảng thời gian ngắn
                console.log('TextOverlay chưa sẵn sàng, thử đợi 500ms...');
                setTimeout(() => {
                    console.log('Kiểm tra TextOverlay sau khi đợi');
                    
                    // Kiểm tra lại một lần nữa
                    if (this.dataConverter.textOverlay && 
                        (typeof this.dataConverter.textOverlay.getTextItems === 'function' || 
                         this.dataConverter.textOverlay.textItems)) {
                        console.log('TextOverlay đã sẵn sàng sau khi đợi');
                        resolve(true);
                    } else {
                        console.warn('TextOverlay vẫn chưa sẵn sàng sau khi đợi, tiếp tục xuất video không có text');
                        resolve(false);
                    }
                }, 500);
            });
        };

        // Nhớ mở khóa khi hoàn thành hoặc có lỗi
        const unlockExport = () => {
            this.isExportingVideo = false;
        };
        
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
                    unlockExport(); // Mở khóa khi thành công
                    // Trả về kết quả
                    const result = {
                        success: true,
                        videoUrl: data.videoUrl
                    };
                    
                    if (exportCallback) exportCallback(result);
                    return result;
                })
                .catch(error => {
                    unlockExport(); // Mở khóa khi có lỗi
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
            })
            .catch(err => {
                unlockExport(); // Đảm bảo mở khóa ngay cả khi có lỗi ngoài ý muốn
                throw err;
            });
    }
}

// Export để các module khác có thể sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportManager;
} else {
    window.ExportManager = ExportManager;
}