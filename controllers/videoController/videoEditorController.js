const path  = require('path');
const fs    = require('fs');
const { execSync, exec } = require('child_process');
const util  = require('util');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const { uploadFile } = require(path.resolve(__dirname, '../../services/firebaseService'));
const videoModel     = require('../../models/videoModel');

/* ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */
function ffPos (v, axis = 'x', ov = 'text_w') {
  if (typeof v === 'string') return v;
  if (!Number.isFinite(v)) v = 0.5;              // null / undefined ⇒ 0.5
  if (v >= 0 && v <= 1) {
    const main = axis === 'x' ? 'main_w' : 'main_h';
    return `(${main}-${ov})*${v}`;
  }
  return Math.round(v);
}
const safeNum = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

function safeExecSync (cmd, opts = {}) {
  try { return execSync(cmd, { stdio: 'pipe', ...opts }); }
  catch (e) {
    console.error('[FFMPEG-ERR]', e.stderr?.toString() || e.message);
    throw e;
  }
}
function getFontPath () {
  const winFont = 'C:/Windows/Fonts/arial.ttf';
  const nixFont = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  return fs.existsSync(winFont) ? winFont : nixFont;
}

async function convertToMp3 (src) {
  const dst = src.replace(/\.(webm|ogg)$/i, '.mp3');
  await util.promisify(exec)(
    `ffmpeg -y -loglevel error -i "${src}" -ar 44100 -ac 2 -codec:a libmp3lame -q:a 4 "${dst}"`
  );
  fs.unlinkSync(src);
  return dst;
}

function getAudioDuration (p) {
  try {
    const o = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${p}"`);
    return parseFloat(o.toString().trim()) || 0;
  } catch { return 0; }
}

const secondsToSrtTime = s => {
  const h  = String(Math.floor(s / 3600)).padStart(2, '0');
  const m  = String(Math.floor(s % 3600 / 60)).padStart(2, '0');
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  const ms = String(Math.round((s % 1) * 1000)).padStart(3, '0');
  return `${h}:${m}:${ss},${ms}`;
};

/**
 * Chuyển đường dẫn web ("/temp/foo.png", "music/calm.mp3" …) ⇒ path tuyệt đối.
 * Luôn trỏ vào thư mục `public`.
 */
function convertUrlToFilePath (p) {
  if (!p) return null;
  if (p.includes('?')) p = p.split('?')[0];
  if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;   // URL tuyệt đối

  if (p.startsWith('/temp/'))  return path.join(__dirname, '../../public', p.slice(1));
  if (p.startsWith('/music/')) return path.join(__dirname, '../../public', p.slice(1));
  if (path.isAbsolute(p))     return p;                      // /home/… hoặc C:\…

  // «music/…» không có dấu «/» đầu → thêm thủ công
  return path.join(__dirname, '../../public', p.replace(/^\/?/, ''));
}

/* ------------------------------------------------------------------
 * Gộp các đoạn clip cùng partId (ảnh + âm thanh)
 * ------------------------------------------------------------------ */
function mergeMediaParts (raw = []) {
  const map = {};
  raw.forEach(p => {
    if (!p.partId) return;
    const k = p.partId.replace(/^(image|audio|video|sound|img|snd)[-_]?/, '');
    map[k] ??= { partId: k };
    if (p.imagePath) map[k].imagePath = p.imagePath;
    if (p.audioPath) map[k].audioPath = p.audioPath;
    ['effect','transition','caption','text','duration','startTime'].forEach(f => {
      if (p[f] !== undefined) map[k][f] = p[f];
    });
  });
  return Object.values(map);
}

/* ------------------------------------------------------------------
 * Multer – upload audio
 * ------------------------------------------------------------------ */
const audioStore = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../public/temp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename   : (req, file, cb) => cb(null, `user_upload_${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname || '.webm')}`)
});

const audioUpload = multer({
  storage   : audioStore,
  limits    : { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('audio/'))
}).single('audio');

/* ------------------------------------------------------------------
 * API – uploadAudioForPart
 * ------------------------------------------------------------------ */
const uploadAudioForPart = [
  audioUpload,
  async (req, res) => {
    try {
      const { sessionId, partId } = req.body;
      if (!sessionId || !partId) throw new Error('Thiếu sessionId / partId');
      if (!req.file)             throw new Error('Không có file audio');

      let stored = req.file.path;
      if (/\.(webm|ogg)$/i.test(stored)) stored = await convertToMp3(stored);

      /* lưu vào session nếu có */
      if (req.session?.videoPreparation?.sessionId === sessionId) {
        const part = req.session.videoPreparation.scriptParts?.find(x => x.id === partId);
        if (part) part.audioPath = `/temp/${path.basename(stored)}`;
      }

      return res.json({ success:true, audioPath:`/temp/${path.basename(stored)}`, mime:'audio/mpeg' });
    } catch (e) {
      console.error('[uploadAudioForPart]', e);
      res.status(500).json({ success:false, error:e.message });
    }
  }
];

/* ------------------------------------------------------------------
 * Generate SRT
 * ------------------------------------------------------------------ */
function generateSrtFile(parts, outPath) {
  let cur = 0, idx = 1, srt = '';
   parts.forEach(p => {
    // dùng p.duration nếu có, fallback sang ffprobe
    const dur = Number.isFinite(p.duration)
              ? p.duration
              : getAudioDuration(convertUrlToFilePath(p.audioPath));
    if (!dur) return;
    // giờ lấy caption || text || content
    const textLine = p.text   // kiểu mới
                   || p.content // fallback
                   || p.caption // nếu dùng caption từ clips
                   || '';
    srt += `${idx++}\n`
         + `${secondsToSrtTime(cur)} --> ${secondsToSrtTime(cur + dur)}\n`
         + `${textLine}\n\n`;
    cur += dur;
  });
  fs.writeFileSync(outPath, srt.trim() + '\n', 'utf8');
}

/* ------------------------------------------------------------------
 * Save video edits (draft)
 * ------------------------------------------------------------------ */
async function saveVideoEdits (req, res) {
  try {
    const { sessionId, parts = [], textOverlays = [], imageOverlays = [], music = null } = req.body;
    if (!sessionId) return res.status(400).json({ success:false, error:'Thiếu sessionId' });

    const dir = path.join(__dirname, '../../public/temp', sessionId);
    fs.mkdirSync(dir, { recursive:true });

    fs.writeFileSync(
      path.join(dir, 'editor_data.json'),
      JSON.stringify({ parts, textOverlays, imageOverlays, music }, null, 2)
    );
    res.json({ success:true, message:'Đã lưu' });
  } catch (e) {
    console.error('[saveVideoEdits]', e);
    res.status(500).json({ success:false, error:e.message });
  }
}

/* ------------------------------------------------------------------
 * createFinalVideo – trọng tâm FIX
 * ------------------------------------------------------------------ */
const createFinalVideo = async (req, res) => {
  try {
    let { sessionId, parts = [], aspectRatio = '16:9', script = null,
          music = null } = req.body;
    if (!sessionId || !parts.length)
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu' });

    /* ===== 1. TÁCH NHÓM ===== */
    const textOverlays  = (parts.find(p => p.type === 'textOverlays')  || {}).items || [];
    const imageOverlays = (parts.find(p => p.type === 'imageOverlays') || {}).items || [];
    const clipsRaw      = parts.filter(p => !p.type);
    let   clips         = mergeMediaParts(clipsRaw);

    if (!clips.length)
      return res.status(400).json({ success:false, error:'Không clip hợp lệ' });

    /* ===== 2. META DIR ===== */
    const userId = req.session?.user_id || req.user?.id_nguoidung || null;
    const topic  = req.session?.videoPreparation?.topic || req.body.topic || 'Video AI';

    const videosDir = path.join(__dirname,'../../public/videos');
    const tempDir   = path.join(__dirname,'../../public/temp');
    fs.mkdirSync(videosDir,{recursive:true});

    const tempId = uuidv4();
    const segList= path.join(tempDir,`seg_${tempId}.txt`);
    const segPaths=[];
    const videoName=`edited_video_${Date.now()}.mp4`;
    const concatOut= path.join(tempDir,`cat_${tempId}.mp4`);
    const finalVid = path.join(videosDir,videoName);

    /* ===== 3. XÂY TỪNG SEGMENT ===== */
    for (let i=0;i<clips.length;i++){
      const c=clips[i];
      const img=convertUrlToFilePath(c.imagePath);
      let   aud=convertUrlToFilePath(c.audioPath);
      if (!fs.existsSync(img)||!fs.existsSync(aud))
        return res.status(400).json({success:false,error:`Thiếu file ở clip #${i+1}`});
      if (/\.webm$|\.ogg$/i.test(aud)) aud=await convertToMp3(aud);
      const dur=getAudioDuration(aud)||5;

      /* --- build filter-complex --- */
      const filterParts=[];
      let last = 'bg0';
      filterParts.push(`[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,`+
                       `pad=1920:1080:(ow-iw)/2:(oh-ih)/2[${last}]`);

      /* Hiệu ứng */
      if (c.effect?.type){
        const v=c.effect.value;
        const fx={
          grayscale :'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3:0',
          sepia     :'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0',
          brightness:`eq=brightness=${(v-50)/50}`,
          contrast  :`eq=contrast=${v/50}`,
          blur      :`boxblur=${v/20}:${v/20}`
        }[c.effect.type];
        if (fx){ filterParts.push(`[${last}]${fx}[fx1]`); last='fx1'; }
      }

      /* TEXT overlay khớp clip */
      const start = c.startTime||0;
      const end   = start+dur;
      textOverlays.filter(t => (t.startTime||0)<end && ((t.startTime||0)+(t.duration||3))>start)
        .forEach((t,idx)=>{
          const st=Math.max(0,(t.startTime||0)-start).toFixed(2);
          const et=Math.min(dur,(t.startTime||0)+(t.duration||3)-start).toFixed(2);
          const safe=(t.content||t.text||'').replace(/['"]/g,c=>c==='\''
                                                      ?"\\'"
                                                      :'\\"');
          filterParts.push(
  `[${last}]drawtext=` +
  `fontfile=/Windows/Fonts/arial.ttf:` +
  `text='${safe}':` +
  `fontcolor=${t.color || 'white'}:` +
  `fontsize=${safeNum(t.size, 44)}:` +

`x=${ffPos(t.x,'x','text_w')}:` +
 `y=${ffPos(t.y,'y','text_h')}:` +
  `enable='between(t,${st},${et})'[txt${idx}]`
);
          last=`txt${idx}`;
        });

      /* IMAGE overlay */
      let extInputs='';
      let ovCount=0;
      imageOverlays.filter(o => (o.startTime||0)<end && ((o.startTime||0)+(o.duration||3))>start)
        .forEach(o=>{
          const ovAbs=convertUrlToFilePath(o.src||o.imagePath);
          if (!fs.existsSync(ovAbs)) return;
          extInputs+=` -loop 1 -i "${ovAbs}"`;
          const st=Math.max(0,(o.startTime||0)-start).toFixed(2);
          const et=Math.min(dur,(o.startTime||0)+(o.duration||3)-start).toFixed(2);
          const ow = Math.round((o.scale||0.25)*1920);

         filterParts.push(`[${2+ovCount}:v]scale=${ow}:-1[ov${ovCount}]`);
filterParts.push(
  `[${last}][ov${ovCount}]overlay=` +

 `${ffPos(o.x,'x','overlay_w')}:${ffPos(o.y,'y','overlay_h')}:` +
  `enable='between(t,${st},${et})'[ovb${ovCount}]`
);
          
          last=`ovb${ovCount}`; ovCount++;
        });

      filterParts.push(`[${last}]format=yuv420p[v]`);
      const seg=path.join(tempDir,`seg_${tempId}_${i}.mp4`);
      segPaths.push(seg);

      safeExecSync(
        `ffmpeg -y -loop 1 -i "${img}" -i "${aud}"${extInputs} `+
        `-filter_complex "${filterParts.join(';')}" -map "[v]" -map 1:a `+
        `-c:v libx264 -preset veryfast -pix_fmt yuv420p -shortest -t ${dur} "${seg}"`
      );
      fs.appendFileSync(segList,`file '${seg.replace(/\\/g,'/')}'\n`);
    }

    /* ===== 4. Concat ===== */
    safeExecSync(`ffmpeg -y -f concat -safe 0 -i "${segList}" -c copy "${concatOut}"`);

    /* ===== 5. Nhạc nền ===== */
    let videoForSub = concatOut;
    if (music && music.file) {
      // Bóc tách
      const musicFile      = music.file;
      const musicVolume    = Number.isFinite(+music.volume) ? +music.volume : 0.5;
      const musicStartTime = Number.isFinite(+music.start)  ? +music.start  : 0;
      const musicEndTime   = Number.isFinite(+music.end)    ? +music.end    : null;

      // Chuyển URL -> đường dẫn tuyệt đối
      const musAbs = convertUrlToFilePath(musicFile);
      if (fs.existsSync(musAbs)) {
        const mixOut = path.join(tempDir, `mix_${tempId}.mp4`);

        // build -ss / -to nếu cần cắt đoạn
        const trimArgs = [`-ss ${musicStartTime}`]
          .concat(musicEndTime != null ? [`-to ${musicEndTime}`] : [])
          .join(' ');

        safeExecSync(
          // đầu vào video, sau đó đầu vào nhạc (đã trim)
          `ffmpeg -y -i "${concatOut}" ${trimArgs} -i "${musAbs}" ` +
          `-filter_complex "[1:a]volume=${musicVolume}[bg];[0:a][bg]amix=inputs=2:duration=first" ` +
          `-map 0:v -map "[a]" -c:v copy -shortest "${mixOut}"`
        );
        videoForSub = mixOut;
      } else {
        console.warn('Không tìm thấy file nhạc nền tại:', musAbs);
      }
    }

    /* ===== 6. Phụ đề ===== */
    const subDir=path.join(videosDir,'subtitles'); fs.mkdirSync(subDir,{recursive:true});
    const srt=path.join(subDir,`sub_${sessionId}.srt`);
    generateSrtFile(clips,srt);
    const ass=srt.replace(/\.srt$/i,'.ass');
    safeExecSync(`ffmpeg -y -i "${srt}" "${ass}"`);
    safeExecSync(
      `ffmpeg -y -i "${videoForSub}" -vf "ass='${ass.replace(/\\/g,'/').replace(/:/g,'\\:')}'" -c:a copy "${finalVid}"`
    );

    /* ===== 7. Upload & DB ===== */
    const fbKey=`videos/${videoName}`;
    const pubURL=await uploadFile(finalVid,fbKey,{contentType:'video/mp4'});
    const sizeMb=(fs.statSync(finalVid).size/1024/1024).toFixed(2);
    await videoModel.insertVideo({filename:videoName,firebaseKey:fbKey,publicUrl:pubURL,
                                  sizeMb,title:topic,script,userId});

    /* ===== 8. Clean temp ===== */
    [segList,...segPaths,concatOut,(videoForSub!==concatOut)&&videoForSub]
      .filter(Boolean).forEach(f=>{try{fs.unlinkSync(f);}catch{}});

    res.json({success:true,videoUrl:pubURL,title:topic,userId});
  } catch(err){
    console.error('❌ createFinalVideo',err);
    res.status(500).json({success:false,error:err.message});
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