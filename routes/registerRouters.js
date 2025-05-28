const express = require('express')
const router = express.Router()
const { register, check_email } = require('../controllers/registerController')

// Route xử lý đăng ký
router.get('/register', (req, res) => {
  const message = req.query.message
  res.render('register', { message})
})
router.post('/register', register)
router.post('/check-email', check_email)

module.exports = router
