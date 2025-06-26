/**
 * VideoEditor - Trình quản lý chỉnh sửa video tổng thể
 */
class VideoEditor {
    constructor() {
        // Các thành phần
        this.timeline = null;
        this.textOverlay = null;
        this.effectsManager = null;
        
        // Gán instance vào window để các module khác có thể truy cập
        window.videoEditor = this;
        
        // Các phần tử DOM
        this.canvasElement = document.getElementById('preview-canvas');
        this.ctx = this.canvasElement ? this.canvasElement.getContext('2d') : null;
        this.playPreviewBtn = document.getElementById('play-preview-btn');
        this.exportVideoBtn = document.getElementById('export-video-btn');
        this.backToEditBtn = document.getElementById('back-to-edit-btn');
        this.saveVideoBtn = document.getElementById('save-video-btn');
        
        // Các thuộc tính
        this.videoData = null;
        this.loadedMediaItems = {};
        this.isPlaying = false;
        this.playbackTimer = null;
        this.currentTime = 0;
        this.aspectRatio = '16:9';
        
        // Khởi tạo
        this.init();
    }

    /**
     * Khởi tạo VideoEditor
     */
    async init() {
        // Cố gắng lấy dữ liệu từ sessionStorage
        const videoDataJson = sessionStorage.getItem('videoPreviewData');
        
        if (!videoDataJson) {
            alert('Không tìm thấy dữ liệu video. Vui lòng quay lại trang trước.');
            return;
        }
        
        try {
            this.videoData = JSON.parse(videoDataJson);
            console.log("Dữ liệu video từ sessionStorage:", this.videoData);
            
            // Thiết lập kích thước canvas
            this.setupCanvas();
            
            // Khởi tạo các thành phần
            this.initializeComponents();
            
            // Tải trước media
            await this.preloadMedia();
            
            // Chuyển đổi dữ liệu video thành clips cho timeline
            this.convertVideoDataToClips();
            
            // Kiểm tra xem clips đã được thêm đúng vào timeline chưa
            console.log("Kiểm tra timeline sau khi thêm clips:");
            console.log("- Số lượng clips:", this.timeline.clips.length);
            console.log("- Clips đã thêm:", this.timeline.clips);
            console.log("- Thời lượng timeline:", this.timeline.duration, "giây");
            
            // Thiết lập sự kiện
            this.bindEvents();
            
        } catch (error) {
            console.error('Lỗi khởi tạo VideoEditor:', error);
            alert('Đã xảy ra lỗi khi khởi tạo trình chỉnh sửa video.');
        }
    }

    /**
     * Thiết lập kích thước canvas
     */
    setupCanvas() {
        if (!this.canvasElement) return;
        
        // Tính toán kích thước dựa trên aspect ratio
        const containerWidth = this.canvasElement.parentElement.offsetWidth;
        let width = containerWidth;
        let height;
        
        // Thiết lập kích thước theo tỉ lệ
        if (this.aspectRatio === '16:9') {
            height = width * 9 / 16;
        } else if (this.aspectRatio === '4:3') {
            height = width * 3 / 4;
        } else if (this.aspectRatio === '1:1') {
            height = width;
        } else {
            // Mặc định 16:9
            height = width * 9 / 16;
        }
        
        // Thiết lập kích thước
        this.canvasElement.width = width;
        this.canvasElement.height = height;
    }

    /**
     * Khởi tạo các thành phần
     */
    initializeComponents() {
        // Khởi tạo Timeline
        this.timeline = new Timeline({
            onTimeUpdate: (time) => this.updatePreview(time)
        });
        
        // Lắng nghe sự kiện thay đổi thời lượng timeline
        this.timeline.container.addEventListener('timelineDurationChanged', (e) => {
            console.log(`Sự kiện timelineDurationChanged: Thời lượng mới = ${e.detail.duration}s`);
            
            // Cập nhật thời lượng trong UI
            const durationElement = document.getElementById('timeline-duration');
            if (durationElement) {
                durationElement.textContent = this.formatTimeDetailed(e.detail.duration);
            }
            
            // Cập nhật thanh seek
            const seekBar = document.getElementById('timeline-seek');
            if (seekBar) {
                seekBar.max = e.detail.duration;
            }
            
            // Nếu đang phát và thời gian hiện tại vượt quá thời lượng mới
            if (this.isPlaying && this.currentTime > e.detail.duration) {
                this.pausePreview();
                this.timeline.setCurrentTime(e.detail.duration);
            }
        });
        
        // Khởi tạo TextOverlay
        this.textOverlay = new TextOverlay();
        
        // Khởi tạo EffectsManager
        this.effectsManager = new EffectsManager({
            onEffectApplied: () => this.updatePreview(this.currentTime)
        });
    }

    /**
     * Tải trước media
     */
    async preloadMedia() {
        const clips = this.videoData.scriptParts || [];
        console.log('Bắt đầu tải trước media cho', clips.length, 'clips');
        
        for (const clip of clips) {
            if (clip.imagePath) {
                // Tải hình ảnh
                try {
                    console.log(`Đang tải hình ảnh cho phần ${clip.partId}: ${clip.imagePath}`);
                    const image = new Image();
                    image.crossOrigin = "anonymous"; // Cho phép xử lý hình ảnh từ các domain khác
                    image.src = this.convertToRelativePath(clip.imagePath);
                    
                    await new Promise((resolve, reject) => {
                        image.onload = () => {
                            console.log(`Đã tải thành công hình ảnh cho phần ${clip.partId}`);
                            resolve();
                        };
                        image.onerror = (err) => {
                            console.error(`Không thể tải hình ảnh cho phần ${clip.partId}:`, err);
                            reject(new Error(`Không thể tải hình ảnh: ${clip.imagePath}`));
                        };
                        // Timeout sau 5 giây nếu hình không tải được
                        setTimeout(() => {
                            if (!image.complete) {
                                console.warn(`Timeout khi tải hình ảnh cho phần ${clip.partId}`);
                                resolve(); // Vẫn tiếp tục thay vì reject
                            }
                        }, 5000);
                    });
                    
                    this.loadedMediaItems[`image_${clip.partId}`] = image;
                } catch (error) {
                    console.error('Lỗi khi tải hình ảnh:', error);
                }
            }
            
            if (clip.audioPath) {
                // Tải âm thanh
                try {
                    console.log(`Đang tải âm thanh cho phần ${clip.partId}: ${clip.audioPath}`);
                    const audio = new Audio();
                    audio.src = this.convertToRelativePath(clip.audioPath);
                    
                    await new Promise((resolve, reject) => {
                        audio.oncanplaythrough = () => {
                            console.log(`Đã tải thành công âm thanh cho phần ${clip.partId}`);
                            resolve();
                        };
                        audio.onerror = (err) => {
                            console.error(`Không thể tải âm thanh cho phần ${clip.partId}:`, err);
                            reject(new Error(`Không thể tải âm thanh: ${clip.audioPath}`));
                        };
                        // Timeout sau 5 giây nếu audio không tải được
                        setTimeout(() => {
                            if (audio.readyState < 3) {
                                console.warn(`Timeout khi tải âm thanh cho phần ${clip.partId}`);
                                resolve(); // Vẫn tiếp tục thay vì reject
                            }
                        }, 5000);
                    });
                    
                    this.loadedMediaItems[`audio_${clip.partId}`] = audio;
                } catch (error) {
                    console.error('Lỗi khi tải âm thanh:', error);
                }
            }
        }
        
        console.log('Đã tải xong media cho tất cả clips');
        console.log('loadedMediaItems:', this.loadedMediaItems);
    }

    /**
     * Chuyển đổi đường dẫn đầy đủ thành đường dẫn tương đối
     */
    convertToRelativePath(path) {
        if (!path) return '';
        
        // Nếu là URL đầy đủ, giữ nguyên
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        
        // Nếu là đường dẫn tương đối bắt đầu bằng '/', giữ nguyên
        if (path.startsWith('/')) {
            return path;
        }
        
        // Nếu là đường dẫn có chứa giao thức file://, chuyển thành đường dẫn tương đối
        if (path.includes('file://')) {
            const fileName = path.split('/').pop();
            return `/temp/${fileName}`;
        }
        
        // Mặc định giữ nguyên
        return path;
    }

    /**
     * Chuyển đổi dữ liệu video thành clips cho timeline
     */
    convertVideoDataToClips() {
        if (!this.videoData || !this.videoData.scriptParts) return;
        
        console.log("Bắt đầu chuyển đổi dữ liệu video thành clips");
        console.log("scriptParts:", this.videoData.scriptParts);
        console.log("loadedMediaItems:", this.loadedMediaItems);
        
        let startTime = 0;
        
        for (const part of this.videoData.scriptParts) {
            // Tính toán thời lượng dựa trên audio nếu có
            let duration = 5; // Mặc định 5 giây
            const audio = this.loadedMediaItems[`audio_${part.partId}`];
            
            if (audio && !isNaN(audio.duration)) {
                duration = audio.duration;
                console.log(`Clip ${part.partId}: Sử dụng thời lượng audio ${duration}s`);
            }
            
            // Tìm hình ảnh cho clip này
            const imageKey = `image_${part.partId}`;
            let image = this.loadedMediaItems[imageKey];
            
            // Nếu không có hình, kiểm tra xem có đường dẫn ảnh không
            if (!image && part.imagePath) {
                // Tạo hình ảnh mới
                image = new Image();
                image.src = this.convertToRelativePath(part.imagePath);
                this.loadedMediaItems[imageKey] = image;
                console.log(`Clip ${part.partId}: Tạo mới hình ảnh từ ${part.imagePath}`);
            }
            
            // Phân loại clip (video nếu có cả hình và audio, audio nếu chỉ có audio)
            let clipType = 'video'; // Mặc định là video
            
            // Nếu không có hình nhưng có audio, đánh dấu là audio clip
            if ((!image || !part.imagePath) && part.audioPath) {
                clipType = 'audio';
                console.log(`Clip ${part.partId}: Đánh dấu là audio clip vì không có hình`);
            }
            
            // Thêm clip vào timeline với thời lượng cụ thể
            this.timeline.addClipWithTimeConstraint({
                id: part.partId,
                name: `Phần ${part.partId}`,
                type: clipType,
                imagePath: part.imagePath,
                audioPath: part.audioPath,
                text: part.text
            }, duration, startTime);
            
            // Thêm clip audio riêng nếu clip video có audio
            if (clipType === 'video' && part.audioPath) {
                const audioClipId = `audio_${part.partId}`;
                this.timeline.addClipWithTimeConstraint({
                    id: audioClipId,
                    name: `Âm thanh ${part.partId}`,
                    type: 'audio',
                    imagePath: null,
                    audioPath: part.audioPath,
                    text: part.text
                }, duration, startTime);
                
                // Đảm bảo audio được lưu với ID chính xác
                if (audio) {
                    this.loadedMediaItems[audioClipId] = audio;
                }
                
                console.log(`Đã thêm clip audio riêng cho phần ${part.partId}`);
            }
            
            // Cập nhật startTime cho clip tiếp theo
            startTime += duration;
        }
        
        console.log(`Đã chuyển đổi ${this.videoData.scriptParts.length} phần thành clips với tổng thời lượng ${startTime}s`);
    }

    /**
     * Gắn các sự kiện
     */
    bindEvents() {
        // Sự kiện nút phát preview
        if (this.playPreviewBtn) {
            this.playPreviewBtn.addEventListener('click', () => {
                if (this.isPlaying) {
                    this.pausePreview();
                    this.playPreviewBtn.innerHTML = '<i class="bi bi-play-fill"></i> Phát';
                } else {
                    this.playPreview();
                    this.playPreviewBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Tạm dừng';
                }
            });
        }
        
        // Sự kiện nút xuất video
        if (this.exportVideoBtn) {
            this.exportVideoBtn.addEventListener('click', () => {
                this.exportVideo();
            });
        }
        
        // Sự kiện nút quay lại
        if (this.backToEditBtn) {
            this.backToEditBtn.addEventListener('click', () => {
                if (confirm('Bạn có chắc muốn quay lại trang trước? Các thay đổi chưa lưu sẽ bị mất.')) {
                    window.location.href = '/api/advanced-video/edit-parts';
                }
            });
        }
        
        // Sự kiện nút lưu thay đổi
        if (this.saveVideoBtn) {
            this.saveVideoBtn.addEventListener('click', () => {
                this.saveChanges();
            });
        }
        
        // Sự kiện resize cửa sổ
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.updatePreview(this.currentTime);
        });
    }

    /**
     * Cập nhật preview tại thời điểm cụ thể
     */
    updatePreview(time) {
        if (!this.ctx || !this.canvasElement) return;
        
        this.currentTime = time;
        
        // Xóa canvas
        this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Tìm clip video đang hiển thị tại thời điểm hiện tại
        const currentVideoClip = this.timeline.clips.find(clip => 
            clip.type === 'video' && time >= clip.startTime && time < (clip.startTime + clip.duration)
        );
        
        // Tìm clip audio đang phát tại thời điểm hiện tại
        const currentAudioClip = this.timeline.clips.find(clip => 
            clip.type === 'audio' && time >= clip.startTime && time < (clip.startTime + clip.duration)
        );
        
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
                    img.src.includes(currentVideoClip.imagePath.split('/').pop())
                );
                
                // Nếu vẫn không tìm thấy, tạo hình mới
                if (!image) {
                    image = new Image();
                    image.src = this.convertToRelativePath(currentVideoClip.imagePath);
                    this.loadedMediaItems[imageKey] = image;
                }
            }
            
            // Hiển thị hình ảnh với hiệu ứng
            if (image && image.complete) {
                // Vẽ hình ảnh lên toàn bộ canvas
                this.ctx.drawImage(image, 0, 0, this.canvasElement.width, this.canvasElement.height);
                
                // Áp dụng hiệu ứng nếu có
                this.effectsManager.applyEffectToCanvas(this.ctx, currentVideoClip.id);
            } else {
                // Vẽ nền đen với tên clip nếu không có hình
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
                
                // Vẽ tên clip
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '24px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(currentVideoClip.name || `Clip ${currentVideoClip.id}`, 
                    this.canvasElement.width / 2, this.canvasElement.height / 2);
            }
        } else {
            // Vẽ nền đen nếu không có clip video
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        }
        
        // Xử lý phát audio
        if (this.isPlaying) {
            // Dừng tất cả audio không liên quan
            Object.entries(this.loadedMediaItems)
                .filter(([key, item]) => item instanceof Audio)
                .forEach(([key, audio]) => {
                    // Nếu không phải audio hiện tại, dừng lại
                    if (!currentAudioClip || !key.includes(currentAudioClip.id)) {
                        audio.pause();
                    }
                });
            
            // Phát audio nếu có
            if (currentAudioClip) {
                // Tìm audio đúng cho clip này
                let audioKey = currentAudioClip.id;
                // Nếu ID không bắt đầu bằng "audio_", thêm tiền tố
                if (!audioKey.startsWith('audio_')) {
                    audioKey = `audio_${audioKey}`;
                }
                
                const audio = this.loadedMediaItems[audioKey] || this.loadedMediaItems[currentAudioClip.id];
                
                if (audio) {
                    const clipTime = time - currentAudioClip.startTime;
                    
                    // Nếu audio đang tạm dừng hoặc chưa phát
                    if (audio.paused) {
                        // Đặt thời gian hiện tại và phát
                        audio.currentTime = clipTime;
                        
                        // Đảm bảo rằng audio sẽ phát hết
                        const playPromise = audio.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(err => console.error('Lỗi khi phát audio:', err));
                        }
                    } else {
                        // Điều chỉnh thời gian nếu chênh lệch quá lớn
                        if (Math.abs(audio.currentTime - clipTime) > 0.5) {
                            audio.currentTime = clipTime;
                        }
                    }
                    
                    // Cập nhật thời lượng clip audio nếu cần
                    if (audio.duration && audio.duration !== currentAudioClip.duration) {
                        console.log(`Cập nhật thời lượng clip audio ${currentAudioClip.id} từ ${currentAudioClip.duration}s thành ${audio.duration}s`);
                        currentAudioClip.duration = audio.duration;
                        this.timeline.updateTimelineDuration();
                    }
                }
            }
        }
        
        // Cập nhật text overlays
        this.textOverlay.updateAtTime(time);
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
        
        // Dừng tất cả các audio
        Object.values(this.loadedMediaItems).forEach(item => {
            if (item instanceof Audio) {
                item.pause();
            }
        });
        
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
                this.playPreviewBtn.innerHTML = '<i class="bi bi-play-fill"></i> Phát';
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
        Object.values(this.loadedMediaItems).forEach(item => {
            if (item instanceof Audio) {
                item.pause();
            }
        });
    }

    /**
     * Xuất video
     */
    exportVideo() {
        // Lưu cấu hình hiện tại
        this.saveChanges();
        
        // Hiển thị thông báo
        alert('Video đang được tạo. Quá trình này có thể mất vài phút tùy thuộc vào độ dài và độ phức tạp của video.');
        
        // Gửi yêu cầu tạo video
        fetch('/api/advanced-video/create-edited-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: this.videoData.sessionId,
                parts: this.exportData()
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Hiển thị video đã xuất
                const resultContainer = document.getElementById('result-container');
                const resultVideo = document.getElementById('result-video');
                
                if (resultContainer && resultVideo) {
                    resultVideo.src = data.videoUrl;
                    resultContainer.style.display = 'block';
                    
                    // Cuộn xuống kết quả
                    resultContainer.scrollIntoView({ behavior: 'smooth' });
                }
                
                alert('Video đã được tạo thành công!');
            } else {
                alert(`Lỗi khi tạo video: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Lỗi khi gọi API tạo video:', error);
            alert('Đã xảy ra lỗi khi tạo video. Vui lòng thử lại sau.');
        });
    }

    /**
     * Lưu thay đổi
     */
    saveChanges() {
        // Thu thập dữ liệu từ timeline, text overlay và effects
        const exportData = this.exportData();
        
        // Cập nhật dữ liệu vào sessionStorage
        sessionStorage.setItem('videoEditedData', JSON.stringify({
            sessionId: this.videoData.sessionId,
            parts: exportData
        }));
        
        // Gửi yêu cầu lưu dữ liệu
        fetch('/api/advanced-video/save-video-edits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: this.videoData.sessionId,
                parts: exportData
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Đã lưu thay đổi!');
            } else {
                alert(`Lỗi khi lưu thay đổi: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Lỗi khi gọi API lưu dữ liệu:', error);
            alert('Đã xảy ra lỗi khi lưu thay đổi. Vui lòng thử lại sau.');
        });
    }

    /**
     * Xuất dữ liệu cho việc tạo video
     */
    exportData() {
        const exportData = [];
        
        // Thu thập dữ liệu từ clips
        for (const clip of this.timeline.clips) {
            exportData.push({
                partId: clip.id,
                name: clip.name,
                startTime: clip.startTime,
                duration: clip.duration,
                imagePath: clip.imagePath,
                audioPath: clip.audioPath,
                text: clip.text,
                transition: clip.transition || 'none',
                effect: this.effectsManager.getEffectForClip(clip.id)
            });
        }
        
        // Thu thập dữ liệu text overlays
        const textItems = this.textOverlay.getTextItems();
        
        // Thêm textItems vào data
        exportData.push({
            type: 'textOverlays',
            items: textItems
        });
        
        return exportData;
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

// Khởi tạo khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    // Tạo instance global để các thành phần khác có thể truy cập
    window.editor = new VideoEditor();
});