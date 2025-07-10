const { db } = require('../models/connectDb');

async function getYoutubeUploadedVideos(userId, filter = {}) {
  // 1. Lấy video theo id_nguoidung
  const sql = `
    SELECT id, title, updated_at, id_nguoidung, youtube_id
    FROM videos
    WHERE id_nguoidung = $1
    ORDER BY updated_at DESC
  `;
  const allVideos = await db.any(sql, [userId]);

  // 2. Nếu không có filter thì trả về toàn bộ
  if (!filter || Object.keys(filter).length === 0) {
    return allVideos;
  }

  // 3. Lọc thêm bằng JavaScript nếu có yêu cầu cụ thể về thời gian
  const filteredVideos = allVideos.filter(video => {
    const date = new Date(video.updated_at);

    if (filter.year && filter.month && filter.day) {
      return (
        date.getFullYear() === filter.year &&
        date.getMonth() + 1 === filter.month &&
        date.getDate() === filter.day
      );
    }

    if (filter.year && filter.month) {
      return (
        date.getFullYear() === filter.year &&
        date.getMonth() + 1 === filter.month
      );
    }

    if (filter.fromDate && filter.toDate) {
      const from = new Date(filter.fromDate);
      const to = new Date(filter.toDate);
      return date >= from && date <= to;
    }

    return true;
  });

  return filteredVideos;
}
// Tính tổng thời gian xem video (giây)
async function getTotalWatchTime(userId, fromDate, toDate) {
  const sql = `
    SELECT SUM(duration_watched) AS total
    FROM video_statistics vs
    JOIN videos v ON vs.video_id = v.id
    WHERE v.id_nguoidung = $1 AND vs.watched_at BETWEEN $2 AND $3
  `;
  const result = await db.oneOrNone(sql, [userId, fromDate, toDate]);
  return result?.total || 0;
}


// Tính thời lượng xem trung bình mỗi lượt xem (giây)
async function getAvgWatchDuration(userId) {
  const sql = `
    SELECT AVG(duration_watched) AS avg
    FROM video_statistics vs
    JOIN videos v ON vs.video_id = v.id
    WHERE v.id_nguoidung = $1
  `;
  const result = await db.oneOrNone(sql, [userId]);
  return result?.avg || 0;
}

// Tính tỷ lệ người xem hết video (%)
async function getCompletionRate(userId) {
  const sql = `
    SELECT 
      COUNT(*) FILTER (WHERE is_completed) * 100.0 / NULLIF(COUNT(*), 0) AS rate
    FROM video_statistics vs
    JOIN videos v ON vs.video_id = v.id
    WHERE v.id_nguoidung = $1
  `;
  const result = await db.oneOrNone(sql, [userId]);
  return result?.rate || 0;
}

module.exports = { getYoutubeUploadedVideos, getTotalWatchTime, getAvgWatchDuration, getCompletionRate };
