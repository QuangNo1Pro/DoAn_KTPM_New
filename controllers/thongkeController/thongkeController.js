const { google } = require('googleapis');
const { getOAuth2Client } = require('../../controllers/videoController/upLoadYoutubeController');
const {
  getYoutubeUploadedVideos,
  getTotalWatchTime,
  getAvgWatchDuration,
  getCompletionRate
} = require('../../models/thongkeModel');

function parseMonthParam(monthStr) {
  if (!monthStr) return null;
  const [year, month] = monthStr.split('-').map(Number);
  const fromDate = new Date(year, month - 1, 1); // đầu tháng
  const now = new Date();

  // Nếu là tháng hiện tại thì toDate là hôm nay, ngược lại là cuối tháng
  const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
  const toDate = isCurrentMonth
    ? now
    : new Date(year, month, 0, 23, 59, 59); // cuối tháng

  return { year, month, fromDate, toDate };
}


async function getYoutubeStatsPage(req, res) {
  try {
    const userId = req.session.user?.id_nguoidung || req.user?.id_nguoidung;
    if (!userId) return res.redirect('/login');

    const { month } = req.query;
    const monthFilter = parseMonthParam(month);
    const { fromDate, toDate } = monthFilter || {};


    const videos = await getYoutubeUploadedVideos(userId, monthFilter);
    const oauth2Client = getOAuth2Client(req);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const ids = videos.map(v => v.youtube_id).filter(Boolean);
    let viewsMap = {}, likesMap = {}, durations = {}, completions = {};

    if (ids.length > 0) {
      const ytRes = await youtube.videos.list({
        part: 'snippet,statistics,contentDetails',
        id: ids.join(','),
      });

      for (const item of ytRes.data.items) {
        const durationISO = item.contentDetails?.duration || 'PT0M0S';
        const viewCount = parseInt(item.statistics?.viewCount || 0);
        const likeCount = parseInt(item.statistics?.likeCount || 0);
        const estimatedWatchTime = parseInt(item.statistics?.estimatedMinutesWatched || 0); // giả định

        const match = durationISO.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
        const minutes = match ? parseInt(match[1] || '0') + parseInt((match[2] || '0') / 60) : 0;

        viewsMap[item.id] = viewCount;
        likesMap[item.id] = likeCount;
        durations[item.id] = minutes;
        completions[item.id] = viewCount > 0 && minutes > 0
          ? ((estimatedWatchTime / minutes) / viewCount) * 100
          : 0;
      }
    }

    let totalViews = 0, totalLikes = 0, totalWatchTime = 0, completionRates = [], totalVideos = videos.length;
    let chartLabels = [], chartData = [];

    for (let v of videos) {
      const vid = v.youtube_id;
      v.viewCount = viewsMap[vid] || 0;
      v.likeCount = likesMap[vid] || 0;
      v.duration = durations[vid] || 0;
      v.completionRate = completions[vid] || 0;

      totalViews += v.viewCount;
      totalLikes += v.likeCount;
      totalWatchTime += v.viewCount * v.duration;
      if (v.completionRate) completionRates.push(v.completionRate);

      const uploadDate = new Date(v.updated_at);
      const label = uploadDate.toISOString().split('T')[0];
      chartLabels.push(label);
      chartData.push(v.viewCount);
    }

    // 👉 fallback sang thống kê nội bộ nếu API trả về không đủ
    const [
      internalWatchTime,
      internalAvgDuration,
      internalCompletionRate
    ] = await Promise.all([
      getTotalWatchTime(userId, fromDate, toDate),
      getAvgWatchDuration(userId, fromDate, toDate),
      getCompletionRate(userId, fromDate, toDate)
    ]);


    const avgWatchDuration = totalViews > 0
      ? (totalWatchTime / totalViews).toFixed(2)
      : (internalAvgDuration / 60).toFixed(2);

    const completionRate = completionRates.length > 0
      ? (completionRates.reduce((a, b) => a + b, 0) / completionRates.length).toFixed(1)
      : internalCompletionRate.toFixed(1);

    const totalWatchTimeFinal = totalWatchTime > 0
      ? Math.round(totalWatchTime)
      : Math.round(internalWatchTime / 60); // từ giây → phút

    res.render('thongkeVideo', {
      title: 'Thống kê video YouTube',
      stats: {
        totalVideos,
        totalViews,
        totalLikes,
        totalWatchTime: totalWatchTimeFinal,
        avgWatchDuration,
        completionRate
      },
      viewChartJSON: {
        labels: JSON.stringify(chartLabels),
        data: JSON.stringify(chartData)
      },
      videos,
      filterMonth: month
    });

  } catch (err) {
    console.error('Lỗi thống kê:', err);
    if (err.message.includes('Insufficient Permission')) {
      return res.status(403).send('Token Google không đủ quyền để xem thống kê video. Vui lòng đăng nhập lại.');
    }
    return res.status(500).send('Lỗi khi thống kê video YouTube');
  }
}

module.exports = { getYoutubeStatsPage };
