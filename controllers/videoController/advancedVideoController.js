require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { uploadFile } = require(path.resolve(__dirname, '../../services/firebaseService.js'));

const { execSync } = require('child_process');
const axios = require('axios');
const { generateScriptByVertexAI } = require('../../services/vertexService');
const { VIETNAMESE_VOICES } = require('../../services/textToSpeechService');
const textToSpeech = require('@google-cloud/text-to-speech');
const multer = require('multer');
const os = require('os');
const util = require('util');
const videoModel = require('../../models/videoModel');   // đường dẫn tuỳ dự án
const { addBackgroundMusic } = require('../../services/videoGeneratorService'); // đường dẫn đảm bảo đúng

// ngay đầu file (đã có multer) thêm cấu hình chấp nhận audio


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
const audioUpload = multer({
  storage,
  limits:{fileSize: 20*1024*1024},           // 20 MB đủ rộng
  fileFilter:(req,file,cb)=>{
    if(file.mimetype.startsWith('audio/')) cb(null,true);
    else cb(new Error('Chỉ chấp nhận file âm thanh'),false);
  }
});
function convertUrlToFilePath(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) {
    url = new URL(url).pathname;          // bỏ domain
  }
  if (url.startsWith('/')) {
    return path.join(__dirname, '../../public', url.slice(1));
  }
  return path.isAbsolute(url)
    ? url
    : path.join(__dirname, '../../public', url);
}

/* --- API UPLOAD AUDIO --- */
const uploadAudioForPart = async (req,res)=>{
  try{
      const {sessionId,partId} = req.body;
      if(!sessionId||!partId) throw new Error('Thiếu sessionId / partId');

      // kiểm tra session
      if(!req.session?.videoPreparation
          || req.session.videoPreparation.sessionId !== sessionId){
          throw new Error('Phiên làm việc không hợp lệ hoặc đã hết hạn');
      }

      // đường dẫn đã được multer lưu vào req.file.path
      const part = req.session.videoPreparation.scriptParts
                    .find(p=>p.id===partId);
      if(!part)   throw new Error('Không tìm thấy part');

      const rel = `/temp/${path.basename(req.file.path)}`;
part.audioPath = rel;


      return res.json({
          success:true,
          audioPath:`/temp/${path.basename(req.file.path)}`,
          audioPath: rel,
  mime :'audio/mpeg'
          
      });
  }catch(err){
      console.error('uploadAudioForPart',err);
      res.status(500).json({success:false, error: err.message});
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
const ttsCredentialsPath = path.join(__dirname, '../../text to speed.json');

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

  // Tạo ảnh cho từng từ khóa hoặc mô tả bằng imageController API
  for (const keyword of keywords) {
    try {
      // Hiển thị phần đầu của từ khóa/mô tả nếu dài
      const displayKeyword = keyword.length > 50 ? `${keyword.substring(0, 50)}...` : keyword;
      console.log(`🖼️ Đang tạo ảnh cho: ${displayKeyword}`);

      // Thêm độ trễ trước khi gọi API để tránh rate limit (tăng lên 30 giây)
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Nếu keyword là mô tả dài, thêm các từ khóa nâng cao chất lượng
      let prompt = keyword;
      if (keyword.length > 30) {
        prompt = `${keyword}, high quality, detailed, clear image, sharp focus`;
      }

      // Lấy thông tin tỉ lệ khung hình từ session nếu có
      let aspectRatio = '16:9';
      try {
        if (req && req.session && req.session.videoPreparation && req.session.videoPreparation.aspectRatio) {
          aspectRatio = req.session.videoPreparation.aspectRatio;
        }
      } catch (error) {
        console.log('⚠️ Không thể lấy aspectRatio từ session, sử dụng mặc định 16:9');
      }

      // Gọi API imageController để tạo ảnh với prompt nâng cao
      const response = await axios.post('http://localhost:3000/api/image/generate', {
        prompt: prompt,
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
      // Sử dụng toàn bộ mô tả hình ảnh
      const imageDescription = part.image.trim();
      console.log(`🖼️ Tải hình ảnh với mô tả đầy đủ: ${imageDescription}`);
      
      // Tạo mảng chứa một phần tử là toàn bộ mô tả
      const fullDescription = [imageDescription];
      
      // Tải hình ảnh với mô tả đầy đủ
      const images = await downloadImagesForKeywords(fullDescription, tempDir);
      if (images.length > 0) {
        results.push({
          ...part,
          imagePath: images[0].path
        });
        continue;
      }
      
      // Nếu không tìm được ảnh với mô tả đầy đủ, thử với từ khóa trích xuất
      console.log(`⚠️ Không tìm được ảnh với mô tả đầy đủ, thử với từ khóa`);
      const keywords = extractKeywordsFromDescription(part.image);
      if (keywords.length > 0) {
        const keywordImages = await downloadImagesForKeywords(keywords, tempDir);
        if (keywordImages.length > 0) {
          results.push({
            ...part,
            imagePath: keywordImages[0].path
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
    // ffprobe trả về 1 dòng duy nhất là số giây
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    )
      .toString()
      .trim();

    const seconds = parseFloat(out);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  } catch (err) {
    console.error('⚠️  ffprobe error:', err.message);
    return 0; // Để code phía dưới tự bỏ qua phần audio lỗi
  }
}

// Chuyển đổi giây sang định dạng SRT
function secondsToSrtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const whole = Math.floor(sec);
  const ms = Math.round((sec - whole) * 1000).toString().padStart(3, '0');

  const h = String(Math.floor(whole / 3600)).padStart(2, '0');
  const m = String(Math.floor((whole % 3600) / 60)).padStart(2, '0');
  const s = String(whole % 60).padStart(2, '0');

  return `${h}:${m}:${s},${ms}`;
}


// Sinh file phụ đề SRT cho các phần script
function generateSrtFile(parts, srtPath) {
  let srt = '';
  let current = 0;
  let idx = 1;

  parts.forEach((part) => {
    const dur = part.audioPath ? getAudioDuration(part.audioPath) : 0;
    if (dur === 0) return;        // bỏ đoạn lỗi

    const start = secondsToSrtTime(current);
    const end   = secondsToSrtTime(current + dur);

    srt += `${idx}\n${start} --> ${end}\n${part.text}\n\n`;
    current += dur;
    idx++;
  });

  fs.writeFileSync(srtPath, srt.trim() + '\n', 'utf8');
  return idx - 1;                 // số caption đã ghi
}

//Tạo video từ hình ảnh và âm thanh sử dụng FFmpeg

const ffprobe = require('fluent-ffmpeg');
async function renderZoomFrames(
  imagePath,
  outDir,
  zoomStart,
  zoomEnd,
  duration,
  fps = 30,
  targetWidth = 1920,
  targetHeight = 1080
) {
  const totalFrames = Math.floor(duration * fps);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Đảm bảo ảnh gốc có size đủ lớn trước khi zoom bằng cách scale về tỉ lệ phù hợp
  const getInitialScaleFactor = (imageWidth, imageHeight) => {
    const scaleW = targetWidth / imageWidth;
    const scaleH = targetHeight / imageHeight;
    return Math.max(scaleW, scaleH);
  };

  // Lấy kích thước ảnh gốc
  const probeImageSize = () => {
    const output = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${imagePath}"`).toString();
    const [w, h] = output.trim().split('x').map(Number);
    return { w, h };
  };

  const { w: imageWidth, h: imageHeight } = probeImageSize();
  const baseScale = getInitialScaleFactor(imageWidth, imageHeight);

  for (let i = 0; i < totalFrames; i++) {
    const t = i / totalFrames;
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
    const zoom = zoomStart + (zoomEnd - zoomStart) * eased;

    // scale tổng: đảm bảo ảnh đủ lớn rồi mới zoom
    const scaleFactor = baseScale * zoom;

    const vf = `scale=iw*${scaleFactor}:ih*${scaleFactor},` +
      `crop=${targetWidth}:${targetHeight}:(iw-${targetWidth})/2:(ih-${targetHeight})/2`;

        const framePath = path.join(
      outDir,
      `frame_${i.toString().padStart(4, '0')}.jpg`
    );

    /* vẽ 1 frame jpg duy nhất */
    execSync(
      `ffmpeg -y -i "${imagePath}" -vf "${vf}" -frames:v 1 "${framePath}"`,
      { stdio: 'pipe' }
    );
  }
}
async function createVideoSegment(
  imagePath,
  audioPath,
  outputPath,
  zoomStart = 1.0,
  zoomEnd   = 1.15,         // zoom nhẹ để tránh vỡ hình
  aspectRatio = '16:9'
) {
  /* xác định kích thước đích */
  const sizeMap = {
    '16:9': [1920, 1080],
    '9:16': [1080, 1920],
    '1:1' : [1080, 1080],
    '4:3' : [1440, 1080]
  };
  const [W, H] = sizeMap[aspectRatio] || sizeMap['16:9'];
  const fps = 30;

  /* lấy thời lượng audio */
  let duration = await new Promise((resolve) => {
  ffprobe.ffprobe(audioPath, (e, m) =>
    resolve(
      m?.format?.duration && Number.isFinite(m.format.duration)
        ? m.format.duration
        : NaN
    )
  );
});

  if (!Number.isFinite(duration) || duration <= 0) {
  console.warn('⚠️  Không đọc được duration, dùng mặc định 10s');
  duration = 10;                       // fallback an toàn
}
else {
  duration = Math.min(duration, 600);   //  hạn chế ≤10 phút
}
const totalFrames = fps * duration;
const zoomInc =
  totalFrames > 0 ? (zoomEnd - zoomStart) / totalFrames : 0.001; // luôn hữu hạn

/* ---------- 2. filter & câu lệnh ffmpeg ---------- */
const scalePad =
  `scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
  `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`;
const zoompan =
  `zoompan=z='zoom+${zoomInc}':d=1:` +
  `x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':fps=${fps}`;
const vf = `${scalePad},${zoompan}`;

/* thêm -t CHỈ khi ta có duration hợp lệ (>0)                     */
const tFlag = Number.isFinite(duration) && duration > 0 ? `-t ${duration}` : '';

const cmd =
  `ffmpeg -y -loop 1 -i "${imagePath}" -i "${audioPath}" ` +
  `-vf "${vf}" ${tFlag} -c:v libx264 -pix_fmt yuv420p ` +
  `-c:a aac -shortest "${outputPath}"`;
execSync(cmd, { stdio: 'inherit' });
}
/**
 * Từ mảng scriptParts (đã có imagePath, audioPath, text)
 * → render từng segment zoom-pan, ghép chúng, chèn phụ đề,
 *   thêm nhạc nền (nếu có)  rồi trả về đường dẫn video cuối.
 */
async function createVideoWithAudio(
  scriptParts,             // [{imagePath,audioPath,text}, …]
  outputPath,              // …/public/videos/advanced_video_xxx.mp4
  aspectRatio = '16:9',    // 16:9 | 9:16 | …
  bgMusic     = null,      // đường dẫn tới nhạc nền (tuỳ chọn)
  bgVolume    = 0.25,      // 0 – 1
  musicStart  = 0,
  musicEnd    = null
) {
  /* -------------------------------------------------- */
  /* 0. Chuẩn bị                                       */
  /* -------------------------------------------------- */
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const size = { '16:9':[1920,1080],'9:16':[1080,1920],'1:1':[1080,1080],'4:3':[1440,1080] }[aspectRatio] || [1920,1080];
  const [vw, vh] = size;
  const fps = 30;

  /* -------------------------------------------------- */
  /* 1. Render SEGMENT                                  */
  /* -------------------------------------------------- */
  const segments = [];
  let timeline   = 0;            // tính thời gian để ghi phụ đề
  const srtLines = [];

  for (let i = 0; i < scriptParts.length; i++) {
   const p = scriptParts[i];
   if (!p.imagePath || !p.audioPath) continue;

    /* chuyển về path tuyệt đối trước khi dùng ffmpeg */
    const imgAbs = convertUrlToFilePath(p.imagePath);
    const audAbs = convertUrlToFilePath(p.audioPath);       // bỏ qua part thiếu media

    /* 1.1  Xác định thời lượng audio  ----------------- */
    let duration = await new Promise(r => {
      ffprobe.ffprobe(p.audioPath, (e,md)=> r(!e && md?.format?.duration || 0));
    });
    if (!Number.isFinite(duration) || duration <= 0) {
      console.warn('⚠️  Không đọc được duration, dùng mặc định 10s');
      duration = 10;
    }

    /* 1.2  Render frame zoom-pan ---------------------- */
    const frameDir = path.join(outDir, `frames_${Date.now()}_${i}`);
    fs.mkdirSync(frameDir, { recursive:true });

    const zoomStart = i % 2 ? 1.5 : 1.0;
    const zoomEnd   = i % 2 ? 1.0 : 1.5;
    await renderZoomFrames(
   imgAbs,      frameDir, zoomStart, zoomEnd,
    duration, fps, vw, vh
 );
    /* 1.3  Gộp frame + audio thành segment ------------ */
   const segPath = path.join(outDir, `segment_${i}_${Date.now()}.mp4`);
 execSync(
   `ffmpeg -y -framerate ${fps} -i "${frameDir}/frame_%04d.jpg" ` +
   `-i "${audAbs}" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${segPath}"`,
   { stdio:'inherit' }
 );
    segments.push(segPath);

    /* 1.4  Phụ đề dòng hiện tại ----------------------- */
    const ts = s => {
      const h=String(Math.floor(s/3600)).padStart(2,'0');
      const m=String(Math.floor(s%3600/60)).padStart(2,'0');
      const ss=String(Math.floor(s%60)).padStart(2,'0');
      const ms=String(Math.round((s%1)*1000)).padStart(3,'0');
      return `${h}:${m}:${ss},${ms}`;
    };
    srtLines.push(
      `${srtLines.length+1}`,
      `${ts(timeline)} --> ${ts(timeline+duration)}`,
      (p.text||'').trim(), ''
    );
    timeline += duration;

    fs.rmSync(frameDir,{recursive:true,force:true});
  }

  if (!segments.length) throw new Error('Không còn segment hợp lệ');

  /* -------------------------------------------------- */
  /* 2. CONCAT tất cả segment ------------------------- */
  const concatTxt = path.join(outDir,'concat.txt');
  fs.writeFileSync(concatTxt, segments.map(f=>`file '${path.basename(f)}'`).join('\n'));

  const concatMp4 = path.join(outDir,`concat_${Date.now()}.mp4`);
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${path.basename(concatTxt)}" -c copy "${path.basename(concatMp4)}"`,
    { cwd: outDir, stdio:'inherit' }
  );

  /* dọn file segment tạm */
  segments.forEach(f=>fs.unlinkSync(f));
  fs.unlinkSync(concatTxt);

  /* -------------------------------------------------- */
  /* 3. Chèn phụ đề với đường dẫn TƯƠNG ĐỐI ----------- */
  const srtFile = path.join(outDir,`sub_${Date.now()}.srt`);
  fs.writeFileSync(srtFile, srtLines.join('\n'),'utf8');

  const withSubs = path.join(outDir,`with_subs_${Date.now()}.mp4`);
  execSync(
    `ffmpeg -y -i "${path.basename(concatMp4)}" ` +
    `-vf "subtitles=${path.basename(srtFile)}" -c:a copy "${path.basename(withSubs)}"`,
    { cwd: outDir, stdio:'inherit' }
  );

  fs.unlinkSync(srtFile);
  fs.unlinkSync(concatMp4);

  /* -------------------------------------------------- */
  /* 4. Nhạc nền (nếu có) ------------------------------ */
  let finalOut = withSubs;
  if (bgMusic) {
    const mixed = path.join(outDir,`with_music_${Date.now()}.mp4`);
    const vol   = Number(bgVolume) || 0.25;
    const trim  = musicEnd !== null ? `-to ${musicEnd}` : '';
    execSync(
      `ffmpeg -y -i "${finalOut}" ` +
      `-ss ${musicStart} ${trim} -i "${bgMusic}" ` +
      `-filter_complex "[1:a]volume=${vol}[bg];[0:a][bg]amix=inputs=2:duration=first[a]" ` +
      `-map 0:v -map "[a]" -c:v copy -shortest "${mixed}"`,
      { stdio:'inherit' }
    );
    fs.unlinkSync(finalOut);
    finalOut = mixed;
  }

  /* -------------------------------------------------- */
  /* 5. Trả về                                         */
  fs.renameSync(finalOut, outputPath);
  console.log(`✅  Video cuối: ${outputPath}`);
  return outputPath;
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
    const finalVideoPath = await createVideoWithAudio(
      scriptPartsWithMedia,
      outputPath,
      '16:9',              // aspectRatio mặc định
      music,
      musicVolume,
      musicStartTime,
      musicEndTime
    );


    console.log('✅ Đã tạo video thành công:', outputPath);

    // Trả về kết quả
    return res.json({
      success: true,
      videoUrl: `/outputs/${path.basename(finalVideoPath)}`
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

  const { topic, script, voiceId, aspectRatio = '16:9', imageModel = 'ultra' } = req.body;

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
      topic: topic || null,
      scriptParts: scriptParts.map((part, index) => ({
        id: `part_${index}`,
        index: index,
        ...part,
        audioPath: null,
        imagePath: null
      })),
      voiceId,
      aspectRatio,
      imageModel // Thêm thông tin về mô hình AI tạo ảnh
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
      imageModel, // Thêm thông tin về mô hình AI tạo ảnh
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
async function addMusicToVideo(inputVideoPath, outputVideoPath, music, musicVolume, musicStartTime, musicEndTime, outputDir) {
  try {
    const musicPath = path.join(__dirname, '../../public/music', music);
    if (!fs.existsSync(musicPath)) {
      throw new Error(`File nhạc không tồn tại: ${musicPath}`);
    }
    const clippedMusicPath = path.join(outputDir, `clip_${Date.now()}.mp3`);
    const finalOutputWithMusic = path.join(outputDir, `output_final_${Date.now()}.mp4`);
    const trimCmd = `ffmpeg -y -i "${musicPath}" -ss ${musicStartTime} ${musicEndTime ? `-to ${musicEndTime}` : ''} -c copy "${clippedMusicPath}"`;
    execSync(trimCmd, { stdio: 'inherit' });
    const mixCmd = `ffmpeg -y -i "${inputVideoPath}" -i "${clippedMusicPath}" -filter_complex "[1:a]volume=${musicVolume}[a1];[0:a][a1]amix=inputs=2:duration=first[aout]" -map 0:v -map "[aout]" -c:v copy -shortest "${finalOutputWithMusic}"`;
    execSync(mixCmd, { stdio: 'inherit' });
    fs.copyFileSync(finalOutputWithMusic, outputVideoPath);
    [clippedMusicPath, finalOutputWithMusic].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
  } catch (error) {
    console.error('❌ Lỗi khi thêm nhạc nền:', error.message);
    throw error;
  }
}

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
    // Lấy thông tin mô hình AI tạo ảnh từ session
    const imageModel = req.session.videoPreparation.imageModel || 'ultra';

    // Tìm phần cần tạo hình ảnh
    const part = req.session.videoPreparation.scriptParts.find(p => p.id === partId);

    if (!part) {
      throw new Error(`Không tìm thấy phần với ID: ${partId}`);
    }

    // Xác định prompt cho hình ảnh
    let imagePrompt = customPrompt;

    // Nếu không có prompt tùy chỉnh, sử dụng toàn bộ mô tả hình ảnh hoặc trích xuất từ văn bản
    if (!imagePrompt) {
      if (part.image && part.image.trim() !== '') {
        // Sử dụng toàn bộ mô tả hình ảnh thay vì chỉ trích xuất từ khóa
        imagePrompt = part.image.trim();
        console.log(`🖼️ Sử dụng toàn bộ mô tả hình ảnh: ${imagePrompt}`);
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
      modelType: imageModel, // Sử dụng mô hình AI đã chọn
      imageCount: 1,
      aspectRatio: aspectRatio,
      retryDelay: 30000, // Thêm thời gian chờ 30 giây
      maxRetries: 5      // Thử tối đa 5 lần
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
    const rel = `/temp/audio/${audioFilename}`;
 part.audioPath = rel;

    // Nếu văn bản được tùy chỉnh, cập nhật nội dung text trong part
    if (customText) {
      part.text = customText;
    }

    return res.json({
      success: true,
      audioPath: `/temp/audio/${audioFilename}`,
      audioPath: rel,
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
/**
 * API hoàn thiện video từ các phần đã chuẩn bị
 */
const finalizeAdvancedVideo = async (req, res) => {
  console.log('🎬 Bắt đầu hoàn thiện video...');

  const {
    sessionId,
    aspectRatio = '16:9',
    music = null,
    musicVolume = 0.3,
    musicStartTime = 0,
    musicEndTime = null
  } = req.body;

  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin phiên làm việc' });
  }

  try {
    /* ------------------------------------------------
       1. Lấy dữ liệu phiên & kiểm tra
    -------------------------------------------------*/
    if (
      !req.session ||
      !req.session.videoPreparation ||
      req.session.videoPreparation.sessionId !== sessionId
    ) {
      throw new Error('Phiên làm việc không hợp lệ hoặc đã hết hạn');
    }

    const { script, scriptParts, topic } = req.session.videoPreparation;
    const validParts = scriptParts.filter(p => p.imagePath && p.audioPath);
    if (!validParts.length) throw new Error('Không có phần nào có đủ media');

    /* ------------------------------------------------
       2. Chuẩn bị đường dẫn xuất
    -------------------------------------------------*/
    const outputDir = path.join(__dirname, '../../public/videos');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const videoFileName = `advanced_video_${sessionId}.mp4`;
    const outputPath = path.join(outputDir, videoFileName);

    /* ------------------------------------------------
       3. Render video (tận dụng hàm đã viết)
    -------------------------------------------------*/
    await createVideoWithAudio(
      validParts,
      outputPath,
      aspectRatio,
      music,
      musicVolume,
      musicStartTime,
      musicEndTime
    );


    /* ------------------------------------------------
       4. Upload Firebase & ghi DB
    -------------------------------------------------*/
    const firebaseKey = `videos/${videoFileName}`;
    const publicUrl = await uploadFile(
      outputPath,
      firebaseKey,
      { contentType: 'video/mp4' }   // giúp trình duyệt stream ngay
    );
    console.log('🚀 Đã upload Firebase:', publicUrl);

    // (tuỳ chọn) ghi vào bảng videos
    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
    console.log("ID nguoi dung: ", req.session.user)
    const userId =
      req.session?.user?.id_nguoidung
      || req.user?.id_nguoidung
      || null;

    await videoModel.insertVideo({
      filename: videoFileName,
      firebaseKey: firebaseKey,
      publicUrl: publicUrl,
      sizeMb: sizeMb,
      title: topic || 'Video hoàn thiện',
      script: script || null,
      userId
    });

    /* ------------------------------------------------
       5. Trả kết quả
    -------------------------------------------------*/
    return res.json({
      success: true,
      videoUrl: publicUrl,                 // URL Firebase
      localPath: `/videos/${videoFileName}`, // nếu bạn muốn tham chiếu tạm
      script: script
    });

  } catch (err) {
    console.error('❌ Lỗi khi hoàn thiện video:', err);
    return res.status(500).json({ success: false, error: err.message });
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

const renderEditPartsPage = (req, res) => {
  res.render('videoView/editVideoParts', {
    title: 'Chỉnh sửa phần video',
    layout: 'main'
  });
};

// controllers/videoController.js
const createFinalVideo = async (req, res) => {
  try {
    /* ------------------------------------------------
       0. LẤY INPUT
    -------------------------------------------------*/
    const {
      sessionId,
      parts,
      music,
      musicVolume = 0.5,
      musicStartTime = 0,
      musicEndTime = null
    } = req.body;


    if (!sessionId || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
    }

    /* ------------------------------------------------
       1. CHUẨN BỊ THƯ MỤC & TÊN FILE
    -------------------------------------------------*/
    const outputDir = path.join(__dirname, '../../public/videos');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const videoFileName = `advanced_video_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, videoFileName);

    /* ------------------------------------------------
       2. LỌC & TẠO SEGMENTS
    -------------------------------------------------*/
    const validParts = parts.filter(p => p.imagePath && p.audioPath);
    if (!validParts.length) {
      return res.status(400).json({ success: false, error: 'Không có phần nào đủ media' });
    }

    const segTxt = path.join(outputDir, `segments_${Date.now()}.txt`);
    const segments = [];
    let segContent = '';

    for (let i = 0; i < validParts.length; i++) {
      const p = validParts[i];
      const segPath = path.join(outputDir, `segment_${i}_${Date.now()}.mp4`);
      segments.push(segPath);

      /* scale/pad tuỳ tỉ lệ */
      const scaleMap = {
        '9:16': '-vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2"',
        '1:1': '-vf "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2"',
        '4:3': '-vf "scale=1440:1080:force_original_aspect_ratio=decrease,pad=1440:1080:(ow-iw)/2:(oh-ih)/2"',
        '16:9': '-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2"'
      };
      const segSetting = scaleMap[aspectRatio] || scaleMap['16:9'];

      /* caption tuỳ ý */
      let caption = '';
      if (p.caption) {
        const safeTxt = p.caption.replace(/'/g, '\\\'');
        const yPos =
          p.captionPosition === 'top' ? 'text_h' :
            p.captionPosition === 'bottom' ? 'h-text_h*2' :
              '(h-text_h)/2';
        caption = `,drawtext=text='${safeTxt}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=${yPos}:shadowcolor=black:shadowx=2:shadowy=2`;
      }

      const cmd = `ffmpeg -y -loop 1 -i "${p.imagePath}" -i "${p.audioPath}" `
        + `-c:v libx264 -tune stillimage -c:a aac -b:a 192k -af "volume=1.0" `
        + `${segSetting}${caption} -pix_fmt yuv420p -shortest "${segPath}"`;
      execSync(cmd, { stdio: 'inherit' });
      segContent += `file '${segPath.replace(/\\/g, '/')}'\n`;
    }
    fs.writeFileSync(segTxt, segContent);

    /* ------------------------------------------------
       3. GHÉP SEGMENT + FASTSTART
    -------------------------------------------------*/
    const sizeMap = { '9:16': '1080x1920', '1:1': '1080x1080', '4:3': '1440x1080', '16:9': '1920x1080' };
    const concatCmd =
      `ffmpeg -y -f concat -safe 0 -i "${segTxt}" -c:v libx264 -c:a aac `
      + `-pix_fmt yuv420p -movflags +faststart -s ${sizeMap[aspectRatio] || sizeMap['16:9']} "${outputPath}"`;
    execSync(concatCmd, { stdio: 'inherit' });

    /* ------------------------------------------------
       4. SUBTITLE
    -------------------------------------------------*/
    const srtPath = path.join(outputDir, 'subs.srt');
    generateSrtFile(validParts, srtPath);

    const srtTmp = path.join(outputDir, `subs_${Date.now()}.srt`);
    fs.copyFileSync(srtPath, srtTmp);
    const escSrt = srtTmp.replace(/\\/g, '/').replace(/:/g, '\\:');
    const tempOut = path.join(outputDir, `render_${Date.now()}.mp4`);
    const subCmd = `ffmpeg -y -i "${outputPath}" -vf "subtitles='${escSrt}'" -c:a copy "${tempOut}"`;
    execSync(subCmd, { stdio: 'inherit' });
    fs.renameSync(tempOut, outputPath);

    /* ------------------------------------------------
       5. UPLOAD FIREBASE
    -------------------------------------------------*/
    const firebaseKey = `videos/${videoFileName}`;
    const publicUrl = await uploadFile(
      outputPath,
      firebaseKey,
      { contentType: 'video/mp4' }          // để trình duyệt stream OK
    );
    console.log('🚀 Upload Firebase thành công:', publicUrl);

    /* (tùy chọn) ghi DB --------------------------------*/
    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
    const userId =
      req.session?.user?.id_nguoidung
      || req.user?.id_nguoidung
      || null;

    await videoModel.insertVideo({
      filename, firebaseKey, publicUrl, sizeMb,
      title, script, userId
    });

    //fs.copyFileSync(subtitledOutputTemp, outputPath);
    // === Thêm nhạc nền nếu có chọn ===
    if (music) {
      await addMusicToVideo(outputPath, outputPath, music, musicVolume, musicStartTime, musicEndTime, outputDir);
    }


    /* ------------------------------------------------
       6. DỌN FILE TẠM & TRẢ KẾT QUẢ
    -------------------------------------------------*/
    [...segments, segTxt, srtPath, srtTmp].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));

    // fs.unlinkSync(outputPath); // nếu muốn xoá file local

    return res.json({
      success: true,
      videoUrl: publicUrl,            // URL Firebase có thể embed ngay
      localPath: `/videos/${videoFileName}`
    });

  } catch (err) {
    console.error('❌ Lỗi createFinalVideo:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Kiểm tra cài đặt ban đầu
const checkSetup = async (req, res) => {
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
      checks
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra cài đặt:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi không xác định khi kiểm tra cài đặt'
    });
  }
};

// Thêm API debug video
const debugVideo = async (req, res) => {
  try {
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

    return res.json({
      success: true,
      debugInfo
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra debug video:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi không xác định khi kiểm tra debug video'
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
  upload, // Export middleware upload để sử dụng trong router
  renderEditPartsPage,
  createFinalVideo,
  checkSetup,
  debugVideo,
  uploadAudioForPart,
  upload      ,   // middleware hình ảnh
  audioUpload 
};