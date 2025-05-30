const express = require('express')
const router = express.Router()
const { handleSearch } = require('../../controllers/searchController/searchController')

router.get('/search', (req, res) => res.render('searchView/search'))
router.post('/search', handleSearch)

module.exports = router
