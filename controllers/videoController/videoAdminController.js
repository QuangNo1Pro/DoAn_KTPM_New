// controllers/videoAdminController.js
const videoModel = require('../../models/videoModel');

/*───────────────────────────────────────────────────────────────────*/
/* TIỆN ÍCH LẤY VIDEO + META                                         */
/*───────────────────────────────────────────────────────────────────*/
async function fetchPagedVideos({ page = 1, limit = 20, userId = null }) {
  limit = Number(limit) > 0 ? Number(limit) : 20;
  page  = Number(page)  > 0 ? Number(page)  : 1;
  const offset = (page - 1) * limit;

  /* chỉ query khi có userId – tránh trả nhầm video người khác */
  const [videos, total] = userId
    ? await Promise.all([
        videoModel.listVideos({ limit, offset, userId }),
        videoModel.countVideos({ userId })
      ])
    : [[], 0];

  const lastPage = Math.max(1, Math.ceil(total / limit));
  if (page > lastPage) return fetchPagedVideos({ page: lastPage, limit, userId });

  return {
    videos,
    page,
    limit,
    offset,
    total,
    lastPage,
    prevPage : Math.max(1, page - 1),
    nextPage : Math.min(lastPage, page + 1),
    pages    : Array.from({ length: lastPage }, (_, i) => i + 1)
  };
}

/*───────────────────────────────────────────────────────────────────*/
/* PAGE  /my-videos                                                  */
/*───────────────────────────────────────────────────────────────────*/
async function renderVideoListPage(req, res) {
  try {
    /*====== CHỈ LẤY VIDEO CỦA CHÍNH USER ĐĂNG NHẬP ======*/
    const userId =
          req.session?.user_id              // set từ loginController
       ?? req.session?.user?.id_nguoidung   // fallback (nếu đã tạo middleware)
       ?? null;

    const data = await fetchPagedVideos({
      page : req.query.page,
      limit: req.query.limit,
      userId
    });

    res.render('videoView/myVideos', {
      title : 'Video của tôi',
      ...data
    });

  } catch (err) {
    console.error('[renderVideoListPage]', err);
    res.status(500).send('Lỗi server');
  }
}

/*───────────────────────────────────────────────────────────────────*/
/* API  GET /api/videos                                              */
/*───────────────────────────────────────────────────────────────────*/
async function apiListVideos(req, res) {
  try {
    const userId =
          req.session?.user_id
       ?? req.session?.user?.id_nguoidung
       ?? null;

    const data = await fetchPagedVideos({
      page : req.query.page,
      limit: req.query.limit,
      userId
    });

    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[apiListVideos]', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/*───────────────────────────────────────────────────────────────────*/
/* API  DELETE /api/videos/:id                                       */
/*───────────────────────────────────────────────────────────────────*/
async function apiDeleteVideo(req, res) {
  try {
    await videoModel.deleteById(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[apiDeleteVideo]', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  renderVideoListPage,
  apiListVideos,
  apiDeleteVideo
};
