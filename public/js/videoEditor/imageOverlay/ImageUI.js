/**
 * ImageUI - Module quản lý giao diện người dùng cho ảnh overlay
 */

/**
 * Cập nhật danh sách ảnh trong panel
 * @this {ImageOverlay} Đối tượng ImageOverlay
 */
export function updateImageItemsList() {
    if (!this.itemsList) return;
    
    // Xóa danh sách cũ
    this.itemsList.innerHTML = '';
    
    // Thêm từng ảnh vào danh sách
    this.imageItems.forEach(item => {
        const element = document.createElement('button');
        element.className = `list-group-item list-group-item-action ${this.selectedImageId === item.id ? 'active' : ''}`;
        element.dataset.imageId = item.id;
        element.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>${item.name || `Ảnh ${item.id.split('-')[1]}`}</span>
                <span class="badge bg-info">${this.formatTime(item.startTime)}</span>
            </div>
        `;
        
        // Thêm sự kiện click để chọn ảnh
        element.addEventListener('click', () => {
            this.selectImage(item.id);
        });
        
        this.itemsList.appendChild(element);
    });
}

/**
 * Chọn ảnh để chỉnh sửa
 * @this {ImageOverlay} Đối tượng ImageOverlay
 * @param {string} imageId - ID của ảnh cần chọn
 */
export function selectImage(imageId) {
    // Lưu ID ảnh đang chọn
    this.selectedImageId = imageId;
    
    // Cập nhật UI
    this.updateImageItemsList();
    
    // Hiển thị editor cho ảnh
    this.showImageEditor();
    
    console.log(`Đã chọn ảnh: ${imageId}`);
    
    // Cập nhật hiển thị ảnh đã chọn trên canvas
    const imageElements = this.container.querySelectorAll('.image-overlay-item');
    imageElements.forEach(el => {
        if (el.dataset.imageId === imageId) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });
}

/**
 * Hiển thị editor cho ảnh đang chọn
 * @this {ImageOverlay} Đối tượng ImageOverlay
 */
export function showImageEditor() {
    // Lấy editor từ DOM
    const imageEditor = document.getElementById('image-editor');
    if (!imageEditor) return;
    
    // Tìm ảnh đang chọn
    const selectedImage = this.imageItems.find(item => item.id === this.selectedImageId);
    
    // Nếu có ảnh, hiển thị editor với thông tin của ảnh
    if (selectedImage) {
        // Nếu có input cho URL ảnh
        const imageUrl = document.getElementById('image-url');
        if (imageUrl) {
            imageUrl.value = selectedImage.src || '';
        }
        
        // Cập nhật các trường input
        document.getElementById('image-start-time').value = selectedImage.startTime;
        document.getElementById('image-duration').value = selectedImage.duration;
        document.getElementById('image-opacity').value = selectedImage.opacity * 100;
        document.getElementById('image-scale').value = selectedImage.scale * 100;
        document.getElementById('image-rotation').value = selectedImage.rotation;
        
        // Chọn animation
        const animationSelect = document.getElementById('image-animation');
        if (animationSelect) {
            animationSelect.value = selectedImage.animation || 'none';
        }
        
        // Thêm trường nhập liệu cho vị trí x, y nếu chưa có
        if (!document.getElementById('image-x-position')) {
            const positionGroup = document.createElement('div');
            positionGroup.className = 'mb-3 image-position-custom';
            positionGroup.id = 'image-position-custom';
            positionGroup.innerHTML = `
                <label class="form-label">Vị trí tùy chỉnh (%):</label>
                <div class="input-group">
                    <span class="input-group-text">X:</span>
                    <input type="number" class="form-control" id="image-x-position" min="0" max="100" value="${Math.round(selectedImage.x * 100)}">
                    <span class="input-group-text">Y:</span>
                    <input type="number" class="form-control" id="image-y-position" min="0" max="100" value="${Math.round(selectedImage.y * 100)}">
                </div>
                <small class="form-text text-muted">Kéo ảnh trực tiếp trên màn hình hoặc điều chỉnh giá trị ở đây</small>
            `;
            
            // Thêm vào sau input duration
            document.getElementById('image-duration').closest('.row').after(positionGroup);
        } else {
            document.getElementById('image-x-position').value = Math.round(selectedImage.x * 100);
            document.getElementById('image-y-position').value = Math.round(selectedImage.y * 100);
        }
        
        // Hiển thị editor
        imageEditor.classList.remove('d-none');
        
        // Render lại để hiển thị viền cho ảnh đang chọn
        const currentTime = this.getCurrentTime ? this.getCurrentTime() : 0;
        this.renderImageItems(currentTime);
    } else {
        // Nếu không tìm thấy ảnh, ẩn editor
        imageEditor.classList.add('d-none');
    }
}

/**
 * Ẩn editor ảnh
 * @this {ImageOverlay} Đối tượng ImageOverlay
 */
export function hideImageEditor() {
    const imageEditor = document.getElementById('image-editor');
    if (imageEditor) {
        imageEditor.classList.add('d-none');
    }
}

/**
 * Lấy thời gian hiện tại
 * @this {ImageOverlay} Đối tượng ImageOverlay
 * @returns {number} Thời gian hiện tại (giây)
 */
function getCurrentTime() {
    // Cố gắng lấy thời gian từ VideoEditor
    if (window.videoEditor) {
        if (typeof window.videoEditor.getCurrentTime === 'function') {
            return window.videoEditor.getCurrentTime();
        }
        if (window.videoEditor.timeline) {
            if (typeof window.videoEditor.timeline.getCurrentTime === 'function') {
                return window.videoEditor.timeline.getCurrentTime();
            }
            if (window.videoEditor.timeline.currentTime !== undefined) {
                return window.videoEditor.timeline.currentTime;
            }
        }
    }
    
    // Nếu không có, trả về 0
    return 0;
}

/**
 * Xử lý việc dọn dẹp modal sau khi đóng
 * @param {HTMLElement} modal - Phần tử modal
 */
function cleanupModal(modal) {
    // Đảm bảo xóa backdrop và các class modal
    setTimeout(() => {
        // Xóa lớp modal-backdrop khỏi body nếu còn sót lại
        const modalBackdrops = document.querySelectorAll('.modal-backdrop');
        modalBackdrops.forEach(backdrop => {
            backdrop.remove();
        });
        
        // Xóa các class và style trên body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }, 300);
}

/**
 * Reset form thêm ảnh
 */
function resetImageForm() {
    // Reset các trường input
    document.getElementById('new-image-url').value = '';
    document.getElementById('new-image-name').value = '';
    document.getElementById('image-upload').value = '';
}

/**
 * Tải ảnh lên server
 * @param {File} file - File ảnh cần tải lên
 * @returns {Promise<string>} Đường dẫn đến file đã tải lên
 */
async function uploadImageToServer(file) {
    const formData = new FormData();
    formData.append('media', file);
    
    try {
        const response = await fetch('/api/advanced-video/upload-media', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Lỗi khi tải ảnh lên server');
        }
        
        const data = await response.json();
        if (data.success) {
            return data.filePath; // Đường dẫn đến file đã tải lên
        } else {
            throw new Error(data.error || 'Lỗi không xác định');
        }
    } catch (error) {
        console.error('Lỗi khi tải ảnh lên server:', error);
        throw error;
    }
}

/**
 * Gắn các sự kiện UI
 * @this {ImageOverlay} Đối tượng ImageOverlay
 */
export function bindEvents() {
    // Sự kiện thêm ảnh mới
    if (this.addImageBtn) {
        this.addImageBtn.addEventListener('click', () => {
            // Mở modal thêm ảnh
            const modal = new bootstrap.Modal(this.imageModal);
            modal.show();
        });
    }
    
    // Sự kiện xác nhận thêm ảnh
    if (this.confirmAddImage) {
        this.confirmAddImage.addEventListener('click', async (event) => {
            // Lấy các giá trị từ form
            const imageUrl = document.getElementById('new-image-url').value;
            const imageName = document.getElementById('new-image-name').value;
            const imageUpload = document.getElementById('image-upload');
            
            // Kiểm tra xem có file tải lên không
            if (imageUpload && imageUpload.files && imageUpload.files[0]) {
                const file = imageUpload.files[0];
                
                // Kiểm tra kích thước (tối đa 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Kích thước file quá lớn! Vui lòng chọn file nhỏ hơn 5MB.');
                    return;
                }
                
                try {
                    // Hiển thị thông báo đang tải lên
                    const loadingMessage = document.createElement('div');
                    loadingMessage.textContent = 'Đang tải ảnh lên server...';
                    loadingMessage.className = 'alert alert-info';
                    document.querySelector('.modal-body').appendChild(loadingMessage);
                    
                    // Tải ảnh lên server
                    const serverPath = await uploadImageToServer(file);
                    
                    // Xóa thông báo đang tải
                    document.querySelector('.modal-body').removeChild(loadingMessage);
                    
                    // Thêm ảnh mới với đường dẫn từ server
                    this.addImage({
                        src: serverPath,
                        name: imageName || file.name,
                        type: file.type.includes('gif') ? 'gif' : 'image'
                    });
                    
                    // Reset form
                    resetImageForm();
                    
                    // Đóng modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('imageModal'));
                    if (modal) modal.hide();
                } catch (error) {
                    alert(`Lỗi khi tải ảnh lên: ${error.message}`);
                    event.preventDefault();
                    return false;
                }
            }
            // Nếu không có file nhưng có URL
            else if (imageUrl) {
                // Thêm ảnh mới từ URL
                this.addImage({
                    src: imageUrl,
                    name: imageName,
                    type: imageUrl.toLowerCase().endsWith('.gif') ? 'gif' : 'image'
                });
                
                // Reset form
                resetImageForm();
            } else {
                alert('Vui lòng nhập URL ảnh hoặc chọn file từ máy tính');
                // Ngăn modal đóng khi chưa có input
                event.preventDefault();
                return false;
            }
        });
    }
    
    // Sự kiện khi modal đóng
    if (this.imageModal) {
        this.imageModal.addEventListener('hidden.bs.modal', () => {
            // Xóa lớp modal-backdrop khỏi body nếu còn sót lại
            const modalBackdrops = document.querySelectorAll('.modal-backdrop');
            modalBackdrops.forEach(backdrop => {
                backdrop.remove();
            });
            
            // Xóa các class và style trên body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
    }
    
    // Sự kiện áp dụng thay đổi cho ảnh
    document.getElementById('apply-image-changes')?.addEventListener('click', () => {
        if (!this.selectedImageId) return;
        
        // Lấy giá trị từ các input
        const startTime = parseFloat(document.getElementById('image-start-time').value);
        const duration = parseFloat(document.getElementById('image-duration').value);
        const opacity = parseInt(document.getElementById('image-opacity').value) / 100;
        const scale = parseInt(document.getElementById('image-scale').value) / 100;
        const rotation = parseInt(document.getElementById('image-rotation').value);
        const animation = document.getElementById('image-animation').value;
        
        // Lấy vị trí tùy chỉnh nếu có
        let x = 0.5;
        let y = 0.5;
        
        if (document.getElementById('image-x-position') && document.getElementById('image-y-position')) {
            x = parseInt(document.getElementById('image-x-position').value) / 100;
            y = parseInt(document.getElementById('image-y-position').value) / 100;
        }
        
        // Giới hạn giá trị
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));
        
        // Cập nhật ảnh
        this.updateImage(this.selectedImageId, {
            startTime, duration, opacity, scale, rotation, animation, x, y
        });
    });
    
    // Sự kiện xóa ảnh
    document.getElementById('delete-image-item')?.addEventListener('click', () => {
        if (this.selectedImageId) {
            // Xác nhận trước khi xóa
            if (confirm('Bạn có chắc chắn muốn xóa ảnh này không?')) {
                this.removeImage(this.selectedImageId);
            }
        }
    });
    
    // Tab handling cho việc hiển thị vị trí tùy chỉnh
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', function(e) {
            const customPositionEl = document.getElementById('image-position-custom');
            if (customPositionEl) {
                if (e.target.id === 'images-tab') {
                    customPositionEl.style.display = 'block';
                } else {
                    customPositionEl.style.display = 'none';
                }
            }
        });
    });
    
    // Xử lý sự kiện khi chọn file
    const imageUpload = document.getElementById('image-upload');
    if (imageUpload) {
        imageUpload.addEventListener('change', () => {
            // Nếu đã chọn file, xóa URL để tránh nhầm lẫn
            if (imageUpload.files && imageUpload.files[0]) {
                document.getElementById('new-image-url').value = '';
                
                // Tự động điền tên file nếu chưa nhập tên
                const nameInput = document.getElementById('new-image-name');
                if (!nameInput.value) {
                    nameInput.value = imageUpload.files[0].name.split('.')[0];
                }
            }
        });
    }
    
    // Xử lý sự kiện khi nhập URL
    const imageUrlInput = document.getElementById('new-image-url');
    if (imageUrlInput) {
        imageUrlInput.addEventListener('input', () => {
            // Nếu nhập URL, reset file input để tránh nhầm lẫn
            if (imageUrlInput.value) {
                const imageUpload = document.getElementById('image-upload');
                if (imageUpload) {
                    imageUpload.value = '';
                }
            }
        });
    }
} 