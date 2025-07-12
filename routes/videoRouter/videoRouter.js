const express = require('express');
const router = express.Router();
const { renderAdvancedVideoPage, renderVideoEditorPage } = require('../../controllers/videoController/videoController');
const advancedVideoRouter = require('./advancedVideoRouter');
const { requireAuth } = require('../../middleware/auth');
const { recordVideoWatch } = require('../../controllers/videoController/watchVideoController');
const videoStatisticsRouter = require('./video-statisticsRouter');

// Route trang tạo video nâng cao
router.get('/advanced-video', requireAuth, renderAdvancedVideoPage);

// Route cho trang chỉnh sửa video
router.get('/video-editor', requireAuth, renderVideoEditorPage);

// Route xem video và ghi lại lượt xem
router.get('/watch/:id', recordVideoWatch); // Giữ công khai hoặc thêm requireAuth nếu cần

// Sử dụng router cho API tạo video nâng cao
router.use('/api/advanced-video', advancedVideoRouter); // Xóa requireAuth

// Sử dụng router cho API thống kê video
router.use('/api/video-statistics', requireAuth, videoStatisticsRouter);

module.exports = router;