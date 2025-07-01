const { db } = require('../models/connectDb');

async function getYoutubeUploadedVideos(userId, filter = {}) {
  // 1. Lấy tất cả video đã upload lên YouTube của user
  const sql = `
    SELECT title, updated_at,youtube_id
    FROM videos
    ORDER BY updated_at DESC
  `;
  const allVideos = await db.any(sql, [userId]);

  // 2. Nếu không có filter thì trả về toàn bộ
  if (!filter || Object.keys(filter).length === 0) {
    return allVideos;
  }

  // 3. Lọc theo JS
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

    return true; // fallback: không có điều kiện lọc
  });

  return filteredVideos;
}

module.exports = { getYoutubeUploadedVideos };
