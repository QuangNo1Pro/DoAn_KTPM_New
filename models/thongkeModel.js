const { db } = require('../models/connectDb');

async function getYoutubeUploadedVideos(userId, filter = {}) {
  // 1. Lấy video theo id_nguoidung
  const sql = `
    SELECT title, updated_at, id, id_nguoidung
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

module.exports = { getYoutubeUploadedVideos };
