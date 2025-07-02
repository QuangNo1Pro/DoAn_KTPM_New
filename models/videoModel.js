// models/videoModel.js
const { db } = require('./connectDb');

/*--------------- INSERT ---------------*/
async function insertVideo({
  filename,
  firebaseKey,
  publicUrl,
  sizeMb,
  title  = null,
  script = null,
  userId = null            // <-- chỉ cần đúng tên này
}) {
  const cols  = [
    'filename', 'firebase_key', 'public_url',
    'size_mb', 'title', 'script', 'id_nguoidung'   // <-- đúng tên cột
  ];
  const binds = cols.map((_, i) => `$${i + 1}`).join(',');
  const vals  = [
    filename, firebaseKey, publicUrl,
    sizeMb, title, script, userId            // <-- giữ đúng thứ tự
  ];

  const row = await db.oneOrNone(
    `INSERT INTO videos (${cols.join(',')})
     VALUES (${binds})
     ON CONFLICT (firebase_key) DO NOTHING
     RETURNING id`,
    vals
  );

  if (row?.id) return row.id;

  const existing = await db.one(
    'SELECT id FROM videos WHERE firebase_key = $1',
    [firebaseKey]
  );
  return existing.id;
}

/*--------------- LIST / COUNT ---------------*/
async function listVideos({ userId = null, limit = 10, offset = 0 } = {}) {
  if (userId) {
    return db.any(
      `SELECT * FROM videos
       WHERE id_nguoidung = $3          -- <-- sửa
       ORDER BY id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, userId]
    );
  }
  return db.any(
    `SELECT * FROM videos
     ORDER BY id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

async function countVideos({ userId = null } = {}) {
  if (userId) {
    const row = await db.one(
      'SELECT COUNT(*) AS total FROM videos WHERE id_nguoidung = $1', // <-- sửa
      [userId]
    );
    return Number(row.total);
  }
  const row = await db.one('SELECT COUNT(*) AS total FROM videos');
  return Number(row.total);
}

module.exports = { insertVideo, listVideos, countVideos, /* … */ };
