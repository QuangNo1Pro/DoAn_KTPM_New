const express = require('express')
const router = express.Router()
const {renderAdvancedVideoPage, renderVideoEditorPage} = require('../../controllers/videoController/videoController')
const advancedVideoRouter = require('./advancedVideoRouter')
const { isAuthenticated } = require('../../middleware/authMiddleware')
// Route trang tạo video nâng cao
router.get('/advanced-video', isAuthenticated, renderAdvancedVideoPage)

// Route cho trang chỉnh sửa video
router.get('/video-editor', isAuthenticated, renderVideoEditorPage)

// Sử dụng router cho API tạo video nâng cao
router.use('/api/advanced-video', isAuthenticated, advancedVideoRouter)

module.exports = router
