/**
 * TimelineCore.js - Lớp cơ sở cho Timeline
 */
class TimelineCore {
    /**
     * Khởi tạo Timeline cơ sở
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
    }


}

export default TimelineCore; 