const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { uploadFile } = require(path.resolve(__dirname, '../../services/firebaseService'));
const videoModel = require('../../models/videoModel');

/**
 * Lấy thời lượng audio bằng ffprobe
 */
function getAudioDuration(audioPath) {
    try {
        const result = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
        return parseFloat(result.toString().trim());
    } catch {
        return 0;
    }
}

/**
 * Chuyển đổi giây sang định dạng SRT
 */
function secondsToSrtTime(seconds) {
    const date = new Date(null);
    date.setSeconds(Math.floor(seconds));
    const ms = String(Math.floor((seconds % 1) * 1000)).padStart(3, '0');
    return date.toISOString().substr(11, 8) + ',' + ms;
}

/**
 * Sinh file phụ đề SRT cho các sequent
 */
function generateSrtFile(parts, srtPath) {
    let srtContent = '';
    let currentTime = 0;

    console.log(`Đang tạo phụ đề SRT cho ${parts.length} phần video...`);

    parts.forEach((part, idx) => {
        // Chuyển đổi đường dẫn audio thành đường dẫn tuyệt đối
        const audioPath = convertUrlToFilePath(part.audioPath);
        if (!audioPath || !fs.existsSync(audioPath)) {
            console.warn(`⚠️ Không tìm thấy file audio cho phần ${idx + 1}: ${part.audioPath}`);
            return; // Bỏ qua phần này
        }

        // Lấy thời lượng audio
        const duration = getAudioDuration(audioPath);
        if (!duration) {
            console.warn(`⚠️ Không thể lấy thời lượng audio cho phần ${idx + 1}`);
            return; // Bỏ qua phần này
        }

        // Tạo thời gian bắt đầu và kết thúc
        const start = secondsToSrtTime(currentTime);
        const end = secondsToSrtTime(currentTime + duration);

        // Lấy văn bản phụ đề - ưu tiên theo thứ tự: caption > text > transcript > description
        const subtitleText = part.caption || part.text || part.transcript || part.description || '';

        // Thêm vào nội dung SRT
        srtContent += `${idx + 1}\n${start} --> ${end}\n${subtitleText}\n\n`;

        // Cập nhật thời gian hiện tại
        currentTime += duration;

        console.log(`✅ Đã thêm phụ đề cho phần ${idx + 1}: ${subtitleText.substring(0, 30)}${subtitleText.length > 30 ? '...' : ''}`);
    });

    // Ghi file SRT
    try {
        fs.writeFileSync(srtPath, srtContent, 'utf8');
        console.log(`✅ Đã ghi file phụ đề thành công: ${srtPath}`);
    } catch (error) {
        console.error(`❌ Lỗi khi ghi file phụ đề: ${error.message}`);
    }
}

/**
 * Chuyển đổi URL thành đường dẫn file vật lý
 */
function convertUrlToFilePath(urlPath) {
    if (!urlPath) return null;

    // Trường hợp đường dẫn đầy đủ (URL)
    if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
        // Lấy phần đường dẫn sau domain
        // Ví dụ: http://localhost:3000/temp/file.jpg -> /temp/file.jpg
        const urlObj = new URL(urlPath);
        urlPath = urlObj.pathname;
    }

    // Chuyển đổi đường dẫn tương đối thành đường dẫn tuyệt đối
    if (urlPath.startsWith('/')) {
        return path.join(__dirname, '../../public', urlPath.substring(1));
    }

    // Nếu là đường dẫn tương đối không bắt đầu bằng /
    return path.join(__dirname, '../../public', urlPath);
}

/**
 * Xử lý lưu dữ liệu chỉnh sửa video
 */
const saveVideoEdits = async (req, res) => {
    try {
        const { sessionId, parts } = req.body;

        if (!sessionId || !parts || !Array.isArray(parts)) {
            return res.status(400).json({
                success: false,
                error: 'Dữ liệu không hợp lệ'
            });
        }

        // Tạo thư mục tạm cho phiên làm việc này nếu chưa có
        const sessionDir = path.join(__dirname, '../../public/temp', sessionId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        // Lưu dữ liệu vào file JSON
        const dataFilePath = path.join(sessionDir, 'editor_data.json');
        fs.writeFileSync(dataFilePath, JSON.stringify(parts, null, 2));

        return res.json({
            success: true,
            message: 'Đã lưu dữ liệu chỉnh sửa video'
        });
    } catch (error) {
        console.error('Lỗi khi lưu dữ liệu chỉnh sửa video:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Lỗi server'
        });
    }
};

/**
 * Xử lý tạo video từ dữ liệu đã chỉnh sửa (có phụ đề)
 */
const createFinalVideo = async (req, res) => {
    try {
        const {
            sessionId,
            parts = [],
            aspectRatio = '16:9',
            script = null,

            music = null,
            musicVolume = 0.5,
            musicStartTime = 0,
            musicEndTime = null
        } = req.body;
        console.log('🎼 Nhạc nền:', music);
        console.log('🎚️ Volume:', musicVolume);
        console.log('🎧 Start:', musicStartTime);
        console.log('🎧 End:', musicEndTime);

        // Lấy userId (ưu tiên session, sau đó body – tuỳ app auth)
        const userId =
            req.session?.user_id
            || req.user?.id_nguoidung
            || null;
        // Lấy **topic** lưu trong session (đã được set ở prepareVideoScript)
        const topic = req.session?.videoPreparation?.topic
            || req.body.topic
            || 'Video không tiêu đề';
        if (!sessionId || !parts || !Array.isArray(parts)) {
            return res.status(400).json({
                success: false,
                error: 'Dữ liệu không hợp lệ'
            });
        }

        // Tạo thư mục đầu ra nếu chưa tồn tại
        const outputDir = path.join(__dirname, '../../public/videos');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Đảm bảo thư mục phụ đề tồn tại
        const subtitleDir = path.join(outputDir, 'subtitles');
        if (!fs.existsSync(subtitleDir)) {
            fs.mkdirSync(subtitleDir, { recursive: true });
        }

        // Tên file video
        const videoFileName = `edited_video_${Date.now()}.mp4`;
        const outputPath = path.join(outputDir, videoFileName);

        // Tạo file tạm để lưu danh sách các đoạn video
        const tempDir = path.join(__dirname, '../../public/temp');
        const tempId = uuidv4();
        const segmentListPath = path.join(tempDir, `segments_${tempId}.txt`);
        let segmentsList = '';
        const segments = [];

        // Lọc các phần là clips (loại bỏ textOverlays và các phần khác không phải clips)
        // Kiểm tra và lọc ra phần textOverlays riêng
        let textOverlays = null;
        let imageOverlays = null;
        const validParts = [];

        for (const part of parts) {
            if (part.type === 'textOverlays') {
                textOverlays = part;
            } else if (part.type === 'imageOverlays') {
                imageOverlays = part;
            } else if (part.partId && part.imagePath && part.audioPath) {
                validParts.push(part);
            }
        }

        if (validParts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Không có phần nào có đủ media (hình ảnh và âm thanh)'
            });
        }
        
        console.log(`Đã tìm thấy ${validParts.length} clip hợp lệ, ${textOverlays ? textOverlays.items?.length : 0} text overlays và ${imageOverlays ? imageOverlays.items?.length : 0} image overlays`);
        
        // Log chi tiết về text overlays để debug
        if (textOverlays && textOverlays.items && textOverlays.items.length > 0) {
            console.log('Danh sách text overlays:');
            textOverlays.items.forEach((item, idx) => {
                console.log(`Text #${idx + 1}: "${item.content && item.content.length > 20 ? item.content.substring(0, 20) + '...' : item.content}" - start: ${item.startTime}s, duration: ${item.duration}s, pos: (${item.x}, ${item.y})`);
            });
        }
        
        // Log chi tiết về image overlays để debug
        if (imageOverlays && imageOverlays.items && imageOverlays.items.length > 0) {
            console.log('Danh sách image overlays:');
            imageOverlays.items.forEach((item, idx) => {
                console.log(`Image #${idx + 1}: "${item.name}" - start: ${item.startTime}s, duration: ${item.duration}s, pos: (${item.x}, ${item.y}), scale: ${item.scale}, rotation: ${item.rotation}`);
            });
        }
        
        // Tạo segment cho từng phần
        for (let i = 0; i < validParts.length; i++) {
            const part = validParts[i];
            const segmentPath = path.join(tempDir, `segment_${tempId}_${i}.mp4`);
            segments.push(segmentPath);

            // Xác định cài đặt video
            let segmentSettings = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';

            // Áp dụng hiệu ứng (nếu có)
            if (part.effect && part.effect.type !== 'none') {
                switch (part.effect.type) {
                    case 'grayscale':
                        segmentSettings += ',colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3:0';
                        break;
                    case 'sepia':
                        segmentSettings += ',colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0';
                        break;
                    case 'brightness':
                        const brightnessValue = (part.effect.value - 50) / 50;
                        segmentSettings += `,eq=brightness=${brightnessValue}`;
                        break;
                    case 'contrast':
                        const contrastValue = part.effect.value / 50;
                        segmentSettings += `,eq=contrast=${contrastValue}`;
                        break;
                    case 'blur':
                        const blurValue = part.effect.value / 20;
                        segmentSettings += `,boxblur=${blurValue}:${blurValue}`;
                        break;
                }
            }

            // Thêm text overlay nếu có
            if (textOverlays && textOverlays.items && textOverlays.items.length > 0) {
                // Lọc chỉ lấy các text overlay áp dụng cho clip này
                const clipStartTime = part.startTime || 0;
                const clipEndTime = clipStartTime + (part.duration || 3);

                const applicableTextItems = textOverlays.items.filter(text => {
                    const textStartTime = text.startTime || 0;
                    const textEndTime = textStartTime + (text.duration || 3);

                    // Kiểm tra xem text overlay có xuất hiện trong thời gian của clip này không
                    return (textStartTime < clipEndTime && textEndTime > clipStartTime);
                });

                if (applicableTextItems.length > 0) {
                    console.log(`Có ${applicableTextItems.length} text overlay cần áp dụng cho phần ${i + 1}`);

                    // Tạo filter drawtext cho mỗi text overlay
                    applicableTextItems.forEach(textItem => {
                        // Xác định thời gian hiển thị trong clip này
                        const textStart = Math.max(0, textItem.startTime - clipStartTime);
                        const textEnd = Math.min(part.duration || 3, (textItem.startTime + textItem.duration) - clipStartTime);

                        // Tính toán vị trí
                        const xPos = Math.floor(textItem.x * 1920);
                        const yPos = Math.floor(textItem.y * 1080);

                        const textContent = textItem.content.replace(/'/g, "\\'").replace(/"/g, '\\"');
                        const fontColor = textItem.color || '#ffffff';
                        const fontSize = textItem.size || 24;

                        segmentSettings += `,drawtext=text='${textContent}':fontcolor=${fontColor}:fontsize=${fontSize}:x=${xPos}:y=${yPos}:enable='between(t,${textStart},${textEnd})':shadowcolor=black:shadowx=2:shadowy=2`;
                    });
                }
            }
            
            // Thêm image overlay nếu có
            if (imageOverlays && imageOverlays.items && imageOverlays.items.length > 0) {
                // Lọc chỉ lấy các image overlay áp dụng cho clip này
                const clipStartTime = part.startTime || 0;
                const clipEndTime = clipStartTime + (part.duration || 3);
                
                const applicableImageItems = imageOverlays.items.filter(image => {
                    const imageStartTime = image.startTime || 0;
                    const imageEndTime = imageStartTime + (image.duration || 3);
                    
                    // Kiểm tra xem image overlay có xuất hiện trong thời gian của clip này không
                    return (imageStartTime < clipEndTime && imageEndTime > clipStartTime);
                });
                
                if (applicableImageItems.length > 0) {
                    console.log(`Có ${applicableImageItems.length} image overlay cần áp dụng cho phần ${i+1}`);
                    
                    // Tạo thư mục tạm để lưu ảnh nếu cần
                    const imageOverlayDir = path.join(tempDir, `image_overlays_${tempId}`);
                    if (!fs.existsSync(imageOverlayDir)) {
                        fs.mkdirSync(imageOverlayDir, { recursive: true });
                    }
                    
                    // Xử lý từng image overlay
                    let overlayIndex = 0;
                    for (const imageItem of applicableImageItems) {
                        try {
                            // Xác định thời gian hiển thị trong clip này
                            const imageStart = Math.max(0, imageItem.startTime - clipStartTime);
                            const imageEnd = Math.min(part.duration || 3, (imageItem.startTime + imageItem.duration) - clipStartTime);
                            
                            // Tính toán vị trí
                            const xPos = Math.floor(imageItem.x * 1920);
                            const yPos = Math.floor(imageItem.y * 1080);
                            
                            // Xử lý đường dẫn ảnh
                            let imagePath = imageItem.src;
                            let localImagePath = '';
                            
                            // Nếu là URL từ internet, tải về
                            if (imagePath.startsWith('http') && !imagePath.startsWith('blob:')) {
                                try {
                                    // Tạo tên file tạm
                                    const tempImageName = `overlay_${tempId}_${overlayIndex}.png`;
                                    localImagePath = path.join(imageOverlayDir, tempImageName);
                                    
                                    // Tải ảnh về (sử dụng axios hoặc fetch)
                                    // Đây là một thao tác bất đồng bộ, nhưng chúng ta đang trong hàm đồng bộ
                                    // Nên sẽ sử dụng phương pháp đơn giản hơn
                                    console.log(`Đang tải ảnh từ URL: ${imagePath}`);
                                    
                                    // Bỏ qua bước tải ảnh, sử dụng URL trực tiếp
                                    imagePath = imageItem.src;
                                } catch (downloadError) {
                                    console.error(`Lỗi khi tải ảnh từ URL: ${imagePath}`, downloadError);
                                    continue; // Bỏ qua overlay này
                                }
                            } 
                            // Nếu là blob URL, bỏ qua vì không thể xử lý ở server
                            else if (imagePath.startsWith('blob:')) {
                                console.warn(`Không thể xử lý blob URL: ${imagePath}`);
                                continue; // Bỏ qua overlay này
                            }
                            // Nếu là đường dẫn local
                            else {
                                // Chuyển đổi URL thành đường dẫn file vật lý
                                if (imagePath.startsWith('/')) {
                                    localImagePath = path.join(__dirname, '../../public', imagePath.substring(1));
                                } else {
                                    localImagePath = path.join(__dirname, '../../public', imagePath);
                                }
                                
                                // Kiểm tra xem file có tồn tại không
                                if (!fs.existsSync(localImagePath)) {
                                    console.warn(`Không tìm thấy file ảnh: ${localImagePath}`);
                                    continue; // Bỏ qua overlay này
                                }
                                
                                imagePath = localImagePath;
                            }
                            
                            // Tính toán kích thước ảnh (giả định 20% màn hình nếu không có thông tin)
                            const width = Math.round(1920 * 0.2 * (imageItem.scale || 1));
                            
                            // Đơn giản hóa filter string để tránh lỗi cú pháp
                            const baseFilter = segmentSettings.split(',')[0];
                            // Bỏ qua phần rotation và các tham số phức tạp khác
                            // segmentSettings = `${baseFilter},overlay=x=${xPos}:y=${yPos}:enable='between(t,${imageStart},${imageEnd})'`;
                            
                            // Lưu trữ thông tin overlay vào phần này để xử lý riêng
                            if (!part.overlays) part.overlays = [];
                            part.overlays.push({
                                imagePath: imagePath,
                                x: xPos,
                                y: yPos,
                                startTime: imageStart,
                                endTime: imageEnd,
                                width: width
                            });
                            
                            overlayIndex++;
                        } catch (overlayError) {
                            console.error(`Lỗi khi xử lý image overlay: ${overlayError.message}`);
                        }
                    }
                }
            }
            

            // Thêm chuyển cảnh (nếu có)
            let transitionSettings = '';
            if (part.transition && part.transition !== 'none' && i > 0) {
                // Các hiệu ứng chuyển cảnh có thể được thêm vào đây
                // Nhưng để đơn giản, chúng ta sẽ bỏ qua trong lần triển khai đầu tiên
            }

            // Sử dụng ffmpeg để tạo segment
            try {
                // Chuyển đổi URL thành đường dẫn file vật lý
                const imagePath = convertUrlToFilePath(part.imagePath);
                const audioPath = convertUrlToFilePath(part.audioPath);

                // Kiểm tra xem file có tồn tại không
                const imageExists = fs.existsSync(imagePath);
                const audioExists = fs.existsSync(audioPath);

                if (!imageExists || !audioExists) {
                    const errorMsg = `Không tìm thấy file media cho phần ${i + 1}: Image exists: ${imageExists}, Audio exists: ${audioExists}`;

                    return res.status(400).json({
                        success: false,
                        error: errorMsg
                    });
                }

                // Xác định thời lượng của audio để tạo video có độ dài tương ứng
                const audioDuration = getAudioDuration(audioPath);
                
                // Tạo lệnh ffmpeg - phân biệt giữa trường hợp có overlay và không có
                let segmentCommand = '';

                if (part.overlays && part.overlays.length > 0) {
                    // Sử dụng filter_complex khi có overlay
                    let filterComplex = `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2`;
                    
                    // Thêm các hiệu ứng đã định nghĩa trước đó vào filter chính
                    if (part.effect && part.effect.type !== 'none') {
                        switch (part.effect.type) {
                            case 'grayscale':
                                filterComplex += ',colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3:0';
                                break;
                            case 'sepia':
                                filterComplex += ',colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0';
                                break;
                            case 'brightness':
                                const brightnessValue = (part.effect.value - 50) / 50;
                                filterComplex += `,eq=brightness=${brightnessValue}`;
                                break;
                            case 'contrast':
                                const contrastValue = part.effect.value / 50;
                                filterComplex += `,eq=contrast=${contrastValue}`;
                                break;
                            case 'blur':
                                const blurValue = part.effect.value / 20;
                                filterComplex += `,boxblur=${blurValue}:${blurValue}`;
                                break;
                        }
                    }
                    
                    // Thêm text overlays nếu có
                    if (textOverlays && textOverlays.items && textOverlays.items.length > 0) {
                        // Lọc chỉ lấy các text overlay áp dụng cho clip này
                        const clipStartTime = part.startTime || 0;
                        const clipEndTime = clipStartTime + (part.duration || 3);

                        const applicableTextItems = textOverlays.items.filter(text => {
                            const textStartTime = text.startTime || 0;
                            const textEndTime = textStartTime + (text.duration || 3);
                            return (textStartTime < clipEndTime && textEndTime > clipStartTime);
                        });

                        if (applicableTextItems.length > 0) {
                            console.log(`Có ${applicableTextItems.length} text overlay cần áp dụng cho phần ${i + 1}`);

                            // Tạo filter drawtext cho mỗi text overlay
                            applicableTextItems.forEach(textItem => {
                                // Xác định thời gian hiển thị trong clip này
                                const textStart = Math.max(0, textItem.startTime - clipStartTime);
                                const textEnd = Math.min(part.duration || 3, (textItem.startTime + textItem.duration) - clipStartTime);

                                // Tính toán vị trí
                                const xPos = Math.floor(textItem.x * 1920);
                                const yPos = Math.floor(textItem.y * 1080);

                                const textContent = textItem.content.replace(/'/g, "\\'").replace(/"/g, '\\"');
                                const fontColor = textItem.color || '#ffffff';
                                const fontSize = textItem.size || 24;

                                filterComplex += `,drawtext=text='${textContent}':fontcolor=${fontColor}:fontsize=${fontSize}:x=${xPos}:y=${yPos}:enable='between(t,${textStart},${textEnd})':shadowcolor=black:shadowx=2:shadowy=2`;
                            });
                        }
                    }

                    filterComplex += `[bg];`;
                    
                    // Thêm từng overlay vào filter complex
                    for (let j = 0; j < part.overlays.length; j++) {
                        const overlay = part.overlays[j];
                        
                        // Tạo tên cho input và output của từng layer
                        const overlayInput = `[ov${j}]`;
                        const bgName = j === 0 ? `[bg]` : `[bg${j-1}]`;
                        const outputName = j === part.overlays.length - 1 ? `[v]` : `[bg${j}]`;
                        
                        // Sửa index của input stream: j+2 thay vì j+1 vì input thứ hai là audio
                        filterComplex += `[${j+2}:v]scale=${overlay.width}:-1${overlayInput};`;
                        
                        // Thêm overlay vào background
                        filterComplex += `${bgName}${overlayInput}overlay=x=${overlay.x}:y=${overlay.y}:enable='between(t,${overlay.startTime},${overlay.endTime})'${outputName};`;
                    }
                    
                    // Chuẩn bị lệnh với nhiều input
                    let inputs = `-loop 1 -i "${imagePath.replace(/\\/g, '/')}" -i "${audioPath.replace(/\\/g, '/')}"`;
                    for (const overlay of part.overlays) {
                        inputs += ` -loop 1 -i "${overlay.imagePath.replace(/\\/g, '/')}"`;
                    }
                    
                    // Tạo lệnh ffmpeg với filter_complex
                    segmentCommand = `ffmpeg ${inputs} -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest -filter_complex "${filterComplex}" -map "[v]" -map "1:a" -t ${audioDuration} "${segmentPath.replace(/\\/g, '/')}"`;
                } else {
                    // Filter đơn giản khi không có overlay
                    segmentCommand = `ffmpeg -loop 1 -i "${imagePath.replace(/\\/g, '/')}" -i "${audioPath.replace(/\\/g, '/')}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest -vf "${segmentSettings}" -t ${audioDuration} "${segmentPath.replace(/\\/g, '/')}"`;
                }
                
                // Thêm log để debug
                console.log(`Lệnh tạo segment ${i}: ${segmentCommand}`);

                // Thực thi lệnh
                execSync(segmentCommand);

                // Thêm vào danh sách segment
                segmentsList += `file '${segmentPath.replace(/\\/g, '/')}'\n`;

            } catch (error) {
                console.error(`Lỗi khi tạo segment cho phần ${i + 1}:`, error.message);

                return res.status(500).json({
                    success: false,
                    error: `Lỗi khi tạo đoạn video cho phần ${i + 1}: ${error.message}`
                });
            }
        }

        // Ghi file danh sách segment
        fs.writeFileSync(segmentListPath, segmentsList);

        // Ghép các segment
        const concatCommand = `ffmpeg -f concat -safe 0 -i "${segmentListPath}" -c copy "${outputPath}"`;

        try {
            // Thực thi lệnh ghép video
            execSync(concatCommand);

            // Tạo file phụ đề
            const subtitleDir = path.join(outputDir, 'subtitles');
            if (!fs.existsSync(subtitleDir)) {
                fs.mkdirSync(subtitleDir, { recursive: true });
            }

            const srtPath = path.join(subtitleDir, `subtitles_${sessionId}.srt`);
            const assPath = path.join(subtitleDir, `subtitles_${sessionId}.ass`);

            // Tạo file phụ đề
            generateSrtFile(validParts, srtPath);

            // Kiểm tra nội dung phụ đề
            const srtContent = fs.readFileSync(srtPath, 'utf8').trim();
            if (!srtContent) {
                console.warn('⚠️ File SRT rỗng hoặc không tồn tại, bỏ qua bước thêm phụ đề');
            } else {
                console.log('✅ Đã tạo file phụ đề SRT thành công');

                try {
                    // Chuyển đổi SRT sang ASS để có nhiều tùy chọn style hơn
                    const srt2assCommand = `ffmpeg -i "${srtPath}" "${assPath}"`;
                    execSync(srt2assCommand);
                    console.log('✅ Đã chuyển đổi SRT sang ASS thành công');

                    // Chuẩn bị đường dẫn file phụ đề cho ffmpeg (xử lý ký tự đặc biệt)
                    const assEscapedPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

                    // Ghép phụ đề vào video
                    const outputWithSubsPath = path.join(outputDir, `final_${videoFileName}`);
                    const subtitleCommand = `ffmpeg -i "${outputPath}" -vf "subtitles='${assEscapedPath}'" -c:a copy "${outputWithSubsPath}"`;
                    console.log('🔄 Đang thêm phụ đề vào video...');

                    // Thực hiện lệnh
                    execSync(subtitleCommand);

                    // Thay thế file gốc bằng file có phụ đề
                    fs.unlinkSync(outputPath);
                    fs.renameSync(outputWithSubsPath, outputPath);
                    console.log('✅ Đã thêm phụ đề vào video thành công');
                } catch (subsError) {
                    console.error('❌ Lỗi khi thêm phụ đề với ASS:', subsError.message);

                    // Thử lại với SRT nếu không thành công
                    try {
                        console.log('🔄 Đang thử thêm phụ đề với định dạng SRT...');
                        const srtEscapedPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
                        const alternativeOutputPath = path.join(outputDir, `alt_final_${videoFileName}`);
                        const alternativeCommand = `ffmpeg -i "${outputPath}" -vf "subtitles='${srtEscapedPath}'" -c:a copy "${alternativeOutputPath}"`;

                        execSync(alternativeCommand);

                        // Thay thế file gốc bằng file có phụ đề
                        fs.unlinkSync(outputPath);
                        fs.renameSync(alternativeOutputPath, outputPath);
                        console.log('✅ Đã thêm phụ đề với định dạng SRT thành công');
                    } catch (altError) {
                        console.error('❌ Không thể thêm phụ đề:', altError.message);
                        // Tiếp tục mà không có phụ đề
                    }
                }
            }

            // Dọn dẹp: xóa các file tạm
            segments.forEach(segment => {
                try {
                    fs.unlinkSync(segment);
                } catch (e) {
                    console.warn(`Không thể xóa file tạm: ${segment}`, e);
                }
            });

            try {
                fs.unlinkSync(segmentListPath);
            } catch (e) {
                console.warn(`Không thể xóa file danh sách segment: ${segmentListPath}`, e);
            }

            // Kiểm tra kích thước file video cuối cùng
            const stats = fs.statSync(outputPath);
            console.log(`Video đã được tạo: ${outputPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

            const firebaseKey = `videos/${videoFileName}`;
            const publicUrl = await uploadFile(outputPath, firebaseKey, { contentType: 'video/mp4' });
            console.log('🚀 Upload Firebase thành công:', publicUrl);

            /* ------------------------------------------------
               6. GHI DATABASE
            -------------------------------------------------*/

            const sizeMb = (stats.size / 1024 / 1024).toFixed(2);

            await videoModel.insertVideo({
                filename: videoFileName,
                firebaseKey: firebaseKey,
                publicUrl: publicUrl,
                sizeMb: sizeMb,
                title: topic,
                script: script,
                userId: userId
            });

            /* ------------------------------------------------
               7. DỌN TEMP & RESPONSE
            -------------------------------------------------*/


            return res.json({
                success: true,
                videoUrl: publicUrl,
                localPath: `/videos/${videoFileName}`,
                title: topic,
                userId
            });

        } catch (error) {
            console.error('Lỗi khi ghép video:', error.message);

            return res.status(500).json({
                success: false,
                error: `Lỗi khi ghép video: ${error.message}`
            });
        }
    } catch (error) {
        console.error('Lỗi khi tạo video cuối cùng:', error);

        return res.status(500).json({
            success: false,
            error: error.message || 'Lỗi server'
        });
    }
};

/**
 * Xử lý tải lên file từ người dùng
 */
const uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Không có file được tải lên'
            });
        }

        // Trả về đường dẫn đến file đã tải lên
        return res.json({
            success: true,
            filePath: `/temp/${req.file.filename}`,
            originalName: req.file.originalname,
            fileType: req.file.mimetype
        });
    } catch (error) {
        console.error('Lỗi khi tải lên file:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Lỗi server'
        });
    }
};

/**
 * Kiểm tra trạng thái của controller
 */
const checkStatus = async (req, res) => {
    try {
        return res.json({
            success: true,
            message: 'Controller đang hoạt động bình thường',
            timestamp: new Date().toISOString(),
            env: {
                platform: process.platform,
                node: process.version,
                cwd: process.cwd()
            }
        });
    } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Lỗi server'
        });
    }
};

/**
 * Kiểm tra dữ liệu nhận được từ client
 */
const checkRequestData = async (req, res) => {
    try {
        // Lấy dữ liệu từ request
        const { sessionId, parts } = req.body;

        // Kiểm tra dữ liệu
        const validation = {
            sessionId: {
                exists: !!sessionId,
                type: typeof sessionId,
                value: sessionId
            },
            parts: {
                exists: !!parts,
                isArray: Array.isArray(parts),
                length: parts ? parts.length : 0,
                validParts: parts && Array.isArray(parts) ? parts.filter(part => part.partId && part.imagePath && part.audioPath).length : 0
            },
            body: req.body
        };

        // Thêm thông tin về từng phần nếu có
        if (parts && Array.isArray(parts)) {
            validation.partDetails = parts.map((part, index) => {
                // Kiểm tra tồn tại file nếu có đường dẫn
                let imageExists = false;
                let audioExists = false;

                if (part.imagePath) {
                    const imagePath = part.imagePath.startsWith('/') ? path.join(__dirname, '../../public', part.imagePath.substring(1)) : part.imagePath;
                    imageExists = fs.existsSync(imagePath);
                }

                if (part.audioPath) {
                    const audioPath = part.audioPath.startsWith('/') ? path.join(__dirname, '../../public', part.audioPath.substring(1)) : part.audioPath;
                    audioExists = fs.existsSync(audioPath);
                }

                return {
                    index,
                    partId: part.partId,
                    hasImagePath: !!part.imagePath,
                    hasAudioPath: !!part.audioPath,
                    imagePath: part.imagePath,
                    audioPath: part.audioPath,
                    imageExists,
                    audioExists,
                    isValid: !!part.partId && !!part.imagePath && !!part.audioPath && imageExists && audioExists
                };
            });
        }

        return res.json({
            success: true,
            validation,
            isValid: !!sessionId && !!parts && Array.isArray(parts) && parts.length > 0 && parts.filter(part => part.partId && part.imagePath && part.audioPath).length > 0
        });
    } catch (error) {
        console.error('Lỗi khi kiểm tra dữ liệu:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Lỗi server'
        });
    }
};

/**
 * Kiểm tra video mới nhất đã được tạo
 */
const checkLastCreatedVideo = async (req, res) => {
    try {
        // Tìm file video mới nhất trong thư mục videos
        const videosDir = path.join(__dirname, '../../public/videos');

        // Kiểm tra thư mục có tồn tại không
        if (!fs.existsSync(videosDir)) {
            return res.json({
                success: false,
                error: 'Thư mục videos không tồn tại'
            });
        }

        // Lấy danh sách file và sắp xếp theo thời gian sửa đổi (mới nhất trước)
        const files = fs.readdirSync(videosDir)
            .filter(file => file.startsWith('edited_video_') && file.endsWith('.mp4')) // Chỉ lọc các file video đã chỉnh sửa
            .map(file => {
                const filePath = path.join(videosDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    created: stats.mtime
                };
            })
            .sort((a, b) => b.created - a.created);

        // Kiểm tra xem có file nào không
        if (files.length === 0) {
            return res.json({
                success: false,
                error: 'Không tìm thấy video nào'
            });
        }

        // Lấy file mới nhất
        const latestFile = files[0];
        console.log(`Đã tìm thấy video mới nhất: ${latestFile.name}, tạo lúc: ${latestFile.created.toLocaleString()}`);

        return res.json({
            success: true,
            videoUrl: `/videos/${latestFile.name}`,
            created: latestFile.created,
            timestamp: latestFile.created.getTime()
        });
    } catch (error) {
        console.error('Lỗi khi kiểm tra video mới nhất:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Lỗi server'
        });
    }
};

module.exports = {
    saveVideoEdits,
    createFinalVideo,
    uploadMedia,
    checkStatus,
    checkRequestData,
    checkLastCreatedVideo
};