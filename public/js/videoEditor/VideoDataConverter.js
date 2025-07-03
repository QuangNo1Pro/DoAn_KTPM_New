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
        
        // Thu thập dữ liệu text overlays - đã được cải thiện
        let textItems = [];
        let textItemsFound = false;
        
        // Kiểm tra kỹ textOverlay
        if (this.textOverlay) {
            console.log('TextOverlay object details:', {
                hasGetTextItemsMethod: typeof this.textOverlay.getTextItems === 'function',
                hasTextItemsProperty: !!this.textOverlay.textItems,
                isTextItemsArray: Array.isArray(this.textOverlay.textItems),
                textItemsLength: this.textOverlay.textItems ? this.textOverlay.textItems.length : 0
            });
            
            // Thử cách 1: Sử dụng phương thức getTextItems nếu có
            if (typeof this.textOverlay.getTextItems === 'function') {
                try {
                    textItems = this.textOverlay.getTextItems();
                    if (textItems && textItems.length > 0) {
                        console.log(`Đã lấy được ${textItems.length} text items qua phương thức getTextItems`);
                        textItemsFound = true;
                    } else {
                        console.warn('getTextItems() trả về mảng rỗng hoặc null');
                    }
                } catch (error) {
                    console.error('Lỗi khi gọi getTextItems:', error);
                }
            }
            
            // Thử cách 2: Truy cập trực tiếp thuộc tính textItems nếu cách 1 không thành công
            if (!textItemsFound && this.textOverlay.textItems) {
                if (Array.isArray(this.textOverlay.textItems)) {
                    textItems = this.textOverlay.textItems;
                    if (textItems.length > 0) {
                        console.log(`Đã lấy được ${textItems.length} text items từ thuộc tính textItems`);
                        textItemsFound = true;
                    } else {
                        console.warn('textItems là mảng rỗng');
                    }
                } else {
                    console.warn('textItems không phải là mảng', this.textOverlay.textItems);
                }
            }
            
            // Thử cách 3: Tìm từ window.videoEditor hoặc window.editor nếu cả hai cách trên đều không thành công
            if (!textItemsFound) {
                const editorInstance = window.videoEditor || window.editor;
                if (editorInstance && editorInstance.textOverlay) {
                    console.log('Thử lấy text items từ editorInstance.textOverlay');
                    
                    if (typeof editorInstance.textOverlay.getTextItems === 'function') {
                        try {
                            textItems = editorInstance.textOverlay.getTextItems();
                            if (textItems && textItems.length > 0) {
                                console.log(`Đã lấy được ${textItems.length} text items từ editorInstance.textOverlay.getTextItems()`);
                                textItemsFound = true;
                            }
                        } catch (error) {
                            console.error('Lỗi khi gọi editorInstance.textOverlay.getTextItems:', error);
                        }
                    }
                    
                    if (!textItemsFound && editorInstance.textOverlay.textItems && Array.isArray(editorInstance.textOverlay.textItems)) {
                        textItems = editorInstance.textOverlay.textItems;
                        if (textItems.length > 0) {
                            console.log(`Đã lấy được ${textItems.length} text items từ editorInstance.textOverlay.textItems`);
                            textItemsFound = true;
                        }
                    }
                }
            }
        } else {
            console.warn('Không có đối tượng textOverlay trong dataConverter');
            
            // Thử lấy từ window.videoEditor hoặc window.editor
            const editorInstance = window.videoEditor || window.editor;
            if (editorInstance && editorInstance.textOverlay) {
                console.log('Thử lấy text items từ global editorInstance.textOverlay');
                
                if (typeof editorInstance.textOverlay.getTextItems === 'function') {
                    try {
                        textItems = editorInstance.textOverlay.getTextItems();
                        if (textItems && textItems.length > 0) {
                            console.log(`Đã lấy được ${textItems.length} text items từ editorInstance.textOverlay.getTextItems()`);
                            textItemsFound = true;
                        }
                    } catch (error) {
                        console.error('Lỗi khi gọi editorInstance.textOverlay.getTextItems:', error);
                    }
                }
                
                if (!textItemsFound && editorInstance.textOverlay.textItems && Array.isArray(editorInstance.textOverlay.textItems)) {
                    textItems = editorInstance.textOverlay.textItems;
                    if (textItems.length > 0) {
                        console.log(`Đã lấy được ${textItems.length} text items từ editorInstance.textOverlay.textItems`);
                        textItemsFound = true;
                    }
                }
            }
        }
        
        // Thêm text items vào dữ liệu xuất nếu tìm thấy
        if (textItemsFound && textItems && textItems.length > 0) {
            console.log(`Đã tìm thấy ${textItems.length} text items, thêm vào dữ liệu xuất`);
            
            // Xem nội dung của text items để debug
            textItems.forEach((item, index) => {
                console.log(`Text item #${index}:`, {
                    id: item.id,
                    content: item.content,
                    startTime: item.startTime,
                    duration: item.duration,
                    position: item.position
                });
            });
            
            exportData.push({
                type: 'textOverlays',
                items: textItems
            });
        } else {
            console.warn('Không tìm thấy text items nào để xuất');
        }
        
        // Log kết quả cuối cùng
        console.log(`Đã tìm thấy ${this.timeline.clips.length} clip hợp lệ và ${textItemsFound ? textItems.length : 0} text overlays`);
        
        return exportData;
    }
}

// Export để các module khác có thể sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoDataConverter;
} else {
    window.VideoDataConverter = VideoDataConverter;
}