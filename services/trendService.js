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

// Lấy xu hướng từ Dailymotion
exports.getDailymotionTrends = async () => {
  try {
    console.log('Đang lấy xu hướng từ Dailymotion...');
    
    // Gọi API với bộ lọc video Việt Nam
    const response = await axios.get('https://api.dailymotion.com/videos', {
      params: {
        fields: 'id,title,views_total,description,language',
        sort: 'trending',
        limit: 15,
        country: 'vn',    // Lọc theo quốc gia Việt Nam
        languages: 'vi',  // Ưu tiên ngôn ngữ tiếng Việt
        search: 'Việt Nam' // Tìm kiếm video liên quan đến Việt Nam
      }
    });
    
    if (response.data && response.data.list) {
      // Lọc kết quả để ưu tiên video tiếng Việt hoặc có tiêu đề/mô tả liên quan Việt Nam
      const filteredVideos = response.data.list.filter(video => {
        // Ưu tiên video tiếng Việt
        if (video.language === 'vi') return true;
        
        // Hoặc có chứa các từ khóa tiếng Việt phổ biến
        const vietnameseKeywords = ['việt nam', 'việt', 'vietnam', 'saigon', 'hà nội', 'hanoi', 'hcm', 'vn'];
        const title = (video.title || '').toLowerCase();
        const description = (video.description || '').toLowerCase();
        
        return vietnameseKeywords.some(keyword => 
          title.includes(keyword) || description.includes(keyword)
        );
      });
      
      // Lấy 10 video đầu tiên sau khi lọc, hoặc trả về tất cả nếu ít hơn 10
      const result = filteredVideos.slice(0, 10);
      
      return result.map(video => ({
        title: video.title,
        description: `Video trending trên Dailymotion với ${video.views_total.toLocaleString()} lượt xem`,
        viewCount: video.views_total,
        thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${video.id}`,
        source: 'Dailymotion',
        url: `https://www.dailymotion.com/video/${video.id}`
      }));
    } else {
      throw new Error('Không nhận được dữ liệu hợp lệ từ Dailymotion API');
    }
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu từ Dailymotion:', error.message);
    
    // Fallback khi có lỗi: trả về dữ liệu mẫu liên quan đến Việt Nam
    const sampleTrends = [
      { title: "Ẩm thực Việt Nam - Món ngon ba miền", description: "Khám phá ẩm thực đa dạng Việt Nam", viewCount: 980000, source: "Dailymotion" },
      { title: "Du lịch Việt Nam 2023 - Những điểm đến không thể bỏ qua", description: "Tổng hợp điểm du lịch nổi tiếng", viewCount: 920000, source: "Dailymotion" },
      { title: "Nhạc Trẻ Việt Nam Hay Nhất Hiện Nay", description: "Tuyển tập nhạc Việt hot nhất", viewCount: 870000, source: "Dailymotion" },
      { title: "Phim Việt Nam - Tập mới nhất", description: "Phim truyền hình Việt Nam đang hot", viewCount: 810000, source: "Dailymotion" },
      { title: "Văn hóa truyền thống Việt Nam", description: "Giới thiệu văn hóa độc đáo của Việt Nam", viewCount: 750000, source: "Dailymotion" },
      { title: "Bóng đá Việt Nam - Trận đấu mới nhất", description: "Tổng hợp các bàn thắng đẹp", viewCount: 700000, source: "Dailymotion" },
      { title: "Tin tức nóng Việt Nam 24h", description: "Cập nhật tin tức mới nhất", viewCount: 650000, source: "Dailymotion" },
      { title: "Hài Việt Nam mới nhất 2023", description: "Các tiểu phẩm hài hước", viewCount: 600000, source: "Dailymotion" },
      { title: "Khám phá Việt Nam: Từ Bắc vào Nam", description: "Hành trình khám phá đất nước", viewCount: 550000, source: "Dailymotion" },
      { title: "Công nghệ Việt Nam phát triển", description: "Thành tựu công nghệ của người Việt", viewCount: 500000, source: "Dailymotion" }
    ];
    
    console.log(`Trả về ${sampleTrends.length} xu hướng mẫu từ Dailymotion do lỗi: ${error.message}`);
    return sampleTrends;
  }
};

// Lấy xu hướng từ báo Tuổi Trẻ
exports.getGoogleTrends = async () => {
  try {
    console.log('Đang lấy xu hướng từ báo Tuổi Trẻ...');
    
    // Sử dụng báo Tuổi Trẻ thay vì Google Trends
    return await getTuoiTreTrends();
    
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu Tuổi Trẻ:', error.message);
    
    // Fallback khi có lỗi: trả về dữ liệu mẫu
    const sampleTrends = [
      { title: "Bóng đá Việt Nam", description: "Thông tin về các trận đấu mới nhất", viewCount: 950000, source: "Tuổi Trẻ" },
      { title: "Thời tiết hôm nay", description: "Cập nhật thời tiết các tỉnh thành", viewCount: 850000, source: "Tuổi Trẻ" },
      { title: "Giá vàng", description: "Biến động giá vàng trong ngày", viewCount: 750000, source: "Tuổi Trẻ" },
      { title: "COVID-19", description: "Tình hình dịch bệnh mới nhất", viewCount: 650000, source: "Tuổi Trẻ" },
      { title: "Tin tức công nghệ", description: "Các xu hướng công nghệ mới", viewCount: 550000, source: "Tuổi Trẻ" },
      { title: "Bầu cử tổng thống", description: "Thông tin về các cuộc bầu cử", viewCount: 500000, source: "Tuổi Trẻ" },
      { title: "Điện thoại thông minh mới", description: "Thông tin về các mẫu điện thoại mới", viewCount: 450000, source: "Tuổi Trẻ" },
      { title: "Du lịch trong nước", description: "Các điểm đến du lịch nổi tiếng", viewCount: 400000, source: "Tuổi Trẻ" },
      { title: "Tuyển sinh đại học", description: "Thông tin về kỳ thi tuyển sinh", viewCount: 350000, source: "Tuổi Trẻ" },
      { title: "Khóa học trực tuyến", description: "Các khóa học online phổ biến", viewCount: 300000, source: "Tuổi Trẻ" },
    ];
    
    console.log(`Trả về ${sampleTrends.length} xu hướng mẫu từ Tuổi Trẻ do lỗi: ${error.message}`);
    return sampleTrends;
  }
};

// Hàm lấy xu hướng từ báo Tuổi Trẻ qua RSS
async function getTuoiTreTrends() {
  try {
    // Danh sách các RSS feed từ các chuyên mục khác nhau của báo Tuổi Trẻ
    const rssFeedUrls = [
      'https://tuoitre.vn/rss/tin-moi-nhat.rss',
      'https://tuoitre.vn/rss/thoi-su.rss',
      'https://tuoitre.vn/rss/the-gioi.rss',
      'https://tuoitre.vn/rss/phap-luat.rss',
      'https://tuoitre.vn/rss/kinh-doanh.rss',
      'https://tuoitre.vn/rss/cong-nghe.rss'
    ];
    
    // Chọn ngẫu nhiên 2 feed để lấy dữ liệu (để tăng tính đa dạng)
    const selectedFeeds = rssFeedUrls.slice(0, 3);
    
    // Lấy dữ liệu từ các feed đã chọn
    const feedPromises = selectedFeeds.map(url => axios.get(url, {
      headers: {
        'User-Agent': 'DoAn_KTPM_Application/1.0'
      }
    }));
    
    const feedResponses = await Promise.all(feedPromises);
    
    // Mảng chứa tất cả các bài viết
    let allArticles = [];
    
    // Xử lý dữ liệu từ mỗi feed
    for (const response of feedResponses) {
      const xmlData = response.data;
      
      // Trích xuất thông tin từ XML bằng biểu thức chính quy (regex)
      // Lấy tất cả các mục <item> trong XML
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      const items = [...xmlData.matchAll(itemRegex)];
      
      // Xử lý từng mục để lấy tiêu đề, mô tả và link
      for (const item of items) {
        const itemContent = item[1];
        
        // Lấy tiêu đề
        const titleMatch = /<title>(.*?)<\/title>/i.exec(itemContent);
        const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : '';
        
        // Lấy mô tả
        const descMatch = /<description>(.*?)<\/description>/i.exec(itemContent);
        const description = descMatch ? decodeHtmlEntities(descMatch[1]) : '';
        
        // Lấy ngày xuất bản
        const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/i.exec(itemContent);
        const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();
        
        // Lấy link
        const linkMatch = /<link>(.*?)<\/link>/i.exec(itemContent);
        const link = linkMatch ? linkMatch[1] : '';
        
        // Tạo một đối tượng bài viết mới và thêm vào mảng
        if (title && !allArticles.some(article => article.title === title)) {
          allArticles.push({
            title,
            description: cleanDescription(description),
            pubDate,
            link,
          });
        }
      }
    }
    
    // Sắp xếp bài viết theo ngày xuất bản, mới nhất lên đầu
    allArticles.sort((a, b) => b.pubDate - a.pubDate);
    
    // Lấy 10 bài viết mới nhất
    const latestArticles = allArticles.slice(0, 10);
    
    // Định dạng kết quả theo cấu trúc chung của app
    const formattedTrends = latestArticles.map((article, index) => ({
      title: article.title,
      description: article.description || 'Tin tức từ báo Tuổi Trẻ',
      viewCount: 1000000 - (index * 50000), // Giá trị ước tính theo thứ tự
      thumbnailUrl: '', // RSS không cung cấp hình ảnh
      source: 'Tuổi Trẻ',
      url: article.link
    }));
    
    console.log(`Lấy được ${formattedTrends.length} xu hướng từ báo Tuổi Trẻ`);
    return formattedTrends;
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu từ RSS Tuổi Trẻ:', error.message);
    throw error; // Ném lỗi để xử lý ở hàm cha
  }
}

// Hàm giải mã các ký tự HTML entities và thẻ CDATA
function decodeHtmlEntities(text) {
  if (!text) return '';
  
  // Loại bỏ thẻ CDATA
  let cleanText = text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
  
  // Loại bỏ HTML entities
  cleanText = cleanText
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
    
  return cleanText;
}

// Hàm làm sạch mô tả
function cleanDescription(description) {
  if (!description) return '';
  
  // Loại bỏ các thẻ HTML
  let cleanText = description.replace(/<\/?[^>]+(>|$)/g, ' ');
  
  // Loại bỏ khoảng trắng thừa
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  
  // Cắt mô tả nếu quá dài
  return cleanText.length > 200 ? cleanText.substring(0, 197) + '...' : cleanText;
}

// Hàm gom nhóm lấy xu hướng từ tất cả nguồn
exports.getAllTrends = async (keyword = '', source = 'all') => {
  try {
    console.log(`Lấy xu hướng với từ khóa: "${keyword}" và nguồn: ${source}`);
    
    // Chạy song song để tối ưu tốc độ
    const [youtubeTrends, wikiTrends, tuoiTreTrends, dailymotionTrends] = await Promise.all([
      exports.getYouTubeTrends(),
      exports.getWikipediaTrends(),
      exports.getGoogleTrends(), // Giữ tên hàm cũ để tương thích, nhưng thực tế là Tuổi Trẻ
      exports.getDailymotionTrends() // Thêm Dailymotion trends
    ]);
    
    // Gộp dựa trên nguồn đã chọn hoặc tất cả
    let allTrends = [];
    
    if (source === 'youtube') {
      allTrends = youtubeTrends;
    } else if (source === 'wikipedia') {
      allTrends = wikiTrends;
    } else if (source === 'google') {
      allTrends = tuoiTreTrends;
    } else if (source === 'dailymotion') {
      allTrends = dailymotionTrends;
    } else {
      // Mặc định: tất cả nguồn
      allTrends = [...youtubeTrends, ...wikiTrends, ...tuoiTreTrends, ...dailymotionTrends];
    }
    
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