/**
 * ImageRender - Module xử lý render ảnh/GIF lên canvas
 */

/**
 * Cập nhật trạng thái hiển thị của ảnh theo thời gian
 * @this {ImageOverlay} Đối tượng ImageOverlay
 * @param {number} time - Thời gian hiện tại (giây)
 */
export function updateImageAtTime(time) {
    // Lấy danh sách ảnh cần hiển thị ở thời điểm hiện tại
    const visibleImages = this.getImageItemsAtTime(time);
    
    // Lấy tất cả các ảnh đang hiển thị (DOM elements)
    const displayedElements = this.container.querySelectorAll('.image-overlay-item');
    
    // Set để theo dõi ID của ảnh đang hiển thị
    const visibleIds = new Set(visibleImages.map(img => img.id));
    const displayedIds = new Set();
    
    // Kiểm tra các phần tử đang hiển thị
    displayedElements.forEach(element => {
        const imageId = element.dataset.imageId;
        displayedIds.add(imageId);
        
        // Nếu ảnh không nên hiển thị ở thời điểm hiện tại, ẩn đi
        if (!visibleIds.has(imageId)) {
            element.style.display = 'none';
        }
    });
    
    // Hiển thị hoặc cập nhật các ảnh cần hiển thị
    visibleImages.forEach(image => {
        // Nếu đã có DOM element, cập nhật nó
        let element = document.getElementById(`image-overlay-${image.id}`);
        
        // Nếu chưa có, tạo mới
        if (!element) {
            element = createImageElement(image);
            this.container.appendChild(element);
        }
        
        // Hiển thị và cập nhật vị trí, kích thước
        element.style.display = 'block';
        updateImageElement(element, image);
    });
}

/**
 * Tạo phần tử DOM cho ảnh
 * @param {Object} image - Đối tượng ảnh
 * @returns {HTMLElement} Phần tử DOM đã tạo
 */
function createImageElement(image) {
    // Tạo phần tử chứa ảnh
    const element = document.createElement('div');
    element.id = `image-overlay-${image.id}`;
    element.className = 'image-overlay-item';
    element.dataset.imageId = image.id;
    
    // Tạo phần tử ảnh bên trong
    const imgElement = document.createElement('img');
    imgElement.src = image.src;
    imgElement.alt = image.name || 'Image overlay';
    imgElement.style.width = '100%';
    imgElement.style.height = '100%';
    imgElement.style.objectFit = 'contain';
    
    // Thêm vào phần tử chứa
    element.appendChild(imgElement);
    
    // Thêm các điểm resize nếu cần
    addResizeHandles(element);
    
    return element;
}

/**
 * Thêm các điểm resize cho phần tử ảnh
 * @param {HTMLElement} element - Phần tử DOM của ảnh
 */
function addResizeHandles(element) {
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    
    positions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `image-resizer ${pos}`;
        element.appendChild(handle);
    });
}

/**
 * Cập nhật vị trí và kích thước của phần tử ảnh
 * @param {HTMLElement} element - Phần tử DOM của ảnh
 * @param {Object} image - Đối tượng ảnh
 */
function updateImageElement(element, image) {
    // Lấy kích thước container
    const container = element.parentElement;
    if (!container) return;
    
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    // Tính toán vị trí và kích thước
    const left = (image.x * containerWidth) - ((image.width * containerWidth) / 2);
    const top = (image.y * containerHeight) - ((image.height * containerHeight) / 2);
    const width = image.width * containerWidth;
    const height = image.height * containerHeight;
    
    // Cập nhật style
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.opacity = image.opacity;
    element.style.transform = `rotate(${image.rotation}deg) scale(${image.scale})`;
    
    // Thêm class selected nếu đang được chọn
    if (window.imageOverlay && window.imageOverlay.selectedImageId === image.id) {
        element.classList.add('selected');
    } else {
        element.classList.remove('selected');
    }
    
    // Áp dụng animation nếu có
    applyAnimation(element, image);
}

/**
 * Áp dụng hiệu ứng animation cho ảnh
 * @param {HTMLElement} element - Phần tử DOM của ảnh
 * @param {Object} image - Đối tượng ảnh
 */
function applyAnimation(element, image) {
    // Xóa animation cũ nếu có
    element.style.animation = '';
    element.style.animationFillMode = '';
    
    // Nếu không có animation, thoát
    if (!image.animation || image.animation === 'none') return;
    
    // Thời gian hiện tại
    const currentTime = window.videoEditor?.getCurrentTime?.() || 0;
    
    // Thời gian từ khi bắt đầu hiển thị
    const elapsedTime = Math.max(0, currentTime - image.startTime);
    
    // Thời gian còn lại
    const remainingTime = Math.max(0, (image.startTime + image.duration) - currentTime);
    
    // Áp dụng animation tương ứng
    switch (image.animation) {
        case 'fade':
            // Nếu đang trong 0.5s đầu, fade in
            if (elapsedTime < 0.5) {
                element.style.animation = 'fadeIn 0.5s ease forwards';
                element.style.opacity = '0';
                element.style.animationPlayState = 'running';
            }
            // Nếu đang trong 0.5s cuối, fade out
            else if (remainingTime < 0.5) {
                element.style.animation = 'fadeOut 0.5s ease forwards';
                element.style.animationPlayState = 'running';
            }
            break;
            
        case 'zoom-in':
            // Nếu đang trong 0.5s đầu, zoom in
            if (elapsedTime < 0.5) {
                element.style.animation = 'zoomIn 0.5s ease forwards';
                element.style.transform = `scale(0) rotate(${image.rotation}deg)`;
                element.style.animationPlayState = 'running';
            }
            break;
            
        case 'zoom-out':
            // Nếu đang trong 0.5s cuối, zoom out
            if (remainingTime < 0.5) {
                element.style.animation = 'zoomOut 0.5s ease forwards';
                element.style.animationPlayState = 'running';
            }
            break;
            
        case 'slide-left':
            // Nếu đang trong 0.5s đầu, slide từ phải sang trái
            if (elapsedTime < 0.5) {
                element.style.animation = 'slideInLeft 0.5s ease forwards';
                element.style.transform = `translateX(100%) rotate(${image.rotation}deg) scale(${image.scale})`;
                element.style.animationPlayState = 'running';
            }
            break;
            
        case 'slide-right':
            // Nếu đang trong 0.5s đầu, slide từ trái sang phải
            if (elapsedTime < 0.5) {
                element.style.animation = 'slideInRight 0.5s ease forwards';
                element.style.transform = `translateX(-100%) rotate(${image.rotation}deg) scale(${image.scale})`;
                element.style.animationPlayState = 'running';
            }
            break;
    }
}

/**
 * Render tất cả ảnh ở thời điểm hiện tại
 * @this {ImageOverlay} Đối tượng ImageOverlay
 * @param {number} time - Thời gian hiện tại (giây)
 */
export function renderImageItems(time) {
    // Xóa tất cả ảnh hiện tại
    this.container.querySelectorAll('.image-overlay-item').forEach(el => {
        el.style.display = 'none';
    });
    
    // Lấy danh sách ảnh cần hiển thị ở thời điểm hiện tại
    const visibleImages = this.getImageItemsAtTime(time);
    
    // Render từng ảnh
    visibleImages.forEach(image => {
        // Tìm phần tử DOM của ảnh
        let element = document.getElementById(`image-overlay-${image.id}`);
        
        // Nếu chưa có, tạo mới
        if (!element) {
            element = createImageElement(image);
            this.container.appendChild(element);
        }
        
        // Hiển thị và cập nhật
        element.style.display = 'block';
        updateImageElement(element, image);
    });
}

/**
 * Render ảnh lên timeline
 * @this {ImageOverlay} Đối tượng ImageOverlay
 * @param {Object} item - Đối tượng ảnh cần render
 */
export function renderImageOnTimeline(item) {
    // Kiểm tra xem có timeline không
    if (!window.videoEditor || !window.videoEditor.timeline) {
        console.warn('Timeline chưa sẵn sàng, không thể hiển thị ảnh trên timeline');
        return;
    }
    
    // Tìm track ảnh
    const imageTrack = document.getElementById('image-track');
    if (!imageTrack) {
        console.warn('Không tìm thấy image track trên timeline');
        return;
    }
    
    // Kiểm tra xem clip đã tồn tại chưa
    const existingClip = document.getElementById(`timeline-image-${item.id}`);
    if (existingClip) {
        // Cập nhật clip đã tồn tại
        existingClip.style.left = `${item.startTime * window.videoEditor.timeline.pixelsPerSecond}px`;
        existingClip.style.width = `${item.duration * window.videoEditor.timeline.pixelsPerSecond}px`;
        return;
    }
    
    // Tạo clip mới trên timeline
    const clip = document.createElement('div');
    clip.id = `timeline-image-${item.id}`;
    clip.className = 'timeline-clip image-clip';
    clip.style.position = 'absolute';
    clip.style.height = '80%';
    clip.style.top = '10%';
    clip.style.left = `${item.startTime * window.videoEditor.timeline.pixelsPerSecond}px`;
    clip.style.width = `${item.duration * window.videoEditor.timeline.pixelsPerSecond}px`;
    clip.style.backgroundColor = '#3c7eb9';
    clip.style.borderRadius = '3px';
    clip.style.border = '1px solid #4a90e2';
    clip.style.overflow = 'hidden';
    clip.style.cursor = 'pointer';
    clip.dataset.clipId = item.id;
    clip.dataset.clipType = 'image';
    
    // Thêm thumbnail nếu có
    if (item.src) {
        // Tạo thumbnail container
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.style.width = '100%';
        thumbnailContainer.style.height = '60%';
        thumbnailContainer.style.overflow = 'hidden';
        thumbnailContainer.style.display = 'flex';
        thumbnailContainer.style.justifyContent = 'center';
        thumbnailContainer.style.alignItems = 'center';
        thumbnailContainer.style.backgroundColor = '#2a2a2a';
        
        // Tạo thumbnail
        const thumbnail = document.createElement('img');
        thumbnail.src = item.src;
        thumbnail.style.maxWidth = '100%';
        thumbnail.style.maxHeight = '100%';
        thumbnail.style.objectFit = 'contain';
        
        thumbnailContainer.appendChild(thumbnail);
        clip.appendChild(thumbnailContainer);
    }
    
    // Thêm tên
    const nameElement = document.createElement('div');
    nameElement.textContent = item.name || `Ảnh ${item.id.split('-')[1]}`;
    nameElement.style.padding = '2px 5px';
    nameElement.style.fontSize = '10px';
    nameElement.style.whiteSpace = 'nowrap';
    nameElement.style.overflow = 'hidden';
    nameElement.style.textOverflow = 'ellipsis';
    nameElement.style.color = 'white';
    clip.appendChild(nameElement);
    
    // Thêm sự kiện click
    clip.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Chọn ảnh khi click vào clip
        if (window.imageOverlay && typeof window.imageOverlay.selectImage === 'function') {
            window.imageOverlay.selectImage(item.id);
        }
        
        // Đặt thời gian hiện tại đến vị trí của clip
        if (window.videoEditor && window.videoEditor.timeline) {
            window.videoEditor.timeline.setCurrentTime(item.startTime);
        }
    });
    
    // Thêm vào track
    imageTrack.appendChild(clip);
    
    console.log(`Đã render ảnh ${item.id} lên timeline tại vị trí ${item.startTime}s với độ dài ${item.duration}s`);
} 