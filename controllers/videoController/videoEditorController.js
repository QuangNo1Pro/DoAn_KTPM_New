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
        const validParts = parts.filter(part => part.partId && part.imagePath && part.audioPath);
        
        if (validParts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Không có phần nào có đủ media (hình ảnh và âm thanh)'
            });
        }
        
        // Tạo segment cho từng phần
        for (let i = 0; i < validParts.length; i++) {
            const part = validParts[i];
            const segmentPath = path.join(tempDir, `segment_${tempId}_${i}.mp4`);
            segments.push(segmentPath);
            
            // Xác định cài đặt video
            let segmentSettings = '-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2"';
            
            // Áp dụng hiệu ứng (nếu có)
            if (part.effect && part.effect.type !== 'none') {
                let effectFilter = '';
                
                switch (part.effect.type) {
                    case 'grayscale':
                        effectFilter = `,colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3:0`;
                        break;
                    case 'sepia':
                        effectFilter = `,colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0`;
                        break;
                    case 'brightness':
                        const brightnessValue = (part.effect.value - 50) / 50;
                        effectFilter = `,eq=brightness=${brightnessValue}`;
                        break;
                    case 'contrast':
                        const contrastValue = part.effect.value / 50;
                        effectFilter = `,eq=contrast=${contrastValue}`;
                        break;
                    case 'blur':
                        const blurValue = part.effect.value / 20;
                        effectFilter = `,boxblur=${blurValue}:${blurValue}`;
                        break;
                }
                
                segmentSettings = `-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2${effectFilter}"`;
            }
            
            // Thêm chuyển cảnh (nếu có)
            let transitionSettings = '';
            if (part.transition && part.transition !== 'none' && i > 0) {
                // Các hiệu ứng chuyển cảnh có thể được thêm vào đây
                // Nhưng để đơn giản, chúng ta sẽ bỏ qua trong lần triển khai đầu tiên
            }
            
            // Sử dụng ffmpeg để tạo segment
            try {
                const imagePath = part.imagePath.startsWith('/') ? path.join(__dirname, '../../public', part.imagePath.substring(1)) : part.imagePath;
                const audioPath = part.audioPath.startsWith('/') ? path.join(__dirname, '../../public', part.audioPath.substring(1)) : part.audioPath;
                
                const segmentCommand = `ffmpeg -y -loop 1 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -shortest ${segmentSettings} -pix_fmt yuv420p "${segmentPath}"`;
                execSync(segmentCommand);
                
                // Thêm vào danh sách segment
                segmentsList += `file '${segmentPath.replace(/\\/g, '/')}'\n`;
            } catch (error) {
                console.error(`Lỗi khi tạo segment cho phần ${i + 1}:`, error.message);
                return res.status(500).json({
                    success: false,
                    error: `Lỗi khi tạo segment cho phần ${i + 1}: ${error.message}`
                });
            }
        }
        
        // Ghi file danh sách segment
        fs.writeFileSync(segmentListPath, segmentsList);
        
        // Ghép các segment thành video hoàn chỉnh
        try {
            // Sử dụng concat demuxer
            const concatCommand = `ffmpeg -y -f concat -safe 0 -i "${segmentListPath}" -c copy "${outputPath}"`;
            execSync(concatCommand);

            // Sinh file SRT cho toàn bộ video
            const srtPath = path.join(outputDir, `subtitles_${Date.now()}.srt`);
            generateSrtFile(validParts, srtPath);

            // Chèn phụ đề vào video
            const subtitledOutput = path.join(outputDir, `output_${Date.now()}.mp4`);
            const srtEscapedPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
            const subtitleCommand = `ffmpeg -y -i "${outputPath}" -vf "subtitles='${srtEscapedPath}'" -c:a copy "${subtitledOutput}"`;
            execSync(subtitleCommand);

            // Ghi đè file output cuối cùng
            fs.copyFileSync(subtitledOutput, outputPath);

            // Dọn dẹp các file tạm
            segments.forEach(segment => {
                if (fs.existsSync(segment)) {
                    fs.unlinkSync(segment);
                }
            });
            if (fs.existsSync(segmentListPath)) {
                fs.unlinkSync(segmentListPath);
            }
            if (fs.existsSync(subtitledOutput)) {
                fs.unlinkSync(subtitledOutput);
            }
            if (fs.existsSync(srtPath)) {
                fs.unlinkSync(srtPath);
            }

            // Trả về kết quả
            return res.json({
                success: true,
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
            error: error.message || 'Lỗi không xác định khi tạo video cuối cùng'
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

module.exports = {
    saveVideoEdits,
    createFinalVideo,
    uploadMedia
};