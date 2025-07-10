const { db } = require('../../models/connectDb');

// Ghi log mỗi khi user bắt đầu xem video
async function recordVideoWatch(req, res) {
  try {
    const userId = req.session.user?.id_nguoidung || req.user?.id_nguoidung;
    const videoId = parseInt(req.params.id);

    if (!userId || !videoId) return res.status(400).send('Thiếu user hoặc video');

    // Ghi log ban đầu: chưa biết xem bao lâu, chỉ là bắt đầu xem
    await db.none(`
      INSERT INTO video_statistics(video_id, user_id, duration_watched, is_completed)
      VALUES ($1, $2, 0, false)
    `, [videoId, userId]);

    // Chuyển hướng đến trang xem video (tùy bạn thiết kế giao diện)
    res.render('watchVideo', { videoId });

  } catch (err) {
    console.error('Lỗi ghi log xem video:', err);
    res.status(500).send('Lỗi khi ghi log xem video');
  }
}

module.exports = { recordVideoWatch };
