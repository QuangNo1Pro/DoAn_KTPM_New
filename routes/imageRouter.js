const express = require('express');
const router = express.Router();
const { generateImage } = require('../controllers/imageController');

// Route API để tạo ảnh
router.post('/api/image/generate', generateImage);

module.exports = router; 