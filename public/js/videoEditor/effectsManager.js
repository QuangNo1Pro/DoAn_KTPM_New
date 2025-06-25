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
        
        const value = parseInt(this.effectValue.value);
        const target = this.effectTarget.value;
        
        if (target === 'all') {
            // Áp dụng cho toàn bộ video
            this.effects.global = {
                type: this.selectedEffect,
                value
            };
        } else if (window.editor && window.editor.timeline.selectedClipId) {
            // Áp dụng cho clip đang chọn
            const clipId = window.editor.timeline.selectedClipId;
            this.effects.clips[clipId] = {
                type: this.selectedEffect,
                value
            };
        }
        
        // Thông báo cập nhật preview
        if (typeof this.options.onEffectApplied === 'function') {
            this.options.onEffectApplied(this.effects);
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
     * @param {CanvasRenderingContext2D|HTMLImageElement} source - Context hoặc hình ảnh nguồn
     * @param {string} clipId - ID của clip (nếu có)
     */
    applyEffectToCanvas(source, clipId = null) {
        if (!this.canvasElement) {
            return;
        }

        // Lấy context
        let ctx;
        if (source instanceof CanvasRenderingContext2D) {
            // Nếu truyền vào là context, sử dụng trực tiếp
            ctx = source;
        } else if (source instanceof HTMLImageElement) {
            // Nếu truyền vào là hình ảnh, vẽ lên canvas
            if (!this.ctx) return;
            ctx = this.ctx;
            
            // Vẽ hình ảnh gốc
            const width = this.canvasElement.width;
            const height = this.canvasElement.height;
            ctx.drawImage(source, 0, 0, width, height);
        } else {
            console.error('Không thể xác định nguồn để áp dụng hiệu ứng');
            return;
        }
        
        // Lấy hiệu ứng áp dụng
        const effect = this.getEffectForClip(clipId);
        
        // Nếu không có hiệu ứng, không cần xử lý thêm
        if (effect.type === 'none') {
            return;
        }
        
        // Lấy kích thước canvas
        const width = this.canvasElement.width;
        const height = this.canvasElement.height;
        
        // Lấy dữ liệu ảnh
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Áp dụng hiệu ứng
        switch (effect.type) {
            case 'grayscale':
                this.applyGrayscale(data, effect.value / 100);
                break;
            case 'sepia':
                this.applySepia(data, effect.value / 100);
                break;
            case 'brightness':
                this.applyBrightness(data, effect.value);
                break;
            case 'contrast':
                this.applyContrast(data, effect.value);
                break;
            case 'blur':
                // Sử dụng CSS filter cho blur
                ctx.filter = `blur(${effect.value / 10}px)`;
                // Cần vẽ lại với filter nếu đang sử dụng hình ảnh
                if (source instanceof HTMLImageElement) {
                    ctx.drawImage(source, 0, 0, width, height);
                }
                ctx.filter = 'none';
                return;  // Trong trường hợp blur, không cần xử lý tiếp theo
        }
        
        // Cập nhật lại ảnh
        ctx.putImageData(imageData, 0, 0);
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