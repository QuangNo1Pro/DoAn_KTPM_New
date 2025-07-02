const express = require('express')
const router = express.Router()
const { generateImage } = require('../controllers/imageController')
const { isAuthenticated } = require('../middleware/authMiddleware')

// Route API để tạo ảnh
router.post('/api/image/generate',isAuthenticated, generateImage)

module.exports = router
