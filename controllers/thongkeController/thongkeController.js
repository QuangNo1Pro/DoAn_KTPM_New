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
        const estimatedWatchTime = parseInt(item.statistics?.estimatedMinutesWatched || 0); // giả định có API tương đương

        const match = durationISO.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
        const minutes = match ? parseInt(match[1] || '0') + parseInt((match[2] || '0') / 60) : 0;

        viewsMap[item.id] = viewCount;
        likesMap[item.id] = likeCount;
        durations[item.id] = minutes;
        completions[item.id] = viewCount > 0 ? ((estimatedWatchTime / minutes) / viewCount) * 100 : 0;
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

    const avgWatchDuration = totalVideos > 0 && totalViews > 0 ? (totalWatchTime / totalViews).toFixed(2) : 0;
    const avgCompletionRate = completionRates.length > 0 ? (completionRates.reduce((a, b) => a + b, 0) / completionRates.length).toFixed(1) : 0;

    console.log('Thống kê video:',videos)
    res.render('thongkeVideo', {
      title: 'Thống kê video YouTube',
      stats: {
        totalVideos,
        totalViews,
        totalLikes,
        totalWatchTime: Math.round(totalWatchTime),
        avgWatchDuration,
        completionRate: avgCompletionRate
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