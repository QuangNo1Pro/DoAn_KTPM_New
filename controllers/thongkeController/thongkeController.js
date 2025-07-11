const { google } = require('googleapis');
const { getOAuth2Client } = require('../../controllers/videoController/upLoadYoutubeController');
const {
  getYoutubeUploadedVideos,
  getTotalWatchTime,
  getAvgWatchDuration,
  getCompletionRate
} = require('../../models/thongkeModel');

function parseTimePeriod(periodStr, startDate, endDate) {
  const now = new Date();
  let fromDate, toDate;

  if (startDate && endDate) {
    fromDate = new Date(startDate);
    toDate = new Date(endDate);
  } else if (periodStr === 'week') {
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    fromDate = startOfWeek;
    toDate = now;
  } else if (periodStr === 'year') {
    fromDate = new Date(now.getFullYear(), 0, 1);
    toDate = now;
  } else { // Mặc định là month
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    toDate = now;
  }

  return { fromDate, toDate };
}

async function getYoutubeStatsPage(req, res) {
  try {
    const userId = req.session.user?.id_nguoidung || req.user?.id_nguoidung;
    if (!userId) return res.redirect('/login');

    const { period, startDate, endDate } = req.query;
    const filterPeriod = period || 'month'; // Đặt giá trị mặc định là 'month' nếu không có
    const { fromDate, toDate } = parseTimePeriod(period, startDate, endDate);

    const videos = await getYoutubeUploadedVideos(userId, { fromDate, toDate });
    const oauth2Client = getOAuth2Client(req);
    const { token } = await oauth2Client.getAccessToken();
    if (!token || token.expiry_date < Date.now()) {
      return res.status(401).send('Token hết hạn. Vui lòng đăng nhập lại.');
    }
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const ids = videos.map(v => v.youtube_id).filter(Boolean);
    let viewsMap = {}, likesMap = {}, durations = {}, completions = {};

    if (ids.length > 0) {
      const chunkedIds = [];
      for (let i = 0; i < ids.length; i += 50) {
        chunkedIds.push(ids.slice(i, i + 50));
      }
      for (const chunk of chunkedIds) {
        const ytRes = await youtube.videos.list({
          part: 'snippet,statistics,contentDetails',
          id: chunk.join(','),
        });
        for (const item of ytRes.data.items) {
          const durationISO = item.contentDetails?.duration || 'PT0M0S';
          const viewCount = parseInt(item.statistics?.viewCount || 0);
          const likeCount = parseInt(item.statistics?.likeCount || 0);
          const estimatedWatchTime = parseInt(item.statistics?.estimatedMinutesWatched || '0') || 0;

          const match = durationISO.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
          const minutes = match ? parseInt(match[1] || '0') + parseInt((match[2] || '0') / 60) : 0;

          viewsMap[item.id] = viewCount;
          likesMap[item.id] = likeCount;
          durations[item.id] = minutes;
          completions[item.id] = (viewCount > 0 && minutes > 0)
            ? ((estimatedWatchTime / minutes) / viewCount) * 100
            : 0;
          if (!item.statistics?.estimatedMinutesWatched) {
            console.warn(`Dữ liệu estimatedMinutesWatched thiếu cho video ${item.id}`);
          }
        }
      }
    }

    let totalViews = 0;
    let totalLikes = 0;
    let totalWatchTime = 0;
    let completionRates = [];
    let totalVideos = videos.length;

    const viewsPerDay = {};

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
      const label = uploadDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
      viewsPerDay[label] = (viewsPerDay[label] || 0) + v.viewCount;
    }

    const chartLabels = Object.keys(viewsPerDay).sort();
    const chartData = chartLabels.map(date => viewsPerDay[date]);

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
      : Math.round(internalWatchTime / 60);

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
      videoTitles: JSON.stringify(videos.map(v => v.title)),
      videoViews: JSON.stringify(videos.map(v => v.viewCount)),
      videos,
      filterPeriod, // Truyền filterPeriod để giữ giá trị đã chọn
      startDate,    // Truyền startDate để giữ giá trị đã chọn
      endDate       // Truyền endDate để giữ giá trị đã chọn
    });
  } catch (err) {
    console.error('Lỗi thống kê:', err);
    if (err.message.includes('Insufficient Permission')) {
      return res.status(403).send('Token Google không đủ quyền để xem thống kê video. Vui lòng đăng nhập lại hoặc cấp quyền bổ sung.');
    }
    return res.status(500).send('Lỗi khi thống kê video YouTube');
  }
}

module.exports = { getYoutubeStatsPage };