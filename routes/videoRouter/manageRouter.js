// routes/videoRouter/manageRouter.js
const express = require('express');
const router  = express.Router();
const db      = require('../../models/videoModel');

router.get('/videos', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, filename, public_url, size_mb,
              created_at::date AS created
       FROM videos
       ORDER BY created_at DESC`
    );
    res.json({ success: true, items: rows });
  } catch (err) {
    console.error('List videos error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // xoá metadata; *không* xoá file Firebase để an toàn
    await db.query('DELETE FROM videos WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete video error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
