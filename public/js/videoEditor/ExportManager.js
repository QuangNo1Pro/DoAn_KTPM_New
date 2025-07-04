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

                if (typeof this.dataConverter.textOverlay.getTextItems === 'function') {
                    const textItems = this.dataConverter.textOverlay.getTextItems();
                    console.log('Text items sẵn sàng để xuất:', textItems);
                    resolve(true);
                    return;
                }

                if (this.dataConverter.textOverlay.textItems && Array.isArray(this.dataConverter.textOverlay.textItems)) {
                    console.log('Đối tượng TextOverlay.textItems sẵn sàng:', this.dataConverter.textOverlay.textItems);
                    resolve(true);
                    return;
                }

                if (window.textOverlayModuleState && !window.textOverlayModuleState.isLoaded) {
                    console.log('Đang đợi TextOverlay module được tải xong...');

                    setTimeout(() => {
                        console.warn('Đã đạt timeout khi đợi TextOverlay, tiếp tục xuất video');
                        resolve(false);
                    }, 2000);

                    const checkInterval = setInterval(() => {
                        if (window.textOverlayModuleState && window.textOverlayModuleState.isLoaded) {
                            clearInterval(checkInterval);
                            console.log('TextOverlay module đã tải xong, tiếp tục xuất video');
                            resolve(true);
                        }
                    }, 100);
                } else {
                    resolve(false);
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

        this.saveChanges()
            .catch(error => {
                console.warn('Không thể lưu thay đổi trước khi xuất:', error);
            });

        return ensureTextOverlayLoaded()
            .then(() => {
                const sessionId = this.videoData.sessionId;
                const parts = this.dataConverter.exportData();
                const selectedMusic = document.getElementById('bg-music-select')?.value || '';
                const musicVolume = parseFloat(document.getElementById('bg-music-volume')?.value || '0.5');
                const musicStartTime = parseFloat(document.getElementById('music-start-time')?.value || '0');
                const musicEndTime = parseFloat(document.getElementById('music-end-time')?.value || '60');

                console.log('DEBUG - Request Data:', {
                    sessionId: sessionId,
                    sessionIdType: typeof sessionId,
                    parts: parts,
                    partsLength: parts.length
                });

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

                if (!navigator.onLine) {
                    const result = {
                        success: false,
                        error: 'Không có kết nối internet. Vui lòng thử lại sau.',
                        offline: true
                    };
                    if (exportCallback) exportCallback(result);
                    return Promise.resolve(result);
                }

                return this.fetchWithRetry('/api/advanced-video/create-edited-video', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        parts: parts,
                        music: selectedMusic,
                        musicVolume: musicVolume,
                        musicStartTime: musicStartTime,
                        musicEndTime: musicEndTime
                    })
                })
                    .then(async response => {
                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('DEBUG - Response Error Text:', errorText);

                            try {
                                const errorJson = JSON.parse(errorText);
                                throw new Error(`Lỗi kết nối: ${response.status} ${response.statusText}. Chi tiết: ${errorJson.error || errorText}`);
                            } catch (e) {
                                throw new Error(`Lỗi kết nối: ${response.status} ${response.statusText}. Chi tiết: ${errorText}`);
                            }
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.success) {
                            const result = {
                                success: true,
                                videoUrl: data.videoUrl
                            };
                            if (exportCallback) exportCallback(result);
                            return result;
                        } else {
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
