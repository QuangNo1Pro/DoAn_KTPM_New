const axios = require('axios');
require('dotenv').config();
const { generateTopicByAI } = require('../../services/aiService');

const handleSearch = async (req, res) => {
  const { mode, keyword } = req.body;
  let script = '';
  let keywordList = [];

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
          keywordList = ytRes.data.items.map(item => item.snippet.title);
          script = `🎯 Danh sách chủ đề trending:\n(Hãy nhấn vào 1 chủ đề để tạo kịch bản)`;
        } else {
          script = '⚠️ Không tìm thấy chủ đề nào từ YouTube.';
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

  res.render('searchView/search', { script, keywordList });
};

//Generate đoạn script tương ứng
const { generateScriptByAI } = require('../../services/aiService');
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

module.exports = { handleSearch,generateScript };
