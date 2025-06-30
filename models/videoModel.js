// models/videoModel.js
const {db}  = require('./connectDb');

/**
 * Thêm một bản ghi video.
 * @returns {Promise<Number>}  id mới
 * @param {Object} param0
 * @param {Number} param0.userId      ⬅️ id_nguoidung
 */
async function insertVideo({ filename, firebaseKey, publicUrl, sizeMb, title=null, script=null,userId  = null   }) {

  const cols  = ['filename','firebase_key','public_url','size_mb','title','script','id_nguoidung'];
  const binds = cols.map((_,i)=> `$${i+1}`).join(',');
  const vals  = [filename,firebaseKey,publicUrl,sizeMb,title,script,userId];

  /* 1. Thử INSERT – nếu trùng khóa thì DO NOTHING */
  const row = await db.oneOrNone(
    `INSERT INTO videos (${cols.join(',')})
     VALUES (${binds})
     ON CONFLICT (firebase_key) DO NOTHING
     RETURNING id`, vals);

  /* 2. Nếu đã trùng → lấy id sẵn có */
  if (row?.id) return row.id;

  const existing = await db.one(
    'SELECT id FROM videos WHERE firebase_key=$1', [firebaseKey]);
  return existing.id;
}

async function getVideoById(id) {
  return db.oneOrNone('SELECT * FROM videos WHERE id = $1', [id]);
}

async function listVideos({ userId = null, limit = 10, offset = 0 } = {}) {
  if (userId) {
    return db.any(
      `SELECT * FROM videos
       WHERE id_nguoidung = $3
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
async function deleteById(id){
  return db.none('DELETE FROM videos WHERE id=$1',[id]);
}
module.exports = { insertVideo, getVideoById, listVideos, deleteById };


