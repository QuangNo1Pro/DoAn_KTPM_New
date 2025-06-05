const express = require('express')
const router = express.Router()
const { handleSearch, generateScript } = require('../../controllers/searchController/searchController')
const { getAllTrends } = require('../../services/trendService')

// Sửa route để tự động tải trends khi vào trang
router.get('/search', async (req, res) => {
  try {
    // Khi vào trang tìm kiếm, mặc định tải xu hướng từ tất cả nguồn
    const trends = await getAllTrends();
    const keywordList = trends.map(trend => ({
      title: trend.title,
      source: trend.source,
      views: trend.viewCount
    }));
    
    res.render('searchView/search', { 
      mode: 'web', 
      source: 'all',
      keywordList,
      trends
    });
  } catch (error) {
    console.error('Lỗi khi tải xu hướng:', error);
    res.render('searchView/search', { mode: 'web' });
  }
})

router.post('/search', handleSearch)
router.post('/generate-script',generateScript)

module.exports = router