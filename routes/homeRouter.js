const express = require('express')
const router = express.Router()
const { renderHome, renderDashboard } = require('../controllers/homeController')
const { isAuthenticated } = require('../middleware/authMiddleware')
// Route trang chủ
router.get('/', renderHome)
router.get('/dashboard',isAuthenticated, renderDashboard)
module.exports = router
