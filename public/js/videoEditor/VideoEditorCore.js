/**
 * VideoEditorCore - Trình quản lý chỉnh sửa video tổng thể
 */
class VideoEditorCore {
    constructor() {
        // Các thành phần
        this.timeline = null;
        this.textOverlay = null;
        this.effectsManager = null;
        this.mediaLoader = null;
        this.previewManager = null;
        this.dataConverter = null;
        this.exportManager = null;
        
        // Gán instance vào window để các module khác có thể truy cập
        window.videoEditor = this;
        
        // Các phần tử DOM
        this.canvasElement = document.getElementById('preview-canvas');
        this.ctx = this.canvasElement ? this.canvasElement.getContext('2d') : null;
        this.playPreviewBtn = document.getElementById('play-preview-btn');
        this.exportVideoBtn = document.getElementById('export-video-btn');
        this.backToEditBtn = document.getElementById('back-to-edit-btn');
        this.emergencyExitBtn = document.getElementById('emergency-exit');
        
        // Các thuộc tính
        this.videoData = null;
        this.aspectRatio = '16:9';
        
        // Khởi tạo
        this.init();
        
        // Thêm xử lý nút thoát khẩn cấp
        if (this.emergencyExitBtn) {
            this.emergencyExitBtn.addEventListener('click', (e) => {
                console.log('Thoát khẩn cấp kích hoạt');
                // Xóa dữ liệu từ sessionStorage
                sessionStorage.removeItem('videoPreviewData');
                
                // Đảm bảo có thể thoát
                try {
                    // Xóa tất cả backdrop
                    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                    
                    // Xóa các class và style trên body
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                } catch (err) {
                    console.error('Lỗi khi dọn dẹp UI:', err);
                }
                
                // Tiếp tục cho phép chuyển hướng đến trang chủ
            });
        }
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
            
            // Khởi tạo các thành phần
            this.initializeComponents();
            
            // Thiết lập kích thước canvas
            this.previewManager.setupCanvas();
            
            // Tải trước media
            await this.loadMedia();
            
            // Chuyển đổi dữ liệu video thành clips cho timeline
            this.loadTimelineClips();
            
            // Thiết lập sự kiện
            this.bindEvents();
            
        } catch (error) {
            console.error('Lỗi khởi tạo VideoEditor:', error);
            alert('Đã xảy ra lỗi khi khởi tạo trình chỉnh sửa video.');
        }
    }

    /**
     * Khởi tạo các thành phần
     */
    initializeComponents() {
        // Khởi tạo Timeline
        this.timeline = new Timeline({
            onTimeUpdate: (time) => this.updatePreview(time)
        });
        
        // Khởi tạo TextOverlay - Sử dụng đối tượng giả trước để tránh lỗi
        try {
            // Luôn tạo một đối tượng TextOverlay giả khởi đầu 
            this.textOverlay = {
                updateAtTime: function() {},
                addTextItem: function() { return { id: 'temp-' + Date.now() }; },
                removeTextItem: function() {},
                renderTextItems: function() {},
                getTextItemsAtTime: function() { return []; },
                getTextItems: function() { return []; }
            };
            
            // Nếu có TextOverlay thực sự, thử tạo
            if (window.TextOverlay && typeof window.TextOverlay === 'function') {
                console.log('Tạo TextOverlay thật');
                let realTextOverlay = new window.TextOverlay();
                
                // Nếu khởi tạo thành công, cập nhật tham chiếu
                if (realTextOverlay) {
                    this.textOverlay = realTextOverlay;
                }
            } else if (typeof window.initTextOverlay === 'function') {
                // Thử tải TextOverlay
                console.log('Đang thử tải TextOverlay...');
                
                window.initTextOverlay().then((TextOverlayClass) => {
                    if (TextOverlayClass && window.TextOverlay) {
                        console.log('TextOverlay đã được tải, cập nhật tham chiếu');
                        
                        try {
                            // Tạo instance mới
                            let realTextOverlay = new window.TextOverlay();
                            
                            // Cập nhật tham chiếu trong các đối tượng
                            this.textOverlay = realTextOverlay;
                            if (this.previewManager) {
                                this.previewManager.textOverlay = realTextOverlay;
                            }
                            if (this.dataConverter) {
                                this.dataConverter.textOverlay = realTextOverlay;
                            }
                        } catch (e) {
                            console.error('Lỗi khi tạo TextOverlay sau khi tải:', e);
                        }
                    }
                }).catch(err => {
                    console.warn('Không thể tải TextOverlay:', err);
                });
            }
        } catch (error) {
            console.error('Lỗi khi tạo TextOverlay:', error);
            
            // Nếu có lỗi, sử dụng đối tượng giả
            this.textOverlay = {
                updateAtTime: function() {},
                addTextItem: function() { 
                    console.warn('Chức năng thêm chữ không khả dụng, đang sử dụng phiên bản giả');
                    return { id: 'dummy-' + Date.now() }; 
                },
                removeTextItem: function() {},
                renderTextItems: function() {},
                getTextItemsAtTime: function() { return []; },
                getTextItems: function() { return []; }
            };
        }
        
        // Khởi tạo EffectsManager
        try {
            this.effectsManager = new EffectsManager({
                onEffectApplied: () => this.updatePreview(this.getCurrentTime())
            });
        } catch (error) {
            console.error('Lỗi khi khởi tạo EffectsManager:', error);
            
            // Tạo phiên bản giả nếu có lỗi
            this.effectsManager = {
                applyEffectToCanvas: function() {},
                getEffectForClip: function() { return { type: 'none', value: 0 }; },
                effects: { global: { type: 'none', value: 0 }, clips: {} }
            };
        }
        
        // Khởi tạo MediaLoader
        this.mediaLoader = new MediaLoader({
            onMediaLoaded: (mediaItems) => {
                console.log('Media đã tải xong:', mediaItems);
            }
        });
        
        // Khởi tạo PreviewManager
        this.previewManager = new PreviewManager({
            canvasElement: this.canvasElement,
            timeline: this.timeline,
            effectsManager: this.effectsManager,
            textOverlay: this.textOverlay,
            aspectRatio: this.aspectRatio
        });
        
        // Khởi tạo VideoDataConverter
        this.initializeDataConverter();
        
        // Khởi tạo ExportManager
        this.exportManager = new ExportManager({
            videoData: this.videoData,
            timeline: this.timeline,
            dataConverter: this.dataConverter
        });
        
        // Lắng nghe sự kiện thay đổi thời lượng timeline
        this.timeline.container.addEventListener('timelineDurationChanged', (e) => {
            console.log(`Sự kiện timelineDurationChanged: Thời lượng mới = ${e.detail.duration}s`);
            
            // Cập nhật thời lượng trong UI
            const durationElement = document.getElementById('timeline-duration');
            if (durationElement) {
                durationElement.textContent = this.previewManager.formatTimeDetailed(e.detail.duration);
            }
            
            // Cập nhật thanh seek
            const seekBar = document.getElementById('timeline-seek');
            if (seekBar) {
                seekBar.max = e.detail.duration;
            }
            
            // Nếu đang phát và thời gian hiện tại vượt quá thời lượng mới
            if (this.previewManager.isPlaying && this.previewManager.currentTime > e.detail.duration) {
                this.pausePreview();
                this.timeline.setCurrentTime(e.detail.duration);
            }
        });
    }

    /**
     * Tải media
     */
    async loadMedia() {
        // Lấy danh sách clip từ videoData
        const clips = this.videoData.scriptParts || [];
        
        // Tải media cho tất cả clip
        const loadedMedia = await this.mediaLoader.preloadMedia(clips);
        
        // Cập nhật loadedMedia cho PreviewManager
        this.previewManager.loadedMediaItems = loadedMedia;
        
        // Cập nhật loadedMedia cho DataConverter
        this.dataConverter.loadedMediaItems = loadedMedia;
        
        return loadedMedia;
    }

    /**
     * Tải clips vào timeline
     */
    loadTimelineClips() {
        // Kiểm tra xem clips đã được thêm đúng vào timeline chưa
        console.log("Bắt đầu thêm clips vào timeline");
        
        // Chuyển đổi dữ liệu video thành clips
        const clips = this.dataConverter.convertVideoDataToClips(this.videoData);
        
        // Thêm từng clip vào timeline
        clips.forEach(clip => {
            this.timeline.addClipWithTimeConstraint({
                id: clip.id,
                name: clip.name,
                type: clip.type,
                imagePath: clip.imagePath,
                audioPath: clip.audioPath,
                text: clip.text
            }, clip.duration, clip.startTime);
        });
        
        console.log("Kiểm tra timeline sau khi thêm clips:");
        console.log("- Số lượng clips:", this.timeline.clips.length);
        console.log("- Clips đã thêm:", this.timeline.clips);
        console.log("- Thời lượng timeline:", this.timeline.duration, "giây");
    }

    /**
     * Gắn các sự kiện
     */
    bindEvents() {
        // Sự kiện nút phát preview
        if (this.playPreviewBtn) {
            this.playPreviewBtn.addEventListener('click', () => {
                if (this.previewManager.isPlaying) {
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
        
        // Sự kiện resize cửa sổ
        window.addEventListener('resize', () => {
            this.previewManager.setupCanvas();
            this.updatePreview(this.getCurrentTime());
        });
        
        // Thêm sự kiện cho thanh seek
        const seekBar = document.getElementById('timeline-seek');
        if (seekBar) {
            seekBar.addEventListener('input', () => {
                const time = parseFloat(seekBar.value);
                this.timeline.setCurrentTime(time);
                this.updatePreview(time);
            });
        }
    }

    /**
     * Cập nhật preview
     */
    updatePreview(time) {
        this.previewManager.updatePreview(time);
    }

    /**
     * Phát preview
     */
    playPreview() {
        if (this.previewManager.isPlaying) {
            this.pausePreview();
            return;
        }
        
        // Tương tác với audio để kích hoạt autoplay
        this.enableAudioPlayback();
        
        // Phát preview
        this.previewManager.playPreview();
        
        // Cập nhật nút phát/tạm dừng
        if (this.playPreviewBtn) {
            this.playPreviewBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Tạm dừng';
        }
    }

    /**
     * Kích hoạt khả năng phát âm thanh trước khi phát preview
     */
    enableAudioPlayback() {
        // Thử phát một đoạn audio ngắn để kích hoạt khả năng phát âm thanh
        try {
            // Tạo một audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Tạo một oscillator node (tạo âm thanh)
            const oscillator = audioContext.createOscillator();
            oscillator.frequency.value = 0; // Tần số 0Hz (không nghe thấy)
            
            // Giảm âm lượng xuống 0
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0;
            
            // Kết nối các node
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Phát trong 10ms rồi dừng
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                
                // Nếu AudioContext đang suspended, resume nó
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
            }, 10);
            
            console.log('Đã kích hoạt audio context');
            
            // Kích hoạt tất cả audio đã tải sẵn
            Object.values(this.mediaLoader.loadedMediaItems).forEach(item => {
                if (item instanceof Audio) {
                    try {
                        const playPromise = item.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                // Tạm dừng ngay sau khi phát thành công
                                item.pause();
                                item.currentTime = 0;
                            }).catch(e => {
                                // Không làm gì, đây là một phần của quá trình kích hoạt
                            });
                        }
                    } catch (e) {
                        // Không làm gì, đây là một phần của quá trình kích hoạt
                    }
                }
            });
        } catch (e) {
            console.warn('Không thể kích hoạt AudioContext:', e);
        }
    }

    /**
     * Tạm dừng preview
     */
    pausePreview() {
        this.previewManager.pausePreview();
        
        // Cập nhật nút phát/tạm dừng
        if (this.playPreviewBtn) {
            this.playPreviewBtn.innerHTML = '<i class="bi bi-play-fill"></i> Phát';
        }
    }

    /**
     * Lấy thời gian hiện tại
     */
    getCurrentTime() {
        return this.previewManager.currentTime;
    }

    /**
     * Xuất video
     */
    exportVideo() {
        // Kiểm tra kết nối mạng
        if (!navigator.onLine) {
            alert('Không có kết nối internet. Vui lòng kiểm tra mạng và thử lại.');
            return;
        }

        // Hiển thị thông báo loading
        alert('Đang bắt đầu xuất video, vui lòng đợi...');
        
        // Đảm bảo TextOverlay được tải trước khi xuất video
        this.ensureTextOverlayLoaded()
            .then(() => {
                // Gọi hàm xuất video từ ExportManager với callback
                const exportCallback = (result) => {
                    console.log('Kết quả xuất video:', result);
                    
                    if (result.success) {
                        alert('Video đã được tạo thành công!');
                        // Hiển thị video đã xuất
                        this.showExportedVideo(result.videoUrl);
                    } else if (result.offline) {
                        alert('Không có kết nối internet. Vui lòng kiểm tra mạng và thử lại.');
                    } else if (result.message && result.message.includes('kiểm tra')) {
                        // Đang trong quá trình kiểm tra kết quả
                        alert(result.message || 'Đang kiểm tra kết quả tạo video...');
                    } else {
                        alert(`Lỗi: ${result.error || 'Không xác định'}`);
                    }
                };
                
                this.exportManager.exportVideo(exportCallback);
            });
    }

    /**
     * Đảm bảo TextOverlay được tải trước khi xuất video
     */
    ensureTextOverlayLoaded() {
        return new Promise((resolve) => {
            // Nếu textOverlay đã có hoạt động, tiếp tục luôn
            if (this.textOverlay && this.textOverlay.textItems && this.textOverlay.textItems.length > 0) {
                console.log('TextOverlay đã được tải với', this.textOverlay.textItems.length, 'text items');
                resolve();
                return;
            }

            console.log('Kiểm tra và tải TextOverlay trước khi xuất video...');
            
            // Nếu window.TextOverlay đã được tải, nhưng textOverlay chưa được khởi tạo
            if (window.TextOverlay && !this.textOverlay) {
                console.log('Khởi tạo TextOverlay từ window.TextOverlay...');
                this.textOverlay = new window.TextOverlay({
                    container: document.getElementById('text-overlays-container'),
                    canvasElement: document.getElementById('preview-canvas')
                });
                
                // Khởi tạo lại dataConverter với textOverlay mới
                this.initializeDataConverter();
                
                console.log('Đã khởi tạo TextOverlay thành công');
                resolve();
                return;
            }
            
            // Nếu cần tải TextOverlay từ đầu
            if (window.initTextOverlay && typeof window.initTextOverlay === 'function') {
                console.log('Tải TextOverlay từ initTextOverlay...');
                
                window.initTextOverlay()
                    .then(TextOverlayClass => {
                        if (TextOverlayClass) {
                            this.textOverlay = new TextOverlayClass({
                                container: document.getElementById('text-overlays-container'),
                                canvasElement: document.getElementById('preview-canvas')
                            });
                            
                            // Khởi tạo lại dataConverter với textOverlay mới
                            this.initializeDataConverter();
                            
                            console.log('Đã tải TextOverlay thành công');
                        } else {
                            console.warn('Không thể tải TextOverlay, tiếp tục xuất video không có text');
                        }
                        resolve();
                    })
                    .catch(error => {
                        console.error('Lỗi khi tải TextOverlay:', error);
                        resolve(); // Vẫn tiếp tục xuất video dù có lỗi
                    });
            } else {
                console.warn('Không có hàm initTextOverlay, tiếp tục xuất video không có text');
                resolve();
            }
        });
    }

    /**
     * Hiển thị video đã xuất
     */
    showExportedVideo(videoUrl) {
        // Hiển thị video đã xuất
        let resultContainer = document.getElementById('result-container');
        const resultVideo = document.getElementById('result-video');
        
        if (resultContainer && resultVideo) {
            resultVideo.src = videoUrl;
            resultContainer.style.display = 'block';
            
            // Cuộn xuống kết quả
            resultContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Tạo phần tử kết quả nếu chưa có
            const newResultContainer = document.createElement('div');
            newResultContainer.id = 'result-container';
            newResultContainer.className = 'card mt-3';
            newResultContainer.style.display = 'block';
            
            newResultContainer.innerHTML = `
                <div class="card-header bg-success text-white">
                    <h3 class="mb-0">Video Đã Xuất</h3>
                </div>
                <div class="card-body">
                    <video id="result-video" src="${videoUrl}" controls class="w-100"></video>
                    <div class="mt-2">
                        <a href="${videoUrl}" download class="btn btn-primary">
                            <i class="bi bi-download"></i> Tải xuống
                        </a>
                    </div>
                </div>
            `;
            
            // Thêm vào trang
            const mainContainer = document.querySelector('.container-fluid');
            if (mainContainer) {
                mainContainer.appendChild(newResultContainer);
                newResultContainer.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    /**
     * Khởi tạo VideoDataConverter với textOverlay
     */
    initializeDataConverter() {
        console.log('Khởi tạo VideoDataConverter với textOverlay:', this.textOverlay);
        this.dataConverter = new VideoDataConverter({
            timeline: this.timeline,
            effectsManager: this.effectsManager,
            textOverlay: this.textOverlay,
            loadedMediaItems: this.loadedMediaItems
        });
    }
}

// Khởi tạo khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    // Đảm bảo tất cả các thành phần cần thiết đã tải xong
    const requiredClasses = [
        'Timeline', 'EffectsManager',
        'MediaLoader', 'PreviewManager', 'VideoDataConverter', 'ExportManager'
    ];
    
    // TextOverlay là tùy chọn, chúng ta sẽ tạo một phiên bản giả nếu không có
    const optionalClasses = ['TextOverlay'];
    
    // Theo dõi các module đã tải
    window.loadedModules = window.loadedModules || {};
    
    // Hàm được gọi khi một module được tải xong
    window.moduleLoaded = function(moduleName) {
        console.log(`Module ${moduleName} đã được tải xong`);
        window.loadedModules[moduleName] = true;
    };
    
    let retryCount = 0;
    const maxRetries = 5;  // Tăng số lần thử
    
    const checkDependencies = () => {
        // Tăng số lần thử
        retryCount++;
        console.log(`Kiểm tra dependencies lần ${retryCount}/${maxRetries}`);
        
        const missingDeps = requiredClasses.filter(cls => !window[cls]);
        if (missingDeps.length > 0) {
            console.warn('Đang chờ các module bắt buộc:', missingDeps.join(', '));
            
            if (retryCount < maxRetries) {
                setTimeout(checkDependencies, 300);  // Tăng thời gian chờ
            } else {
                console.error('Đã hết số lần thử, khởi tạo với các thành phần hiện có');
                initEditor();
            }
            return;
        }
        
        // Nếu đã tải xong các module bắt buộc, kiểm tra TextOverlay
        if (typeof window.initTextOverlay === 'function' && !window.TextOverlay) {
            console.log('Cố gắng tải TextOverlay bằng initTextOverlay');
            
            try {
                window.initTextOverlay().then(() => {
                    console.log('TextOverlay đã được khởi tạo thành công');
                    initEditor();
                }).catch(error => {
                    console.error('Lỗi khi khởi tạo TextOverlay:', error);
                    initEditor();
                });
            } catch (e) {
                console.error('Lỗi khi gọi initTextOverlay:', e);
                initEditor();
            }
        } else {
            // Không cần khởi tạo TextOverlay hoặc đã có sẵn
            initEditor();
        }
    };
    
    const initEditor = () => {
        // Kiểm tra các module tùy chọn
        optionalClasses.forEach(cls => {
            if (!window[cls]) {
                console.warn(`Không tìm thấy module tùy chọn: ${cls}, sẽ tạo phiên bản giả`);
                
                // Tạo phiên bản giả cho TextOverlay nếu không có
                if (cls === 'TextOverlay') {
                    // Kiểm tra lại một lần nữa xem TextOverlay đã tồn tại chưa
                    if (!window.TextOverlay) {
                        window.TextOverlay = class DummyTextOverlay {
                            constructor() {
                                console.log("Không tìm thấy module tùy chọn: TextOverlay, sẽ tạo phiên bản giả");
                                this.textItems = [];
                            }
                            
                            // Các hàm giả cần thiết
                            updateAtTime() {}
                            addTextItem() { 
                                console.warn("Đang sử dụng TextOverlay giả, chức năng bị hạn chế");
                                return { id: 'dummy-' + Date.now() }; 
                            }
                            removeTextItem() {}
                            renderTextItems() {}
                            getTextItemsAtTime() { return []; }
                            getTextItems() { return this.textItems; }
                        };
                        
                        // Thông báo đã tạo phiên bản giả
                        console.log(`Đã tạo phiên bản giả cho ${cls}`);
                    } else {
                        console.log('TextOverlay đã được tải trước đó');
                    }
                }
            }
        });
        
        // Tạo instance global để các thành phần khác có thể truy cập
        window.editor = new VideoEditorCore();
    };
    
    // Thêm script TextOverlay nếu chưa có
    const loadTextOverlayScript = () => {
        const mainScriptPath = '/js/videoEditor/textOverlay/index.js';
        if (!document.querySelector(`script[src="${mainScriptPath}"]`)) {
            const script = document.createElement('script');
            script.src = mainScriptPath;
            script.async = true;
            script.onload = () => {
                console.log('Đã tải script TextOverlay index.js');
                // Đợi một chút để script khởi tạo
                setTimeout(checkDependencies, 300);
            };
            script.onerror = () => {
                console.error('Lỗi khi tải script TextOverlay');
                checkDependencies();
            };
            document.head.appendChild(script);
        } else {
            console.log('Script TextOverlay đã được thêm vào trước đó');
            checkDependencies();
        }
    };
    
    // Bắt đầu quy trình tải
    loadTextOverlayScript();
});

// Export để các module khác có thể sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoEditorCore;
} else {
    window.VideoEditorCore = VideoEditorCore;
} 