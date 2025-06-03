const axios = require('axios');

exports.getYouTubeSuggestions = async (keyword) => {
  try {
    // Sử dụng API chính thức hơn của YouTube (vẫn là Google) nhưng sử dụng tham số phù hợp hơn
    const response = await axios.get('https://suggestqueries.google.com/complete/search', {
      responseType: 'text', // Quan trọng để đọc được response dạng JSONP
      params: {
        client: 'firefox', // Sử dụng client firefox để nhận response JSON thay vì JSONP
        ds: 'yt', // YouTube data source
        hl: 'vi', // Ngôn ngữ Tiếng Việt
        q: keyword
      },
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
        'Origin': 'https://www.youtube.com',
        'Referer': 'https://www.youtube.com/'
      }
    });
    
    // Phân tích dữ liệu trả về
    try {
      // Response có thể là JSON hoặc JSONP, thử phân tích cả hai
      let data;
      const responseText = response.data;
      
      if (typeof responseText === 'string') {
        // Nếu là string, thử xem có phải JSONP không
        if (responseText.startsWith('window.google.ac.h(')) {
          // Đây là JSONP format
          const jsonStr = responseText.replace('window.google.ac.h(', '').replace(')])}', ')]');
          data = JSON.parse(jsonStr);
        } else {
          // Thử parse như JSON thông thường
          data = JSON.parse(responseText);
        }
      } else {
        // Nếu không phải string, có thể đã được axios parse thành JSON
        data = responseText;
      }
      
      // Trích xuất các gợi ý
      if (data && Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
        // Format dữ liệu gợi ý
        return data[1].map(item => {
          // Xử lý nếu item là array hoặc string
          const suggestion = Array.isArray(item) ? item[0] : item;
          return {
            text: suggestion,
            source: 'YouTube'
          };
        });
      }
    } catch (parseError) {
      console.error('Lỗi khi phân tích dữ liệu YouTube:', parseError);
    }
    
    // Nếu không parse được, trả về mảng rỗng
    return [];
    
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu YouTube:', error);
    
    // Fallback với các từ khóa phổ biến
    if (keyword.toLowerCase().includes('game') || keyword.toLowerCase().includes('chơi')) {
      return [
        { text: keyword + ' mobile', source: 'YouTube' },
        { text: keyword + ' pc gameplay', source: 'YouTube' },
        { text: keyword + ' trailer mới nhất', source: 'YouTube' },
        { text: keyword + ' review', source: 'YouTube' },
        { text: keyword + ' gameplay', source: 'YouTube' },
        { text: keyword + ' tập 1', source: 'YouTube' }
      ];
    } else if (keyword.toLowerCase().includes('hoạt hình') || keyword.toLowerCase().includes('anime')) {
      return [
        { text: keyword + ' tập mới nhất', source: 'YouTube' },
        { text: keyword + ' vietsub', source: 'YouTube' },
        { text: keyword + ' tập 1', source: 'YouTube' },
        { text: keyword + ' phim full', source: 'YouTube' },
        { text: keyword + ' movie', source: 'YouTube' },
        { text: keyword + ' season 2', source: 'YouTube' }
      ];
    } else {
      return [
        { text: keyword + ' mới nhất', source: 'YouTube' },
        { text: keyword + ' trending', source: 'YouTube' },
        { text: keyword + ' viral', source: 'YouTube' },
        { text: keyword + ' full hd', source: 'YouTube' },
        { text: keyword + ' official', source: 'YouTube' },
        { text: keyword + ' reaction', source: 'YouTube' }
      ];
    }
  }
};

exports.getGoogleSuggestions = async (keyword) => {
  try {
    // API gợi ý của Google
    const response = await axios.get('https://suggestqueries.google.com/complete/search', {
      params: {
        client: 'firefox', // Sử dụng client firefox để nhận response dạng JSON
        q: keyword,
        hl: 'vi' // Ngôn ngữ Tiếng Việt
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
      }
    });
    
    // Kết quả trả về là một mảng, phần tử thứ hai chứa các gợi ý
    const suggestions = response.data && Array.isArray(response.data) && response.data.length > 1 
      ? response.data[1] 
      : [];
    
    return suggestions.map(text => ({
      text,
      source: 'Google'
    }));
  } catch (error) {
    console.error('Lỗi khi lấy gợi ý từ Google:', error);
    
    // Fallback: Trả về một số gợi ý giả định phù hợp với từ khóa
    if (keyword.toLowerCase().includes('covid') || keyword.toLowerCase().includes('dịch')) {
      return [
        { text: keyword + ' mới nhất', source: 'Google' },
        { text: keyword + ' hôm nay', source: 'Google' },
        { text: keyword + ' vaccine', source: 'Google' },
        { text: keyword + ' ca nhiễm', source: 'Google' },
        { text: keyword + ' triệu chứng', source: 'Google' }
      ];
    } else {
      return [
        { text: keyword + ' là gì', source: 'Google' },
        { text: keyword + ' mới nhất', source: 'Google' },
        { text: keyword + ' tin tức', source: 'Google' },
        { text: keyword + ' wikipedia', source: 'Google' },
        { text: keyword + ' nghĩa là gì', source: 'Google' }
      ];
    }
  }
};

exports.getWikipediaSuggestions = async (keyword) => {
  try {
    // Sử dụng API của Wikipedia để lấy gợi ý tìm kiếm
    const response = await axios.get('https://vi.wikipedia.org/w/api.php', {
      params: {
        action: 'opensearch',
        format: 'json',
        search: keyword,
        limit: 10,
        namespace: 0,
        origin: '*'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
      }
    });
    
    // Định dạng kết quả trả về
    if (response.data && Array.isArray(response.data) && response.data.length > 1) {
      const suggestions = response.data[1] || [];
      const descriptions = response.data[2] || [];
      const urls = response.data[3] || [];
      
      return suggestions.map((text, index) => ({
        text,
        description: descriptions[index] || '',
        url: urls[index] || '',
        source: 'Wikipedia'
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Lỗi khi lấy gợi ý từ Wikipedia:', error);
    
    // Fallback cho từ khóa Wikipedia
    return [
      { text: keyword, source: 'Wikipedia' },
      { text: keyword + ' là gì', source: 'Wikipedia' },
      { text: keyword + ' lịch sử', source: 'Wikipedia' },
      { text: keyword + ' tiếng Việt', source: 'Wikipedia' },
      { text: keyword + ' định nghĩa', source: 'Wikipedia' }
    ];
  }
}; 