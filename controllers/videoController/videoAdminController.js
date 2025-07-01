// controllers/videoAdminController.js
const path       = require('path');
const videoModel = require('../../models/videoModel');
const fs = require('fs');

/* -------- PAGE /my-videos ------------------------------------------- */
async function renderVideoListPage(req, res) {
  try {
    const videos = await videoModel.listVideos({ limit: 100, offset: 0 });

    const videosWithPaths = videos.map(video => {
      const filename = video.filename || '';

      // Kiểm tra nếu filename không tồn tại
      if (!filename || typeof filename !== 'string') {
        console.warn(`⚠️ Video ID ${video.id} thiếu hoặc sai filename`);
        return {
          ...video,
          local_path: '',
          server_path: '',
          file_exists: false
        };
      }

      const localPath = `/videos/${filename}`;
      const serverPath = path.join(__dirname, '../../public/videos', filename);

      // Optional: Kiểm tra nếu file thực sự tồn tại
      const exists = fs.existsSync(serverPath);

      if (!exists) {
        console.warn(`⚠️ File không tồn tại: ${serverPath}`);
      }

      return {
        ...video,
        local_path: localPath,
        server_path: serverPath,
        file_exists: exists
      };
    });

    res.render('videoView/myVideos', {
      title: 'Video của tôi',
      videos: videosWithPaths
    });

  } catch (err) {
    console.error('❌ renderVideoListPage error:', err);
    res.status(500).send('Lỗi server khi tải danh sách video.');
  }
}

/* -------- API: GET list --------------------------------------------- */
async function apiListVideos(req, res) {
  try {
    const limit  = Number(req.query.limit  || 20);
    const page   = Number(req.query.page   || 1);
    const offset = (page - 1) * limit;
    const userId = req.session?.user?.id_nguoidung;

    const videos = await videoModel.listVideos({ userId });
    res.json({ success: true, videos });
  } catch (err) {
    console.error('apiListVideos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/* -------- API: DELETE ----------------------------------------------- */
async function apiDeleteVideo(req, res) {
  try {
    const { id } = req.params;
    await videoModel.deleteById(id);
    res.json({ success: true });
  } catch (err) {
    console.error('apiDeleteVideo:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { renderVideoListPage, apiListVideos, apiDeleteVideo };
