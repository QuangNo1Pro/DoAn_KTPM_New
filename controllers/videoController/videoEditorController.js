const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { uploadFile } = require(path.resolve(__dirname, '../../services/firebaseService'));
const videoModel = require('../../models/videoModel');
const util = require('util');
const multer = require('multer');

/* ------------------- Utility Functions ------------------- */
function safeExecSync(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: 'pipe', ...opts });
  } catch (e) {
    console.error('[FFMPEG-ERR]', e.stderr?.toString() || e.message);
    throw e;
  }
}

function mergeMediaParts(rawParts = []) {
  const map = {};
  rawParts.forEach(p => {
    if (!p.partId) return;
    const key = p.partId.replace(/^(image|audio|video|sound|img|snd)[-_]?/, '');
    map[key] ??= { partId: key };
    if (p.imagePath) map[key].imagePath = p.imagePath;
    if (p.audioPath) map[key].audioPath = p.audioPath;
    ['effect', 'transition', 'caption', 'text', 'duration'].forEach(f => {
      if (p[f] !== undefined) map[key][f] = p[f];
    });
  });
  return Object.values(map);
}

async function convertToMp3(srcPath) {
  const dstPath = srcPath.replace(/\.(webm|ogg)$/i, '.mp3');
  await util.promisify(require('child_process').exec)(
    `ffmpeg -y -loglevel error -i "${srcPath}" -ar 44100 -ac 2 -codec:a libmp3lame -q:a 4 "${dstPath}"`
  );
  fs.unlinkSync(srcPath);
  return dstPath;
}

function getAudioDuration(p) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${p}"`
    );
    return parseFloat(out.toString().trim()) || 0;
  } catch {
    return 0;
  }
}

function secondsToSrtTime(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  const ms = String(Math.round((sec % 1) * 1000)).padStart(3, '0');
  return `${h}:${m}:${s},${ms}`;
}

function normaliseWebPath(p = '') {
  if (p.includes('?')) p = p.split('?')[0];
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

function convertUrlToFilePath(p) {
  if (!p) return null;
  if (p.includes('?')) p = p.split('?')[0];
  if (p.startsWith('http')) {
    p = new URL(p).pathname;
  }
  if (p.startsWith('/temp/')) {
    return path.join(__dirname, '../../public', p.slice(1));
  }
  if (path.isAbsolute(p)) {
    return p;
  }
  return path.join(__dirname, '../../public', p);
}

/* ------------------- Multer Configuration ------------------- */
const audStore = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../public/temp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null,
      `user_upload_${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname || '.webm')}`
    );
  }
});

const audioUpload = multer({
  storage: audStore,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('audio/'))
}).single('audio');

/* ------------------- API: Upload Audio for Part ------------------- */
const uploadAudioForPart = [
  audioUpload,
  async (req, res) => {
    try {
      const { sessionId, partId } = req.body;
      if (!sessionId || !partId) throw new Error('Thiếu sessionId / partId');
      if (!req.file) throw new Error('Không có file audio');

      let stored = req.file.path;
      if (/\.webm$|\.ogg$/i.test(stored)) {
        console.log('🔄 Convert WebM ➜ MP3');
        stored = await convertToMp3(stored);
      }

      if (req.session?.videoPreparation?.sessionId === sessionId) {
        const p = req.session.videoPreparation.scriptParts.find(x => x.id === partId);
        if (p) p.audioPath = `/temp/${path.basename(stored)}`;
      }

      return res.json({
        success: true,
        audioPath: `/temp/${path.basename(stored)}`,
        mime: 'audio/mpeg'
      });
    } catch (err) {
      console.error('[uploadAudioForPart]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
];

/* ------------------- API: Generate SRT File ------------------- */
function generateSrtFile(parts, outPath) {
  let cur = 0,
    idx = 1,
    srt = '';
  parts.forEach(p => {
    const audDur = getAudioDuration(convertUrlToFilePath(p.audioPath));
    if (!audDur) return;
    srt += `${idx++}\n${secondsToSrtTime(cur)} --> ${secondsToSrtTime(cur + audDur)}\n` +
      `${p.caption || p.text || ''}\n\n`;
    cur += audDur;
  });
  fs.writeFileSync(outPath, srt.trim() + '\n', 'utf8');
}

/* ------------------- API: Save Video Edits ------------------- */
const saveVideoEdits = async (req, res) => {
  try {
    const { sessionId, parts } = req.body;
    if (!sessionId || !Array.isArray(parts))
      return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });

    const dir = path.join(__dirname, '../../public/temp', sessionId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'editor_data.json'), JSON.stringify(parts, null, 2));
    res.json({ success: true, message: 'Đã lưu' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
};

/* ------------------- API: Create Final Video ------------------- */
const createFinalVideo = async (req, res) => {
  let srt;
  try {
    let { sessionId, parts = [], aspectRatio = '16:9', script = null } = req.body;
    if (!sessionId || !parts.length)
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu' });

    parts = mergeMediaParts(parts);
    console.table(parts);
    parts.forEach((p, i) => {
      console.log(`Part ${i}`, p.partId, p.imagePath, p.audioPath);
    });

    /* ---- user / topic ----------------------------------------- */
    const userId = req.authUserId; // Sử dụng req.authUserId từ middleware requireAuth
    console.log('🔍 userId before insertVideo:', userId);
    const topic = req.session?.videoPreparation?.topic || req.body.topic || 'Video không tiêu đề';

    /* ---- paths ------------------------------------------------- */
    const videosDir = path.join(__dirname, '../../public/videos');
    const tempDir = path.join(__dirname, '../../public/temp');
    fs.mkdirSync(videosDir, { recursive: true });

    const tempId = uuidv4();
    const segList = path.join(tempDir, `segments_${tempId}.txt`);
    const videoName = `edited_video_${Date.now()}.mp4`;
    const finalVideo = path.join(videosDir, videoName);

    let listTxt = '';
    const segPaths = [];

    /* ---- build từng segment ----------------------------------- */
    for (let i = 0; i < parts.length; i++) {
      const prt = parts[i];
      if (!prt.imagePath || !prt.audioPath) continue;

      const imgAbs = convertUrlToFilePath(prt.imagePath);
      let audAbs = convertUrlToFilePath(prt.audioPath);
      console.log('audioAbs:', audAbs, 'exists?', fs.existsSync(audAbs));

      if (!fs.existsSync(audAbs))
        return res.status(400).json({ success: false, error: `Thiếu *audio* ở part #${i + 1}` });

      if (!fs.existsSync(imgAbs)) {
        console.warn(`⚠️ Part ${i} không có ảnh, bỏ qua`);
        continue;
      }

      if (/\.webm$|\.ogg$/i.test(audAbs)) {
        audAbs = await convertToMp3(audAbs);
        prt.audioPath = `/temp/${path.basename(audAbs)}`;
      }

      const dur = getAudioDuration(audAbs) || 5;
      let vf = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';

      if (prt.effect?.type) {
        const v = prt.effect.value;
        vf += ({
          grayscale: ',colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3:0',
          sepia: ',colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0',
          brightness: `,eq=brightness=${(v - 50) / 50}`,
          contrast: `,eq=contrast=${v / 50}`,
          blur: `,boxblur=${v / 20}:${v / 20}`
        }[prt.effect.type] || '');
      }

      const seg = path.join(tempDir, `segment_${tempId}_${i}.mp4`);
      safeExecSync(
        `ffmpeg -y -loop 1 -i "${imgAbs}" -i "${audAbs}" ` +
        `-c:v libx264 -tune stillimage -c:a aac -b:a 128k -pix_fmt yuv420p ` +
        `-shortest -t ${dur} -vf "${vf}" "${seg}"`
      );
      segPaths.push(seg);
      listTxt += `file '${seg.replace(/\\/g, '/')}\n`;
    }

    if (!segPaths.length)
      return res.status(400).json({ success: false, error: 'Không part nào hợp lệ' });

    fs.writeFileSync(segList, listTxt);

    /* ---- concat ------------------------------------------------ */
    safeExecSync(`ffmpeg -y -f concat -safe 0 -i "${segList}" -c copy "${finalVideo}"`);

    /* ---- subtitles -------------------------------------------- */
    const subDir = path.join(videosDir, 'subtitles');
    fs.mkdirSync(subDir, { recursive: true });
    srt = path.join(subDir, `sub_${sessionId}.srt`);
    generateSrtFile(parts, srt);

    const tmp = path.join(videosDir, `tmp_${videoName}`);
    safeExecSync(
      `ffmpeg -y -i "${finalVideo}" -vf "subtitles='${srt.replace(/\\/g, '/').replace(/:/g, '\\:')}'" -c:a copy "${tmp}"`
    );
    fs.renameSync(tmp, finalVideo);

    /* ---- upload & DB ------------------------------------------ */
    const fbKey = `videos/${videoName}`;
    const pubURL = await uploadFile(finalVideo, fbKey, { contentType: 'video/mp4' });
    const sizeMb = (fs.statSync(finalVideo).size / 1024 / 1024).toFixed(2);

    await videoModel.insertVideo({
      filename: videoName,
      firebaseKey: fbKey,
      publicUrl: pubURL,
      sizeMb,
      title: topic,
      script,
      userId
    });

    /* ---- cleanup ---------------------------------------------- */
    [...segPaths, segList, srt].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));

    return res.json({ success: true, videoUrl: pubURL, title: topic, userId });

  } catch (err) {
    console.error('❌ createFinalVideo', err);
    /* ---- cleanup on error ------------------------------------- */
    if (srt && fs.existsSync(srt)) fs.unlinkSync(srt);
    [...segPaths, segList].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ------------------- API: Upload Media ------------------- */
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Không có file được tải lên'
      });
    }

    return res.json({
      success: true,
      filePath: `/temp/${req.file.filename}`,
      originalName: req.file.originalname,
      fileType: req.file.mimetype
    });
  } catch (error) {
    console.error('Lỗi khi tải lên file:', error);
    return res.status(500).json({ success: false, error: error.message || 'Lỗi server' });
  }
};

/* ------------------- API: Check Status ------------------- */
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
    return res.status(500).json({ success: false, error: error.message || 'Lỗi server' });
  }
};

/* ------------------- API: Check Request Data ------------------- */
const checkRequestData = async (req, res) => {
  try {
    const { sessionId, parts } = req.body;
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

    if (parts && Array.isArray(parts)) {
      validation.partDetails = parts.map((part, index) => {
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
    return res.status(500).json({ success: false, error: error.message || 'Lỗi server' });
  }
};

/* ------------------- API: Check Last Created Video ------------------- */
const checkLastCreatedVideo = async (req, res) => {
  try {
    const videosDir = path.join(__dirname, '../../public/videos');
    if (!fs.existsSync(videosDir)) {
      return res.json({
        success: false,
        error: 'Thư mục videos không tồn tại'
      });
    }

    const files = fs.readdirSync(videosDir)
      .filter(file => file.startsWith('edited_video_') && file.endsWith('.mp4'))
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

    if (files.length === 0) {
      return res.json({
        success: false,
        error: 'Không tìm thấy video nào'
      });
    }

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
    return res.status(500).json({ success: false, error: error.message || 'Lỗi server' });
  }
};

module.exports = {
  audioUpload,
  uploadAudioForPart,
  saveVideoEdits,
  createFinalVideo,
  uploadMedia,
  checkStatus,
  checkRequestData,
  checkLastCreatedVideo
};