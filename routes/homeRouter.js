const express = require('express')
const router = express.Router()
const { renderHome } = require('../controllers/homeController')
//const isAuthenticated = require('../middleware/authMiddleware')
// Route trang chủ
router.get('/', renderHome)
module.exports = router
