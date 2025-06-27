const express = require('express')
const router = express.Router()
const { 
  renderAdvancedVideoPage,
  renderVideoEditorPage
} = require('../../controllers/videoController/videoController')
const advancedVideoRouter = require('./advancedVideoRouter')

// Route trang tạo video nâng cao
router.get('/advanced-video', renderAdvancedVideoPage)

// Route cho trang chỉnh sửa video
router.get('/video-editor', renderVideoEditorPage)

// Sử dụng router cho API tạo video nâng cao
router.use('/api/advanced-video', advancedVideoRouter)

module.exports = router
