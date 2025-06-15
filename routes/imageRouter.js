const express = require('express');
const router = express.Router();
const { generateImage } = require('../controllers/imageController');

// Route để render trang tạo ảnh
router.get('/create-image', (req, res) => {
  res.render('imageView/createImage', {
    title: 'Tạo ảnh bằng AI',
    user: req.session?.user
  });
});

// Route API để tạo ảnh
router.post('/api/generate-image', generateImage);

module.exports = router; 