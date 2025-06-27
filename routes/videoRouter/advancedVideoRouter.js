const express = require('express');
const router = express.Router();
const { 
  generateAdvancedVideo, 
  getAvailableVoices, 
  prepareVideoScript,
  generateImageForPart,
  generateAudioForPart,
  finalizeAdvancedVideo,
  uploadImageForPart,
  generateSampleAudio,
  upload
} = require('../../controllers/videoController/advancedVideoController');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Trang hiển thị
router.get('/edit-parts', (req, res) => {
  res.render('videoView/editVideoParts', { 
    title: 'Chỉnh sửa phần video',
    layout: 'main'
  });
});

// API tạo video nâng cao với giọng đọc
router.post('/generate-advanced', generateAdvancedVideo);

// API lấy danh sách giọng đọc có sẵn
router.get('/voices', getAvailableVoices);

// API tạo mẫu âm thanh để nghe thử giọng đọc
router.post('/sample-audio', generateSampleAudio);

// API chuẩn bị kịch bản và phân tích thành các phần
router.post('/prepare-script', prepareVideoScript);

// API tạo/tạo lại hình ảnh cho một phần
router.post('/generate-image-for-part', generateImageForPart);

// API tải lên hình ảnh từ máy tính cho một phần
router.post('/upload-image-for-part', upload.single('image'), uploadImageForPart);

// API tạo/tạo lại giọng đọc cho một phần
router.post('/generate-audio-for-part', generateAudioForPart);

// API hoàn thiện video từ các phần đã chuẩn bị
router.post('/finalize-video', finalizeAdvancedVideo);

// API tạo video cuối cùng từ dữ liệu đã chỉnh sửa
router.post('/create-final-video', (req, res) => {
  try {
    const { sessionId, parts } = req.body;
    
    if (!sessionId || !parts || !Array.isArray(parts) || parts.length === 0) {
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
    const videoFileName = `advanced_video_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, videoFileName);
    
    // Chuẩn bị dữ liệu cho việc tạo video
    const validParts = parts.filter(part => part.imagePath && part.audioPath);
    
    if (validParts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Không có phần nào có đủ media (hình ảnh và âm thanh)'
      });
    }
    
    // Tạo danh sách các segment và danh sách segment
    const segmentListPath = path.join(outputDir, `segments_${Date.now()}.txt`);
    let segmentsList = '';
    const segments = [];
    
    // Tạo segment cho từng phần
    for (let i = 0; i < validParts.length; i++) {
      const part = validParts[i];
      const segmentPath = path.join(outputDir, `segment_${i}_${Date.now()}.mp4`);
      segments.push(segmentPath);
      
      // Xác định cài đặt video dựa trên tỉ lệ khung hình (mặc định 16:9)
      let segmentSettings = '-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2"';
      
      // Thêm văn bản chú thích nếu có
      let captionFilter = '';
      if (part.caption) {
        const captionText = part.caption.replace(/'/g, "\\'");
        
        // Xác định vị trí caption
        let captionY = '(h-text_h)/2'; // Mặc định ở giữa
        
        if (part.captionPosition === 'top') {
          captionY = 'text_h';
        } else if (part.captionPosition === 'bottom') {
          captionY = 'h-text_h*2';
        }
        
        captionFilter = `,drawtext=text='${captionText}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=${captionY}:shadowcolor=black:shadowx=2:shadowy=2`;
        segmentSettings = `-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2${captionFilter}"`;
      }
      
      // Tạo video segment với thời lượng dựa trên thời gian hiển thị đã chọn
      const duration = part.duration || 5;
      
      // Sử dụng ffmpeg để tạo segment
      try {
        const segmentCommand = `ffmpeg -y -loop 1 -i "${part.imagePath}" -i "${part.audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -af "volume=1.0" ${segmentSettings} -pix_fmt yuv420p -shortest "${segmentPath}"`;
        execSync(segmentCommand);
        
        // Thêm vào danh sách segment
        segmentsList += `file '${segmentPath.replace(/\\/g, '/')}'\n`;
      } catch (error) {
        console.error(`Lỗi khi tạo segment cho phần ${i + 1}:`, error.message);
      }
    }
    
    // Ghi file danh sách segment
    fs.writeFileSync(segmentListPath, segmentsList);
    
    // Ghép các segment thành video hoàn chỉnh
    try {
      // Sử dụng concat demuxer
      const concatCommand = `ffmpeg -y -f concat -safe 0 -i "${segmentListPath}" -c:a copy -s 1920x1080 "${outputPath}"`;
      execSync(concatCommand);
      
      // Dọn dẹp các file tạm
      segments.forEach(segment => {
        if (fs.existsSync(segment)) {
          fs.unlinkSync(segment);
        }
      });
      
      if (fs.existsSync(segmentListPath)) {
        fs.unlinkSync(segmentListPath);
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
});

// API kiểm tra cài đặt
router.get('/check-setup', async (req, res) => {
  try {
    const checks = {
      ffmpeg: false,
      ffprobe: false,
      googleCredentials: false,
      tempDir: false,
      videoDir: false
    };
    
    // Kiểm tra FFmpeg
    try {
      execSync('ffmpeg -version');
      checks.ffmpeg = true;
    } catch (error) {
      console.error('FFmpeg không được cài đặt:', error.message);
    }
    
    // Kiểm tra FFprobe
    try {
      execSync('ffprobe -version');
      checks.ffprobe = true;
    } catch (error) {
      console.error('FFprobe không được cài đặt:', error.message);
    }
    
    // Kiểm tra Google credentials
    const ttsCredentialsPath = path.join(__dirname, '../../text-to-speed.json');
    if (fs.existsSync(ttsCredentialsPath)) {
      checks.googleCredentials = true;
    }
    
    // Kiểm tra thư mục
    const tempDir = path.join(__dirname, '../../public/temp');
    const videoDir = path.join(__dirname, '../../public/videos');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    checks.tempDir = fs.existsSync(tempDir);
    
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    checks.videoDir = fs.existsSync(videoDir);
    
    return res.json({
      success: true,
      checks,
      allChecksPass: Object.values(checks).every(check => check)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API debug tạo video
router.get('/debug', async (req, res) => {
  try {
    const { execSync } = require('child_process');
    const path = require('path');
    const fs = require('fs');
    
    // Kiểm tra thư mục và file
    const debugInfo = {
      system: {
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version,
        memory: process.memoryUsage()
      },
      directories: {},
      files: {},
      ffmpeg: {},
      credentials: {}
    };
    
    // Kiểm tra thư mục
    const baseDir = path.join(__dirname, '../../');
    const dirsToCheck = [
      'public', 
      'public/videos', 
      'public/temp', 
      'public/temp/audio'
    ];
    
    for (const dir of dirsToCheck) {
      const fullPath = path.join(baseDir, dir);
      let status = 'không tồn tại';
      let writable = false;
      
      if (fs.existsSync(fullPath)) {
        status = 'tồn tại';
        try {
          // Kiểm tra quyền ghi
          const testFile = path.join(fullPath, `test_${Date.now()}.txt`);
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
          writable = true;
        } catch (error) {
          writable = false;
        }
      } else {
        try {
          fs.mkdirSync(fullPath, { recursive: true });
          status = 'đã tạo mới';
          writable = true;
        } catch (error) {
          status = `lỗi khi tạo: ${error.message}`;
        }
      }
      
      debugInfo.directories[dir] = {
        path: fullPath,
        status,
        writable
      };
    }
    
    // Kiểm tra file credentials
    const credentialsFile = path.join(baseDir, 'text-to-speed.json');
    if (fs.existsSync(credentialsFile)) {
      const stats = fs.statSync(credentialsFile);
      debugInfo.credentials['text-to-speed.json'] = {
        exists: true,
        size: stats.size,
        permissions: fs.constants.R_OK | fs.constants.W_OK ? 'đọc/ghi' : 'không đủ quyền',
        validJson: true
      };
      
      try {
        const content = fs.readFileSync(credentialsFile, 'utf8');
        JSON.parse(content);
      } catch (error) {
        debugInfo.credentials['text-to-speed.json'].validJson = false;
      }
    } else {
      debugInfo.credentials['text-to-speed.json'] = {
        exists: false,
        message: 'File credentials không tồn tại'
      };
    }
    
    // Kiểm tra FFmpeg
    try {
      const ffmpegVersion = execSync('ffmpeg -version').toString();
      const ffprobeVersion = execSync('ffprobe -version').toString();
      
      debugInfo.ffmpeg = {
        ffmpeg: {
          installed: true,
          version: ffmpegVersion.split('\n')[0]
        },
        ffprobe: {
          installed: true,
          version: ffprobeVersion.split('\n')[0]
        }
      };
    } catch (error) {
      debugInfo.ffmpeg = {
        error: error.message,
        solution: 'Cài đặt FFmpeg và thêm vào PATH'
      };
    }
    
    // Kiểm tra kết nối Internet (để tải hình ảnh)
    try {
      const axios = require('axios');
      const internetCheck = await axios.get('https://www.google.com', { timeout: 5000 });
      debugInfo.internet = {
        connected: internetCheck.status === 200,
        status: internetCheck.status
      };
    } catch (error) {
      debugInfo.internet = {
        connected: false,
        error: error.message
      };
    }
    
    // Trả về thông tin debug
    return res.json({
      success: true,
      debugInfo
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Import video editor controller
const { 
  saveVideoEdits, 
  createFinalVideo, 
  uploadMedia,
  checkStatus,
  checkRequestData
} = require('../../controllers/videoController/videoEditorController');

// API lưu dữ liệu chỉnh sửa video
router.post('/save-video-edits', saveVideoEdits);

// API tạo video cuối cùng từ dữ liệu đã chỉnh sửa
router.post('/create-edited-video', createFinalVideo);

// API tải lên media (hình ảnh, âm thanh) cho video editor
router.post('/upload-media', upload.single('media'), uploadMedia);

// API kiểm tra trạng thái controller
router.get('/check-editor-status', checkStatus);

// API kiểm tra dữ liệu request
router.post('/check-request-data', checkRequestData);

module.exports = router; 