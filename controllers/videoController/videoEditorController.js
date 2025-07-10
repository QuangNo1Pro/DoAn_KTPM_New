const path = require('path');
const fs = require('fs');
const { execSync: _execSync, exec, spawnSync } = require('child_process');

/** execSync an-toàn: luôn bắt lỗi và in ra thông tin chi tiết */
function execSync(cmd, opts = {}) {
  try {
    return _execSync(cmd, { stdio: 'pipe', ...opts });
  } catch (e) {
    const msg = e.stderr ? e.stderr.toString() : e.message;
    console.error('[FFMPEG-ERROR]', msg);
    throw e;                             // vẫn throw để flow phía trên biết
  }
}
const util = require('util');
const execAsync = util.promisify(exec);   // chạy ffmpeg/ffprobe dạng *không khóa* event-loop
const { v4: uuidv4 } = require('uuid');
const { uploadFile } = require(path.resolve(__dirname, '../../services/firebaseService'));
const videoModel = require('../../models/videoModel');
process.on('uncaughtException',  err => {
  console.error('[FATAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', err => {
  console.error('[FATAL] Unhandled Rejection:', err);
});


// đặt ngay dưới phần require(...)
async function transcodeToMp3(srcPath) {
  const dstPath = srcPath.replace(path.extname(srcPath), '.mp3');

  await execAsync(
    // libmp3lame phải có trong bản ffmpeg cài đặt
    `ffmpeg -y -loglevel error -i "${srcPath}" \
            -ar 44100 -ac 2 -codec:a libmp3lame -q:a 4 "${dstPath}"`,
    { timeout: 25_000 }
  );

  // KHÔNG cần giữ file .webm làm gì nữa
  fs.unlinkSync(srcPath);

  console.log('[AUDIO-DEBUG] convert OK →', dstPath);
  return { path: dstPath, converted: true };
}


/**
 * Lấy thời lượng audio bằng ffprobe
 */
 function getAudioDuration(audioPath) {
   try {
     const result = execSync(
       `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
     );
     const dur = parseFloat(result.toString().trim());
     console.log(`[AUDIO-DEBUG] ffprobe "${audioPath}" -> ${dur}s`);
     return dur;
   } catch (e) {
     console.warn(`[AUDIO-DEBUG] ffprobe lỗi với "${audioPath}":`, e.message);
     return 3;
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
function convertUrlToFilePath(p) {
  if (!p) return null;
  // bỏ domain nếu là URL
  if (p.startsWith('http://') || p.startsWith('https://')) {
    p = new URL(p).pathname;
  }
  // nếu đã absolute trên FS
  if (path.isAbsolute(p)) return p;
  // /temp/xxx → public/temp/xxx
  if (p.startsWith('/temp/')) return path.join(__dirname, '../../public', p.slice(1));
  // temp/xxx → public/temp/xxx
  if (p.startsWith('temp/')) return path.join(__dirname, '../../public', p);
  // /videos/xxx → public/videos/xxx
  if (p.startsWith('/videos/')) return path.join(__dirname, '../../public', p.slice(1));
  // fallback: tìm temp rồi videos
  const t = path.join(__dirname, '../../public/temp', p);
  if (fs.existsSync(t)) return t;
  const v = path.join(__dirname, '../../public/videos', p);
  if (fs.existsSync(v)) return v;
  // cuối cùng
  return path.join(__dirname, '../../public', p);
}


/**
 * Xử lý lưu dữ liệu chỉnh sửa video
 */
const saveVideoEdits = async (req, res) => {
    
    try {
        
        const { sessionId, parts: _parts, scriptParts } = req.body;
    const parts = _parts || scriptParts;      // ✔️ hỗ trợ cả 2 tên

    parts.forEach((p,i)=>{
  const abs = convertUrlToFilePath(p.audioPath);
  console.log('[AUDIO-DEBUG] saveVideoEdits',
    {i, audioPath:p.audioPath, abs, exists: fs.existsSync(abs)});
});

    console.log('[VIDEO-EDITOR] /saveVideoEdits', {
      sessionId,
      partsLen: Array.isArray(parts) ? parts.length : 0
    });

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
const isBlobOrDataUrl = (u) =>
  typeof u === 'string' && (u.startsWith('blob:') || u.startsWith('data:'));

/**
 * Xử lý tạo video từ dữ liệu đã chỉnh sửa (có phụ đề)
 */
const createFinalVideo = async (req, res) => {
    try {
        const {
      sessionId,
      aspectRatio      = '16:9',
      music            = null,
      musicVolume      = 0.5,
      musicStartTime   = 0,
      musicEndTime     = null,
      script           = null,

      parts:       rawParts = [],
      scriptParts: altParts = []
    } = req.body;

    const parts = rawParts.length ? rawParts : altParts;
       

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



         if (!sessionId || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({
        success: false,
        error  : 'Thiếu sessionId hoặc danh sách parts rỗng'
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

         /* ---------- PHÂN LOẠI RÕ RÀNG ---------- */
 let textOverlays  = null;
 let imageOverlays = null;
 const clips       = [];

 for (const p of parts) {
   if (p.type === 'textOverlays')  { textOverlays  = p; continue; }
   if (p.type === 'imageOverlays') { imageOverlays = p; continue; }

   if (!p.imagePath || !p.audioPath ||
       isBlobOrDataUrl(p.imagePath) || isBlobOrDataUrl(p.audioPath)) continue;

   clips.push(p);                        // CHỈ clip thực sự có media
 }

 if (clips.length === 0) {
   return res.status(400).json({
     success:false,
     error:'Tất cả clip đều đang ở trạng thái tạm (blob/data)…'
   });
 }
 console.log(`[VIDEO-EDITOR] session=${sessionId} | clips=${clips.length}`);
        
        
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
        for (let i = 0; i < clips.length; i++) {
            const part = clips[i];
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
                // Chuyển đổi URL thành đường dẫn file vật lý
let audioPath   = convertUrlToFilePath(part.audioPath);
let imagePath   = convertUrlToFilePath(part.imagePath);
let audioExists = fs.existsSync(audioPath);

/* Fallback: nếu client còn gửi đuôi .webm nhưng server đã convert */


// đợi thêm nếu vừa convert chưa kịp ghi
for (let i = 0; i < 3 && !audioExists; i++) {
  await new Promise(r => setTimeout(r, 200));
  audioExists = fs.existsSync(audioPath);
}

console.log('[AUDIO-DEBUG] Part', i, { audioPath, audioExists });
if (!audioExists) {
  return res.status(400).json({ success:false, error:`Không tìm thấy audio cho clip #${i+1}` });
}
if (!fs.existsSync(imagePath) || !audioExists) {
  const errorMsg = `Thiếu file media cho clip #${i + 1}`;
  return res.status(400).json({ success:false, error: errorMsg });
}

                // Xác định thời lượng của audio để tạo video có độ dài tương ứng
               let audioDuration = getAudioDuration(audioPath);
if (!audioDuration || isNaN(audioDuration)) {
   console.warn('[AUDIO-DEBUG] audioDuration = 0 – dùng fallback 3 s');
   audioDuration = 3;                          // fallback an toàn
 }

                
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
                console.log('[AUDIO-DEBUG] FFmpeg cmd:', segmentCommand);


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

            // Kiểm tra xem có nhạc nền không
            if (music && music !== 'none') {
                console.log(`🎵 Đang thêm nhạc nền: ${music}`);
                
                // Đường dẫn đến file nhạc nền
                const musicPath = path.join(__dirname, '../../public/music', music);
                
                // Kiểm tra file nhạc có tồn tại không
                if (!fs.existsSync(musicPath)) {
                    console.error(`❌ Không tìm thấy file nhạc: ${musicPath}`);
                } else {
                    const tempOutputPath = path.join(outputDir, `temp_${videoFileName}`);
                    
                    // Import hàm addBackgroundMusic từ service
                    const { addBackgroundMusic } = require('../../services/videoGeneratorService');
                    
                    try {
                        console.log('🎼 Đang thêm nhạc nền vào video...');
                        await addBackgroundMusic(
                            outputPath,
                            musicPath,
                            tempOutputPath,
                            musicVolume,
                            musicStartTime,
                            musicEndTime
                        );
                        
                        // Thay thế file video gốc bằng file có nhạc nền
                        fs.unlinkSync(outputPath);
                        fs.renameSync(tempOutputPath, outputPath);
                        console.log('✅ Đã thêm nhạc nền vào video thành công');
                    } catch (musicError) {
                        console.error('❌ Lỗi khi thêm nhạc nền:', musicError);
                        // Tiếp tục mà không có nhạc nền
                    }
                }
            } else {
                console.log('ℹ️ Không có nhạc nền được chọn');
            }

            
            if (!fs.existsSync(subtitleDir)) {
                fs.mkdirSync(subtitleDir, { recursive: true });
            }

            const srtPath = path.join(subtitleDir, `subtitles_${sessionId}.srt`);
            const assPath = path.join(subtitleDir, `subtitles_${sessionId}.ass`);

            // Tạo file phụ đề
            generateSrtFile(clips, srtPath);

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
/**
 * Xử lý tải lên file từ người dùng
 */
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) throw new Error('Không có file upload');

    /* -----------------------------------------------
       1. Phát hiện file cần convert
    ------------------------------------------------*/
    const mime       = req.file.mimetype;           // audio/webm | audio/ogg | …
    const ext        = path.extname(req.file.originalname).toLowerCase();
    const needConvert = /audio\/(webm|ogg)/.test(mime) || /\.(webm|ogg)$/.test(ext);

    console.log('[UPLOAD] %s (%s) → needConvert=%s',
                req.file.originalname, mime, needConvert);

    /* -----------------------------------------------
       2. Chạy ffmpeg nếu cần
    ------------------------------------------------*/
    if (needConvert) {
      const { path: mp3Path } = await transcodeToMp3(req.file.path);

      // cập nhật object req.file để code downstream chỉ thấy .mp3
      req.file.filename = path.basename(mp3Path);   // ví dụ: user_upload_123.mp3
      req.file.path     = mp3Path;
      req.file.mimetype = 'audio/mpeg';
    }

    /* -----------------------------------------------
       3. Trả về cho client (luôn là .mp3)
    ------------------------------------------------*/
    return res.json({
      success      : true,
      filePath     : `/temp/${req.file.filename}`,  // đường dẫn tĩnh tới file mp3
      originalName : req.file.originalname,
      fileType     : req.file.mimetype              // audio/mpeg
    });

  } catch (err) {
    console.error('[UPLOAD-ERROR]', err);
    res.status(500).json({ success:false, error: err.message });
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
         const {
      sessionId,
      parts:       _parts = [],
      scriptParts: _alt   = []
    } = req.body;     // ưu tiên parts, fallback scriptParts

    const parts = _parts.length ? _parts : _alt;
        // Kiểm tra dữ liệu
       const validation = {
      sessionId : { exists: !!sessionId, type: typeof sessionId, value: sessionId },
      partsMeta : {
        exists     : !!parts,
        isArray    : Array.isArray(parts),
        total      : Array.isArray(parts) ? parts.length : 0,
        withBlob   : Array.isArray(parts)
                     ? parts.filter(p => isBlobOrDataUrl(p.audioPath) || isBlobOrDataUrl(p.imagePath)).length
                     : 0,
        fullyValid : Array.isArray(parts)
                     ? parts.filter(p => p.partId && p.imagePath && p.audioPath &&
                                         !isBlobOrDataUrl(p.audioPath) && !isBlobOrDataUrl(p.imagePath)).length
                     : 0
      },
      bodyKeys  : Object.keys(req.body)
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
      success : true,
      validation,
      isValid : !!sessionId &&
                validation.partsMeta.total      > 0 &&
                validation.partsMeta.fullyValid > 0
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