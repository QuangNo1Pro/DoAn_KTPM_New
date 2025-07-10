const express = require('express');
const router = express.Router();
const { recordWatchCompletion } = require('../../controllers/videoController/statisticsController');

router.post('/complete', recordWatchCompletion);

module.exports = router;
