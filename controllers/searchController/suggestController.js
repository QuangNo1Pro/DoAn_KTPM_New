const { getYouTubeSuggestions, getGoogleSuggestions, getWikipediaSuggestions } = require('../../services/suggestService');
const axios = require('axios');
require('dotenv').config();

// Danh sách từ khóa hot trend cố định để đảm bảo luôn có gợi ý
const HOT_TOPICS = [
  'shorts video ideas',
  'tiktok trends',
  'youtube shorts trend',
  'viral challenges',
  'trending hashtags',
  'dance challenges',
  'prank videos',
  'day in my life',
  'outfit ideas',
  'makeup tutorial',
  'cooking hacks',
  'life hacks',
  'fitness challenge',
  'room tour',
  'what i eat in a day',
  'morning routine',
  'night routine',
  'skincare routine',
  'travel vlog',
  'street food',
  'asmr video'
];

const getSuggestions = async (req, res) => {
  try {
    const { q, source = 'youtube' } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json([]);
    }
    
    let suggestions = [];
    const trimmedQuery = q.trim();
    
    // Nếu query ngắn, ưu tiên gợi ý từ danh sách cố định 
    if (trimmedQuery.length < 4) {
      const localSuggestions = HOT_TOPICS.filter(topic => 
        topic.toLowerCase().includes(trimmedQuery.toLowerCase())
      ).slice(0, 6);
      
      // Luôn trả về gợi ý từ danh sách cố định cho từ khóa ngắn
      if (localSuggestions.length > 0) {
        return res.json(localSuggestions);
      }
      
      // Nếu không có gợi ý từ danh sách cố định, trả về một số gợi ý mặc định cho từ khóa ngắn
      return res.json([
        trimmedQuery + ' ideas',
        trimmedQuery + ' tutorial',
        trimmedQuery + ' trend',
        trimmedQuery + ' mới nhất',
        trimmedQuery + ' là gì'
      ]);
    }
    
    // Phương pháp 1: Sử dụng service
    try {
      if (source === 'wikipedia') {
        // Sử dụng API Wikipedia
        suggestions = await getWikipediaSuggestions(trimmedQuery);
      } else if (source === 'google') {
        // Sử dụng API Google
        suggestions = await getGoogleSuggestions(trimmedQuery);
      } else {
        // Mặc định sử dụng API YouTube
        suggestions = await getYouTubeSuggestions(trimmedQuery);
      }
    } catch (serviceError) {
      console.error('Lỗi từ service gợi ý:', serviceError);
    }
    
    // Nếu không có kết quả từ Wikipedia, thử sử dụng API Google nhưng đổi nguồn thành Wikipedia
    if (suggestions.length === 0 && source === 'wikipedia') {
      try {
        const googleSuggestions = await getGoogleSuggestions(trimmedQuery + ' wikipedia');
        suggestions = googleSuggestions.map(item => ({
          ...item,
          text: item.text.replace(' wikipedia', ''),
          source: 'Wikipedia'
        }));
      } catch (fallbackError) {
        console.error('Lỗi khi lấy gợi ý fallback cho Wikipedia:', fallbackError);
      }
    }
    
    // Nếu không có kết quả, thử phương pháp 2
    if (suggestions.length === 0 && source === 'youtube') {
      try {
        // Phương pháp 2: Sử dụng API tìm kiếm trực tiếp từ YouTube
        const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            maxResults: 10,
            q: trimmedQuery,
            type: 'video',
            key: process.env.YOUTUBE_API_KEY || ''
          }
        });
        
        // Format kết quả thành gợi ý
        if (searchResponse.data && searchResponse.data.items && searchResponse.data.items.length > 0) {
          suggestions = searchResponse.data.items.map(item => ({
            text: item.snippet.title,
            source: 'YouTube',
            id: item.id.videoId
          })).slice(0, 6); // Giới hạn 6 gợi ý
        }
      } catch (searchError) {
        console.error('Lỗi khi tìm kiếm YouTube:', searchError);
      }
    }
    
    // Nếu cả hai phương pháp đều thất bại, sử dụng gợi ý giả lập
    if (suggestions.length === 0) {
      if (source === 'youtube') {
        if (trimmedQuery.toLowerCase().includes('hoạt hình') || trimmedQuery.toLowerCase().includes('anime')) {
          suggestions = [
            { text: trimmedQuery + ' tập mới nhất', source: 'YouTube' },
            { text: trimmedQuery + ' vietsub', source: 'YouTube' },
            { text: trimmedQuery + ' tập 1', source: 'YouTube' },
            { text: trimmedQuery + ' phim full', source: 'YouTube' },
            { text: trimmedQuery + ' movie', source: 'YouTube' }
          ];
        } else {
          suggestions = [
            { text: trimmedQuery, source: 'YouTube' },
            { text: trimmedQuery + ' mới nhất', source: 'YouTube' },
            { text: trimmedQuery + ' trending', source: 'YouTube' },
            { text: trimmedQuery + ' viral', source: 'YouTube' },
            { text: trimmedQuery + ' full hd', source: 'YouTube' }
          ];
        }
      } else if (source === 'wikipedia') {
        suggestions = [
          { text: trimmedQuery, source: 'Wikipedia' },
          { text: trimmedQuery + ' định nghĩa', source: 'Wikipedia' },
          { text: trimmedQuery + ' lịch sử', source: 'Wikipedia' },
          { text: trimmedQuery + ' tiếng Việt', source: 'Wikipedia' },
          { text: trimmedQuery + ' bách khoa toàn thư', source: 'Wikipedia' }
        ];
      } else {
        suggestions = [
          { text: trimmedQuery, source: 'Google' },
          { text: trimmedQuery + ' là gì', source: 'Google' },
          { text: trimmedQuery + ' mới nhất', source: 'Google' },
          { text: trimmedQuery + ' tin tức', source: 'Google' }
        ];
      }
    }
    
    // Loại bỏ các gợi ý trùng lặp
    const uniqueSuggestions = [];
    const seen = new Set();
    
    for (const suggestion of suggestions) {
      const text = suggestion.text.toLowerCase();
      if (!seen.has(text)) {
        seen.add(text);
        uniqueSuggestions.push(suggestion);
      }
    }
    
    return res.json(uniqueSuggestions);
  } catch (error) {
    console.error('Lỗi khi xử lý gợi ý:', error);
    // Luôn trả về một mảng, không để frontend bị lỗi
    return res.status(200).json([
      { 
        text: req.query.q || "Không tìm thấy gợi ý", 
        source: req.query.source === 'wikipedia' ? 'Wikipedia' : (req.query.source === 'google' ? 'Google' : 'YouTube')
      }
    ]);
  }
};

module.exports = { getSuggestions }; 