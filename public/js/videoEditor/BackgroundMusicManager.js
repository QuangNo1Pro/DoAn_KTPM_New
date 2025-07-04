/**
 * BackgroundMusicManager - Quản lý nhạc nền cho trình chỉnh sửa video
 */
class BackgroundMusicManager {
    /**
     * Khởi tạo BackgroundMusicManager
     * @param {Object} options - Các tùy chọn
     */
    constructor(options = {}) {
        this.options = {
            onMusicApplied: () => {}, // Callback khi áp dụng nhạc nền
            ...options
        };
        
        // Danh sách nhạc nền có sẵn
        this.availableTracks = {
            'none': {
                name: 'Không có nhạc nền',
                path: null
            },
            'bgmusic1': {
                name: 'Nhạc nền vui nhộn',
                path: '/videos/bgmusic/happy.mp3'
            },
            'bgmusic2': {
                name: 'Nhạc nền trầm lắng',
                path: '/videos/bgmusic/calm.mp3'
            }
        };
        
        // Nhạc nền đang sử dụng
        this.currentMusic = {
            global: {
                track: 'none',
                volume: 0.5
            },
            clips: {} // Nhạc nền riêng cho từng clip
        };
        
        // Audio element cho xem trước
        this.audioElement = null;
        
        // Khởi tạo
        this.init();
    }
    
    /**
     * Khởi tạo
     */
    init() {
        this.bindEvents();
        
        // Tạo audio element
        this.audioElement = document.createElement('audio');
        this.audioElement.id = 'bgmusic-preview';
        this.audioElement.style.display = 'none';
        this.audioElement.loop = true;
        document.body.appendChild(this.audioElement);
    }
    
    /**
     * Gắn sự kiện
     */
    bindEvents() {
        // Gắn sự kiện cho các nút nhạc nền
        document.querySelectorAll('[data-bgmusic]').forEach(button => {
            button.addEventListener('click', () => {
                // Bỏ chọn các nút khác
                document.querySelectorAll('[data-bgmusic]').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Chọn nút này
                button.classList.add('active');
                
                // Lấy mã nhạc nền
                const musicId = button.getAttribute('data-bgmusic');
                
                // Hiển thị thiết lập nhạc nền nếu không phải 'none'
                const settingsPanel = document.getElementById('bgmusic-settings');
                if (settingsPanel) {
                    settingsPanel.style.display = musicId !== 'none' ? 'block' : 'none';
                }
                
                // Xem trước nhạc nền
                this.previewBackgroundMusic(musicId);
            });
        });
        
        // Gắn sự kiện cho nút áp dụng nhạc nền
        const applyButton = document.getElementById('apply-bgmusic');
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                this.applyBackgroundMusic();
            });
        }
        
        // Gắn sự kiện cho thanh volume
        const volumeSlider = document.getElementById('bgmusic-volume');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', () => {
                const volume = volumeSlider.value / 100;
                if (this.audioElement) {
                    this.audioElement.volume = volume;
                }
            });
        }
    }
    
    /**
     * Xem trước nhạc nền
     * @param {string} musicId - ID của nhạc nền
     */
    previewBackgroundMusic(musicId) {
        // Dừng nhạc đang phát
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        
        // Nếu là 'none', không phát nhạc
        if (musicId === 'none' || !this.availableTracks[musicId]) {
            return;
        }
        
        // Lấy thông tin nhạc nền
        const track = this.availableTracks[musicId];
        
        // Thiết lập nguồn và phát nhạc
        if (this.audioElement && track.path) {
            this.audioElement.src = track.path;
            
            // Thiết lập âm lượng
            const volumeSlider = document.getElementById('bgmusic-volume');
            if (volumeSlider) {
                this.audioElement.volume = volumeSlider.value / 100;
            } else {
                this.audioElement.volume = 0.5;
            }
            
            // Phát nhạc
            this.audioElement.play().catch(error => {
                console.warn('Không thể phát nhạc nền:', error);
            });
        }
    }
    
    /**
     * Áp dụng nhạc nền
     */
    applyBackgroundMusic() {
        // Lấy nhạc nền đang chọn
        const selectedButton = document.querySelector('[data-bgmusic].active');
        if (!selectedButton) {
            return;
        }
        
        const musicId = selectedButton.getAttribute('data-bgmusic');
        
        // Lấy âm lượng
        const volumeSlider = document.getElementById('bgmusic-volume');
        const volume = volumeSlider ? volumeSlider.value / 100 : 0.5;
        
        // Lấy mục tiêu áp dụng
        const targetSelect = document.getElementById('bgmusic-target');
        const target = targetSelect ? targetSelect.value : 'all';
        
        // Áp dụng nhạc nền
        if (target === 'all') {
            // Áp dụng cho toàn bộ video
            this.currentMusic.global = {
                track: musicId,
                volume: volume
            };
        } else if (window.videoEditor && window.videoEditor.timeline) {
            // Áp dụng cho clip đang chọn
            const selectedClipId = window.videoEditor.timeline.selectedClipId;
            
            if (selectedClipId) {
                this.currentMusic.clips[selectedClipId] = {
                    track: musicId,
                    volume: volume
                };
            } else {
                alert('Vui lòng chọn một clip để áp dụng nhạc nền.');
                return;
            }
        }
        
        // Thông báo đã áp dụng
        alert(`Đã áp dụng nhạc nền "${this.availableTracks[musicId].name}" với âm lượng ${Math.round(volume * 100)}%.`);
        
        // Gọi callback
        if (typeof this.options.onMusicApplied === 'function') {
            this.options.onMusicApplied(this.currentMusic);
        }
    }
    
    /**
     * Dừng preview nhạc nền
     */
    stopPreview() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
    }
    
    /**
     * Lấy thông tin nhạc nền cho clip
     * @param {string} clipId - ID của clip
     * @returns {Object} Thông tin nhạc nền
     */
    getMusicForClip(clipId) {
        // Nếu clip có nhạc nền riêng, trả về nhạc đó
        if (this.currentMusic.clips[clipId]) {
            return this.currentMusic.clips[clipId];
        }
        
        // Nếu không, trả về nhạc nền toàn cục
        return this.currentMusic.global;
    }
    
    /**
     * Lấy danh sách nhạc nền
     * @returns {Object} Danh sách nhạc nền
     */
    getAvailableTracks() {
        return this.availableTracks;
    }
}

// Thêm vào window object
window.BackgroundMusicManager = BackgroundMusicManager;

// Thông báo module đã được tải
if (window.moduleLoaded) {
    window.moduleLoaded('BackgroundMusicManager');
} 