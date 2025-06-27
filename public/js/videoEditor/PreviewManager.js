/**
 * PreviewManager - Quản lý việc hiển thị preview video
 */
class PreviewManager {
    constructor(options = {}) {
        this.canvasElement = options.canvasElement;
        this.ctx = this.canvasElement ? this.canvasElement.getContext('2d') : null;
        this.timeline = options.timeline;
        this.loadedMediaItems = options.loadedMediaItems || {};
        this.effectsManager = options.effectsManager;
        this.textOverlay = options.textOverlay;
        
        this.isPlaying = false;
        this.playbackTimer = null;
        this.currentTime = 0;
        this.aspectRatio = options.aspectRatio || '16:9';
        
        // Theo dõi audio đang phát
        this.currentPlayingAudio = null;
        
        // Tối ưu render
        this.lastRenderedTime = -1;
        this.lastRenderedClipId = null;
        this.renderThrottle = 40; // ms (25 FPS)
        this.lastRenderTimestamp = 0;
        
        // Mặc định bật âm thanh
        this.audioEnabled = true;
    }

    /**
     * Phát audio hiện tại
     */
    playCurrentAudio() {
        // Không cần kiểm tra audioEnabled vì luôn bật
        
        // Tìm clip audio tại thời điểm hiện tại
        const currentAudioClip = this.timeline.clips.find(clip => 
            clip.type === 'audio' && 
            this.currentTime >= clip.startTime && 
            this.currentTime < (clip.startTime + clip.duration)
        );
        
        if (currentAudioClip) {
            this.handleAudioPlayback(currentAudioClip, this.currentTime);
        }
    }

    /**
     * Thiết lập kích thước canvas
     */
    setupCanvas() {
        if (!this.canvasElement) return;
        
        // Lấy kích thước container
        const container = this.canvasElement.parentElement;
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        console.log(`Kích thước container: ${containerWidth}x${containerHeight}`);
        
        // Thiết lập kích thước canvas chính xác bằng container
        this.canvasElement.width = containerWidth;
        this.canvasElement.height = containerHeight;
        
        // Log ra kích thước thiết lập
        console.log(`Đã thiết lập canvas: ${this.canvasElement.width}x${this.canvasElement.height}`);
    }

    /**
     * Cập nhật preview tại thời điểm cụ thể
     */
    updatePreview(time) {
        if (!this.ctx || !this.canvasElement) return;
        
        // Giảm tần suất cập nhật (throttle)
        const now = performance.now();
        if (now - this.lastRenderTimestamp < this.renderThrottle) {
            return; // Bỏ qua nếu được gọi quá nhanh
        }
        this.lastRenderTimestamp = now;
        
        this.currentTime = time;
        
        // Tìm clip video đang hiển thị tại thời điểm hiện tại
        const currentVideoClip = this.timeline.clips.find(clip => 
            clip.type === 'video' && time >= clip.startTime && time < (clip.startTime + clip.duration)
        );
        
        // Tìm clip audio đang phát tại thời điểm hiện tại
        const currentAudioClip = this.timeline.clips.find(clip => 
            clip.type === 'audio' && time >= clip.startTime && time < (clip.startTime + clip.duration)
        );
        
        // Kiểm tra nếu không cần cập nhật hình ảnh
        const currentClipId = currentVideoClip ? currentVideoClip.id : null;
        const clipTime = currentVideoClip ? (time - currentVideoClip.startTime) : 0;
        
        // Force cập nhật nếu đang phát
        const forceUpdate = this.isPlaying;
        
        // Chỉ vẽ lại nếu clip thay đổi hoặc thời gian thay đổi đáng kể
        if (!forceUpdate && 
            currentClipId === this.lastRenderedClipId && 
            Math.abs(time - this.lastRenderedTime) < 0.1) {
            
            // Chỉ cập nhật text overlay nếu cần thiết mà không vẽ lại toàn bộ
            if (this.textOverlay) {
                this.textOverlay.updateAtTime(time);
            }
            return;
        }
        
        this.lastRenderedTime = time;
        this.lastRenderedClipId = currentClipId;
        
        // Xóa canvas
        this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Xử lý hiển thị video/ảnh
        if (currentVideoClip) {
            // Lấy hình ảnh từ danh sách đã tải
            const imageKey = `image_${currentVideoClip.id}`;
            let image = this.loadedMediaItems[imageKey];
            
            // Nếu không có hình, kiểm tra xem clip có đường dẫn imagePath không
            if (!image && currentVideoClip.imagePath) {
                // Tìm trong danh sách đã tải hoặc tạo hình mới
                const existingImages = Object.values(this.loadedMediaItems)
                    .filter(item => item instanceof HTMLImageElement);
                
                // Tìm hình theo đường dẫn
                image = existingImages.find(img => 
                    img.src && img.src.includes(currentVideoClip.imagePath.split('/').pop())
                );
                
                // Nếu vẫn không tìm thấy, tạo hình mới
                if (!image) {
                    image = new Image();
                    image.src = currentVideoClip.imagePath;
                    this.loadedMediaItems[imageKey] = image;
                }
            }
            
            // Vẽ nền đen trước
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
            
            // Hiển thị hình ảnh và áp dụng hiệu ứng
            if (image && image.complete) {
                try {
                    // Tính toán kích thước để hình ảnh vừa khít với canvas mà không bị méo
                    const canvasRatio = this.canvasElement.width / this.canvasElement.height;
                    const imageRatio = image.width / image.height;
                    
                    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
                    
                    if (imageRatio > canvasRatio) {
                        // Hình ngang hơn canvas, căn chỉnh theo chiều cao
                        drawHeight = this.canvasElement.height;
                        drawWidth = drawHeight * imageRatio;
                        offsetX = (this.canvasElement.width - drawWidth) / 2;
                    } else {
                        // Hình dọc hơn canvas, căn chỉnh theo chiều rộng
                        drawWidth = this.canvasElement.width;
                        drawHeight = drawWidth / imageRatio;
                        offsetY = (this.canvasElement.height - drawHeight) / 2;
                    }
                    
                    // Vẽ hình ảnh đã được căn chỉnh
                    this.ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
                    
                    // Áp dụng hiệu ứng nếu có
                    if (this.effectsManager) {
                        console.log(`Áp dụng hiệu ứng cho clip ${currentVideoClip.id}`);
                        this.effectsManager.applyEffectToCanvas(this.ctx, currentVideoClip.id);
                    }
                } catch (error) {
                    console.error('Lỗi khi vẽ hình:', error);
                    
                    // Vẽ thông báo lỗi
                    this.ctx.fillStyle = '#f00';
                    this.ctx.font = '16px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('Lỗi hiển thị hình ảnh', 
                        this.canvasElement.width / 2, this.canvasElement.height / 2);
                }
            } else {
                // Vẽ nền đen với tên clip nếu không có hình
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '24px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(currentVideoClip.name || `Clip ${currentVideoClip.id}`, 
                    this.canvasElement.width / 2, this.canvasElement.height / 2);
                this.ctx.font = '16px Arial';
                this.ctx.fillText('Đang tải hình ảnh...', 
                    this.canvasElement.width / 2, this.canvasElement.height / 2 + 30);
            }
        } else {
            // Vẽ nền đen nếu không có clip video
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
            
            // Vẽ thông báo không có clip
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Không có clip tại thời điểm hiện tại', 
                this.canvasElement.width / 2, this.canvasElement.height / 2);
            
            // Vẫn áp dụng hiệu ứng toàn cục nếu có
            if (this.effectsManager) {
                console.log('Áp dụng hiệu ứng toàn cục');
                this.effectsManager.applyEffectToCanvas(this.ctx, null);
            }
        }
        
        // Xử lý phát audio
        if (this.isPlaying) {
            this.handleAudioPlayback(currentAudioClip, time);
        }
        
        // Cập nhật text overlays
        if (this.textOverlay) {
            this.textOverlay.updateAtTime(time);
        }
    }
    
    /**
     * Xử lý phát audio
     */
    handleAudioPlayback(currentAudioClip, time) {
        // Không còn điều kiện kiểm tra audioEnabled vì luôn bật
        
        // Tạm dừng audio hiện tại nếu không phải clip hiện tại
        if (this.currentPlayingAudio) {
            // Nếu không có clip audio hiện tại hoặc clip đã thay đổi
            if (!currentAudioClip || !this.currentPlayingAudio.dataset.clipId.includes(currentAudioClip.id)) {
                try {
                    this.currentPlayingAudio.pause();
                    this.currentPlayingAudio = null;
                } catch (error) {
                    console.warn('Lỗi khi dừng audio đang phát:', error);
                }
            }
        }
        
        // Nếu có clip audio hiện tại
        if (currentAudioClip) {
            // Tìm audio đúng cho clip này
            let audioKey = currentAudioClip.id;
            // Nếu ID không bắt đầu bằng "audio_", thêm tiền tố
            if (!audioKey.startsWith('audio_')) {
                audioKey = `audio_${audioKey}`;
            }
            
            const audio = this.loadedMediaItems[audioKey] || this.loadedMediaItems[currentAudioClip.id];
            
            if (audio) {
                // Đánh dấu ID của clip vào audio
                if (!audio.dataset) audio.dataset = {};
                audio.dataset.clipId = currentAudioClip.id;
                
                const clipTime = time - currentAudioClip.startTime;
                
                // Nếu audio đang tạm dừng hoặc chưa phát
                if (audio.paused) {
                    // Đặt thời gian hiện tại
                    audio.currentTime = clipTime;
                    
                    // Đánh dấu audio hiện tại
                    this.currentPlayingAudio = audio;
                    
                    try {
                        // Đặt âm lượng và đảm bảo không bị tắt tiếng
                        audio.volume = 1.0;
                        audio.muted = false;
                        
                        // Thử phát audio và khởi động bằng tương tác người dùng
                        const playPromise = audio.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(err => {
                                console.warn('Không thể tự động phát audio - đã bị chặn:', err);
                                
                                // Tự động kích hoạt audio khi có tương tác người dùng
                                const handleUserInteraction = () => {
                                    audio.play().catch(err => console.warn('Vẫn không thể phát audio:', err));
                                    
                                    // Xóa event listeners sau khi đã kích hoạt
                                    document.removeEventListener('click', handleUserInteraction);
                                    document.removeEventListener('keydown', handleUserInteraction);
                                };
                                
                                // Thêm sự kiện để bắt tương tác người dùng
                                document.addEventListener('click', handleUserInteraction, {once: true});
                                document.addEventListener('keydown', handleUserInteraction, {once: true});
                            });
                        }
                    } catch (e) {
                        console.warn('Lỗi khi phát audio:', e);
                    }
                } else {
                    // Nếu thời gian hiện tại của audio chênh lệch quá lớn so với thời gian hiện tại của clip
                    if (Math.abs(audio.currentTime - clipTime) > 0.3) {
                        audio.currentTime = clipTime;
                    }
                }
            }
        }
    }

    /**
     * Phát preview
     */
    playPreview() {
        if (this.isPlaying) return;
        
        // Lấy thời lượng hiện tại của timeline
        const currentDuration = this.timeline.duration;
        console.log(`Bắt đầu phát với thời lượng: ${currentDuration}s`);
        
        this.isPlaying = true;
        const startTime = performance.now() - (this.currentTime * 1000);
        
        // Dừng tất cả các audio trước khi bắt đầu phát mới
        this.pauseAllAudio();
        
        const updatePlayback = (timestamp) => {
            if (!this.isPlaying) return;
            
            // Tính toán thời gian đã trôi qua
            const elapsedSeconds = (timestamp - startTime) / 1000;
            
            // Cập nhật thời gian hiện tại - QUAN TRỌNG: Sử dụng thời lượng hiện tại của timeline
            // thay vì thời lượng đã lưu trước đó
            const currentTimelineDuration = this.timeline.duration;
            
            // Kiểm tra xem đã đến cuối video chưa - sử dụng thời lượng hiện tại của timeline
            if (elapsedSeconds >= currentTimelineDuration) {
                // Dừng phát video và đặt playhead đúng ở cuối video
                this.pausePreview();
                this.timeline.setCurrentTime(currentTimelineDuration);
                return;
            }
            
            // Cập nhật thời gian hiện tại
            this.timeline.setCurrentTime(elapsedSeconds);
            
            // Tiếp tục vòng lặp animation
            this.playbackTimer = requestAnimationFrame(updatePlayback);
        };
        
        this.playbackTimer = requestAnimationFrame(updatePlayback);
    }

    /**
     * Tạm dừng preview
     */
    pausePreview() {
        this.isPlaying = false;
        
        if (this.playbackTimer) {
            cancelAnimationFrame(this.playbackTimer);
            this.playbackTimer = null;
        }
        
        // Dừng tất cả các audio
        this.pauseAllAudio();
    }
    
    /**
     * Dừng tất cả audio
     */
    pauseAllAudio() {
        // Dừng tất cả các audio
        Object.values(this.loadedMediaItems).forEach(item => {
            if (item instanceof Audio) {
                try {
                    item.pause();
                } catch (e) {
                    console.warn('Lỗi khi dừng audio:', e);
                }
            }
        });
        
        // Reset biến theo dõi
        this.currentPlayingAudio = null;
    }
    
    /**
     * Format thời gian chi tiết (mm:ss.ms)
     */
    formatTimeDetailed(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
}

// Export để các module khác có thể sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewManager;
} else {
    window.PreviewManager = PreviewManager;
}