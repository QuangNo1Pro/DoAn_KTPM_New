const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

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
    parts.forEach((part, idx) => {
        const audioPath = part.audioPath.startsWith('/') ? path.join(__dirname, '../../public', part.audioPath.substring(1)) : part.audioPath;
        const duration = getAudioDuration(audioPath);
        const start = secondsToSrtTime(currentTime);
        const end = secondsToSrtTime(currentTime + duration);
        srtContent += `${idx + 1}\n${start} --> ${end}\n${part.text || ''}\n\n`;
        currentTime += duration;
    });
    fs.writeFileSync(srtPath, srtContent, 'utf8');
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
        const { sessionId, parts } = req.body;
        
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
        const validParts = [];
        
        for (const part of parts) {
            if (part.type === 'textOverlays') {
                textOverlays = part;
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
        
        console.log(`Đã tìm thấy ${validParts.length} clip hợp lệ và ${textOverlays ? textOverlays.items?.length : 0} text overlays`);
        
        // Log chi tiết về text overlays để debug
        if (textOverlays && textOverlays.items && textOverlays.items.length > 0) {
            console.log('Danh sách text overlays:');
            textOverlays.items.forEach((item, idx) => {
                console.log(`Text #${idx + 1}: "${item.content && item.content.length > 20 ? item.content.substring(0, 20) + '...' : item.content}" - start: ${item.startTime}s, duration: ${item.duration}s, pos: (${item.x}, ${item.y})`);
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
                    console.log(`Có ${applicableTextItems.length} text overlay cần áp dụng cho phần ${i+1}`);
                    
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
            
            // Cập nhật vf settings
            const finalSegmentSettings = `-vf "${segmentSettings}"`;
            
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
                    const errorMsg = `Không tìm thấy file media cho phần ${i+1}: Image exists: ${imageExists}, Audio exists: ${audioExists}`;
                    
                    return res.status(400).json({
                        success: false,
                        error: errorMsg
                    });
                }
                
                // Xác định thời lượng của audio để tạo video có độ dài tương ứng
                const audioDuration = getAudioDuration(audioPath);
                
                // Tạo lệnh ffmpeg
                const segmentCommand = `ffmpeg -loop 1 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest ${finalSegmentSettings} -t ${audioDuration} "${segmentPath}"`;
                
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
            const srtPath = path.join(outputDir, 'subtitles', `subtitles_${sessionId}.srt`);
            const assPath = path.join(outputDir, 'subtitles', `subtitles_${sessionId}.ass`);
            
            // Đảm bảo thư mục tồn tại
            fs.mkdirSync(path.dirname(srtPath), { recursive: true });
            
            // Tạo file phụ đề
            generateSrtFile(validParts, srtPath);
            
            // Chuyển đổi SRT sang ASS để có nhiều tùy chọn style hơn
            const srt2assCommand = `ffmpeg -i "${srtPath}" "${assPath}"`;
            execSync(srt2assCommand);
            
            // Ghép phụ đề vào video
            const outputWithSubsPath = path.join(outputDir, `final_${videoFileName}`);
            const subtitleCommand = `ffmpeg -i "${outputPath}" -vf "subtitles=${assPath.replace(/\\/g, '/')}" "${outputWithSubsPath}"`;
            
            try {
                execSync(subtitleCommand);
                
                // Thay thế file gốc bằng file có phụ đề
                fs.unlinkSync(outputPath);
                fs.renameSync(outputWithSubsPath, outputPath);
            } catch (subsError) {
                console.error('Lỗi khi thêm phụ đề:', subsError.message);
                // Tiếp tục mà không có phụ đề
            }
            
            // Dọn dẹp: xóa các file tạm
            segments.forEach(segment => {
                try {
                    fs.unlinkSync(segment);
                } catch (e) {}
            });
            
            try {
                fs.unlinkSync(segmentListPath);
            } catch (e) {}
            
            return res.json({
                success: true,
                message: 'Đã tạo video thành công',
                videoUrl: `/videos/${videoFileName}`
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