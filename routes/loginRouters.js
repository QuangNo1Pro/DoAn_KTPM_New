const express = require('express')
const router = express.Router()
const { renderLogin, login, googleAuth, googleCallback } = require('../controllers/loginController')

// Route trang login
router.get('/login', renderLogin); // Hiển thị form login
router.post('/login', login); // Xử lý đăng nhập khi submit form

// Route bắt đầu quá trình đăng nhập bằng Google
router.get('/google', googleAuth)

// Route callback sau khi Google xác thực
router.get('/google/callback', googleCallback)

module.exports = router
