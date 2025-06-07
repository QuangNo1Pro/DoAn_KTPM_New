const express = require('express')
const router = express.Router()
const { generateVideo } = require('../../controllers/videoController/videoController')

router.post('/generate', generateVideo)

module.exports = router
