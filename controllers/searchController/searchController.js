const axios = require('axios');
require('dotenv').config();
const { generateTopicByAI, generateScriptByAI } = require('../../services/aiService');
const { getAllTrends, getYouTubeTrends, getWikipediaTrends, getGoogleTrends } = require('../../services/trendService');

const handleSearch = async (req, res) => {
  const { mode, keyword: rawKeyword, source } = req.body;
  
  // Log chi tiết về dữ liệu đầu vào
  console.log('Request body chi tiết:', {
    mode: mode,
    keyword: rawKeyword,
    source: source,
    keywordType: typeof rawKeyword,
    keywordIsArray: Array.isArray(rawKeyword)
  });
  
  // Xử lý keyword có thể là mảng (từ multiple inputs với cùng name) hoặc string
  const keyword = Array.isArray(rawKeyword) ? rawKeyword[0] : rawKeyword;
  
  let script = '';
  let keywordList = [];
  let trends = [];

  // Log để debug
  console.log('Request body đã xử lý:', { mode, keyword, source });

  try {
    switch (mode) {
      case 'user':
        if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
          script = '❗ Vui lòng nhập từ khóa để tìm kiếm.';
        } else {
          script = `📌 Chủ đề bạn vừa nhập là: "${keyword.trim()}". Hãy phát triển thành video hấp dẫn!`;
        }
        // Đảm bảo không có danh sách trending trong chế độ này
        keywordList = [];
        trends = [];
        break;

      case 'web':
        const query = keyword && typeof keyword === 'string' && keyword.trim() !== '' 
                      ? keyword.trim() : 'hot trend';
        
        // Lấy xu hướng từ nguồn được chọn hoặc tất cả nguồn
        console.log('Đang lấy xu hướng từ nguồn:', source);
        
        if (source === 'youtube') {
          trends = await getYouTubeTrends();
          console.log(`Đã lấy ${trends.length} xu hướng từ YouTube`);
        } else if (source === 'wikipedia') {
          trends = await getWikipediaTrends();
          console.log(`Đã lấy ${trends.length} xu hướng từ Wikipedia`);
        } else if (source === 'google') {
          trends = await getGoogleTrends();
          console.log(`Đã lấy ${trends.length} xu hướng từ Google Trends`);
          
          // Đảm bảo nguồn được gán đúng
          if (trends.length > 0) {
            trends = trends.map(trend => ({
              ...trend,
              source: 'Google Trends' // Đảm bảo nguồn được đặt là Google Trends
            }));
          }
        } else {
          // Mặc định lấy tất cả nguồn
          trends = await getAllTrends(query);
          console.log(`Đã lấy ${trends.length} xu hướng từ tất cả nguồn`);
        }

        if (trends.length > 0) {
          keywordList = trends.map(trend => ({
            title: trend.title,
            source: trend.source,
            views: trend.viewCount
          }));
          script = `🎯 Danh sách chủ đề trending${source !== 'all' ? ` từ ${source === 'google' ? 'Google Trends' : (source === 'wikipedia' ? 'Wikipedia' : 'YouTube')}` : ''}:\n(Hãy nhấn vào 1 chủ đề để tạo kịch bản)`;
          
          // Log để kiểm tra nguồn của mỗi kết quả
          console.log('Danh sách kết quả:', keywordList.map(item => ({ title: item.title, source: item.source })));
        } else {
          // Fallback sử dụng YouTube API trực tiếp như cũ
          try {
            const ytRes = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
              params: {
                q: query,
                part: 'snippet',
                maxResults: 10,
                type: 'video',
                regionCode: 'VN',
                key: process.env.YOUTUBE_API_KEY,
              },
            });

            if (ytRes.data.items.length > 0) {
              keywordList = ytRes.data.items.map(item => ({
                title: item.snippet.title,
                source: 'YouTube'
              }));
              script = `🎯 Danh sách chủ đề trending từ YouTube:\n(Hãy nhấn vào 1 chủ đề để tạo kịch bản)`;
            } else {
              script = '⚠️ Không tìm thấy chủ đề nào từ YouTube.';
            }
          } catch (error) {
            script = '⚠️ Không thể kết nối với API YouTube.';
          }
        }
        break;

      case 'ai':
        if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
          console.log('❌ Từ khóa rỗng trong chế độ AI!');
          script = '❗ Vui lòng nhập từ khóa để AI sinh chủ đề.';
          keywordList = [];
        } else {
          try {
            // Log để debug
            console.log('✅ Đang gọi AI để sinh chủ đề với từ khóa hợp lệ:', keyword);
            
            // Thêm một kiểm tra lần cuối
            if (keyword.trim().length < 2) {
              script = '❌ Từ khóa quá ngắn. Vui lòng nhập ít nhất 2 ký tự.';
              keywordList = [];
              break;
            }
            
            // Lấy mảng chủ đề từ AI thay vì văn bản
            const aiTopics = await generateTopicByAI(keyword);
            
            // Log kết quả từ AI để debug
            console.log('✅ Kết quả từ AI:', JSON.stringify(aiTopics));
            
            // Chuyển đổi thành định dạng giống với web trend
            keywordList = aiTopics.map(topic => ({
              title: topic.title,
              source: 'AI',
              views: null // AI không có lượt xem
            }));
            
            if (keywordList.length > 0) {
              script = `🤖 AI đã sinh ${keywordList.length} ý tưởng chủ đề cho "${keyword}":\n(Hãy nhấn vào 1 chủ đề để tạo kịch bản)`;
            } else {
              script = '❌ AI không thể sinh được chủ đề. Vui lòng thử lại với từ khóa khác.';
            }
          } catch (error) {
            console.error('❌ Lỗi khi sinh chủ đề AI:', error);
            script = `❌ Không thể kết nối với dịch vụ AI. Lỗi: ${error.message}`;
            keywordList = [];
          }
        }
        trends = []; // Không cần trends trong chế độ AI
        break;

      default:
        script = '❌ Phương thức tìm kiếm không hợp lệ.';
        keywordList = [];
        trends = [];
    }
  } catch (error) {
    console.error('Lỗi trong quá trình tìm kiếm:', error);
    script = '🚫 Đã xảy ra lỗi khi xử lý yêu cầu tìm kiếm.';
    keywordList = [];
    trends = [];
  }

  res.render('searchView/search', { script, keywordList, trends, mode, source, keyword });
};

const generateScript = async (req, res) => {
  const { keyword } = req.body;
  
  // Đảm bảo keyword là chuỗi
  const processedKeyword = Array.isArray(keyword) ? keyword[0] : keyword;
  
  try {
    if (!processedKeyword || typeof processedKeyword !== 'string' || processedKeyword.trim() === '') {
      return res.json({ success: false, error: 'Từ khóa không được để trống.' });
    }
    
    const topic = await generateScriptByAI(processedKeyword);
    return res.json({ success: true, script: topic });
  } catch (err) {
    console.error('Lỗi sinh kịch bản:', err);
    return res.json({ success: false, error: 'Lỗi khi sinh kịch bản.' });
  }
};

module.exports = { handleSearch, generateScript };
