/**
 * MediaLoader - Quản lý việc tải media (hình ảnh, âm thanh)
 */
class MediaLoader {
    constructor(options = {}) {
        this.loadedMediaItems = {};
        this.onMediaLoaded = options.onMediaLoaded || function() {};
        // Thêm một danh sách các retry cho file audio
        this.audioLoadRetries = {};
        this.maxAudioRetries = 3;
    }

    /**
     * Chuyển đổi đường dẫn đầy đủ thành đường dẫn tương đối
     */
    convertToRelativePath(path) {
        if (!path) return '';
        
        // Đảm bảo đường dẫn bắt đầu bằng /
        if (!path.startsWith('/') && !path.startsWith('http')) {
            path = '/' + path;
        }
        
        // Xóa các tham số cache-busting đã có (nếu có)
        if (path.includes('?')) {
            path = path.split('?')[0];
        }
        
        // Thêm tham số cache-busting để tránh lỗi cache
        path = path + '?t=' + Date.now();
        
        // Log đường dẫn đã chuyển đổi để debug
        console.log(`Đường dẫn chuyển đổi: ${path}`);
        
        return path;
    }

    /**
     * Tải trước media
     */
    async preloadMedia(clips) {
        console.log('Bắt đầu tải trước media cho', clips.length, 'clips');
        
        const loadPromises = [];
        
        for (const clip of clips) {
            // Kiểm tra xem ID có hợp lệ không
            if (!clip.partId) {
                console.warn('Clip không có partId, bỏ qua:', clip);
                continue;
            }
            
            if (clip.imagePath) {
                // Thêm promise tải hình ảnh vào mảng
                loadPromises.push(this.loadImage(clip));
            }
            
            if (clip.audioPath) {
                // Thêm promise tải âm thanh vào mảng
                loadPromises.push(this.loadAudio(clip));
            }
        }
        
        // Đợi tất cả media tải xong (hoặc timeout)
        await Promise.allSettled(loadPromises);
        
        console.log('Đã tải xong media cho tất cả clips');
        console.log('loadedMediaItems:', Object.keys(this.loadedMediaItems).length, 'items');
        
        // Kiểm tra kết quả tải audio
        const audioItems = Object.entries(this.loadedMediaItems)
            .filter(([key, value]) => key.startsWith('audio_') && value instanceof Audio);
        
        console.log(`Đã tải ${audioItems.length} file audio`);

        // Tạo audio mặc định cho các clip không tải được audio
        for (const clip of clips) {
            if (clip.audioPath) {
                const audioKey = `audio_${clip.partId}`;
                if (!this.loadedMediaItems[audioKey]) {
                    console.warn(`Tạo audio mặc định cho clip ${clip.partId}`);
                    const audio = new Audio();
                    audio.src = this.convertToRelativePath(clip.audioPath);
                    this.loadedMediaItems[audioKey] = audio;
                }
            }
        }

        // Thông báo đã tải xong media
        this.onMediaLoaded(this.loadedMediaItems);
        
        return this.loadedMediaItems;
    }
    
    /**
     * Tải hình ảnh
     */
    async loadImage(clip) {
        try {
            console.log(`Đang tải hình ảnh cho phần ${clip.partId}: ${clip.imagePath}`);
            const image = new Image();
            image.crossOrigin = "anonymous"; // Cho phép xử lý hình ảnh từ các domain khác
            
            const imagePromise = new Promise((resolve) => {
                image.onload = () => {
                    console.log(`Đã tải thành công hình ảnh cho phần ${clip.partId}`);
                    resolve(true);
                };
                
                image.onerror = (err) => {
                    console.error(`Không thể tải hình ảnh cho phần ${clip.partId}:`, err);
                    resolve(false);
                };
                
                // Timeout sau 15 giây nếu hình không tải được
                setTimeout(() => {
                    if (!image.complete) {
                        console.warn(`Timeout khi tải hình ảnh cho phần ${clip.partId}`);
                        resolve(false);
                    }
                }, 15000);
                
                // Đặt src sau khi gắn sự kiện
                image.src = this.convertToRelativePath(clip.imagePath);
            });
            
            const success = await imagePromise;
            if (success) {
                this.loadedMediaItems[`image_${clip.partId}`] = image;
            }
            
            return success;
        } catch (error) {
            console.error(`Lỗi khi tải hình ảnh cho phần ${clip.partId}:`, error);
            return false;
        }
    }
    
    /**
     * Tải âm thanh với cách xử lý cải tiến
     */
    async loadAudio(clip) {
        try {
            console.log(`Đang tải âm thanh cho phần ${clip.partId}: ${clip.audioPath}`);
            const audio = new Audio();
            
            // Đặt các thuộc tính để tránh vấn đề autoplay
            audio.preload = "auto";  // Tải âm thanh ngay lập tức
            audio.volume = 1.0;      // Đảm bảo âm lượng đủ lớn
            audio.muted = false;     // Không tắt tiếng
            
            const audioPath = this.convertToRelativePath(clip.audioPath);
            
            const audioPromise = new Promise((resolve) => {
                const timeoutId = setTimeout(() => {
                    console.warn(`Timeout khi tải âm thanh cho phần ${clip.partId}`);
                    
                    // Kiểm tra xem đã retry bao nhiêu lần
                    const retryCount = this.audioLoadRetries[clip.partId] || 0;
                    
                    if (retryCount < this.maxAudioRetries) {
                        // Tăng số lần retry
                        this.audioLoadRetries[clip.partId] = retryCount + 1;
                        
                        console.log(`Đang thử lại lần ${retryCount + 1} cho âm thanh phần ${clip.partId}`);
                        
                        // Thử fetch trực tiếp file audio để xem có tồn tại không
                        fetch(audioPath)
                            .then(response => {
                                if (response.ok) {
                                    console.log(`Đã xác nhận file âm thanh ${clip.partId} tồn tại`);
                                    // File tồn tại, lưu audio ngay cả khi timeout
                                    this.loadedMediaItems[`audio_${clip.partId}`] = audio;
                                } else {
                                    console.error(`File âm thanh ${clip.partId} không tồn tại`);
                                }
                                resolve(false);
                            })
                            .catch(err => {
                                console.error(`Lỗi khi kiểm tra file âm thanh ${clip.partId}:`, err);
                                resolve(false);
                            });
                    } else {
                        // Vẫn lưu audio cho dù timeout
                        this.loadedMediaItems[`audio_${clip.partId}`] = audio;
                        resolve(false);
                    }
                }, 20000); // Tăng thời gian timeout lên 20 giây
                
                // Sự kiện khi tải xong
                audio.addEventListener('canplaythrough', () => {
                    clearTimeout(timeoutId);
                    console.log(`Đã tải thành công âm thanh cho phần ${clip.partId}`);
                    this.loadedMediaItems[`audio_${clip.partId}`] = audio;
                    resolve(true);
                }, { once: true });
                
                // Sự kiện khi lỗi
                audio.addEventListener('error', (err) => {
                    clearTimeout(timeoutId);
                    console.error(`Không thể tải âm thanh cho phần ${clip.partId}:`, err);
                    
                    // Tạo audio mặc định
                    this.loadedMediaItems[`audio_${clip.partId}`] = audio;
                    resolve(false);
                }, { once: true });
                
                // Đặt src sau khi đã gắn event handler
                audio.src = audioPath;
                
                // Thử tải âm thanh
                try {
                    audio.load();
                    
                    // Thử phát để kích hoạt việc tải
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            // Tạm dừng ngay sau đó để không phát âm thanh
                            audio.pause();
                            audio.currentTime = 0;
                        }).catch(e => {
                            // Không cần xử lý lỗi autoplay ở đây
                        });
                    }
                } catch (e) {
                    console.warn(`Lỗi khi gọi audio.load() cho phần ${clip.partId}:`, e);
                }
            });
            
            await audioPromise;
            return true;
        } catch (error) {
            console.error(`Lỗi khi tải âm thanh cho phần ${clip.partId}:`, error);
            return false;
        }
    }

    /**
     * Lấy media đã tải
     */
    getLoadedMedia() {
        return this.loadedMediaItems;
    }

    /**
     * Tạm dừng tất cả audio
     */
    pauseAllAudio() {
        Object.values(this.loadedMediaItems).forEach(item => {
            if (item instanceof Audio) {
                try {
                    item.pause();
                } catch (e) {
                    console.warn('Lỗi khi dừng audio:', e);
                }
            }
        });
    }
}

// Export để các module khác có thể sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediaLoader;
} else {
    window.MediaLoader = MediaLoader;
}