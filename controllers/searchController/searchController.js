const axios = require('axios');
const { generateTopicByAI } = require('../../services/aiService');

const handleSearch = async (req, res) => {
  const { mode, keyword } = req.body;

  let script = '';

  if (mode === 'user') {
    script = `Chủ đề bạn vừa nhập là: "${keyword}". Hãy phát triển thành video!`;
  } else if (mode === 'web') {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/search`, {
          params: {
            q: keyword || 'trend',
            part: 'snippet',
            maxResults: 1,
            key: process.env.YOUTUBE_API_KEY
          }
        }
      );

      const topResult = response.data.items[0];
      script = `📈 Chủ đề trending từ YouTube: "${topResult.snippet.title}"\nMô tả: ${topResult.snippet.description}`;
    } catch (err) {
      script = 'Không thể lấy chủ đề từ web trend. Kiểm tra API key hoặc mạng.';
    }
  } else if (mode === 'ai') {
    script = await generateTopicByAI(keyword);
  }

  res.render('searchView/search', { script });
};
module.exports={handleSearch}