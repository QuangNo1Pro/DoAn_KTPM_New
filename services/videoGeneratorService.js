const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const { extractScriptParts, createAudioForScript } = require('./textToSpeechService');

// Trích xuất mô tả hình ảnh từ kịch bản mới
async function extractImageDescriptionsFromScript(script) {
  try {
    const scriptParts = extractScriptParts(script);
    console.log(`Trích xuất được ${scriptParts.length} phần từ kịch bản`);

    // Lấy các mô tả hình ảnh
    const imageDescriptions = scriptParts
      .filter(part => part.image && part.image.trim() !== '')
      .map(part => ({
        part: part.part,
        description: part.image,
        keywords: extractKeywordsFromDescription(part.image)
      }));

    console.log(`Trích xuất được ${imageDescriptions.length} mô tả hình ảnh`);
    return { scriptParts, imageDescriptions };
  } catch (error) {
    console.error('Lỗi khi trích xuất mô tả hình ảnh:', error);
    return { scriptParts: [], imageDescriptions: [] };
  }
}

// Trích xuất từ khóa từ mô tả hình ảnh
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

// Hàm trích xuất từ khóa từ kịch bản (khi không tìm thấy mô tả hình ảnh)
async function extractKeywordsFromScript(script) {
  const lines = script.split('\n')
    .map(line => line.trim())
    .filter(line => line !== '');

  // Lấy tối đa 5 từ khóa chính từ kịch bản
  const keywords = [];
  const scriptText = lines.join(' ');

  // Lấy một số từ khóa từ kịch bản (đơn giản hóa)
  const words = scriptText.split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['như', 'nhưng', 'hoặc', 'những', 'được', 'trong', 'cùng', 'rằng'].includes(word.toLowerCase()));

  // Lấy 5 từ khóa đầu tiên
  for (let i = 0; i < words.length && keywords.length < 5; i++) {
    if (!keywords.includes(words[i])) {
      keywords.push(words[i]);
    }
  }

  return keywords;
}

// Hàm tải hình ảnh từ Unsplash
async function downloadImagesForKeywords(keywords) {
  // Tạo thư mục lưu trữ tạm thời nếu chưa tồn tại
  const tempDir = path.join(__dirname, '..', 'public', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const imageFiles = [];

  // Tải ảnh từ Unsplash
  for (const keyword of keywords) {
    try {
      // Sử dụng Unsplash Source để tải ảnh đơn giản
      const imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(keyword)}`;
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

      const filePath = path.join(tempDir, `${keyword.replace(/\s+/g, '_')}_${Date.now()}.jpg`);
      fs.writeFileSync(filePath, Buffer.from(response.data));

      imageFiles.push({
        keyword,
        path: filePath
      });
      console.log(`Đã tải ảnh cho từ khóa: ${keyword}`);
    } catch (error) {
      console.error(`Lỗi khi tải ảnh cho từ khóa ${keyword}:`, error.message);
    }
  }

  // Nếu không có ảnh nào được tải, sử dụng ảnh mặc định
  if (imageFiles.length === 0) {
    const defaultImages = [
      path.join(__dirname, '..', 'public', 'image', 'image1.png'),
      path.join(__dirname, '..', 'public', 'image', 'image2.png')
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

// Tải hình ảnh cho từng phần kịch bản
async function downloadImagesForScriptParts(scriptParts, imageDescriptions) {
  const results = [];

  // Tải ảnh cho từng phần dựa trên mô tả
  for (const part of scriptParts) {
    // Tìm mô tả hình ảnh cho phần này
    const imageDesc = imageDescriptions.find(desc => desc.part === part.part);

    if (imageDesc && imageDesc.keywords.length > 0) {
      // Dùng từ khóa từ mô tả để tải ảnh
      const images = await downloadImagesForKeywords(imageDesc.keywords);
      if (images.length > 0) {
        results.push({
          ...part,
          imagePath: images[0].path
        });
        continue;
      }
    }

    // Nếu không có mô tả hoặc không tìm được ảnh, dùng văn bản để trích xuất từ khóa
    const textKeywords = part.text
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => !['như', 'nhưng', 'hoặc', 'những', 'được', 'trong', 'cùng'].includes(word.toLowerCase()))
      .slice(0, 2);

    if (textKeywords.length > 0) {
      const images = await downloadImagesForKeywords(textKeywords);
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
    const defaultImages = await downloadImagesForKeywords(['presentation', 'background', 'minimal']);

    // Gán ảnh mặc định cho các phần
    for (let i = 0; i < results.length; i++) {
      const imgIndex = i % defaultImages.length;
      results[i].imagePath = defaultImages[imgIndex]?.path || null;
    }
  }

  return results;
}

// Hàm tạo video từ hình ảnh và âm thanh sử dụng FFmpeg
async function createVideoWithAudio(
  scriptPartsWithMedia,
  outputPath,
  aspectRatio = '16:9',
  music = null,
  musicVolume = 0.3,
  musicStartTime = 0,
  musicEndTime = null
) {
  try {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Tạo danh sách hình ảnh và âm thanh cho FFmpeg
    const inputListPath = path.join(outputDir, 'input_list.txt');
    const filterScriptPath = path.join(outputDir, 'filter_script.txt');

    let inputList = '';
    let filterScript = '';
    let totalDuration = 0;

    // Tạo danh sách các đầu vào và bộ lọc
    for (let i = 0; i < scriptPartsWithMedia.length; i++) {
      const part = scriptPartsWithMedia[i];

      if (!part.imagePath || !part.audioPath) continue;

      // Thêm input ảnh
      inputList += `file '${part.imagePath.replace(/\\/g, '/')}'\n`;

      // Thêm input âm thanh
      inputList += `file '${part.audioPath.replace(/\\/g, '/')}'\n`;

      // Lấy thông tin về thời lượng âm thanh bằng FFprobe
      try {
        const durationOutput = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${part.audioPath}"`, { encoding: 'utf-8' });
        const duration = parseFloat(durationOutput.trim());

        // Tạo filter cho phần này
        filterScript += `[${i * 2}:v]loop=loop=-1:size=1:start=0,setpts=PTS-STARTPTS+${totalDuration}/TB,scale=1280:720,setdar=16/9[v${i}];\n`;
        filterScript += `[${i * 2 + 1}:a]adelay=${Math.round(totalDuration * 1000)}|${Math.round(totalDuration * 1000)}[a${i}];\n`;

        totalDuration += duration;
      } catch (error) {
        console.error(`Lỗi khi lấy thông tin audio phần ${i}:`, error.message);
        // Giả định thời lượng
        const duration = 5;
        filterScript += `[${i * 2}:v]loop=loop=-1:size=1:start=0,setpts=PTS-STARTPTS+${totalDuration}/TB,scale=1280:720,setdar=16/9[v${i}];\n`;
        filterScript += `[${i * 2 + 1}:a]adelay=${Math.round(totalDuration * 1000)}|${Math.round(totalDuration * 1000)}[a${i}];\n`;
        totalDuration += duration;
      }
    }

    // Tạo mệnh đề concat để ghép nối video và audio
    let videoStreams = '';
    let audioStreams = '';

    for (let i = 0; i < scriptPartsWithMedia.length; i++) {
      if (!scriptPartsWithMedia[i].imagePath || !scriptPartsWithMedia[i].audioPath) continue;
      videoStreams += `[v${i}]`;
      audioStreams += `[a${i}]`;
    }

    // Hoàn thiện filter script với concat
    if (videoStreams && audioStreams) {
      filterScript += `${videoStreams}concat=n=${scriptPartsWithMedia.length}:v=1:a=0[outv];\n`;
      filterScript += `${audioStreams}amix=inputs=${scriptPartsWithMedia.length}:duration=longest[outa]`;
    } else {
      throw new Error('Không đủ media để tạo video');
    }

    // Ghi các file tạm
    fs.writeFileSync(inputListPath, inputList);
    fs.writeFileSync(filterScriptPath, filterScript);

    // Tạo video bằng FFmpeg
    try {
      execSync(`ffmpeg -y -f concat -safe 0 -i "${inputListPath}" -filter_complex_script "${filterScriptPath}" -map "[outv]" -map "[outa]" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k -shortest "${outputPath}"`, { stdio: 'inherit' });

      // Xóa file tạm
      fs.unlinkSync(inputListPath);
      fs.unlinkSync(filterScriptPath);

      // Nếu có nhạc nền, chèn vào video
      if (music) {
        const musicPath = path.join(__dirname, '../public/music', music);
        const outputWithMusic = outputPath.replace(/\.mp4$/, '-with-music.mp4');

        await addBackgroundMusic(outputPath, musicPath, outputWithMusic, musicVolume, musicStartTime, musicEndTime);

        return outputWithMusic;
      }

      return outputPath;

    } catch (error) {
      console.error('Lỗi khi tạo video bằng FFmpeg:', error.message);
      throw new Error('Cần cài đặt FFmpeg để tạo video. Hãy cài đặt FFmpeg hoặc kiểm tra lại cấu hình.');
    }
  } catch (error) {
    console.error('Lỗi khi tạo video:', error);
    throw error;
  }
}

// Hàm tạo video từ script (phương thức chính)
async function generateVideoFromScript(script, outputPath, voiceId = null) {
  try {
    const { scriptParts, imageDescriptions } = await extractImageDescriptionsFromScript(script);

    if (scriptParts.length === 0) {
      throw new Error('Không thể phân tích kịch bản. Hãy đảm bảo kịch bản theo đúng định dạng yêu cầu.');
    }

    const audioDir = path.join(path.dirname(outputPath), 'audio');
    const scriptPartsWithAudio = await createAudioForScript(script, audioDir, voiceId);

    const scriptPartsWithMedia = await downloadImagesForScriptParts(
      scriptPartsWithAudio,
      imageDescriptions
    );

    const videoPath = await createVideoWithAudio(scriptPartsWithMedia, outputPath);
    console.log('Video đã được tạo tại:', videoPath);

    return {
      success: true,
      videoPath,
      scriptParts: scriptPartsWithMedia
    };
  } catch (error) {
    console.error('Lỗi trong quá trình tạo video:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Hàm chèn nhạc nền vào video đã có sẵn (có hỗ trợ điều chỉnh âm lượng)
async function addBackgroundMusic(inputVideoPath, musicPath, outputVideoPath, volume = 0.5, startTime = 0, endTime = null) {
  try {
    console.log(`🎵 Đang thêm nhạc nền: ${musicPath}`);
    console.log(`🔊 Âm lượng: ${volume}, Bắt đầu: ${startTime}s, Kết thúc: ${endTime || 'đến hết'}`);
    
    // Kiểm tra file nhạc có tồn tại không
    if (!fs.existsSync(musicPath)) {
      console.error(`❌ File nhạc không tồn tại: ${musicPath}`);
      throw new Error(`File nhạc không tồn tại: ${musicPath}`);
    }
    
    // Tạo file tạm cho nhạc đã cắt
    const tempDir = path.dirname(outputVideoPath);
    const tempMusicPath = path.join(tempDir, `temp_music_${Date.now()}.mp3`);
    
    let cutCommand = '';
    if (endTime !== null && !isNaN(endTime)) {
      const duration = parseFloat(endTime) - parseFloat(startTime);
      cutCommand = `-ss ${startTime} -t ${duration}`;
    } else {
      cutCommand = `-ss ${startTime}`;
    }

    // Bước 1: Cắt nhạc theo thời gian chỉ định
    console.log('🔪 Cắt nhạc theo thời gian...');
    const cutMusicCmd = `ffmpeg -y -i "${musicPath}" ${cutCommand} "${tempMusicPath}"`;
    execSync(cutMusicCmd, { stdio: 'inherit' });
    
    // Bước 2: Kết hợp video với nhạc nền đã cắt
    console.log('🔄 Kết hợp video với nhạc nền...');
    const mixCommand = `ffmpeg -y -i "${inputVideoPath}" -i "${tempMusicPath}" -filter_complex "[1:a]volume=${volume}[a1];[0:a][a1]amix=inputs=2:duration=first[aout]" -map 0:v -map "[aout]" -c:v copy -shortest "${outputVideoPath}"`;
    execSync(mixCommand, { stdio: 'inherit' });
    
    // Xóa file tạm
    try {
      fs.unlinkSync(tempMusicPath);
    } catch (err) {
      console.warn('⚠️ Không thể xóa file nhạc tạm:', err.message);
    }
    
    console.log(`✅ Đã thêm nhạc nền thành công vào: ${outputVideoPath}`);
    return outputVideoPath;
  } catch (err) {
    console.error('❌ Lỗi khi chèn nhạc nền:', err);
    // Trả về video gốc nếu thất bại
    console.log('⚠️ Trả về video gốc do không thêm được nhạc nền');
    if (inputVideoPath !== outputVideoPath) {
      try {
        fs.copyFileSync(inputVideoPath, outputVideoPath);
        console.log('✅ Đã sao chép video gốc thành đầu ra');
      } catch (copyErr) {
        console.error('❌ Không thể sao chép video gốc:', copyErr);
      }
    }
    return inputVideoPath;
  }
}


module.exports = {
  generateVideoFromScript,
  extractImageDescriptionsFromScript,
  downloadImagesForKeywords,
  createVideoWithAudio,
  addBackgroundMusic // chèn nhạc nền có volume được thêm bởi Phước đẹp trai
};
