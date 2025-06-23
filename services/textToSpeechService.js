const fs = require('fs');
const util = require('util');
const path = require('path');
const textToSpeech = require('@google-cloud/text-to-speech');

// Đường dẫn đến file credentials
const credentialsPath = path.join(__dirname, '..', 'text to speed.json');

// Kiểm tra file credentials
if (!fs.existsSync(credentialsPath)) {
  console.error(`❌ Không tìm thấy file Text-to-Speech credentials tại đường dẫn: ${credentialsPath}`);
} else {
  console.log(`✓ Đã tìm thấy Text-to-Speech credentials tại: ${credentialsPath}`);
}

// Các giọng nói tiếng Việt có sẵn
const VIETNAMESE_VOICES = {
  FEMALE_STANDARD_A: "vi-VN-Standard-A", // Nữ (Standard)
  MALE_STANDARD_B: "vi-VN-Standard-B",   // Nam (Standard)
  FEMALE_STANDARD_C: "vi-VN-Standard-C", // Nữ (Standard)
  MALE_STANDARD_D: "vi-VN-Standard-D",   // Nam (Standard)
  FEMALE_WAVENET_A: "vi-VN-Wavenet-A",   // Nữ (Wavenet - chất lượng cao)
  MALE_WAVENET_B: "vi-VN-Wavenet-B",     // Nam (Wavenet - chất lượng cao)
  FEMALE_WAVENET_C: "vi-VN-Wavenet-C",   // Nữ (Wavenet - chất lượng cao)
  MALE_WAVENET_D: "vi-VN-Wavenet-D",     // Nam (Wavenet - chất lượng cao)
  FEMALE_NEURAL_A: "vi-VN-Neural2-A",    // Nữ (Neural2 - chất lượng cao nhất)
  MALE_NEURAL_D: "vi-VN-Neural2-D",      // Nam (Neural2 - chất lượng cao nhất)
};

// Tạo client Text-to-Speech với credentials
let client;
try {
  client = new textToSpeech.TextToSpeechClient({
    keyFilename: credentialsPath
  });
  console.log('✓ Đã khởi tạo Text-to-Speech client thành công');
} catch (error) {
  console.error('❌ Lỗi khởi tạo Text-to-Speech client:', error.message);
}

/**
 * Chuyển đoạn văn bản thành file âm thanh
 * @param {string} text - Văn bản cần chuyển thành giọng nói
 * @param {string} outputPath - Đường dẫn file âm thanh đầu ra
 * @param {string} voiceId - ID của giọng nói (mặc định là nữ Neural2 chất lượng cao nhất)
 * @returns {Promise<string>} - Đường dẫn đến file âm thanh
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
        pitch: 0,           // Cao độ: -20.0 đến 20.0, mặc định là 0
        speakingRate: 1.0,  // Tốc độ: 0.25 đến 4.0, mặc định là 1.0
        volumeGainDb: 0.0   // Âm lượng: -96.0 đến 16.0, mặc định là 0.0
      },
    };

    // Gọi API để chuyển văn bản thành giọng nói
    const [response] = await client.synthesizeSpeech(request);
    
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
 * @param {string} script - Nội dung kịch bản
 * @param {string} outputDir - Thư mục đầu ra cho các file âm thanh
 * @param {string} voiceId - ID của giọng nói
 * @returns {Promise<Array<{text: string, audioPath: string, image: string}>>} - Danh sách các phần với đường dẫn âm thanh
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
 * Trích xuất các phần từ kịch bản
 * @param {string} script - Nội dung kịch bản
 * @returns {Array<{part: string, text: string, image: string}>} - Các phần của kịch bản
 */
function extractScriptParts(script) {
  const parts = [];
  
  // Sử dụng regex để tìm các phần trong kịch bản (hỗ trợ cả định dạng mới và cũ)
  const partRegex = /((?:##?\s*)?PHẦN\s+(\d+|CUỐI|1:\s*HOOK)[\s\S]*?)(?:(?:\*\*)?Lời\s*thoại:?(?:\*\*)?\s*)([\s\S]*?)(?:(?:(?:\*\*)?Hình\s*ảnh:?(?:\*\*)?\s*)([\s\S]*?))?(?=\s*(?:(?:##?\s*)?PHẦN|\s*(?:##?\s*)?PHẦN CUỐI)|\s*$)/gi;
  
  let match;
  while ((match = partRegex.exec(script)) !== null) {
    const [fullMatch, sectionHeader, part, text, image] = match;
    parts.push({
      part: part.trim(),
      text: text ? text.trim() : '',
      image: image ? image.trim() : ''
    });
  }
  
  return parts;
}

/**
 * Tạo một file âm thanh hoàn chỉnh cho toàn bộ kịch bản
 * @param {string} script - Nội dung kịch bản
 * @param {string} outputPath - Đường dẫn file âm thanh đầu ra
 * @param {string} voiceId - ID của giọng nói
 * @returns {Promise<string>} - Đường dẫn đến file âm thanh
 */
async function createFullAudioForScript(script, outputPath, voiceId = VIETNAMESE_VOICES.FEMALE_NEURAL_A) {
  try {
    // Trích xuất toàn bộ lời thoại từ kịch bản
    const scriptParts = extractScriptParts(script);
    const fullText = scriptParts.map(part => part.text).join('\n\n');
    
    // Tạo âm thanh cho toàn bộ văn bản
    console.log(`Đang tạo file âm thanh hoàn chỉnh cho kịch bản...`);
    const audioPath = await convertTextToSpeech(fullText, outputPath, voiceId);
    
    return audioPath;
  } catch (error) {
    console.error('❌ Lỗi khi tạo âm thanh hoàn chỉnh cho kịch bản:', error);
    throw error;
  }
}

module.exports = {
  VIETNAMESE_VOICES,
  convertTextToSpeech,
  createAudioForScript,
  createFullAudioForScript,
  extractScriptParts
}; 