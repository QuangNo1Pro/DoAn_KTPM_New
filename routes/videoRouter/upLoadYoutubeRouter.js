const express = require('express')
const router = express.Router()
const { uploadYoutube } = require('../../controllers/videoController/upLoadYoutubeController')
const { isAuthenticated } = require('../../middleware/authMiddleware')

router.post('/api/videos/:id/upload-youtube', isAuthenticated, uploadYoutube)

module.exports = router
