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

    /**
     * Thêm hộp debug để hiển thị thông tin
     */
    addDebugBox(message) {
        // Tìm hoặc tạo mới hộp debug
        let debugBox = document.querySelector('.debug-box');
        
        if (!debugBox) {
            debugBox = document.createElement('div');
            debugBox.className = 'debug-box';
            document.body.appendChild(debugBox);
        }
        
        // Thêm thông báo mới với timestamp
        const time = new Date().toLocaleTimeString();
        const msgElement = document.createElement('div');
        msgElement.textContent = `[${time}] ${message}`;
        
        // Thêm vào đầu để tin nhắn mới nhất hiển thị trên cùng
        debugBox.prepend(msgElement);
        
        // Giới hạn số lượng tin nhắn
        if (debugBox.childElementCount > 20) {
            debugBox.removeChild(debugBox.lastChild);
        }
        
        // Tự động xóa sau 10 giây
        setTimeout(() => {
            if (msgElement.parentNode === debugBox) {
                debugBox.removeChild(msgElement);
            }
            
            if (debugBox.childElementCount === 0) {
                document.body.removeChild(debugBox);
            }
        }, 10000);
        
        // Cũng log ra console
        console.log(`DEBUG: ${message}`);
    }
}

export default TimelineCore; 