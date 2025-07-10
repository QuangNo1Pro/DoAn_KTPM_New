const { db } = require('../../models/connectDb');

async function recordWatchCompletion(req, res) {
  const { videoId, durationWatched, isCompleted } = req.body;
  const userId = req.session.user?.id_nguoidung;

  if (!userId || !videoId) return res.sendStatus(400);

  try {
    await db.none(`
      INSERT INTO video_statistics(video_id, user_id, duration_watched, is_completed)
      VALUES ($1, $2, $3, $4)
    `, [videoId, userId, durationWatched || 0, isCompleted || false]);

    res.sendStatus(200);
  } catch (err) {
    console.error('Lỗi ghi log completed:', err.message);
    res.sendStatus(500);
  }
}

module.exports = { recordWatchCompletion };
