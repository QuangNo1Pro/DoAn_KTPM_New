const axios = require('axios');
require('dotenv').config();
const { generateTopicByAI, generateScriptByAI } = require('../../services/aiService');
const { getAllTrends, getYouTubeTrends, getWikipediaTrends, getGoogleTrends } = require('../../services/trendService');

const handleSearch = async (req, res) => {
  const { mode, keyword, source } = req.body;
  let script = '';
  let keywordList = [];
  let trends = [];

  // Log để debug
  console.log('Request body:', { mode, keyword, source });

  try {
    switch (mode) {
      case 'user':
        if (!keyword || keyword.trim() === '') {
          script = '❗ Vui lòng nhập từ khóa để tìm kiếm.';
        } else {
          script = `📌 Chủ đề bạn vừa nhập là: "${keyword.trim()}". Hãy phát triển thành video hấp dẫn!`;
        }
        break;

      case 'web':
        const query = keyword && keyword.trim() !== '' ? keyword.trim() : 'hot trend';
        
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
        const topic = await generateTopicByAI(keyword);
        script = `🤖 AI cho chủ đề:\n"${keyword}"\n\n${topic}`;
        break;

      default:
        script = '❌ Phương thức tìm kiếm không hợp lệ.';
    }
  } catch (error) {
    console.error('Lỗi trong quá trình tìm kiếm:', error);
    script = '🚫 Đã xảy ra lỗi khi xử lý yêu cầu tìm kiếm.';
  }

  res.render('searchView/search', { script, keywordList, trends, mode, source });
};

const generateScript = async (req, res) => {
  const { keyword } = req.body;

  try {
    const topic = await generateScriptByAI(keyword);
    return res.json({ success: true, script: topic });
  } catch (err) {
    console.error('Lỗi AI script:', err);
    return res.json({ success: false, error: 'Lỗi khi sinh kịch bản.' });
  }
};

module.exports = { handleSearch, generateScript };
