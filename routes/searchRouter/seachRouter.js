const express = require('express')
const router = express.Router()
const { handleSearch, generateScript } = require('../../controllers/searchController/searchController')

router.get('/search', (req, res) => res.render('searchView/search'))
router.post('/search', handleSearch)
router.post('/generate-script',generateScript)

module.exports = router
