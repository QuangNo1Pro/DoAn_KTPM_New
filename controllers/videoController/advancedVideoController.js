require('dotenv').config();
const path = require('path');
const fs = require('fs');
const util = require('util');
const { execSync } = require('child_process');
const axios = require('axios');
const { generateScriptByVertexAI } = require('../../services/vertexService');
const { VIETNAMESE_VOICES } = require('../../services/textToSpeechService');
const textToSpeech = require('@google-cloud/text-to-speech');
// Đã xóa import imagenService để chỉ sử dụng imageController

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
  
  // Tạo ảnh cho từng từ khóa bằng imageController API
  for (const keyword of keywords) {
    try {
      console.log(`🖼️ Đang tạo ảnh cho từ khóa: ${keyword}`);
      
      // Gọi API imageController để tạo ảnh
      const response = await axios.post('http://localhost:3000/api/image/generate', {
        prompt: keyword,
        modelType: 'standard', // Có thể chọn 'ultra', 'standard', hoặc 'fast' tùy nhu cầu
        imageCount: 1
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

/**
 * Tạo video từ hình ảnh và âm thanh sử dụng FFmpeg
 */
async function createVideoWithAudio(scriptPartsWithMedia, outputPath) {
  try {
    console.log('🎬 Bắt đầu tạo video với FFmpeg...');
    console.log(`📂 Đường dẫn xuất: ${outputPath}`);
    console.log(`🧩 Số phần media: ${scriptPartsWithMedia.length}`);
    console.log(`🧩 Số phần có đủ media: ${scriptPartsWithMedia.filter(p => p.imagePath && p.audioPath).length}`);
    
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Tạo đường dẫn cho filter script
    const filterScriptPath = path.join(outputDir, 'filter_script.txt');
    
    let filterScript = '';
    let totalDuration = 0;
    
    // Kiểm tra xem có phần nào có đủ media không
    const validParts = scriptPartsWithMedia.filter(part => part.imagePath && part.audioPath);
    
    if (validParts.length === 0) {
      console.error('❌ Không có phần nào có đủ media (hình ảnh và âm thanh)');
      throw new Error('Không có đủ media để tạo video');
    }
    
    console.log(`✅ Có ${validParts.length} phần hợp lệ để tạo video`);
    
    // Ghi thông tin về từng phần để debug
    validParts.forEach((part, index) => {
      console.log(`🧩 Phần ${index + 1}:`);
      console.log(`   - Lời thoại: ${part.text.substring(0, 30)}...`);
      console.log(`   - Hình ảnh: ${part.imagePath}`);
      console.log(`   - Âm thanh: ${part.audioPath}`);
      
      // Kiểm tra file có tồn tại không
      if (!fs.existsSync(part.imagePath)) {
        console.error(`❌ File hình ảnh không tồn tại: ${part.imagePath}`);
      }
      
      if (!fs.existsSync(part.audioPath)) {
        console.error(`❌ File âm thanh không tồn tại: ${part.audioPath}`);
      }
    });
    
    // Tạo các bộ lọc cho video và audio
    for (let i = 0; i < validParts.length; i++) {
      const part = validParts[i];
      
      // Lấy thông tin về thời lượng âm thanh bằng FFprobe
      try {
        console.log(`🔍 Đang lấy thông tin audio phần ${i + 1}...`);
        const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${part.audioPath}"`;
        console.log(`🔍 Command: ${command}`);
        
        const durationOutput = execSync(command, { encoding: 'utf-8' });
        const duration = parseFloat(durationOutput.trim());
        console.log(`✅ Thời lượng audio phần ${i + 1}: ${duration}s`);
        
        // Tạo filter cho phần này với fadeout/fadein cho chuyển cảnh mượt mà hơn
        filterScript += `[${i*2}:v]setpts=PTS-STARTPTS+${totalDuration}/TB,scale=1280:720,setdar=16/9`;
        
        // Thêm hiệu ứng fade cho hình ảnh (trừ hình đầu tiên)
        if (i > 0) {
          filterScript += `,fade=in:0:25`;
        }
        
        // Thêm text cho mỗi phần, hiển thị ở góc dưới
        const shortText = part.text.substring(0, 40) + (part.text.length > 40 ? '...' : '');
        filterScript += `,drawtext=text='${shortText.replace(/'/g, "\\'")}':fontcolor=white:fontsize=20:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=h-th-10`;
        
        filterScript += `[v${i}];\n`;
        
        // Xử lý âm thanh
        filterScript += `[${i*2+1}:a]adelay=${Math.round(totalDuration*1000)}|${Math.round(totalDuration*1000)}[a${i}];\n`;
        
        totalDuration += duration;
      } catch (error) {
        console.error(`❌ Lỗi khi lấy thông tin audio phần ${i + 1}:`, error.message);
        // Giả định thời lượng
        console.log(`⚠️ Sử dụng thời lượng mặc định 5s cho phần ${i + 1}`);
        const duration = 5;
        
        // Tạo filter cho phần này với fadeout/fadein cho chuyển cảnh mượt mà hơn
        filterScript += `[${i*2}:v]setpts=PTS-STARTPTS+${totalDuration}/TB,scale=1280:720,setdar=16/9`;
        
        // Thêm hiệu ứng fade cho hình ảnh (trừ hình đầu tiên)
        if (i > 0) {
          filterScript += `,fade=in:0:25`;
        }
        
        // Thêm text cho mỗi phần, hiển thị ở góc dưới
        const shortText = part.text.substring(0, 40) + (part.text.length > 40 ? '...' : '');
        filterScript += `,drawtext=text='${shortText.replace(/'/g, "\\'")}':fontcolor=white:fontsize=20:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=h-th-10`;
        
        filterScript += `[v${i}];\n`;
        
        // Xử lý âm thanh
        filterScript += `[${i*2+1}:a]adelay=${Math.round(totalDuration*1000)}|${Math.round(totalDuration*1000)}[a${i}];\n`;
        totalDuration += duration;
      }
    }
    
    // Tạo mệnh đề concat để ghép nối video và audio
    let videoStreams = '';
    let audioStreams = '';
    
    for (let i = 0; i < validParts.length; i++) {
      videoStreams += `[v${i}]`;
      audioStreams += `[a${i}]`;
    }
    
    // Hoàn thiện filter script với concat
    if (videoStreams && audioStreams) {
      filterScript += `${videoStreams}concat=n=${validParts.length}:v=1:a=0[outv];\n`;
      filterScript += `${audioStreams}amix=inputs=${validParts.length}:duration=longest[outa]`;
    } else {
      throw new Error('Không đủ media để tạo video');
    }
    
    // Ghi file filter script
    console.log('📝 Ghi file filter script...');
    fs.writeFileSync(filterScriptPath, filterScript);
    console.log('✅ Đã ghi file filter script');

    // Tạo video bằng FFmpeg
    try {
      console.log('🎬 Thực thi lệnh FFmpeg...');
      
      // Xây dựng lệnh FFmpeg với tất cả các đầu vào riêng biệt
      let ffmpegCommand = 'ffmpeg -y';
      
      // Thêm tất cả các file hình ảnh và âm thanh vào lệnh
      for (let i = 0; i < validParts.length; i++) {
        ffmpegCommand += ` -loop 1 -i "${validParts[i].imagePath}" -i "${validParts[i].audioPath}"`;
      }
      
      ffmpegCommand += ` -filter_complex_script "${filterScriptPath}" -map "[outv]" -map "[outa]" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k -shortest "${outputPath}"`;
      console.log(`🎬 Lệnh FFmpeg: ${ffmpegCommand}`);
      
      execSync(ffmpegCommand, { stdio: 'inherit' });
      console.log('✅ FFmpeg đã tạo video thành công');
      
      // Kiểm tra xem video có tồn tại không
      if (fs.existsSync(outputPath)) {
        console.log(`✅ File video đã được tạo: ${outputPath}`);
        
        // Kiểm tra kích thước file
        const stats = fs.statSync(outputPath);
        console.log(`✅ Kích thước video: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
        
        if (stats.size < 10000) { // Nhỏ hơn 10KB có thể là file rỗng hoặc bị lỗi
          console.error('❌ Video có kích thước quá nhỏ, có thể bị lỗi');
        }
      } else {
        console.error('❌ File video không tồn tại sau khi xử lý');
        throw new Error('Không thể tạo video: File không được tạo');
      }
      
      // Xóa file tạm
      try {
        fs.unlinkSync(filterScriptPath);
        console.log('✅ Đã xóa các file tạm');
      } catch (cleanupError) {
        console.error('⚠️ Lỗi khi xóa file tạm:', cleanupError.message);
      }
      
      return outputPath;
    } catch (error) {
      console.error('❌ Lỗi khi tạo video bằng FFmpeg:', error.message);
      console.error('Chi tiết lỗi:', error.stack);
      throw new Error(`Lỗi khi tạo video với FFmpeg: ${error.message}`);
    }
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

module.exports = { 
  generateAdvancedVideo,
  getAvailableVoices
}; 