// controllers/videoAdminController.js
const path       = require('path');
const videoModel = require('../../models/videoModel');

/* -------- PAGE /my-videos ------------------------------------------- */
async function renderVideoListPage(req, res) {
  try {
    const videos = await videoModel.listVideos({ limit: 100, offset: 0 });
    res.render('videoView/myVideos', {            // handlebars/ejs/pug tuỳ bạn
      title : 'Video của tôi',
      videos
    });
  } catch (err) {
    console.error('renderVideoListPage:', err);
    res.status(500).send('Lỗi server');
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
