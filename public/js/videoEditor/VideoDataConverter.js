/**
 * VideoDataConverter - Xử lý chuyển đổi dữ liệu video
 */
class VideoDataConverter {
    constructor(options = {}) {
        this.timeline = options.timeline;
        this.effectsManager = options.effectsManager;
        this.textOverlay = options.textOverlay;
        this.loadedMediaItems = options.loadedMediaItems || {};
    }

    /**
     * Chuyển đổi dữ liệu video thành clips cho timeline
     */
    convertVideoDataToClips(videoData) {
        if (!videoData || !videoData.scriptParts) return [];
        
        console.log("Bắt đầu chuyển đổi dữ liệu video thành clips");
        console.log("scriptParts:", videoData.scriptParts);
        console.log("loadedMediaItems:", this.loadedMediaItems);
        
        let startTime = 0;
        const addedClips = [];
        
        for (const part of videoData.scriptParts) {
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
                image.src = part.imagePath;
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
            const clipData = {
                id: part.partId,
                name: `Phần ${part.partId}`,
                type: clipType,
                imagePath: part.imagePath,
                audioPath: part.audioPath,
                text: part.text,
                startTime: startTime,
                duration: duration
            };
            
            addedClips.push(clipData);
            
            // Thêm clip audio riêng nếu clip video có audio
            if (clipType === 'video' && part.audioPath) {
                const audioClipId = `audio_${part.partId}`;
                const audioClipData = {
                    id: audioClipId,
                    name: `Âm thanh ${part.partId}`,
                    type: 'audio',
                    imagePath: null,
                    audioPath: part.audioPath,
                    text: part.text,
                    startTime: startTime,
                    duration: duration
                };
                
                addedClips.push(audioClipData);
                
                // Đảm bảo audio được lưu với ID chính xác
                if (audio) {
                    this.loadedMediaItems[audioClipId] = audio;
                }
                
                console.log(`Đã thêm clip audio riêng cho phần ${part.partId}`);
            }
            
            // Cập nhật startTime cho clip tiếp theo
            startTime += duration;
        }
        
        console.log(`Đã chuyển đổi ${videoData.scriptParts.length} phần thành ${addedClips.length} clips với tổng thời lượng ${startTime}s`);
        
        return addedClips;
    }

    /**
     * Xuất dữ liệu cho việc tạo video
     */
    exportData() {
        const exportData = [];
        
        // Thu thập dữ liệu từ clips
        for (const clip of this.timeline.clips) {
            // Kiểm tra dữ liệu của clip
            if (!clip.id || !clip.imagePath || !clip.audioPath) {
                console.warn(`Clip không hợp lệ: ID=${clip.id}, Image=${clip.imagePath}, Audio=${clip.audioPath}`);
                continue; // Bỏ qua clip không hợp lệ
            }
            
            // Kiểm tra xem đường dẫn hình ảnh và âm thanh có đúng không
            let imagePath = clip.imagePath;
            let audioPath = clip.audioPath;
            
            // Đảm bảo đường dẫn đúng định dạng
            if (imagePath && !imagePath.startsWith('/') && !imagePath.startsWith('http')) {
                imagePath = '/' + imagePath;
                console.log(`Đã chuyển đổi đường dẫn hình ảnh: ${clip.imagePath} -> ${imagePath}`);
            }
            
            if (audioPath && !audioPath.startsWith('/') && !audioPath.startsWith('http')) {
                audioPath = '/' + audioPath;
                console.log(`Đã chuyển đổi đường dẫn âm thanh: ${clip.audioPath} -> ${audioPath}`);
            }
            
            exportData.push({
                partId: clip.id,
                name: clip.name || `Clip ${clip.id}`,
                startTime: clip.startTime || 0,
                duration: clip.duration || 3,
                imagePath: imagePath,
                audioPath: audioPath,
                text: clip.text || '',
                transition: clip.transition || 'none',
                effect: this.effectsManager ? this.effectsManager.getEffectForClip(clip.id) : null
            });
        }
        
        // Thêm log để debug
        console.log('Đã xuất dữ liệu cho video:', {
            clipCount: this.timeline.clips.length,
            validClips: exportData.length
        });
        
        // Thu thập dữ liệu text overlays - cần kiểm tra kỹ phần này
        if (this.textOverlay) {
            console.log('TextOverlay object exists:', this.textOverlay);
            
            // Kiểm tra phương thức getTextItems tồn tại
            if (typeof this.textOverlay.getTextItems === 'function') {
                try {
                    const textItems = this.textOverlay.getTextItems();
                    console.log('TextItems retrieved:', textItems);
                    
                    if (textItems && textItems.length > 0) {
                        // Thêm textItems vào data như một phần riêng biệt
                        exportData.push({
                            type: 'textOverlays',
                            items: textItems
                        });
                    } else {
                        console.warn('Không có text items được tìm thấy hoặc mảng rỗng');
                    }
                } catch (error) {
                    console.error('Lỗi khi gọi getTextItems:', error);
                }
            } else {
                console.warn('Phương thức getTextItems không tồn tại trong textOverlay');
                
                // Thử lấy trực tiếp từ textItems nếu có
                if (this.textOverlay.textItems && this.textOverlay.textItems.length > 0) {
                    console.log('Lấy textItems trực tiếp từ thuộc tính:', this.textOverlay.textItems);
                    exportData.push({
                        type: 'textOverlays',
                        items: this.textOverlay.textItems
                    });
                }
            }
        } else {
            console.warn('Không có đối tượng textOverlay');
        }
        
        return exportData;
    }
}

// Export để các module khác có thể sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoDataConverter;
} else {
    window.VideoDataConverter = VideoDataConverter;
}