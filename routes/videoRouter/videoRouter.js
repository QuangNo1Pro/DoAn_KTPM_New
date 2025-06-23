const express = require('express')
const router = express.Router()
const { generateVideo } = require('../../controllers/videoController/videoController')
const advancedVideoRouter = require('./advancedVideoRouter')

// Route sinh video cơ bản
router.post('/generate', generateVideo)

// Route trang tạo video nâng cao
router.get('/advanced-video', (req, res) => {
  res.render('videoView/advancedVideo', {
    title: 'Tạo Video AI Nâng Cao',
    user: req.session.user
  })
})

// Sử dụng router cho API tạo video nâng cao
router.use('/api/advanced-video', advancedVideoRouter)

module.exports = router
