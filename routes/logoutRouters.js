const express = require('express')
const router = express.Router()
const { logout } = require('../controllers/logoutController')
const isAuthenticated=require('../middleware/authMiddleware')
// Đăng xuất
router.get('/logout', isAuthenticated, logout)

module.exports = router
