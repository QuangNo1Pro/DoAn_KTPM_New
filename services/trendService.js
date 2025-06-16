const axios = require('axios');
require('dotenv').config();
const googleTrends = require('google-trends-api');

// Lấy xu hướng từ YouTube
exports.getYouTubeTrends = async () => {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,statistics',
        chart: 'mostPopular',
        regionCode: 'VN', 
        maxResults: 10,
        key: process.env.YOUTUBE_API_KEY
      }
    });
    
    return response.data.items.map(item => ({
      title: item.snippet.title,
      description: item.snippet.description,
      viewCount: item.statistics.viewCount,
      thumbnailUrl: item.snippet.thumbnails.high.url,
      source: 'YouTube'
    }));
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu YouTube:', error);
    return [];
  }
};

// Lấy xu hướng từ Wikipedia
exports.getWikipediaTrends = async () => {
  try {
    console.log('Đang gọi Wikimedia REST API để lấy trang xem nhiều nhất...');
    
    // Lấy ngày hôm qua (vì API thường có dữ liệu đến ngày hôm trước)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    
    // Tạo URL API với ngày tháng động
    const apiUrl = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/vi.wikipedia/all-access/${year}/${month}/${day}`;
    
    console.log(`Đang gọi API: ${apiUrl}`);
    
    // Gọi API để lấy trang được xem nhiều nhất
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'DoAn_KTPM_Application/1.0',
        'Accept': 'application/json'
      }
    });
    
    // Kiểm tra dữ liệu hợp lệ
    if (response.data && response.data.items && response.data.items.length > 0 && response.data.items[0].articles) {
      const articles = response.data.items[0].articles
        .filter(article => 
          // Lọc bỏ các trang đặc biệt, trang chính và trang tìm kiếm
          !article.article.startsWith('Đặc_biệt:') && 
          !article.article.includes('Trang_Chính') &&
          !article.article.includes('Tìm_kiếm')
        )
        .slice(0, 10); // Lấy 10 trang hàng đầu sau khi lọc
      
      console.log(`Wikimedia API trả về ${articles.length} xu hướng từ Wikipedia`);
      
      // Chuyển đổi định dạng tên bài viết: Thay "_" bằng khoảng trắng
      return articles.map((item, index) => ({
        title: item.article.replace(/_/g, ' '),
        description: `Trang Wikipedia được xem nhiều #${index + 1} với ${item.views.toLocaleString()} lượt xem`,
        viewCount: item.views,
        thumbnailUrl: '',
        source: 'Wikipedia'
      }));
    } else {
      console.log('Không nhận được dữ liệu hợp lệ từ Wikimedia API');
      
      // Fallback nếu API không trả về dữ liệu đúng định dạng
      return getWikipediaTrendingSample();
    }
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu Wikipedia:', error.message);
    
    // Fallback khi có lỗi
    return getWikipediaTrendingSample();
  }
};

// Hàm trả về dữ liệu mẫu Wikipedia khi API bị lỗi
function getWikipediaTrendingSample() {
  const fallbackWikiTrends = [
    { title: "Việt Nam", description: "Quốc gia Đông Nam Á", viewCount: 850000, source: "Wikipedia" },
    { title: "Hà Nội", description: "Thủ đô của Việt Nam", viewCount: 750000, source: "Wikipedia" },
    { title: "Thành phố Hồ Chí Minh", description: "Thành phố lớn nhất Việt Nam", viewCount: 650000, source: "Wikipedia" },
    { title: "Đội tuyển bóng đá quốc gia Việt Nam", description: "Đội tuyển bóng đá nam quốc gia", viewCount: 550000, source: "Wikipedia" },
    { title: "Trí tuệ nhân tạo", description: "Công nghệ mô phỏng trí thông minh con người", viewCount: 450000, source: "Wikipedia" },
    { title: "Lịch sử Việt Nam", description: "Lịch sử dân tộc Việt Nam", viewCount: 350000, source: "Wikipedia" },
    { title: "Biến đổi khí hậu", description: "Hiện tượng thay đổi khí hậu toàn cầu", viewCount: 250000, source: "Wikipedia" },
    { title: "Thế vận hội", description: "Sự kiện thể thao quốc tế", viewCount: 150000, source: "Wikipedia" },
    { title: "V-League", description: "Giải bóng đá chuyên nghiệp Việt Nam", viewCount: 120000, source: "Wikipedia" },
    { title: "Hệ điều hành", description: "Phần mềm quản lý phần cứng máy tính", viewCount: 100000, source: "Wikipedia" }
  ];
  
  console.log(`Trả về ${fallbackWikiTrends.length} xu hướng mẫu từ Wikipedia`);
  return fallbackWikiTrends;
}

// Lấy xu hướng từ Google Trends
exports.getGoogleTrends = async () => {
  try {
    console.log('Đang gọi Google Trends API...');
    // Lấy xu hướng tìm kiếm hiện tại (realtime) từ Google Trends
    const result = await googleTrends.realTimeTrends({
      geo: 'VN', // Khu vực Việt Nam
      category: 'all', // Tất cả danh mục
      hl: 'vi' // Ngôn ngữ tiếng Việt
    });
    
    console.log('Đã nhận phản hồi từ Google Trends API');
    const trends = JSON.parse(result);
    
    // Chuyển đổi dữ liệu từ Google Trends vào định dạng thống nhất
    let formattedTrends = [];
    
    if (trends && trends.storySummaries && trends.storySummaries.trendingStories) {
      formattedTrends = trends.storySummaries.trendingStories.map((trend, index) => ({
        title: trend.title || trend.entityNames[0] || `Xu hướng #${index + 1}`,
        description: trend.summary || '',
        viewCount: 1000000 - (index * 10000), // Giá trị ước tính (Google không cung cấp số lượt xem)
        thumbnailUrl: trend.image?.imgUrl || '',
        source: 'Google Trends'
      }));
      console.log(`Google Trends API trả về ${formattedTrends.length} xu hướng`);
    } else {
      console.log('Không tìm thấy xu hướng trong phản hồi từ Google Trends API');
    }
    
    return formattedTrends;
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu Google Trends:', error.message);
    
    // Fallback: Lấy top từ khóa tìm kiếm (daily trends)
    try {
      console.log('Đang sử dụng dailyTrends làm fallback...');
      const dailyResult = await googleTrends.dailyTrends({
        geo: 'VN',
        hl: 'vi'
      });
      
      const dailyTrends = JSON.parse(dailyResult);
      let formattedDailyTrends = [];
      
      if (dailyTrends && dailyTrends.default && dailyTrends.default.trendingSearchesDays) {
        const trendingSearches = dailyTrends.default.trendingSearchesDays[0]?.trendingSearches || [];
        
        formattedDailyTrends = trendingSearches.map((trend, index) => ({
          title: trend.title.query || `Xu hướng #${index + 1}`,
          description: trend.articles && trend.articles[0]?.title || '',
          viewCount: parseInt(trend.formattedTraffic.replace('+', '').replace('K', '000')) || (1000000 - (index * 10000)),
          thumbnailUrl: trend.image?.imageUrl || '',
          source: 'Google Trends'
        }));
        console.log(`Google Daily Trends API trả về ${formattedDailyTrends.length} xu hướng`);
      } else {
        console.log('Không tìm thấy xu hướng trong Daily Trends API');
      }
      
      return formattedDailyTrends;
    } catch (fallbackError) {
      console.error('Lỗi khi lấy fallback từ Google Trends:', fallbackError.message);
      
      // Nếu tất cả đều thất bại, tạo một số xu hướng mẫu
      const sampleTrends = [
        { title: "Bóng đá Việt Nam", description: "Thông tin về các trận đấu mới nhất", viewCount: 950000, source: "Google Trends" },
        { title: "Thời tiết hôm nay", description: "Cập nhật thời tiết các tỉnh thành", viewCount: 850000, source: "Google Trends" },
        { title: "Giá vàng", description: "Biến động giá vàng trong ngày", viewCount: 750000, source: "Google Trends" },
        { title: "COVID-19", description: "Tình hình dịch bệnh mới nhất", viewCount: 650000, source: "Google Trends" },
        { title: "Tin tức công nghệ", description: "Các xu hướng công nghệ mới", viewCount: 550000, source: "Google Trends" },
        { title: "Bầu cử tổng thống", description: "Thông tin về các cuộc bầu cử", viewCount: 500000, source: "Google Trends" },
        { title: "Điện thoại thông minh mới", description: "Thông tin về các mẫu điện thoại mới", viewCount: 450000, source: "Google Trends" },
        { title: "Du lịch trong nước", description: "Các điểm đến du lịch nổi tiếng", viewCount: 400000, source: "Google Trends" },
        { title: "Tuyển sinh đại học", description: "Thông tin về kỳ thi tuyển sinh", viewCount: 350000, source: "Google Trends" },
        { title: "Khóa học trực tuyến", description: "Các khóa học online phổ biến", viewCount: 300000, source: "Google Trends" },
      ];
      
      console.log(`Trả về ${sampleTrends.length} xu hướng mẫu từ Google`);
      return sampleTrends;
    }
  }
};

// Hàm gom nhóm lấy xu hướng từ tất cả nguồn
exports.getAllTrends = async (keyword = '') => {
  try {
    // Chạy song song để tối ưu tốc độ
    const [youtubeTrends, wikiTrends, googleTrends] = await Promise.all([
      exports.getYouTubeTrends(),
      exports.getWikipediaTrends(),
      exports.getGoogleTrends()
    ]);
    
    // Gộp và lọc kết quả theo từ khóa nếu có
    let allTrends = [...youtubeTrends, ...wikiTrends, ...googleTrends];
    
    if (keyword && keyword.trim() !== '') {
      const normalizedKeyword = keyword.trim().toLowerCase();
      allTrends = allTrends.filter(trend => 
        trend.title.toLowerCase().includes(normalizedKeyword) || 
        trend.description.toLowerCase().includes(normalizedKeyword)
      );
    }
    
    // Sắp xếp theo lượt xem
    return allTrends.sort((a, b) => b.viewCount - a.viewCount);
  } catch (error) {
    console.error('Lỗi khi lấy tất cả xu hướng:', error);
    return [];
  }
}; 