require('dotenv').config();
const path = require('path');
const fs = require('fs');
const util = require('util');
const { execSync } = require('child_process');
const axios = require('axios');
const { generateScriptByVertexAI } = require('../../services/vertexService');
const { VIETNAMESE_VOICES } = require('../../services/textToSpeechService');
const textToSpeech = require('@google-cloud/text-to-speech');
const multer = require('multer');
const os = require('os');
// Đã xóa import imagenService để chỉ sử dụng imageController

// Thiết lập multer cho việc tải lên file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, '../../public/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'user_upload_' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Chỉ chấp nhận các file ảnh
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Đường dẫn đến file credentials cho Text-to-Speech
const ttsCredentialsPath = path.join(__dirname, '../../text-to-speed.json');

// Khởi tạo client Text-to-Speech
let ttsClient;
try {
  ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: ttsCredentialsPath
  });
  console.log('✓ Đã khởi tạo Text-to-Speech client thành công');
} catch (error) {
  console.error('❌ Lỗi khởi tạo Text-to-Speech client:', error.message);
}

/**
 * Trích xuất các phần từ kịch bản
 */
function extractScriptParts(script) {
  const parts = [];
  
  // Chuẩn hóa script để đảm bảo dấu xuống dòng nhất quán
  const normalizedScript = script.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Regex để tìm các phần trong kịch bản (làm linh hoạt hơn) - hỗ trợ cả định dạng mới và cũ
  const partRegex = /((?:##?\s*)?PHẦN\s+(\d+|CUỐI|1:\s*HOOK)[\s\S]*?)(?:(?:\*\*)?Lời\s*thoại:?(?:\*\*)?\s*)([\s\S]*?)(?:(?:(?:\*\*)?Hình\s*ảnh:?(?:\*\*)?\s*)([\s\S]*?))?(?=\s*(?:(?:##?\s*)?PHẦN|\s*(?:##?\s*)?PHẦN CUỐI)|\s*$)/gi;
  
  console.log('🔍 Đang phân tích kịch bản...');
  console.log('📝 Đoạn đầu kịch bản:', normalizedScript.substring(0, 200));
  
  let match;
  while ((match = partRegex.exec(normalizedScript)) !== null) {
    const [fullMatch, sectionHeader, part, text, image] = match;
    
    // Thêm log để kiểm tra từng match
    console.log(`✅ Tìm thấy PHẦN ${part}:`);
    console.log(`   Lời thoại: ${text ? text.substring(0, 30) + '...' : 'không có'}`);
    console.log(`   Hình ảnh: ${image ? 'có' : 'không có'}`);
    
    parts.push({
      part: part.trim(),
      text: text ? text.trim() : '',
      image: image ? image.trim() : ''
    });
  }
  
  return parts;
}

/**
 * Chuyển văn bản thành giọng nói
 */
async function convertTextToSpeech(text, outputPath, voiceId = VIETNAMESE_VOICES.FEMALE_NEURAL_A) {
  try {
    if (!text || text.trim() === '') {
      throw new Error('Văn bản không được để trống');
    }

    console.log(`🔊 Đang chuyển văn bản thành giọng nói với giọng ${voiceId}...`);

    // Tạo thư mục đầu ra nếu chưa tồn tại
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Cấu hình request
    const request = {
      input: { text },
      voice: {
        languageCode: 'vi-VN',
        name: voiceId,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        pitch: 0,
        speakingRate: 1.0,
        volumeGainDb: 0.0
      },
    };

    // Gọi API để chuyển văn bản thành giọng nói
    const [response] = await ttsClient.synthesizeSpeech(request);
    
    // Ghi file âm thanh
    await util.promisify(fs.writeFile)(outputPath, response.audioContent, 'binary');
    
    console.log(`✓ Đã tạo file giọng nói tại: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('❌ Lỗi khi chuyển văn bản thành giọng nói:', error);
    throw error;
  }
}

/**
 * Phân tích kịch bản và tạo file âm thanh cho từng phần
 */
async function createAudioForScript(script, outputDir, voiceId = VIETNAMESE_VOICES.FEMALE_NEURAL_A) {
  try {
    // Kiểm tra và tạo thư mục đầu ra
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Trích xuất các phần từ kịch bản
    const scriptParts = extractScriptParts(script);
    console.log(`Đã tìm thấy ${scriptParts.length} phần trong kịch bản`);

    // Tạo âm thanh cho từng phần
    const audioResults = [];
    
    for (let i = 0; i < scriptParts.length; i++) {
      const part = scriptParts[i];
      const outputPath = path.join(outputDir, `part_${i + 1}.mp3`);
      
      console.log(`Đang xử lý phần ${i + 1}/${scriptParts.length}: "${part.text.substring(0, 30)}..."`);
      
      try {
        const audioPath = await convertTextToSpeech(part.text, outputPath, voiceId);
        audioResults.push({
          ...part,
          audioPath
        });
      } catch (error) {
        console.error(`Lỗi khi xử lý phần ${i + 1}:`, error.message);
        // Tiếp tục với phần tiếp theo nếu có lỗi
      }
    }

    console.log(`✓ Đã tạo ${audioResults.length}/${scriptParts.length} file âm thanh`);
    return audioResults;
  } catch (error) {
    console.error('❌ Lỗi khi tạo âm thanh cho kịch bản:', error);
    throw error;
  }
}

/**
 * Trích xuất từ khóa từ mô tả hình ảnh
 */
function extractKeywordsFromDescription(description) {
  if (!description) return [];
  
  // Danh sách từ không mang nhiều ý nghĩa tìm kiếm
  const stopWords = ['và', 'hoặc', 'của', 'với', 'trong', 'ngoài', 'trên', 'dưới', 'một', 'có', 'là', 'các', 'những',
    'được', 'sẽ', 'đang', 'đã', 'này', 'khi', 'về', 'như', 'có thể', 'tại', 'bởi', 'vì', 'từ', 'để', 'đến'];
  
  // Tách từ và lọc
  const words = description
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
  
  // Lấy các từ/cụm từ quan trọng
  const importantWords = [];
  const matches = description.match(/(?:"([^"]+)"|\(([^)]+)\)|([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+))/g) || [];
  
  // Thêm từ/cụm từ quan trọng
  matches.forEach(match => {
    const cleanMatch = match.replace(/["()]/g, '').trim();
    if (cleanMatch.length > 3) {
      importantWords.push(cleanMatch);
    }
  });
  
  // Kết hợp từ quan trọng và từ dài
  const keywords = [...new Set([...importantWords, ...words.filter(w => w.length > 5).slice(0, 5)])];
  return keywords.slice(0, 3); // Giới hạn 3 từ khóa cho mỗi mô tả
}

/**
 * Tải hình ảnh từ Unsplash dựa trên từ khóa
 */
async function downloadImagesForKeywords(keywords, tempDir) {
  // Tạo thư mục lưu trữ tạm thời nếu chưa tồn tại
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const imageFiles = [];
  
  // Tạo ảnh cho từng từ khóa bằng imageController API
  for (const keyword of keywords) {
    try {
      console.log(`🖼️ Đang tạo ảnh cho từ khóa: ${keyword}`);
      
      // Thêm độ trễ trước khi gọi API để tránh rate limit (tăng lên 15 giây)
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      // Lấy thông tin tỉ lệ khung hình từ session nếu có
      const aspectRatio = req.session?.videoPreparation?.aspectRatio || '16:9';
      
      // Gọi API imageController để tạo ảnh với tỉ lệ khung hình phù hợp
      const response = await axios.post('http://localhost:3000/api/image/generate', {
        prompt: keyword,
        modelType: 'standard', // Có thể chọn 'ultra', 'standard', hoặc 'fast' tùy nhu cầu
        imageCount: 1,
        aspectRatio: aspectRatio
      });
      
      if (response.data.success && response.data.images && response.data.images.length > 0) {
        // Lưu ảnh vào thư mục tạm
        const filePath = path.join(tempDir, `${keyword.replace(/\s+/g, '_')}_${Date.now()}.jpg`);
        
        // Kiểm tra loại dữ liệu hình ảnh trả về
        if (response.data.images[0].type === 'base64') {
          // Nếu là dữ liệu base64, chuyển thành file
          fs.writeFileSync(filePath, Buffer.from(response.data.images[0].imageData, 'base64'));
        } else if (response.data.images[0].type === 'url') {
          // Nếu là URL, tải file về
          const imgResponse = await axios.get(response.data.images[0].imageData, { responseType: 'arraybuffer' });
          fs.writeFileSync(filePath, Buffer.from(imgResponse.data));
        }
        
        // Thêm vào danh sách ảnh đã tạo
        imageFiles.push({
          keyword,
          path: filePath
        });
        
        console.log(`✅ Đã tạo thành công ảnh cho từ khóa: ${keyword}`);
      } else {
        throw new Error('Không nhận được ảnh từ imageController API');
      }
    } catch (error) {
      console.error(`❌ Lỗi khi tạo ảnh cho từ khóa ${keyword}:`, error.message);
      // Không sử dụng phương pháp dự phòng, chỉ ghi log lỗi và tiếp tục với từ khóa tiếp theo
    }
  }
  
  // Nếu không tạo được ảnh nào, sử dụng ảnh mặc định từ thư mục public/image
  if (imageFiles.length === 0) {
    console.log('⚠️ Sử dụng ảnh mặc định do không tạo được ảnh từ từ khóa');
    const defaultImages = [
      path.join(__dirname, '../../public/image/image1.png'),
      path.join(__dirname, '../../public/image/image2.png')
    ];
    
    for (const img of defaultImages) {
      if (fs.existsSync(img)) {
        imageFiles.push({
          keyword: 'default',
          path: img
        });
      }
    }
  }
  
  return imageFiles;
}

/**
 * Tải hình ảnh cho từng phần kịch bản
 */
async function downloadImagesForScriptParts(scriptParts, tempDir) {
  const results = [];
  
  // Tải ảnh cho từng phần dựa trên mô tả
  for (const part of scriptParts) {
    // Sử dụng mô tả hình ảnh nếu có
    if (part.image && part.image.trim() !== '') {
      const keywords = extractKeywordsFromDescription(part.image);
      
      if (keywords.length > 0) {
        const images = await downloadImagesForKeywords(keywords, tempDir);
        if (images.length > 0) {
          results.push({
            ...part,
            imagePath: images[0].path
          });
          continue;
        }
      }
    }
    
    // Nếu không có mô tả hoặc không tìm được ảnh, dùng văn bản để trích xuất từ khóa
    const textKeywords = part.text
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => !['như', 'nhưng', 'hoặc', 'những', 'được', 'trong', 'cùng'].includes(word.toLowerCase()))
      .slice(0, 2);
    
    if (textKeywords.length > 0) {
      const images = await downloadImagesForKeywords(textKeywords, tempDir);
      if (images.length > 0) {
        results.push({
          ...part,
          imagePath: images[0].path
        });
        continue;
      }
    }
    
    // Nếu vẫn không có ảnh, thêm phần không có ảnh
    results.push({
      ...part,
      imagePath: null
    });
  }
  
  // Nếu không có ảnh cho bất kỳ phần nào, tải một số ảnh mặc định
  if (results.every(r => !r.imagePath)) {
    const defaultImages = await downloadImagesForKeywords(['presentation', 'background', 'minimal'], tempDir);
    
    // Gán ảnh mặc định cho các phần
    for (let i = 0; i < results.length; i++) {
      const imgIndex = i % defaultImages.length;
      results[i].imagePath = defaultImages[imgIndex]?.path || null;
    }
  }
  
  return results;
}
// Thêm hàm lấy thời lượng audio bằng ffprobe
function getAudioDuration(audioPath) {
  try {
    const result = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
    return parseFloat(result.toString().trim());
  } catch (err) {
    console.error('Lỗi lấy thời lượng audio:', err.message);
    return 0;
  }
}

// Chuyển đổi giây sang định dạng SRT
function secondsToSrtTime(seconds) {
  const date = new Date(null);
  date.setSeconds(Math.floor(seconds));
  const ms = String(Math.floor((seconds % 1) * 1000)).padStart(3, '0');
  return date.toISOString().substr(11, 8) + ',' + ms;
}

// Sinh file phụ đề SRT cho các phần script
function generateSrtFile(parts, srtPath) {
  let srtContent = '';
  let currentTime = 0;
  parts.forEach((part, idx) => {
    const duration = getAudioDuration(part.audioPath);
    const start = secondsToSrtTime(currentTime);
    const end = secondsToSrtTime(currentTime + duration);
    srtContent += `${idx + 1}\n${start} --> ${end}\n${part.text}\n\n`;
    currentTime += duration;
  });
  fs.writeFileSync(srtPath, srtContent, 'utf8');
}

/**
 * Tạo video từ hình ảnh và âm thanh sử dụng FFmpeg
 */
async function createVideoWithAudio(scriptPartsWithMedia, outputPath, aspectRatio = '16:9') {
  try {
    console.log('🎬 Bắt đầu tạo video với FFmpeg...');
    console.log(`📂 Đường dẫn xuất: ${outputPath}`);
    console.log(`🧩 Số phần media: ${scriptPartsWithMedia.length}`);
    console.log(`🧩 Số phần có đủ media: ${scriptPartsWithMedia.filter(p => p.imagePath && p.audioPath).length}`);

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    scriptPartsWithMedia.forEach((part, index) => {
      if (part.audioPath && !part.imagePath) {
        part.imagePath = path.join(__dirname, '../../public/image/image1.png');
        console.log(`⚠️ Sử dụng ảnh mặc định cho phần ${index + 1} do không có ảnh`);
      }
    });

    const validParts = scriptPartsWithMedia.filter(part => part.imagePath && part.audioPath);
    if (validParts.length === 0) throw new Error('Không có đủ media để tạo video');

    const segmentListPath = path.join(outputDir, 'segment_list.txt');
    let segmentsList = '';
    const segments = [];

    for (let i = 0; i < validParts.length; i++) {
      const part = validParts[i];
      const segmentPath = path.join(outputDir, `segment_${i}.mp4`);
      segments.push(segmentPath);

      let segmentSettings = '';
      switch (aspectRatio) {
        case '9:16':
          segmentSettings = '-vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2"';
          break;
        case '1:1':
          segmentSettings = '-vf "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2"';
          break;
        case '4:3':
          segmentSettings = '-vf "scale=1440:1080:force_original_aspect_ratio=decrease,pad=1440:1080:(ow-iw)/2:(oh-ih)/2"';
          break;
        default:
          segmentSettings = '-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2"';
      }

      const cmd = `ffmpeg -y -loop 1 -i "${part.imagePath}" -i "${part.audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -af "volume=1.0" ${segmentSettings} -pix_fmt yuv420p -shortest "${segmentPath}"`;
      execSync(cmd, { stdio: 'inherit' });
      segmentsList += `file '${segmentPath.replace(/\\/g, '/')}'\n`;
    }

    fs.writeFileSync(segmentListPath, segmentsList);

    let videoSettings = '';
    switch (aspectRatio) {
      case '9:16':
        videoSettings = '-s 1080x1920';
        break;
      case '1:1':
        videoSettings = '-s 1080x1080';
        break;
      case '4:3':
        videoSettings = '-s 1440x1080';
        break;
      default:
        videoSettings = '-s 1920x1080';
    }

    const concatCommand = `ffmpeg -y -f concat -safe 0 -i "${segmentListPath}" -c:a copy ${videoSettings} "${outputPath}"`;
    execSync(concatCommand, { stdio: 'inherit' });

    const srtPath = path.join(outputDir, 'subtitles.srt');
    generateSrtFile(validParts, srtPath);

    const subtitleDir = path.join(outputDir, 'subtitles');
    if (!fs.existsSync(subtitleDir)) fs.mkdirSync(subtitleDir, { recursive: true });

    const srtTempPath = path.join(subtitleDir, `subtitles_${Date.now()}.srt`);
    const srtContent = fs.readFileSync(srtPath, 'utf8').trim();
    if (!srtContent) throw new Error('❌ File SRT rỗng');
    fs.writeFileSync(srtTempPath, srtContent, { encoding: 'utf8' });

    const subtitledOutputTemp = path.join(outputDir, `output_${Date.now()}.mp4`);
    const srtEscapedPath = srtTempPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    const subtitleCommand = `ffmpeg -y -i "${outputPath}" -vf "subtitles='${srtEscapedPath}'" -c:a copy "${subtitledOutputTemp}"`;
    execSync(subtitleCommand, { stdio: 'inherit' });

    fs.copyFileSync(subtitledOutputTemp, outputPath);

    [
      ...segments,
      segmentListPath,
      srtPath,
      srtTempPath,
      subtitledOutputTemp
    ].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });

    const stats = fs.statSync(outputPath);
    console.log(`🎉 Video tạo xong: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    return outputPath;
  } catch (error) {
    console.error('❌ Lỗi trong quá trình tạo video:', error);
    throw error;
  }
}


/**
 * API chính: Tạo video từ kịch bản với giọng đọc
 */
const generateAdvancedVideo = async (req, res) => {
  console.log('🚀 Bắt đầu tạo video nâng cao...');
  console.log('Body request:', JSON.stringify(req.body).substring(0, 200) + '...');
  
  const { topic, script, voiceId } = req.body;

  if (!topic && !script) {
    console.log('❌ Lỗi: Thiếu chủ đề hoặc kịch bản');
    return res.status(400).json({ success: false, error: 'Vui lòng cung cấp chủ đề hoặc kịch bản!' });
  }

  try {
    // Tạo thư mục đầu ra nếu chưa tồn tại
    const outputDir = path.join(__dirname, '../../public/videos');
    const tempDir = path.join(__dirname, '../../public/temp');
    const audioDir = path.join(tempDir, 'audio');
    
    [outputDir, tempDir, audioDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        console.log(`📁 Tạo thư mục: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Kiểm tra FFmpeg
    try {
      console.log('🔍 Kiểm tra FFmpeg...');
      const ffmpegVersion = execSync('ffmpeg -version').toString().split('\n')[0];
      console.log(`✅ FFmpeg: ${ffmpegVersion}`);
    } catch (error) {
      console.error('❌ Lỗi FFmpeg:', error.message);
      throw new Error('Cần cài đặt FFmpeg để tạo video. Hãy cài đặt FFmpeg và khởi động lại ứng dụng.');
    }

    // Tạo kịch bản nếu chưa có, và chuẩn hóa kịch bản nếu có
    let finalScript = script;
    
    if (!script || script.trim() === '') {
      console.log('🤖 Tạo kịch bản từ chủ đề:', topic);
      try {
        const generatedScript = await generateScriptByVertexAI(topic);
        finalScript = generatedScript;
        console.log('✅ Đã tạo kịch bản từ AI');
      } catch (error) {
        console.error('❌ Lỗi khi tạo kịch bản từ AI:', error);
        throw new Error(`Không thể tạo kịch bản từ chủ đề: ${error.message}`);
      }
    } else {
      // Chuẩn hóa kịch bản đã có
      console.log('📝 Chuẩn hóa kịch bản đã có...');
      
      // Kiểm tra nếu kịch bản không phải là kịch bản thực, mà là danh sách đề xuất
      if (finalScript.includes('Hãy nhấn vào 1 chủ đề để tạo kịch bản')) {
        console.error('❌ Nội dung không phải là kịch bản mà là danh sách đề xuất');
        throw new Error('Nội dung không phải là kịch bản. Vui lòng tạo kịch bản trước khi tạo video.');
      }
    }

    console.log('📜 Kịch bản cuối cùng (đoạn đầu):', finalScript.substring(0, 200) + '...');

    // Phân tích kịch bản
    console.log('🔍 Phân tích kịch bản...');
    const scriptParts = extractScriptParts(finalScript);
    console.log(`✅ Phân tích được ${scriptParts.length} phần kịch bản`);
    
    if (scriptParts.length === 0) {
      console.error('❌ Không tìm thấy phần nào trong kịch bản');
      const errorMessage = 'Kịch bản không đúng định dạng. Hãy kiểm tra lại. ' + 
                          'Kịch bản phải có các phần được đánh dấu bằng "## PHẦN" và có "**Lời thoại:**" và "**Hình ảnh:**".';
      throw new Error(errorMessage);
    }

    // Tạo file âm thanh cho từng phần
    console.log('🔊 Tạo âm thanh cho kịch bản...');
    const scriptPartsWithAudio = await createAudioForScript(finalScript, audioDir, voiceId);
    console.log(`✅ Đã tạo ${scriptPartsWithAudio.length} file âm thanh`);
    
    if (scriptPartsWithAudio.length === 0) {
      console.error('❌ Không tạo được file âm thanh nào');
      throw new Error('Không thể tạo âm thanh. Hãy kiểm tra file credentials Google Cloud.');
    }

    // Tải hình ảnh cho từng phần
    console.log('🖼️ Tải hình ảnh cho kịch bản...');
    const scriptPartsWithMedia = await downloadImagesForScriptParts(scriptPartsWithAudio, tempDir);
    console.log(`✅ Đã tải ${scriptPartsWithMedia.filter(p => p.imagePath).length} hình ảnh`);
    
    if (scriptPartsWithMedia.filter(p => p.imagePath).length === 0) {
      console.error('❌ Không tải được hình ảnh nào');
      throw new Error('Không thể tải hình ảnh. Hãy kiểm tra kết nối mạng.');
    }
    
    // Tạo tên file video
    const videoFileName = `advanced_video_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, videoFileName);
    
    // Tạo video
    console.log('🎬 Bắt đầu tạo video...');
    await createVideoWithAudio(scriptPartsWithMedia, outputPath);
    console.log('✅ Đã tạo video thành công:', outputPath);
    
    // Trả về kết quả
    return res.json({
      success: true,
      videoUrl: `/videos/${videoFileName}`,
      script: finalScript
    });
  } catch (error) {
    console.error('❌ LỖI NGHIÊM TRỌNG:', error);
    console.error('Chi tiết lỗi:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi không xác định khi tạo video',
      stack: error.stack
    });
  }
};

// Danh sách các giọng đọc tiếng Việt có sẵn
const getAvailableVoices = async (req, res) => {
  try {
    const voices = Object.entries(VIETNAMESE_VOICES).map(([key, value]) => ({
      id: value,
      name: key,
      gender: key.includes('FEMALE') ? 'Nữ' : 'Nam',
      quality: key.includes('NEURAL') ? 'Cao nhất' : (key.includes('WAVENET') ? 'Cao' : 'Tiêu chuẩn')
    }));
    
    return res.json({ 
      success: true, 
      voices 
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách giọng đọc:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Lỗi khi lấy danh sách giọng đọc' 
    });
  }
};

/**
 * API chuẩn bị kịch bản và phân tích thành các phần để chỉnh sửa
 */
const prepareVideoScript = async (req, res) => {
  console.log('🚀 Bắt đầu chuẩn bị kịch bản...');
  console.log('Body request:', JSON.stringify(req.body).substring(0, 200) + '...');
  
  const { topic, script, voiceId, aspectRatio = '16:9' } = req.body;

  if (!topic && !script) {
    console.log('❌ Lỗi: Thiếu chủ đề hoặc kịch bản');
    return res.status(400).json({ success: false, error: 'Vui lòng cung cấp chủ đề hoặc kịch bản!' });
  }

  try {
    // Tạo thư mục đầu ra nếu chưa tồn tại
    const tempDir = path.join(__dirname, '../../public/temp');
    const audioDir = path.join(tempDir, 'audio');
    
    [tempDir, audioDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        console.log(`📁 Tạo thư mục: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Kiểm tra FFmpeg
    try {
      console.log('🔍 Kiểm tra FFmpeg...');
      const ffmpegVersion = execSync('ffmpeg -version').toString().split('\n')[0];
      console.log(`✅ FFmpeg: ${ffmpegVersion}`);
    } catch (error) {
      console.error('❌ Lỗi FFmpeg:', error.message);
      throw new Error('Cần cài đặt FFmpeg để tạo video. Hãy cài đặt FFmpeg và khởi động lại ứng dụng.');
    }

    // Tạo kịch bản nếu chưa có, và chuẩn hóa kịch bản nếu có
    let finalScript = script;
    
    if (!script || script.trim() === '') {
      console.log('🤖 Tạo kịch bản từ chủ đề:', topic);
      try {
        const generatedScript = await generateScriptByVertexAI(topic);
        finalScript = generatedScript;
        console.log('✅ Đã tạo kịch bản từ AI');
      } catch (error) {
        console.error('❌ Lỗi khi tạo kịch bản từ AI:', error);
        throw new Error(`Không thể tạo kịch bản từ chủ đề: ${error.message}`);
      }
    } else {
      // Chuẩn hóa kịch bản đã có
      console.log('📝 Chuẩn hóa kịch bản đã có...');
      
      // Kiểm tra nếu kịch bản không phải là kịch bản thực, mà là danh sách đề xuất
      if (finalScript.includes('Hãy nhấn vào 1 chủ đề để tạo kịch bản')) {
        console.error('❌ Nội dung không phải là kịch bản mà là danh sách đề xuất');
        throw new Error('Nội dung không phải là kịch bản. Vui lòng tạo kịch bản trước khi tạo video.');
      }
    }

    console.log('📜 Kịch bản cuối cùng (đoạn đầu):', finalScript.substring(0, 200) + '...');

    // Phân tích kịch bản
    console.log('🔍 Phân tích kịch bản...');
    const scriptParts = extractScriptParts(finalScript);
    console.log(`✅ Phân tích được ${scriptParts.length} phần kịch bản`);
    
    if (scriptParts.length === 0) {
      console.error('❌ Không tìm thấy phần nào trong kịch bản');
      const errorMessage = 'Kịch bản không đúng định dạng. Hãy kiểm tra lại. ' + 
                          'Kịch bản phải có các phần được đánh dấu bằng "## PHẦN" và có "**Lời thoại:**" và "**Hình ảnh:**".';
      throw new Error(errorMessage);
    }

    // Tạo ID phiên làm việc để theo dõi
    const sessionId = Date.now().toString();
    
    // Lưu kịch bản và các phần vào session để sử dụng sau
    if (!req.session) {
      req.session = {};
    }
    
    req.session.videoPreparation = {
      sessionId,
      script: finalScript,
      scriptParts: scriptParts.map((part, index) => ({
        id: `part_${index}`,
        index: index,
        ...part,
        audioPath: null,
        imagePath: null
      })),
      voiceId,
      aspectRatio
    };

    // Trả về thông tin kịch bản đã phân tích
    return res.json({
      success: true,
      sessionId,
      scriptParts: scriptParts.map((part, index) => ({
        id: `part_${index}`,
        index: index,
        ...part
      })),
      voiceId,
      aspectRatio,
      script: finalScript
    });
  } catch (error) {
    console.error('❌ LỖI:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi không xác định khi chuẩn bị kịch bản',
      stack: error.stack
    });
  }
};

/**
 * API tạo/tạo lại hình ảnh cho một phần cụ thể
 */
const generateImageForPart = async (req, res) => {
  console.log('🖼️ Bắt đầu tạo hình ảnh cho phần...');
  
  const { sessionId, partId, customPrompt } = req.body;
  
  if (!sessionId || !partId) {
    return res.status(400).json({
      success: false,
      error: 'Thiếu thông tin phiên làm việc hoặc ID phần'
    });
  }
  
  try {
    // Kiểm tra phiên làm việc
    if (!req.session || !req.session.videoPreparation || req.session.videoPreparation.sessionId !== sessionId) {
      throw new Error('Phiên làm việc không hợp lệ hoặc đã hết hạn');
    }
    
    // Lấy thông tin tỉ lệ khung hình từ session
    const aspectRatio = req.session.videoPreparation.aspectRatio || '16:9';
    
    // Tìm phần cần tạo hình ảnh
    const part = req.session.videoPreparation.scriptParts.find(p => p.id === partId);
    
    if (!part) {
      throw new Error(`Không tìm thấy phần với ID: ${partId}`);
    }
    
    // Xác định prompt cho hình ảnh
    let imagePrompt = customPrompt;
    
    // Nếu không có prompt tùy chỉnh, sử dụng mô tả hình ảnh hoặc trích xuất từ văn bản
    if (!imagePrompt) {
      if (part.image && part.image.trim() !== '') {
        const keywords = extractKeywordsFromDescription(part.image);
        imagePrompt = keywords.join(', ');
      } else {
        // Trích xuất từ khóa từ văn bản
        const textKeywords = part.text
          .split(/\s+/)
          .filter(word => word.length > 4)
          .filter(word => !['như', 'nhưng', 'hoặc', 'những', 'được', 'trong', 'cùng'].includes(word.toLowerCase()))
          .slice(0, 3);
        
        imagePrompt = textKeywords.join(', ');
      }
    }
    
    // Sử dụng prompt gốc và thêm một số hướng dẫn cơ bản
    const enhancedPrompt = `${imagePrompt}, chất lượng cao, chi tiết rõ nét, không có chữ hay watermark`;
    
    console.log(`🖼️ Tạo hình ảnh với prompt: ${enhancedPrompt}`);
    console.log(`📐 Tỉ lệ khung hình: ${aspectRatio}`);
    
    // Tạo thư mục tạm nếu chưa có
    const tempDir = path.join(__dirname, '../../public/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Tạo hình ảnh bằng API
    const response = await axios.post('http://localhost:3000/api/image/generate', {
      prompt: enhancedPrompt,
      modelType: 'standard',
      imageCount: 1,
      aspectRatio: aspectRatio
    });
    
    if (response.data.success && response.data.images && response.data.images.length > 0) {
      // Lưu ảnh vào thư mục tạm
      const imageFilename = `part_${part.index}_${Date.now()}.jpg`;
      const filePath = path.join(tempDir, imageFilename);
      
      if (response.data.images[0].type === 'base64') {
        fs.writeFileSync(filePath, Buffer.from(response.data.images[0].imageData, 'base64'));
      } else if (response.data.images[0].type === 'url') {
        const imgResponse = await axios.get(response.data.images[0].imageData, { responseType: 'arraybuffer' });
        fs.writeFileSync(filePath, Buffer.from(imgResponse.data));
      }
      
      // Cập nhật đường dẫn hình ảnh trong session
      part.imagePath = filePath;
      
      return res.json({
        success: true,
        imagePath: `/temp/${imageFilename}`,
        prompt: enhancedPrompt
      });
    } else {
      throw new Error('Không nhận được hình ảnh từ API tạo ảnh');
    }
  } catch (error) {
    console.error('❌ Lỗi khi tạo hình ảnh:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi không xác định khi tạo hình ảnh'
    });
  }
};

/**
 * API tạo/tạo lại giọng đọc cho một phần cụ thể
 */
const generateAudioForPart = async (req, res) => {
  console.log('🔊 Bắt đầu tạo giọng đọc cho phần...');
  
  const { sessionId, partId, voiceId, customText } = req.body;
  
  if (!sessionId || !partId) {
    return res.status(400).json({
      success: false,
      error: 'Thiếu thông tin phiên làm việc hoặc ID phần'
    });
  }
  
  try {
    // Kiểm tra phiên làm việc
    if (!req.session || !req.session.videoPreparation || req.session.videoPreparation.sessionId !== sessionId) {
      throw new Error('Phiên làm việc không hợp lệ hoặc đã hết hạn');
    }
    
    // Tìm phần cần tạo giọng đọc
    const part = req.session.videoPreparation.scriptParts.find(p => p.id === partId);
    
    if (!part) {
      throw new Error(`Không tìm thấy phần với ID: ${partId}`);
    }
    
    // Xác định văn bản và giọng đọc
    const text = customText || part.text;
    const selectedVoiceId = voiceId || req.session.videoPreparation.voiceId || VIETNAMESE_VOICES.FEMALE_NEURAL_A;
    
    // Tạo thư mục lưu trữ
    const audioDir = path.join(__dirname, '../../public/temp/audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    
    // Đường dẫn file đầu ra
    const audioFilename = `part_${part.index}_${Date.now()}.mp3`;
    const outputPath = path.join(audioDir, audioFilename);
    
    // Tạo giọng đọc
    await convertTextToSpeech(text, outputPath, selectedVoiceId);
    
    // Cập nhật đường dẫn âm thanh trong session
    part.audioPath = outputPath;
    
    // Nếu văn bản được tùy chỉnh, cập nhật nội dung text trong part
    if (customText) {
      part.text = customText;
    }
    
    return res.json({
      success: true,
      audioPath: `/temp/audio/${audioFilename}`,
      text: text
    });
  } catch (error) {
    console.error('❌ Lỗi khi tạo giọng đọc:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi không xác định khi tạo giọng đọc'
    });
  }
};

/**
 * API hoàn thiện video từ các phần đã chuẩn bị
 */
const finalizeAdvancedVideo = async (req, res) => {
  console.log('🎬 Bắt đầu hoàn thiện video...');
  
  const { sessionId, aspectRatio = '16:9' } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'Thiếu thông tin phiên làm việc'
    });
  }
  
  try {
    // Kiểm tra phiên làm việc
    if (!req.session || !req.session.videoPreparation || req.session.videoPreparation.sessionId !== sessionId) {
      throw new Error('Phiên làm việc không hợp lệ hoặc đã hết hạn');
    }
    
    // Lấy thông tin kịch bản và các phần
    const { script, scriptParts } = req.session.videoPreparation;
    
    // Kiểm tra xem có đủ thông tin để tạo video không
    const validParts = scriptParts.filter(part => part.imagePath && part.audioPath);
    
    if (validParts.length === 0) {
      throw new Error('Không có phần nào có đủ media (hình ảnh và âm thanh)');
    }
    
    // Tên file video
    const outputDir = path.join(__dirname, '../../public/videos');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const videoFileName = `advanced_video_${sessionId}.mp4`;
    const outputPath = path.join(outputDir, videoFileName);
    
    // Lưu thông tin tỉ lệ khung hình trong session
    req.session.videoPreparation.aspectRatio = aspectRatio;
    
    // Tạo video từ các phần với tỉ lệ khung hình đã chọn
    await createVideoWithAudio(validParts, outputPath, aspectRatio);
    
    return res.json({
      success: true,
      videoUrl: `/videos/${videoFileName}`,
      script: script
    });
  } catch (error) {
    console.error('❌ Lỗi khi hoàn thiện video:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi không xác định khi tạo video'
    });
  }
};

/**
 * API tải lên hình ảnh tùy chỉnh cho một phần cụ thể
 * Lưu ý: Hàm này được thiết kế để xử lý từng request với middleware upload.single('image')
 */
const uploadImageForPart = async (req, res) => {
  // req.file được thiết lập bởi multer sau khi tải lên thành công
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      error: 'Không tìm thấy file ảnh trong request' 
    });
  }

  const { sessionId, partId } = req.body;
  
  if (!sessionId || !partId) {
    // Xóa file đã tải lên nếu thông tin không hợp lệ
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(400).json({
      success: false,
      error: 'Thiếu thông tin phiên làm việc hoặc ID phần'
    });
  }
  
  try {
    // Kiểm tra phiên làm việc
    if (!req.session || !req.session.videoPreparation || req.session.videoPreparation.sessionId !== sessionId) {
      throw new Error('Phiên làm việc không hợp lệ hoặc đã hết hạn');
    }
    
    // Tìm phần cần cập nhật hình ảnh
    const part = req.session.videoPreparation.scriptParts.find(p => p.id === partId);
    
    if (!part) {
      throw new Error(`Không tìm thấy phần với ID: ${partId}`);
    }
    
    // Cập nhật đường dẫn hình ảnh trong session
    part.imagePath = req.file.path;
    
    // Trả về đường dẫn tương đối để hiển thị trong frontend
    const relativePath = `/temp/${path.basename(req.file.path)}`;
    
    return res.json({
      success: true,
      imagePath: relativePath,
      filename: path.basename(req.file.path)
    });
  } catch (error) {
    console.error('❌ Lỗi khi tải lên hình ảnh:', error);
    
    // Xóa file đã tải lên nếu xử lý thất bại
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi không xác định khi tải lên hình ảnh'
    });
  }
};

/**
 * API tạo mẫu âm thanh để nghe thử giọng đọc
 */
const generateSampleAudio = async (req, res) => {
  console.log('🔊 Bắt đầu tạo mẫu âm thanh giọng đọc...');
  
  const { text, voiceId } = req.body;
  
  if (!text || !voiceId) {
    return res.status(400).json({
      success: false,
      error: 'Thiếu nội dung văn bản hoặc ID giọng đọc'
    });
  }
  
  try {
    // Tạo thư mục lưu trữ
    const audioDir = path.join(__dirname, '../../public/temp/audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    
    // Đường dẫn file đầu ra
    const audioFilename = `sample_${voiceId}_${Date.now()}.mp3`;
    const outputPath = path.join(audioDir, audioFilename);
    
    // Tạo giọng đọc mẫu
    await convertTextToSpeech(text, outputPath, voiceId);
    
    return res.json({
      success: true,
      audioUrl: `/temp/audio/${audioFilename}`,
      text: text
    });
  } catch (error) {
    console.error('❌ Lỗi khi tạo mẫu âm thanh:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi không xác định khi tạo mẫu âm thanh'
    });
  }
};

module.exports = { 
  generateAdvancedVideo,
  getAvailableVoices,
  prepareVideoScript,
  generateImageForPart,
  generateAudioForPart,
  finalizeAdvancedVideo,
  uploadImageForPart,
  generateSampleAudio,
  upload // Export middleware upload để sử dụng trong router
};