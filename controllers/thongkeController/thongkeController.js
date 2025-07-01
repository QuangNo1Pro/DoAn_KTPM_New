const { google } = require('googleapis');
const { getOAuth2Client } = require('../../controllers/videoController/upLoadYoutubeController');
const { getYoutubeUploadedVideos } = require('../../models/thongkeModel');

function parseMonthParam(monthStr) {
  if (!monthStr) return null;
  const [year, month] = monthStr.split('-').map(Number);
  return { year, month };
}

async function getYoutubeStatsPage(req, res) {
  try {
    const userId = req.session.user?.id_nguoidung || req.user?.id_nguoidung;
    if (!userId) return res.redirect('/login');

    const { month } = req.query;
    const monthFilter = parseMonthParam(month); 

    const videos = await getYoutubeUploadedVideos(userId, monthFilter);

    const oauth2Client = getOAuth2Client(req);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // 🔁 Lấy danh sách youtube_id để gọi API YouTube
    const ids = videos.map(v => v.youtube_id).filter(Boolean);
    let viewsMap = {};

    if (ids.length > 0) {
      const ytRes = await youtube.videos.list({
        part: 'snippet,statistics,status',
        id: ids.join(','),
      });

      for (const item of ytRes.data.items) {
        viewsMap[item.id] = item.statistics?.viewCount || 0;
      }
    }

    for (let v of videos) {
      v.viewCount = viewsMap[v.youtube_id] || 0;  // ✅ Sử dụng youtube_id
    }

    const totalViews = videos.reduce((sum, v) => sum + parseInt(v.viewCount || 0), 0);
      const totalVideos = videos.length;
      console.log(videos);

    res.render('thongkeVideo', {
      title: 'Thống kê video YouTube',
      stats: { totalViews, totalVideos },
      videos,
      filterMonth: month
    });

  } catch (err) {
    console.error('Lỗi thống kê:', err);
    res.status(500).send('Lỗi khi thống kê video YouTube');
  }
}

module.exports = { getYoutubeStatsPage };
