/**
 * Timeline - Module cung cấp các chức năng timeline cho VideoEditor
 */

// Khai báo Timeline toàn cục
// Xóa khai báo cũ nếu có để tránh lỗi "Timeline has already been declared"
if (window.Timeline) {
    console.log("Timeline đã tồn tại, sử dụng phiên bản hiện có");
} else {
    /**
     * Timeline class - Quản lý timeline trong trình chỉnh sửa video
     */
    window.Timeline = class Timeline {
        /**
         * Khởi tạo Timeline
     */
    constructor(options = {}) {
        this.options = {
            containerId: 'timeline-container',
            duration: 10, // Mặc định 10 giây
            pixelsPerSecond: 100, // Mặc định 100px mỗi giây
            rulerInterval: 1, // Mốc thời gian mỗi 1 giây
            autoScroll: true, // Tự động cuộn theo playhead
            ...options
        };
        
        this.container = document.getElementById(this.options.containerId);
        
        if (!this.container) {
            console.error(`Timeline container with ID ${this.options.containerId} not found`);
            return;
        }
        
        // Các thông số
        this.duration = this.options.duration; // Thời lượng (giây)
        this.pixelsPerSecond = this.options.pixelsPerSecond; // Tỷ lệ pixel/giây
        this.currentTime = 0; // Thời gian hiện tại (giây)
        this.isPlaying = false; // Trạng thái phát
        this.animationFrameId = null; // ID của requestAnimationFrame
        this.startPlayTime = 0; // Thời điểm bắt đầu phát
        this.clips = []; // Danh sách các clip
        this.selectedClipId = null; // ID của clip đang chọn
        
        // Lấy các phần tử DOM cần thiết
        this.tracksContainer = document.getElementById('timeline-tracks');
        this.ruler = document.getElementById('timeline-ruler');
        this.playhead = document.getElementById('timeline-playhead');
        
        // Kiểm tra và thông báo nếu không tìm thấy các phần tử cần thiết
        if (!this.tracksContainer) {
            console.error(`Timeline tracks container with ID 'timeline-tracks' not found`);
            // Khởi tạo một phần tử mới nếu không tìm thấy
            this.tracksContainer = document.createElement('div');
            this.tracksContainer.id = 'timeline-tracks';
            this.tracksContainer.className = 'timeline-tracks';
            this.container.appendChild(this.tracksContainer);
            console.log("Đã tạo mới timeline-tracks container");
        }
        
        if (!this.ruler) {
            console.error(`Timeline ruler with ID 'timeline-ruler' not found`);
        }
        
        if (!this.playhead) {
            console.error(`Timeline playhead with ID 'timeline-playhead' not found`);
        }
        
        // Khởi tạo UI
        this.initializeUI();
        
        // Gắn sự kiện
        this.bindEvents();
        
        console.log(`Timeline initialized with ${this.duration}s duration at ${this.pixelsPerSecond}px/s`);
    }

    /**
     * Khởi tạo giao diện timeline
     */
    initializeUI() {
        // Tạo thước đo thời gian
        this.updateRuler();
        
        // Tạo các track cho timeline
        this.createTracks();
        
        // Đặt vị trí playhead ban đầu
        this.updatePlayhead();
    }

    /**
     * Cập nhật thước đo thời gian
     */
    updateRuler() {
        if (!this.ruler) return;
        
        // Xóa các đánh dấu cũ
        this.ruler.innerHTML = '';
        
        // Tính toán số lượng mốc thời gian
        const totalWidth = this.duration * this.pixelsPerSecond;
        this.ruler.style.width = `${totalWidth}px`;
        
        // Xác định khoảng thời gian giữa các mốc
        let interval = this.options.rulerInterval;
        
        // Điều chỉnh khoảng thời gian dựa trên tổng thời lượng
        if (this.duration > 60) {
            interval = 5; // 5 giây nếu dài hơn 1 phút
        } else if (this.duration > 20) {
            interval = 2; // 2 giây nếu dài hơn 20 giây
        }
        
        // Thêm các mốc thời gian mới
        for (let i = 0; i <= this.duration; i += interval) {
            const marker = document.createElement('div');
            marker.className = 'ruler-marker';
            marker.style.position = 'absolute';
            marker.style.left = `${i * this.pixelsPerSecond}px`;
            marker.style.height = i % (interval * 2) === 0 ? '15px' : '10px';
            marker.style.width = i % (interval * 2) === 0 ? '2px' : '1px';
            marker.style.backgroundColor = i % (interval * 2) === 0 ? '#aaa' : '#666';
            marker.style.top = '15px';
            
            // Thêm số thời gian cho các mốc chính
            if (i % (interval * 2) === 0) {
                const label = document.createElement('div');
                label.textContent = this.formatTime(i);
                label.style.position = 'absolute';
                label.style.left = '50%';
                label.style.transform = 'translateX(-50%)';
                label.style.top = '-15px';
                label.style.fontSize = '11px';
                label.style.color = '#ccc';
                marker.appendChild(label);
            }
            
            this.ruler.appendChild(marker);
        }
        
        // Thêm một đánh dấu ở cuối cùng nếu chưa có
        if (this.duration % interval !== 0) {
            const endMarker = document.createElement('div');
            endMarker.className = 'ruler-marker';
            endMarker.style.position = 'absolute';
            endMarker.style.left = `${this.duration * this.pixelsPerSecond}px`;
            endMarker.style.height = '15px';
            endMarker.style.width = '2px';
            endMarker.style.backgroundColor = '#f00';
            endMarker.style.top = '15px';
            
            const label = document.createElement('div');
            label.textContent = this.formatTime(this.duration);
            label.style.position = 'absolute';
            label.style.left = '50%';
            label.style.transform = 'translateX(-50%)';
            label.style.top = '-15px';
            label.style.fontSize = '11px';
            label.style.color = '#f88';
            endMarker.appendChild(label);
            
            this.ruler.appendChild(endMarker);
        }
    }

    /**
     * Tạo các track cho timeline
     */
    createTracks() {
        if (!this.tracksContainer) {
            console.error("Không tìm thấy container cho tracks");
            return;
        }
        
        console.log("Tạo các track cho timeline");
        
        // Xóa các track cũ
        this.tracksContainer.innerHTML = '';
        
        // Tính toán tổng chiều rộng dựa trên thời lượng và tỷ lệ pixel/giây
        const totalWidth = Math.max(800, this.duration * this.pixelsPerSecond);
        
        // Track cho video
        const videoTrack = document.createElement('div');
        videoTrack.className = 'timeline-track video-track';
        videoTrack.id = 'video-track';
        videoTrack.style.height = '60px';
        videoTrack.style.width = `${totalWidth}px`;
        videoTrack.style.position = 'relative';
        videoTrack.style.backgroundColor = '#2d2d2d';
        videoTrack.style.borderBottom = '1px solid #444';
        videoTrack.dataset.trackType = 'video';
        
        // Thêm label cho track
        const videoLabel = document.createElement('div');
        videoLabel.textContent = 'Video';
        videoLabel.className = 'track-label';
        videoTrack.appendChild(videoLabel);
        
        // Track cho ảnh/GIF
        const imageTrack = document.createElement('div');
        imageTrack.className = 'timeline-track image-track';
        imageTrack.id = 'image-track';
        imageTrack.style.height = '50px';
        imageTrack.style.width = `${totalWidth}px`;
        imageTrack.style.position = 'relative';
        imageTrack.style.backgroundColor = '#333333';
        imageTrack.style.borderBottom = '1px solid #444';
        imageTrack.dataset.trackType = 'image';
        
        // Thêm label cho track
        const imageLabel = document.createElement('div');
        imageLabel.textContent = 'Ảnh/GIF';
        imageLabel.className = 'track-label';
        imageTrack.appendChild(imageLabel);
        
        // Track cho audio
        const audioTrack = document.createElement('div');
        audioTrack.className = 'timeline-track audio-track';
        audioTrack.id = 'audio-track';
        audioTrack.style.height = '40px';
        audioTrack.style.width = `${totalWidth}px`;
        audioTrack.style.position = 'relative';
        audioTrack.style.backgroundColor = '#252525';
        audioTrack.style.borderBottom = '1px solid #444';
        audioTrack.dataset.trackType = 'audio';
        
        // Thêm label cho track
        const audioLabel = document.createElement('div');
        audioLabel.textContent = 'Audio';
        audioLabel.className = 'track-label';
        audioTrack.appendChild(audioLabel);
        
        // Track cho nhạc nền
        const backgroundMusicTrack = document.createElement('div');
        backgroundMusicTrack.className = 'timeline-track bgmusic-track';
        backgroundMusicTrack.id = 'bgmusic-track';
        backgroundMusicTrack.style.height = '40px';
        backgroundMusicTrack.style.width = `${totalWidth}px`;
        backgroundMusicTrack.style.position = 'relative';
        backgroundMusicTrack.style.backgroundColor = '#1e3a1e'; // Màu xanh đậm hơn so với audio track
        backgroundMusicTrack.style.borderBottom = '1px solid #444';
        backgroundMusicTrack.dataset.trackType = 'bgmusic';
        
        // Thêm label cho track
        const bgmusicLabel = document.createElement('div');
        bgmusicLabel.textContent = 'Nhạc nền';
        bgmusicLabel.className = 'track-label';
        backgroundMusicTrack.appendChild(bgmusicLabel);
        
        // Track cho text
        const textTrack = document.createElement('div');
        textTrack.className = 'timeline-track text-track';
        textTrack.id = 'text-track';
        textTrack.style.height = '40px';
        textTrack.style.width = `${totalWidth}px`;
        textTrack.style.position = 'relative';
        textTrack.style.backgroundColor = '#2d2d2d';
        textTrack.dataset.trackType = 'text';
        
        // Thêm label cho track
        const textLabel = document.createElement('div');
        textLabel.textContent = 'Text';
        textLabel.className = 'track-label';
        textTrack.appendChild(textLabel);
        
        // Thêm vào container
        this.tracksContainer.appendChild(videoTrack);
        this.tracksContainer.appendChild(imageTrack);
        this.tracksContainer.appendChild(audioTrack);
        this.tracksContainer.appendChild(backgroundMusicTrack);
        this.tracksContainer.appendChild(textTrack);
        
        console.log("Đã thêm tracks: video, image, audio, bgmusic, text");
        
        // Thêm đường kẻ dọc cho mỗi mốc thời gian chính
        for (let i = 0; i <= this.duration; i += 5) {
            if (i === 0) continue; // Bỏ qua mốc 0s
            
            const timeLine = document.createElement('div');
            timeLine.style.position = 'absolute';
            timeLine.style.left = `${i * this.pixelsPerSecond}px`;
            timeLine.style.top = '0';
            timeLine.style.width = '1px';
            timeLine.style.height = '100%';
            timeLine.style.backgroundColor = i % 10 === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)';
            timeLine.style.pointerEvents = 'none';
            timeLine.style.zIndex = '1';
            
            // Thêm vào từng track
            videoTrack.appendChild(timeLine.cloneNode(true));
            imageTrack.appendChild(timeLine.cloneNode(true));
            audioTrack.appendChild(timeLine.cloneNode(true));
            backgroundMusicTrack.appendChild(timeLine.cloneNode(true));
            textTrack.appendChild(timeLine.cloneNode(true));
        }
        
        // Thêm debug info
        console.log(`Đã tạo tracks với độ rộng: ${totalWidth}px`);
            
            // Thêm sự kiện kéo thả cho các track
            this.addDropEventsToTrack(videoTrack, 'video');
            this.addDropEventsToTrack(imageTrack, 'image');
            this.addDropEventsToTrack(audioTrack, 'audio');
            this.addDropEventsToTrack(backgroundMusicTrack, 'bgmusic');
            this.addDropEventsToTrack(textTrack, 'text');
        }

        /**
         * Thêm sự kiện kéo thả vào track
         */
        addDropEventsToTrack(track, trackType) {
            console.log(`Đã thêm sự kiện kéo thả cho track ${trackType}`);
            
            // Thêm sự kiện khi kéo clip qua track
            track.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            
            // Thêm sự kiện drop (thả clip)
            track.addEventListener('drop', (e) => {
                e.preventDefault();
                
                // Lấy ID clip đang kéo
                const clipId = e.dataTransfer.getData('text/plain');
                if (!clipId) return;
                
                // Tìm clip trong danh sách
                const clipIndex = this.clips.findIndex(c => c.id === clipId);
                if (clipIndex === -1) return;
                
                const clip = this.clips[clipIndex];
                
                // Tính toán vị trí mới dựa trên điểm thả
                const trackRect = track.getBoundingClientRect();
                const offsetX = e.clientX - trackRect.left;
                const newStartTime = Math.max(0, offsetX / this.pixelsPerSecond);
                
                console.log(`Di chuyển clip ${clipId} đến vị trí ${newStartTime.toFixed(2)}s trên track ${trackType}`);
                
                // Kiểm tra loại track có phù hợp với loại clip không
                if (clip.type !== trackType && !(clip.type === 'video' && trackType === 'audio')) {
                    console.warn(`Không thể thả clip loại ${clip.type} vào track ${trackType}`);
                    return;
                }
                
                // Cập nhật vị trí và loại của clip
                clip.startTime = newStartTime;
                if (trackType !== clip.type && clip.type === 'video' && trackType === 'audio') {
                    // Nếu kéo clip video sang track audio, chuyển thành clip audio
                    console.log(`Chuyển clip ${clipId} từ loại video sang audio`);
                    clip.type = 'audio';
                }
                
                // Tính toán thời lượng mới của timeline dựa trên clip được kéo
                const clipEndTime = newStartTime + clip.duration;
                if (clipEndTime > this.duration) {
                    this.duration = clipEndTime;
                    
                    // Cập nhật UI
                    this.updateRuler();
                    this.createTracks();
                    this.updateTimeDisplays();
                    
                    // Kích hoạt sự kiện để thông báo thời lượng đã thay đổi
                    const event = new CustomEvent('timelineDurationChanged', { 
                        detail: { duration: this.duration } 
                    });
                    this.container.dispatchEvent(event);
                    
                    
                }
                
                // Cập nhật thời lượng timeline
                this.updateTimelineDuration();
                
                // Render lại clip 
                this.renderClips();
            });
        }

        /**
         * Cập nhật vị trí của playhead
         */
        updatePlayhead() {
            if (!this.playhead) return;
            
            // Tính toán vị trí của playhead dựa trên thời gian hiện tại
            const position = this.currentTime * this.pixelsPerSecond;
            
            // Cập nhật vị trí của playhead
            this.playhead.style.left = `${position}px`;
        }

        /**
         * Thiết lập thời gian hiện tại
         */
        setCurrentTime(time) {
            // Đảm bảo thời gian không vượt quá thời lượng tổng thể
            this.currentTime = Math.max(0, Math.min(time, this.duration));
            this.updatePlayhead();
            
            // Cập nhật hiển thị thời gian
            this.updateTimeDisplays();
            
            // Gọi callback (nếu có)
            if (typeof this.options.onTimeUpdate === 'function') {
                this.options.onTimeUpdate(this.currentTime);
            }
        }

        /**
         * Cập nhật các hiển thị thời gian
         */
        updateTimeDisplays() {
            // Cập nhật hiển thị thời gian hiện tại
            const currentTimeElement = document.getElementById('timeline-current-time');
            if (currentTimeElement) {
                currentTimeElement.textContent = this.formatTimeDetailed(this.currentTime);
            }
            
            // Cập nhật hiển thị thời lượng
            const durationElement = document.getElementById('timeline-duration');
            if (durationElement) {
                durationElement.textContent = this.formatTimeDetailed(this.duration);
            }
            
            // Cập nhật thanh seek
            const seekBar = document.getElementById('timeline-seek');
            if (seekBar) {
                seekBar.max = this.duration;
                seekBar.value = this.currentTime;
            }
        }

        /**
         * Format thời gian thành chuỗi mm:ss
         */
        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
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

        /**
         * Gắn các sự kiện
         */
        bindEvents() {
            // Click vào ruler để thay đổi thời gian
            if (this.ruler) {
                this.ruler.addEventListener('click', (e) => {
                    const rect = this.ruler.getBoundingClientRect();
                    const clickPosition = e.clientX - rect.left;
                    const time = clickPosition / this.pixelsPerSecond;
                    
                    this.setCurrentTime(time);
                });
            }
            
            // Cập nhật hiển thị thời gian
            this.updateTimeDisplays();
        }

        /**
         * Thêm clip vào timeline với thời lượng cụ thể
         * Phương thức này đảm bảo tương thích với videoEditor.js
         */
        addClipWithTimeConstraint(clip, duration, startAtTime = null) {
            console.log('Thêm clip:', clip, duration, startAtTime);
            
            // Xác định ID cho clip nếu chưa có
            if (!clip.id) {
                clip.id = `clip-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            }
            
            // Thiết lập thời lượng cho clip
            clip.duration = duration;
            
            // Xác định thời điểm bắt đầu
            if (startAtTime === null) {
                // Nếu không chỉ định, thêm vào cuối timeline
                clip.startTime = this.duration;
            } else {
                // Nếu chỉ định, sử dụng thời điểm được chỉ định
                clip.startTime = startAtTime;
            }
            
            // Đảm bảo có thuộc tính type
            if (!clip.type) {
                clip.type = 'video';
            }
            
            // Thêm clip vào danh sách
            this.clips.push(clip);
            
            // Cập nhật thời lượng timeline
            this.updateTimelineDuration();
            
            // Render lại các clips
            this.renderClips();
            
            // Thêm vào danh sách bên panel
            this.updateClipsList();
            
            console.log(`Đã thêm clip với duration ${duration}s tại ${clip.startTime}s. ID: ${clip.id}`);
            return clip.id;
        }

        /**
         * Cập nhật thời lượng timeline dựa trên clips
         */
        updateTimelineDuration() {
            if (this.clips.length === 0) {
                // Nếu không có clip, sử dụng thời lượng mặc định
                this.duration = this.options.duration;
            } else {
                // Tính thời lượng dựa trên clip có endTime lớn nhất
                let maxEndTime = 0;
                for (const clip of this.clips) {
                    const endTime = clip.startTime + clip.duration;
                    if (endTime > maxEndTime) {
                        maxEndTime = endTime;
                    }
                }
                
                // Không cần thêm buffer, để timeline chính xác bằng với nội dung
                this.duration = maxEndTime;
            }
            
            // Cập nhật UI
            this.updateRuler();
            this.createTracks();
            
            // Cập nhật hiển thị thời lượng
            this.updateTimeDisplays();
            
            // Cập nhật thanh seek
            const seekBar = document.getElementById('timeline-seek');
            if (seekBar) {
                seekBar.max = this.duration;
            }
            
            // Kích hoạt sự kiện để thông báo thời lượng đã thay đổi
            const event = new CustomEvent('timelineDurationChanged', { 
                detail: { duration: this.duration } 
            });
            this.container.dispatchEvent(event);
        }

        /**
         * Render tất cả clips lên timeline
         */
        renderClips() {
            console.log("Đang render các clips trên timeline:", this.clips);
            
            if (!this.clips || this.clips.length === 0) {
                console.log("Không có clip nào để render");
                return;
            }
            
            // Xóa clip cũ trên tất cả các track
            document.querySelectorAll('.timeline-clip').forEach(el => {
                el.remove();
            });
            
            // Lấy các track container
            const videoTrack = document.getElementById('video-track');
            const imageTrack = document.getElementById('image-track');
            const audioTrack = document.getElementById('audio-track');
            const backgroundMusicTrack = document.getElementById('bgmusic-track');
            const textTrack = document.getElementById('text-track');
            
            if (!videoTrack || !imageTrack || !audioTrack || !backgroundMusicTrack || !textTrack) {
                console.error("Không tìm thấy các track container");
                return;
            }
            
            // Render từng clip
            this.clips.forEach(clip => {
                // Xác định track phù hợp
                let trackElement;
                let clipClass = 'timeline-clip';
                
                switch (clip.type) {
                    case 'video':
                        trackElement = videoTrack;
                        clipClass += ' video-clip';
                        break;
                    case 'image':
                        trackElement = imageTrack;
                        clipClass += ' image-clip';
                        break;
                    case 'audio':
                        trackElement = audioTrack;
                        clipClass += ' audio-clip';
                        break;
                    case 'bgmusic':
                        trackElement = backgroundMusicTrack;
                        clipClass += ' bgmusic-clip';
                        break;
                    case 'text':
                        trackElement = textTrack;
                        clipClass += ' text-clip';
                        break;
                    default:
                        console.warn(`Loại clip không hợp lệ: ${clip.type}`);
                        return;
                }
            
            // Tạo element cho clip
            const clipElement = document.createElement('div');
                clipElement.className = clipClass;
            clipElement.dataset.clipId = clip.id;
            clipElement.style.position = 'absolute';
                clipElement.style.height = '80%';
                clipElement.style.top = '10%';
                
                // Vị trí và kích thước
                const startPos = clip.startTime * this.pixelsPerSecond;
                const width = clip.duration * this.pixelsPerSecond;
                
                clipElement.style.left = `${startPos}px`;
            clipElement.style.width = `${width}px`;
            
                // Màu sắc và viền
            if (clip.type === 'video') {
                    clipElement.style.backgroundColor = '#4285f4'; // Xanh dương cho video
                    
                    // Thêm thumbnail nếu có
                if (clip.imagePath) {
                        clipElement.style.backgroundImage = `url('${clip.imagePath}')`;
                        clipElement.style.backgroundSize = 'cover';
                        clipElement.style.backgroundPosition = 'center';
                    }
                } else if (clip.type === 'audio') {
                    clipElement.style.backgroundColor = '#34a853'; // Xanh lá cho audio
                } else if (clip.type === 'bgmusic') {
                    clipElement.style.backgroundColor = '#1e7536'; // Màu xanh đậm hơn cho nhạc nền
                    
                    // Tạo hiệu ứng sóng nhạc
                    const waveContainer = document.createElement('div');
                    waveContainer.className = 'music-waveform';
                    waveContainer.style.position = 'absolute';
                    waveContainer.style.left = '0';
                    waveContainer.style.top = '0';
                    waveContainer.style.width = '100%';
                    waveContainer.style.height = '60%';
                    waveContainer.style.display = 'flex';
                    waveContainer.style.justifyContent = 'space-evenly';
                    waveContainer.style.alignItems = 'center';
                    
                    // Tạo các thanh biểu diễn sóng âm
                    const barCount = Math.max(8, Math.floor(width / 10));
                    for (let i = 0; i < barCount; i++) {
                        const bar = document.createElement('div');
                        const height = 20 + Math.sin(i * 0.5) * 15;
                        bar.style.height = `${height}%`;
                        bar.style.width = '2px';
                        bar.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                        bar.style.marginLeft = '2px';
                        waveContainer.appendChild(bar);
                    }
                    
                    clipElement.appendChild(waveContainer);
                } else {
                    clipElement.style.backgroundColor = '#fbbc05'; // Vàng cho text
                }
                
                clipElement.style.borderRadius = '3px';
                clipElement.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
                
                // Thêm tên clip
                const clipName = document.createElement('div');
                clipName.className = 'clip-name';
                clipName.textContent = clip.name || clip.id;
                clipName.style.color = 'white';
                clipName.style.fontSize = '12px';
                clipName.style.padding = '4px';
                clipName.style.overflow = 'hidden';
                clipName.style.textOverflow = 'ellipsis';
                clipName.style.whiteSpace = 'nowrap';
                clipName.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
                clipElement.appendChild(clipName);
                
                // Thêm vào track
                trackElement.appendChild(clipElement);
                
                // Thêm sự kiện cho clip
                this.addClipEvents(clipElement, clip);
            });
            
            console.log(`Đã render ${this.clips.length} clips lên giao diện`);
        }
        
        /**
         * Thêm sự kiện cho clip
         */
        addClipEvents(clipElement, clip) {
            // Sự kiện click
            clipElement.addEventListener('click', (e) => {
                // Bỏ chọn clip khác
                document.querySelectorAll('.timeline-clip.selected').forEach(el => {
                    if (el !== clipElement) {
                        el.classList.remove('selected');
                    }
                });
                
                // Chọn clip này
                clipElement.classList.toggle('selected');
                
                // Cập nhật ID clip đang chọn
                this.selectedClipId = clipElement.classList.contains('selected') ? clip.id : null;
                
                e.stopPropagation();
            });
            
            // Làm cho clip có thể kéo thả
            clipElement.draggable = true;
            
            // Khi bắt đầu kéo
            clipElement.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', clip.id);
                clipElement.classList.add('dragging');
                
                // Lưu thông tin offset tại điểm kéo để tính vị trí chính xác
                const rect = clipElement.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                e.dataTransfer.setData('offset-x', offsetX.toString());
                
                console.log(`Bắt đầu kéo clip ${clip.id} (${clip.type})`);
            });
            
            // Khi kết thúc kéo
            clipElement.addEventListener('dragend', () => {
                clipElement.classList.remove('dragging');
            });
            
            // Xử lý các phím tắt khi clip được chọn
            clipElement.addEventListener('keydown', (e) => {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    // Xóa clip
                    this.removeClip(clip.id);
                    e.preventDefault();
                } else if (e.key === 'ArrowLeft') {
                    // Di chuyển clip sang trái
                    clip.startTime = Math.max(0, clip.startTime - 0.1);
                    this.renderClips();
                    e.preventDefault();
                } else if (e.key === 'ArrowRight') {
                    // Di chuyển clip sang phải
                    clip.startTime += 0.1;
                    this.renderClips();
                    e.preventDefault();
                }
            });
            
            // Cho phép clip có thể focus để nhận sự kiện keyboard
            clipElement.setAttribute('tabindex', '0');
        }

        /**
         * Cập nhật danh sách clips trong panel
         */
        updateClipsList() {
            const clipsList = document.getElementById('clips-list');
            if (!clipsList) return;
            
            // Xóa nội dung cũ
            clipsList.innerHTML = '';
            
            // Thêm từng clip vào danh sách
            this.clips.forEach(clip => {
                const item = document.createElement('button');
                item.className = `list-group-item list-group-item-action ${this.selectedClipId === clip.id ? 'active' : ''}`;
                item.dataset.clipId = clip.id;
                item.setAttribute('draggable', 'true');
                item.style.cursor = 'move';
                
                // Tạo nội dung cho item
                const duration = this.formatTime(clip.duration);
                item.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span>${clip.name || `Clip ${clip.id.split('-')[1] || clip.id}`}</span>
                        <span class="badge bg-secondary">${duration}</span>
                    </div>
                `;
                
                // Sự kiện click để chọn clip
                item.addEventListener('click', () => {
                    // Bỏ chọn clip khác
                    document.querySelectorAll('#clips-list .list-group-item.active').forEach(el => {
                        el.classList.remove('active');
                    });
                    
                    // Chọn clip này
                    item.classList.add('active');
                    this.selectedClipId = clip.id;
                    
                    // Cập nhật hiển thị trên timeline
                    document.querySelectorAll('.timeline-clip').forEach(el => {
                        if (el.dataset.clipId === clip.id) {
                            el.classList.add('selected');
                        } else {
                            el.classList.remove('selected');
                        }
                    });
                    
                    // Hiển thị editor cho clip nếu có
                    if (typeof showClipEditor === 'function') {
                        showClipEditor(this);
                    } else {
                        console.log('Hiển thị thông tin clip:', clip);
                    }
                });
                
                clipsList.appendChild(item);
            });
            
            console.log(`Đã cập nhật danh sách clips: ${this.clips.length} clips`);
        }

        /**
         * Xóa clip khỏi timeline
         */
        removeClip(clipId) {
            const index = this.clips.findIndex(c => c.id === clipId);
            if (index === -1) return;
            
            console.log(`Xóa clip ${clipId} khỏi timeline`);
            this.clips.splice(index, 1);
            this.updateTimelineDuration();
        this.renderClips();
        this.updateClipsList();
        }
    };

    // Thông báo Timeline đã sẵn sàng
    document.addEventListener('DOMContentLoaded', () => {
        console.log("Timeline module đã sẵn sàng!");
    });
}

// Đảm bảo có phương thức addClipWithTimeConstraint trên đối tượng Timeline
if (window.Timeline && !window.Timeline.prototype.addClipWithTimeConstraint) {
    console.log("Đang thêm phương thức addClipWithTimeConstraint vào Timeline hiện có");
    window.Timeline.prototype.addClipWithTimeConstraint = function(clip, duration, startAtTime = null) {
        console.log('Thêm clip:', clip, duration, startAtTime);
        
        // Xác định ID cho clip nếu chưa có
        if (!clip.id) {
            clip.id = `clip-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }
        
        // Thiết lập thời lượng cho clip
        clip.duration = duration;
        
        // Xác định thời điểm bắt đầu
        if (startAtTime === null) {
            // Nếu không chỉ định, thêm vào cuối timeline
            clip.startTime = this.duration || 0;
                } else {
            // Nếu chỉ định, sử dụng thời điểm được chỉ định
            clip.startTime = startAtTime;
        }
        
        // Đảm bảo có thuộc tính type
        if (!clip.type) {
            clip.type = 'video';
        }
        
        // Đảm bảo có mảng clips
        if (!this.clips) {
            this.clips = [];
        }
        
        // Thêm clip vào danh sách
        this.clips.push(clip);
        
        console.log(`Đã thêm clip với duration ${duration}s tại ${clip.startTime}s. ID: ${clip.id}`);
        return clip.id;
    };
}