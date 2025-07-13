const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middleware/authMiddleware');
const { getYoutubeStatsPage } = require('../../controllers/thongkeController/thongkeController');

router.get('/thongke', getYoutubeStatsPage);

module.exports = router;