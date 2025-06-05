const express = require('express');
const router = express.Router();
const { getSuggestions } = require('../../controllers/searchController/suggestController');

router.get('/suggest', getSuggestions);

module.exports = router; 