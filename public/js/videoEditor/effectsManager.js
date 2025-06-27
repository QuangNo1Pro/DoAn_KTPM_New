/**
 * Quản lý hiệu ứng cho video
 */
class EffectsManager {
    constructor(options = {}) {
        // Cài đặt mặc định
        this.options = Object.assign({
            canvas: '#preview-canvas',
            effectButtons: '[data-effect]',
            effectSettings: '#effect-settings',
            effectValue: '#effect-value',
            effectValueLabel: '#effect-value-label',
            effectTarget: '#effect-target',
            applyEffectBtn: '#apply-effect'
        }, options);

        // Các thuộc tính
        this.canvasElement = document.querySelector(this.options.canvas);
        this.ctx = this.canvasElement ? this.canvasElement.getContext('2d') : null;
        this.effectButtons = document.querySelectorAll(this.options.effectButtons);
        this.effectSettings = document.querySelector(this.options.effectSettings);
        this.effectValue = document.querySelector(this.options.effectValue);
        this.effectValueLabel = document.querySelector(this.options.effectValueLabel);
        this.effectTarget = document.querySelector(this.options.effectTarget);
        this.applyEffectBtn = document.querySelector(this.options.applyEffectBtn);
        
        this.selectedEffect = 'none';
        this.effects = {
            global: { type: 'none', value: 0 },
            clips: {}  // Hiệu ứng cho từng clip: { clipId: { type, value } }
        };

        // Khởi tạo
        this.init();
    }

    /**
     * Khởi tạo EffectsManager
     */
    init() {
        this.bindEvents();
    }

    /**
     * Gắn các sự kiện
     */
    bindEvents() {
        // Sự kiện chọn hiệu ứng
        this.effectButtons.forEach(button => {
            button.addEventListener('click', () => {
                const effect = button.dataset.effect;
                this.selectEffect(effect);
                
                // Đánh dấu button đang chọn
                this.effectButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
        
        // Sự kiện áp dụng hiệu ứng
        if (this.applyEffectBtn) {
            this.applyEffectBtn.addEventListener('click', () => {
                this.applyEffect();
            });
        }
    }

    /**
     * Chọn hiệu ứng
     */
    selectEffect(effectType) {
        this.selectedEffect = effectType;
        
        // Hiển thị/ẩn settings tùy theo hiệu ứng
        if (effectType === 'none') {
            this.effectSettings.style.display = 'none';
        } else {
            this.effectSettings.style.display = 'block';
            
            // Cập nhật label
            switch (effectType) {
                case 'grayscale':
                    this.effectValueLabel.textContent = 'Mức độ đen trắng';
                    break;
                case 'sepia':
                    this.effectValueLabel.textContent = 'Mức độ sepia';
                    break;
                case 'brightness':
                    this.effectValueLabel.textContent = 'Độ sáng';
                    break;
                case 'contrast':
                    this.effectValueLabel.textContent = 'Độ tương phản';
                    break;
                case 'blur':
                    this.effectValueLabel.textContent = 'Độ mờ (px)';
                    break;
                default:
                    this.effectValueLabel.textContent = 'Giá trị';
            }
        }
    }

    /**
     * Áp dụng hiệu ứng
     */
    applyEffect() {
        if (this.selectedEffect === 'none') {
            return;
        }
        
        const value = parseInt(this.effectValue.value) || 50; // Giá trị mặc định nếu không có input
        const target = this.effectTarget ? this.effectTarget.value : 'all';
        
        console.log(`Áp dụng hiệu ứng ${this.selectedEffect} với giá trị ${value} cho ${target}`);
        
        if (target === 'all') {
            // Áp dụng cho toàn bộ video
            this.effects.global = {
                type: this.selectedEffect,
                value
            };
            console.log('Đã áp dụng hiệu ứng toàn cục:', this.effects.global);
        } else {
            // Tìm clip để áp dụng hiệu ứng
            let clipId = null;
            
            // Kiểm tra các nguồn khác nhau để lấy clipId
            if (window.editor && window.editor.timeline && window.editor.timeline.selectedClipId) {
                clipId = window.editor.timeline.selectedClipId;
            } else if (window.videoEditor && window.videoEditor.timeline && window.videoEditor.timeline.selectedClipId) {
                clipId = window.videoEditor.timeline.selectedClipId;
            }
            
            // Nếu không có clip được chọn nhưng vẫn muốn áp dụng cho clip hiện tại
            if (!clipId) {
                // Thử lấy clip hiện tại dựa trên thời gian
                let currentTime = 0;
                
                if (window.editor && window.editor.getCurrentTime) {
                    currentTime = window.editor.getCurrentTime();
                } else if (window.videoEditor && window.videoEditor.getCurrentTime) {
                    currentTime = window.videoEditor.getCurrentTime();
                }
                
                // Tìm clip tại thời điểm hiện tại
                const timeline = window.editor?.timeline || window.videoEditor?.timeline;
                if (timeline && timeline.clips) {
                    const currentClip = timeline.clips.find(clip => 
                        currentTime >= clip.startTime && currentTime < (clip.startTime + clip.duration)
                    );
                    
                    if (currentClip) {
                        clipId = currentClip.id;
                    }
                }
            }
            
            if (clipId) {
                // Áp dụng cho clip cụ thể
                this.effects.clips[clipId] = {
                    type: this.selectedEffect,
                    value
                };
                console.log(`Đã áp dụng hiệu ứng cho clip ${clipId}:`, this.effects.clips[clipId]);
            } else {
                // Nếu không tìm thấy clip, áp dụng toàn cục
                this.effects.global = {
                    type: this.selectedEffect,
                    value
                };
                console.log('Không tìm thấy clip, áp dụng hiệu ứng toàn cục:', this.effects.global);
                
                // Hiển thị thông báo
                alert('Không có clip nào được chọn. Hiệu ứng sẽ được áp dụng cho toàn bộ video.');
            }
        }
        
        // Thông báo cập nhật preview
        if (typeof this.options.onEffectApplied === 'function') {
            this.options.onEffectApplied(this.effects);
        } else {
            // Thử cập nhật preview bằng cách khác nếu không có callback
            if (window.editor && window.editor.updatePreview) {
                const currentTime = window.editor.getCurrentTime ? window.editor.getCurrentTime() : 0;
                window.editor.updatePreview(currentTime);
            } else if (window.videoEditor && window.videoEditor.updatePreview) {
                const currentTime = window.videoEditor.getCurrentTime ? window.videoEditor.getCurrentTime() : 0;
                window.videoEditor.updatePreview(currentTime);
            }
        }
    }

    /**
     * Lấy hiệu ứng cho một clip cụ thể hoặc toàn cục
     */
    getEffectForClip(clipId) {
        // Ưu tiên hiệu ứng cụ thể cho clip
        if (clipId && this.effects.clips[clipId]) {
            return this.effects.clips[clipId];
        }
        
        // Nếu không có, sử dụng hiệu ứng toàn cục
        return this.effects.global;
    }

    /**
     * Áp dụng hiệu ứng lên canvas
     * @param {CanvasRenderingContext2D} ctx - Context để vẽ
     * @param {string} clipId - ID của clip (nếu có)
     */
    applyEffectToCanvas(ctx, clipId = null) {
        try {
            if (!ctx) {
                console.error('Context không tồn tại');
                return;
            }
            
            // Log để debug
            console.log(`Đang áp dụng hiệu ứng cho clip: ${clipId || 'toàn cục'}`);
            
            // Lấy hiệu ứng áp dụng
            const effect = this.getEffectForClip(clipId);
            
            // Log hiệu ứng đang áp dụng
            console.log(`Hiệu ứng được áp dụng:`, effect);
            
            // Nếu không có hiệu ứng, không cần xử lý thêm
            if (!effect || effect.type === 'none' || !effect.type) {
                console.log('Không có hiệu ứng cần áp dụng');
                return;
            }
            
            // Lấy kích thước canvas
            const width = ctx.canvas.width;
            const height = ctx.canvas.height;
            
            if (effect.type === 'blur') {
                // Sử dụng CSS filter cho blur
                ctx.filter = `blur(${Math.max(1, effect.value) / 10}px)`;
                
                // Lấy dữ liệu hình ảnh hiện tại
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(ctx.canvas, 0, 0);
                
                // Xóa canvas hiện tại
                ctx.clearRect(0, 0, width, height);
                
                // Vẽ lại với filter
                ctx.drawImage(tempCanvas, 0, 0);
                
                // Xóa filter sau khi vẽ
                ctx.filter = 'none';
                
                console.log('Đã áp dụng hiệu ứng blur');
                return;
            }
            
            // Lấy dữ liệu ảnh
            let imageData;
            try {
                imageData = ctx.getImageData(0, 0, width, height);
            } catch (e) {
                console.error('Lỗi khi lấy dữ liệu ảnh:', e);
                return;
            }
            
            const data = imageData.data;
            
            // Áp dụng hiệu ứng
            switch (effect.type) {
                case 'grayscale':
                    this.applyGrayscale(data, effect.value / 100);
                    console.log('Đã áp dụng hiệu ứng grayscale');
                    break;
                case 'sepia':
                    this.applySepia(data, effect.value / 100);
                    console.log('Đã áp dụng hiệu ứng sepia');
                    break;
                case 'brightness':
                    this.applyBrightness(data, effect.value);
                    console.log('Đã áp dụng hiệu ứng brightness');
                    break;
                case 'contrast':
                    this.applyContrast(data, effect.value);
                    console.log('Đã áp dụng hiệu ứng contrast');
                    break;
                default:
                    console.warn('Hiệu ứng không được nhận dạng:', effect.type);
                    return;
            }
            
            // Cập nhật lại ảnh
            ctx.putImageData(imageData, 0, 0);
        } catch (error) {
            console.error('Lỗi khi áp dụng hiệu ứng:', error);
        }
    }

    /**
     * Áp dụng hiệu ứng đen trắng
     */
    applyGrayscale(data, intensity) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Chuyển đổi thành grayscale
            const gray = 0.3 * r + 0.59 * g + 0.11 * b;
            
            // Áp dụng với mức độ intensity
            data[i] = r * (1 - intensity) + gray * intensity;
            data[i + 1] = g * (1 - intensity) + gray * intensity;
            data[i + 2] = b * (1 - intensity) + gray * intensity;
        }
    }

    /**
     * Áp dụng hiệu ứng sepia
     */
    applySepia(data, intensity) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Chuyển đổi thành sepia
            const sepiaR = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            const sepiaG = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            const sepiaB = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
            
            // Áp dụng với mức độ intensity
            data[i] = r * (1 - intensity) + sepiaR * intensity;
            data[i + 1] = g * (1 - intensity) + sepiaG * intensity;
            data[i + 2] = b * (1 - intensity) + sepiaB * intensity;
        }
    }

    /**
     * Áp dụng hiệu ứng độ sáng
     */
    applyBrightness(data, value) {
        const adjustment = (value - 50) * 2; // Chuyển từ thang 0-100 sang -100 đến 100
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] + adjustment));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment));
        }
    }

    /**
     * Áp dụng hiệu ứng tương phản
     */
    applyContrast(data, value) {
        const factor = (value / 50); // Chuyển từ thang 0-100 sang 0-2
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, 128 + (data[i] - 128) * factor));
            data[i + 1] = Math.min(255, Math.max(0, 128 + (data[i + 1] - 128) * factor));
            data[i + 2] = Math.min(255, Math.max(0, 128 + (data[i + 2] - 128) * factor));
        }
    }

    /**
     * Lấy danh sách hiệu ứng
     */
    getEffects() {
        return { ...this.effects };
    }
}

// Export class
window.EffectsManager = EffectsManager; 