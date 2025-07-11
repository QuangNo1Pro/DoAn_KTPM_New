const axios = require('axios');
require('dotenv').config();
const { generateScriptByVertexAI, generateTopicByVertexAI } = require('../../services/vertexService');
const { getAllTrends, getYouTubeTrends, getWikipediaTrends, getGoogleTrends, getDailymotionTrends } = require('../../services/trendService');

const handleSearch = async (req, res) => {
  const { mode, keyword: rawKeyword, source, ai_model } = req.body;
  
  // Log chi tiết về dữ liệu đầu vào kèm theo giá trị
  console.log('Request body chi tiết:', {
    mode: mode,
    keyword: rawKeyword,
    source: source,
    ai_model: ai_model,
    keywordType: typeof rawKeyword,
    keywordIsArray: Array.isArray(rawKeyword)
  });
  
  // Kiểm tra ai_model để chỉ nhận 'pro' hoặc 'flash'
  let actualModel = 'pro'; // Mặc định là pro
  if (['pro', 'flash', 'flash-lite', 'flash-2'].includes(ai_model)) {
    actualModel = ai_model;
  }

  // Xử lý keyword có thể là mảng (từ multiple inputs với cùng name) hoặc string
  const keyword = Array.isArray(rawKeyword) ? rawKeyword[0] : rawKeyword;
  
  let script = '';
  let keywordList = [];
  let trends = [];

  // Log để debug
  console.log('Request body đã xử lý:', { mode, keyword, source, ai_model: actualModel });

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
          console.log(`Đã lấy ${trends.length} xu hướng từ Tuổi Trẻ`);
          
          // Đảm bảo nguồn được gán đúng
          if (trends.length > 0) {
            trends = trends.map(trend => ({
              ...trend,
              source: 'Tuổi Trẻ' // Đảm bảo nguồn được đặt là Tuổi Trẻ
            }));
          }
        } else if (source === 'dailymotion') {
          trends = await getDailymotionTrends();
          console.log(`Đã lấy ${trends.length} xu hướng từ Dailymotion`);
        } else {
          // Mặc định lấy tất cả nguồn nếu source là 'all', hoặc từ nguồn cụ thể
          trends = await getAllTrends(query, source);
          console.log(`Đã lấy ${trends.length} xu hướng từ nguồn: ${source}`);
        }

        if (trends.length > 0) {
          keywordList = trends.map(trend => ({
            title: trend.title,
            source: trend.source,
            views: trend.viewCount
          }));
          // Hiển thị nguồn phù hợp
          const sourceDisplayName = 
            source === 'google' ? 'Tuổi Trẻ' : 
            source === 'wikipedia' ? 'Wikipedia' : 
            source === 'youtube' ? 'YouTube' :
            source === 'dailymotion' ? 'Dailymotion' : 'tất cả nguồn';
          
          script = `🎯 Danh sách chủ đề trending từ ${sourceDisplayName}:\n(Hãy nhấn vào 1 chủ đề để tạo kịch bản)`;
          
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
            
            // Xác định mô hình AI để sử dụng
            const modelType = actualModel; // 'pro' hoặc 'flash'
            console.log(`🤖 Sử dụng Vertex AI model: ${modelType}`);
            
            // Gọi hàm tạo chủ đề với modelType
            let aiTopics = await generateTopicByVertexAI(keyword, modelType);
            console.log(`✅ Đã sử dụng Vertex AI (${modelType}) để sinh chủ đề`);
            
            // Log kết quả từ AI để debug
            console.log('✅ Kết quả từ AI:', JSON.stringify(aiTopics));
            
            // Chuyển đổi thành định dạng giống với web trend
            // Đảm bảo aiTopics là một mảng và các phần tử có dạng chuẩn
            let processedTopics = [];
            if (Array.isArray(aiTopics)) {
              processedTopics = aiTopics;
            } else if (typeof aiTopics === 'string') {
              try {
                // Nếu là chuỗi JSON, parse thành mảng
                processedTopics = JSON.parse(aiTopics);
              } catch(e) {
                // Nếu không phải JSON, tạo một mục đơn lẻ
                processedTopics = [{ title: aiTopics, source: "" }];
              }
            } else if (aiTopics && typeof aiTopics === 'object') {
              // Nếu là object duy nhất, bọc trong mảng
              processedTopics = [aiTopics];
            }
            
            const modelName = getModelDisplayName(modelType);
            
            keywordList = processedTopics.map(topic => {
              // Đảm bảo mỗi topic có dạng chuẩn
              if (typeof topic === 'string') {
                return {
                  title: topic,
                  source: `Vertex AI (${modelName})`,
                  views: null
                };
              } else {
                return {
                  title: topic.title || topic.text || JSON.stringify(topic),
                  source: topic.source || `Vertex AI (${modelName})`,
                  views: null // AI không có lượt xem
                };
              }
            });
            
            if (keywordList.length > 0) {
              script = `🤖 ${modelName} đã sinh ${keywordList.length} ý tưởng chủ đề cho "${keyword}":\n(Hãy nhấn vào 1 chủ đề để tạo kịch bản)`;
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

  res.render('searchView/search', { script, keywordList, trends, mode, source, keyword, ai_model: actualModel });
};

const generateScript = async (req, res) => {
  const { keyword, ai_model, script_style, audience_type } = req.body;
  
  console.log('Generate script request:', { keyword, ai_model, script_style, audience_type });
  
  // Đảm bảo keyword là chuỗi
  const processedKeyword = Array.isArray(keyword) ? keyword[0] : keyword;
  
  // Xác định model type và đảm bảo chỉ nhận giá trị hợp lệ
  let modelType = 'pro'; // Mặc định là pro
  if (['pro', 'flash', 'flash-lite', 'flash-2'].includes(ai_model)) {
    modelType = ai_model;
  }

  // Xác định phong cách kịch bản
  let scriptStyle = 'natural'; // Mặc định là tự nhiên
  if (['natural', 'humor', 'professional', 'educational', 'emotional', 'marketing'].includes(script_style)) {
    scriptStyle = script_style;
  }
  
  // Xác định đối tượng người xem
  let audienceType = 'general'; // Mặc định là phổ thông
  if (['general', 'children', 'teenager', 'adult', 'elder', 'student', 'professional', 'family'].includes(audience_type)) {
    audienceType = audience_type;
  }
  
  console.log(`Đã xử lý request, sẽ dùng model: ${modelType}, phong cách: ${scriptStyle}, đối tượng: ${audienceType}`);
  
  try {
    if (!processedKeyword || typeof processedKeyword !== 'string' || processedKeyword.trim() === '') {
      return res.json({ success: false, error: 'Từ khóa không được để trống.' });
    }
    
    // Sử dụng Vertex AI để sinh kịch bản với model được chọn và phong cách
    let script = '';
    let success = false;
    let errorMessage = '';
    
    try {
      console.log(`🤖 Đang gọi Vertex AI (${modelType}) để tạo kịch bản với phong cách ${scriptStyle} và đối tượng ${audienceType}...`);
      script = await generateScriptByVertexAI(processedKeyword, modelType, scriptStyle, audienceType);
      success = true;
      console.log(`✅ Đã sử dụng Vertex AI (${modelType}) thành công`);
    } catch (vertexError) {
      console.error('❌ Lỗi khi gọi Vertex AI:', vertexError.message);
      errorMessage = 'Vertex AI: ' + vertexError.message;
      
      // Phương pháp cuối cùng: Tạo kịch bản mẫu nếu Vertex AI thất bại
      console.log('⚠️ Vertex AI thất bại, tạo kịch bản mẫu');
      script = `
# Kịch bản video về "${processedKeyword}" (Phong cách: ${scriptStyle}, Đối tượng: ${audienceType})

## Mở đầu (Hook)
"Bạn đã bao giờ tự hỏi về ${processedKeyword}? Hôm nay mình sẽ chia sẻ những điều thú vị nhất về chủ đề này!"

## Nội dung chính
"${processedKeyword} là một chủ đề rất thú vị và đang được nhiều người quan tâm. Có 3 điều bạn nên biết:

1. ${processedKeyword} đang trở thành xu hướng trong năm 2024
2. Những người thành công với ${processedKeyword} thường áp dụng các phương pháp khác biệt
3. Bạn có thể bắt đầu với ${processedKeyword} ngay hôm nay chỉ với 3 bước đơn giản

## Kết thúc (Call to Action)
"Nếu bạn thấy video này hữu ích, hãy like và follow để xem thêm nội dung về ${processedKeyword} nhé! Comment bên dưới nếu bạn có câu hỏi hoặc muốn mình chia sẻ thêm về chủ đề này!"
`;
      success = true;
      console.log('✅ Đã tạo kịch bản mẫu thành công');
    }
    
    if (success) {
      res.json({
        success: true,
        script: script,
        model: modelType,
        style: scriptStyle,
        audience: audienceType
      });
    } else {
      res.json({
        success: false,
        error: errorMessage || 'Không thể tạo kịch bản.'
      });
    }
  } catch (error) {
    console.error('❌ Lỗi trong quá trình tạo kịch bản:', error);
    res.json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi tạo kịch bản.'
    });
  }
};

const getModelDisplayName = (modelType) => {
  switch(modelType) {
    case 'flash':
      return 'Gemini 2.5 Flash';
    case 'flash-lite':
      return 'Gemini 2.0 Flash Lite';
    case 'flash-2':
      return 'Gemini 2.0 Flash';
    default:
      return 'Gemini 2.5 Pro';
  }
};

module.exports = { handleSearch, generateScript };
