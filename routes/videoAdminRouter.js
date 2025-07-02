// routes/videoAdminRouter.js
const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/videoController/videoAdminController')
const { isAuthenticated } = require('../middleware/authMiddleware')

/* page HTML */
router.get('/my-videos',isAuthenticated, ctrl.renderVideoListPage)

/* REST API  */
router.get('/api/videos',isAuthenticated, ctrl.apiListVideos); // ?page=&limit=
router.delete('/api/videos/:id',isAuthenticated, ctrl.apiDeleteVideo)

module.exports = router
