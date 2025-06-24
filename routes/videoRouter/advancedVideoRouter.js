const express = require('express');
const router = express.Router();
const { 
  generateAdvancedVideo, 
  getAvailableVoices, 
  prepareVideoScript,
  generateImageForPart,
  generateAudioForPart,
  finalizeAdvancedVideo
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

// API chuẩn bị kịch bản và phân tích thành các phần
router.post('/prepare-script', prepareVideoScript);

// API tạo/tạo lại hình ảnh cho một phần
router.post('/generate-image-for-part', generateImageForPart);

// API tạo/tạo lại giọng đọc cho một phần
router.post('/generate-audio-for-part', generateAudioForPart);

// API hoàn thiện video từ các phần đã chuẩn bị
router.post('/finalize-video', finalizeAdvancedVideo);

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
    const ttsCredentialsPath = path.join(__dirname, '../../text to speed.json');
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
    const credentialsFile = path.join(baseDir, 'text to speed.json');
    if (fs.existsSync(credentialsFile)) {
      const stats = fs.statSync(credentialsFile);
      debugInfo.credentials['text to speed.json'] = {
        exists: true,
        size: stats.size,
        permissions: fs.constants.R_OK | fs.constants.W_OK ? 'đọc/ghi' : 'không đủ quyền',
        validJson: true
      };
      
      try {
        const content = fs.readFileSync(credentialsFile, 'utf8');
        JSON.parse(content);
      } catch (error) {
        debugInfo.credentials['text to speed.json'].validJson = false;
      }
    } else {
      debugInfo.credentials['text to speed.json'] = {
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

module.exports = router; 