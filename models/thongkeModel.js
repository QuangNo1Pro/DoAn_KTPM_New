const { db } = require('../models/connectDb');

async function getYoutubeUploadedVideos(userId, filter = {}) {
  // 1. Chuẩn bị truy vấn SQL cơ bản
  let sql = `
    SELECT id, title, updated_at, id_nguoidung, youtube_id
    FROM videos
    WHERE id_nguoidung = $1
  `;
  const params = [userId];

  // 2. Thêm điều kiện lọc thời gian nếu có
  if (filter.fromDate && filter.toDate) {
    sql += ` AND updated_at BETWEEN $2 AND $3`;
    params.push(new Date(filter.fromDate), new Date(filter.toDate));
  }

  sql += ` ORDER BY updated_at DESC`;

  // 3. Thực thi truy vấn
  const allVideos = await db.any(sql, params);

  return allVideos;
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
async function getAvgWatchDuration(userId, fromDate, toDate) {
  let sql = `
    SELECT AVG(duration_watched) AS avg
    FROM video_statistics vs
    JOIN videos v ON vs.video_id = v.id
    WHERE v.id_nguoidung = $1
  `;
  const params = [userId];

  if (fromDate && toDate) {
    sql += ` AND vs.watched_at BETWEEN $2 AND $3`;
    params.push(fromDate, toDate);
  }

  const result = await db.oneOrNone(sql, params);
  return result?.avg || 0;
}

// Tính tỷ lệ người xem hết video (%)
async function getCompletionRate(userId, fromDate, toDate) {
  let sql = `
    SELECT 
      COUNT(*) FILTER (WHERE is_completed) * 100.0 / NULLIF(COUNT(*), 0) AS rate
    FROM video_statistics vs
    JOIN videos v ON vs.video_id = v.id
    WHERE v.id_nguoidung = $1
  `;
  const params = [userId];

  if (fromDate && toDate) {
    sql += ` AND vs.watched_at BETWEEN $2 AND $3`;
    params.push(fromDate, toDate);
  }

  const result = await db.oneOrNone(sql, params);
  return result?.rate || 0;
}

module.exports = { getYoutubeUploadedVideos, getTotalWatchTime, getAvgWatchDuration, getCompletionRate };