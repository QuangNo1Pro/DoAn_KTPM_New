const express = require('express')
const router = express.Router()
const {renderAdvancedVideoPage, renderVideoEditorPage} = require('../../controllers/videoController/videoController')
const advancedVideoRouter = require('./advancedVideoRouter')
const { isAuthenticated } = require('../../middleware/authMiddleware')
// Route trang tạo video nâng cao
router.get('/advanced-video',  renderAdvancedVideoPage)

// Route cho trang chỉnh sửa video
router.get('/video-editor',  renderVideoEditorPage)

// Sử dụng router cho API tạo video nâng cao
router.use('/api/advanced-video',  advancedVideoRouter)

const { recordVideoWatch } = require('../../controllers/videoController/watchVideoController');

router.get('/watch/:id', recordVideoWatch);

const videoStatisticsRouter = require('./video-statisticsRouter');
router.use('/api/video-statistics', videoStatisticsRouter);


module.exports = router
