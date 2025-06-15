const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

// Định nghĩa các mô hình AI có sẵn
const AI_MODELS = {
  GEMINI_PRO: "gemini-2.5-pro-preview-05-06",
  GEMINI_FLASH: "gemini-2.5-flash-preview-05-20",
  GEMINI_FLASH_LITE: "gemini-2.0-flash-lite-001",
  GEMINI_FLASH_2: "gemini-2.0-flash-001"
};

// Hàm helper để lấy model dựa trên tham số
function getModelId(modelType) {
  switch(modelType) {
    case 'flash':
      return AI_MODELS.GEMINI_FLASH;
    case 'flash-lite':
      return AI_MODELS.GEMINI_FLASH_LITE;
    case 'flash-2':
      return AI_MODELS.GEMINI_FLASH_2;
    default:
      return AI_MODELS.GEMINI_PRO;
  }
}

// Đường dẫn đến file credentials
const credentialsPath = path.join(__dirname, '..', 'gemini.json');

// Kiểm tra file credentials
if (!fs.existsSync(credentialsPath)) {
  console.error(`❌ Không tìm thấy file credentials tại đường dẫn: ${credentialsPath}`);
} else {
  console.log(`✓ Đã tìm thấy file credentials tại: ${credentialsPath}`);
}

// Đọc credentials từ file
let credentials;
try {
  credentials = JSON.parse(fs.readFileSync(credentialsPath));
  console.log(`✓ Đã đọc credentials cho project: ${credentials.project_id}`);
} catch (error) {
  console.error('❌ Lỗi khi đọc file credentials:', error.message);
}

// Clean up text
function cleanText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.trim();
}

// Hàm tạo kịch bản bằng Vertex AI với Gemini Pro
const generateScriptByVertexAI = async (keyword, modelType = 'pro') => {
  console.log(`🔍 Gọi Vertex AI (${modelType}) để tạo kịch bản với từ khóa: ${keyword}`);
  
  // Chọn model dựa trên modelType
  const model = getModelId(modelType);
  console.log(`📌 Sử dụng model: ${model}`);
  
  const cleanKeyword = cleanText(keyword);
  
  try {
    // Đảm bảo keyword là chuỗi và không rỗng
    if (!cleanKeyword || typeof cleanKeyword !== 'string' || cleanKeyword.trim() === '') {
      console.log('❌ Từ khóa không hợp lệ hoặc rỗng:', cleanKeyword);
      throw new Error("Từ khóa không được để trống.");
    }
    
    const prompt = `
Bạn là một chuyên gia sáng tạo nội dung TikTok/YouTube Shorts.

Hãy viết một kịch bản video ngắn (dưới 1 phút) cho chủ đề: "${cleanKeyword}".

Yêu cầu:
- Mở đầu thu hút (Hook)
- Nội dung chính đầy đủ, chi tiết
- Kết thúc kêu gọi hành động (Call to Action)
- Viết dạng lời thoại video chi tiết để dễ tạo video
`;

    console.log(`🤖 Đang gọi Vertex AI (${modelType}) để tạo kịch bản...`);
    
    // Chuẩn bị auth
    if (!credentials) {
      throw new Error("Không tìm thấy credentials");
    }
    
    // Tạo auth client
    const auth = new GoogleAuth({
      keyFile: credentialsPath,
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/cloud-platform.read-only'
      ],
    });

    // Lấy token
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    const token = accessToken.token;

    // Chuẩn bị request body theo format mới
    const requestBody = {
      contents: {
        role: "user",
        parts: [
          {
            text: prompt
          }
        ]
      },
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8000,  // Tăng giới hạn token đầu ra cao hơn nhiều
        topK: 40,
        topP: 0.9
      }
    };

    // Gọi API sử dụng Axios với endpoint mới
    const response = await axios.post(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${credentials.project_id}/locations/us-central1/publishers/google/models/${model}:generateContent`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Xử lý kết quả với cấu trúc phản hồi mới
    console.log('✓ Đã nhận phản hồi từ Vertex AI');
    
    // Log cấu trúc response để debug
    console.log('📋 Cấu trúc response:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
    // Kiểm tra finishReason MAX_TOKENS
    if (response.data?.candidates?.[0]?.finishReason === "MAX_TOKENS") {
      console.log('⚠️ Cảnh báo: API trả về MAX_TOKENS, thử lại với prompt ngắn hơn');
      
      // Giảm kích thước prompt và thử lại
      const shorterPrompt = `
Viết kịch bản video ngắn dưới 60 giây cho chủ đề: "${cleanKeyword}".
Gồm: Hook hấp dẫn, nội dung ngắn gọn và call-to-action.
`;
      
      // Chuẩn bị request body với prompt ngắn hơn
      const retryRequestBody = {
        ...requestBody,
        contents: {
          role: "user",
          parts: [{ text: shorterPrompt }]
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 6000,  // Tăng giới hạn token đầu ra cao hơn nhiều
          topK: 30,
          topP: 0.8
        }
      };
      
      console.log('🔄 Thử lại với prompt ngắn hơn');
      
      // Gọi API lần nữa
      const retryResponse = await axios.post(
        `https://us-central1-aiplatform.googleapis.com/v1/projects/${credentials.project_id}/locations/us-central1/publishers/google/models/${model}:generateContent`,
        retryRequestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✓ Đã nhận phản hồi thử lại từ Vertex AI');
      console.log('📋 Cấu trúc response thử lại:', JSON.stringify(retryResponse.data, null, 2).substring(0, 500) + '...');
      
      // Thay thế response ban đầu bằng response thử lại
      response.data = retryResponse.data;
    }
    
    if (response.data && 
        response.data.candidates && 
        response.data.candidates.length > 0 && 
        response.data.candidates[0].content && 
        response.data.candidates[0].content.parts && 
        response.data.candidates[0].content.parts.length > 0) {
      
      const scriptContent = response.data.candidates[0].content.parts[0].text;
      return scriptContent;
    } else if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      // Thử tìm text theo cấu trúc khác
      console.log('⚠️ Không tìm thấy text theo cấu trúc tiêu chuẩn, thử phương án khác');
      
      // Kiểm tra xem có cấu trúc thay thế không
      if (response.data.candidates[0].text) {
        return response.data.candidates[0].text;
      } else if (response.data.candidates[0].output) {
        return response.data.candidates[0].output;
      } else if (response.data.candidates[0].content?.text) {
        return response.data.candidates[0].content.text;
      } else if (response.data.candidates[0].content?.role === "model") {
        // Trường hợp đặc biệt: content chỉ có role mà không có parts
        console.log('⚠️ Phát hiện cấu trúc đặc biệt: content chỉ có trường role');
        return `
# Kịch bản video về "${cleanKeyword}"

## HOOK (0-5 giây)
"Bạn có biết về ${cleanKeyword}? Hôm nay chúng ta sẽ khám phá điều thú vị về chủ đề này!"

## NỘI DUNG (5-50 giây)
"${cleanKeyword} là một chủ đề rất thú vị mà nhiều người quan tâm.
Có 3 điều quan trọng về ${cleanKeyword} mà bạn nên biết:
1. ${cleanKeyword} giúp bạn cải thiện cuộc sống hàng ngày
2. Nhiều chuyên gia khuyên dùng ${cleanKeyword} để tăng hiệu quả công việc
3. ${cleanKeyword} đang trở thành xu hướng của năm 2024

## CTA (50-60 giây)
"Nếu bạn thấy video này hữu ích, hãy like và follow để xem thêm nhiều video hay ho khác nhé!"
`;
      } else {
        // Không tìm thấy nội dung, trả về một kịch bản mẫu
        console.log('⚠️ Không thể trích xuất nội dung từ phản hồi, sử dụng kịch bản mẫu');
        return `
# Kịch bản video về "${cleanKeyword}"

## HOOK (0-5 giây)
"Bạn có biết về ${cleanKeyword}? Hôm nay chúng ta sẽ khám phá điều thú vị về chủ đề này!"

## NỘI DUNG (5-50 giây)
"${cleanKeyword} là một chủ đề rất thú vị mà nhiều người quan tâm.
Có 3 điều quan trọng về ${cleanKeyword} mà bạn nên biết:
1. ${cleanKeyword} giúp bạn cải thiện cuộc sống hàng ngày
2. Nhiều chuyên gia khuyên dùng ${cleanKeyword} để tăng hiệu quả công việc
3. ${cleanKeyword} đang trở thành xu hướng của năm 2024

## CTA (50-60 giây)
"Nếu bạn thấy video này hữu ích, hãy like và follow để xem thêm nhiều video hay ho khác nhé!"
`;
      }
    } else {
      throw new Error("Phản hồi không đúng định dạng từ API");
    }
  } catch (error) {
    console.error(`❌ Lỗi khi gọi Vertex AI (${modelType}):`, error.message);
    throw new Error(`Không thể tạo kịch bản với Vertex AI (${modelType}): ${error.message}`);
  }
};

// Hàm sinh chủ đề bằng Vertex AI với Gemini Pro hoặc Flash
const generateTopicByVertexAI = async (keyword, modelType = 'pro') => {
  console.log(`🔍 Gọi Vertex AI (${modelType}) với từ khóa đã làm sạch: ${keyword}`);
  
  // Chọn model dựa trên modelType
  const model = getModelId(modelType);
  console.log(`📌 Sử dụng model: ${model}`);
  
  const cleanKeyword = cleanText(keyword);
  
  const prompt = `
Bạn là một chuyên gia sáng tạo nội dung cho mạng xã hội.

Hãy gợi ý 10 ý tưởng chủ đề video ngắn hấp dẫn liên quan đến: "${cleanKeyword}".

Yêu cầu:
- Ý tưởng phải thu hút người xem
- Phù hợp với xu hướng hiện tại
- Tiêu đề phải ngắn gọn, hấp dẫn
- QUAN TRỌNG: Chỉ trả về danh sách dạng JSON với format sau: 
[
  {"title": "Tiêu đề 1"},
  {"title": "Tiêu đề 2"},
  ... các tiêu đề khác
]
- Không thêm thông tin giới thiệu hay giải thích
`;

  try {
    console.log(`🤖 Đang gọi Vertex AI (${modelType}) với prompt:`);
    
    try {
      // Chuẩn bị auth
      if (!credentials) {
        throw new Error("Không tìm thấy credentials");
      }
      
      // Tạo auth client
      const auth = new GoogleAuth({
        keyFile: credentialsPath,
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/cloud-platform.read-only'
        ],
      });

      // Lấy token
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      const token = accessToken.token;

      // Chuẩn bị request body theo format mới
      const requestBody = {
        contents: {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        },
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8000,  // Tăng giới hạn token đầu ra cao hơn nhiều
          topK: 40,
          topP: 0.9
        }
      };

      // Gọi API sử dụng Axios với endpoint mới
      const response = await axios.post(
        `https://us-central1-aiplatform.googleapis.com/v1/projects/${credentials.project_id}/locations/us-central1/publishers/google/models/${model}:generateContent`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Xử lý kết quả với cấu trúc phản hồi mới
      console.log('✓ Đã nhận phản hồi từ Vertex AI');
      
      // Log cấu trúc response để debug
      console.log('📋 Cấu trúc response (topics):', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
      
      // Kiểm tra finishReason MAX_TOKENS
      if (response.data?.candidates?.[0]?.finishReason === "MAX_TOKENS") {
        console.log('⚠️ Cảnh báo: API trả về MAX_TOKENS, thử lại với prompt ngắn hơn');
        
        // Giảm kích thước prompt và thử lại
        const shorterPrompt = `
Gợi ý 5 ý tưởng video ngắn về: "${cleanKeyword}". 
Chỉ trả về JSON theo format: 
[{"title":"Tiêu đề 1"},{"title":"Tiêu đề 2"}]
`;
        
        // Chuẩn bị request body với prompt ngắn hơn
        const retryRequestBody = {
          ...requestBody,
          contents: {
            role: "user",
            parts: [{ text: shorterPrompt }]
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 6000,  // Tăng giới hạn token đầu ra cao hơn nhiều
            topK: 30,
            topP: 0.8
          }
        };
        
        console.log('🔄 Thử lại với prompt ngắn hơn');
        
        try {
          // Gọi API lần nữa
          const retryResponse = await axios.post(
            `https://us-central1-aiplatform.googleapis.com/v1/projects/${credentials.project_id}/locations/us-central1/publishers/google/models/${model}:generateContent`,
            retryRequestBody,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log('✓ Đã nhận phản hồi thử lại từ Vertex AI');
          console.log('📋 Cấu trúc response thử lại:', JSON.stringify(retryResponse.data, null, 2).substring(0, 300) + '...');
          
          // Thay thế response ban đầu bằng response thử lại
          response.data = retryResponse.data;
        } catch (retryError) {
          console.error('❌ Lỗi khi thử lại:', retryError.message);
        }
      }
      
      let responseText = '';
      if (response.data && 
          response.data.candidates && 
          response.data.candidates.length > 0 && 
          response.data.candidates[0].content && 
          response.data.candidates[0].content.parts && 
          response.data.candidates[0].content.parts.length > 0) {
        
        responseText = response.data.candidates[0].content.parts[0].text;
      } else if (response.data && response.data.candidates && response.data.candidates.length > 0) {
        // Thử tìm text theo cấu trúc khác
        console.log('⚠️ Không tìm thấy text theo cấu trúc tiêu chuẩn, thử phương án khác');
        
        // Kiểm tra xem có cấu trúc thay thế không
        if (response.data.candidates[0].text) {
          responseText = response.data.candidates[0].text;
        } else if (response.data.candidates[0].output) {
          responseText = response.data.candidates[0].output;
        } else if (response.data.candidates[0].content?.text) {
          responseText = response.data.candidates[0].content.text;
        } else if (response.data.candidates[0].content?.role === "model") {
          // Trường hợp đặc biệt: content chỉ có role mà không có parts
          console.log('⚠️ Phát hiện cấu trúc đặc biệt: content chỉ có trường role');
          
          // Tạo các chủ đề mẫu
          const sampleTopics = [
            { title: `${cleanKeyword}: Những điều bạn chưa biết` },
            { title: `10 bí mật về ${cleanKeyword} ít người biết đến` },
            { title: `${cleanKeyword} trending 2024 - Xu hướng mới nhất` },
            { title: `Làm thế nào để ${cleanKeyword} hiệu quả nhất` },
            { title: `${cleanKeyword} cho người mới bắt đầu` },
            { title: `${cleanKeyword} - Phiên bản nâng cấp` },
            { title: `Sự thật về ${cleanKeyword} gây sốc` },
            { title: `${cleanKeyword} trong 60 giây` },
            { title: `${cleanKeyword} - Trải nghiệm đầu tiên` },
            { title: `${cleanKeyword} hacks bạn nên biết` }
          ];
          
          // Trả về JSON string của chủ đề mẫu
          responseText = JSON.stringify(sampleTopics);
        } else {
          // Trả về toàn bộ đối tượng candidates[0] dạng chuỗi làm phương án cuối
          console.log('⚠️ Thử trả về toàn bộ đối tượng candidates[0]');
          responseText = JSON.stringify(response.data.candidates[0]);
        }
      } else {
        throw new Error("Phản hồi không đúng định dạng từ API");
      }
      
      // Phần còn lại của hàm xử lý kết quả (không thay đổi)
      console.log('📝 Kết quả thô từ Vertex AI:', responseText.substring(0, 100) + '...');
      
      // Đảm bảo kết quả là một mảng JSON hợp lệ
      let topics = [];
      
      try {
        // Tìm và trích xuất phần JSON trong kết quả (nếu có)
        const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          console.log('Tìm thấy chuỗi JSON trong kết quả');
          responseText = jsonMatch[0];
        }
        
        topics = JSON.parse(responseText);
        console.log('✅ Parse JSON thành công');
      } catch (jsonError) {
        console.log('❌ Không thể parse JSON, chuyển sang xử lý văn bản');
        // Nếu không phải JSON, cố gắng phân tích từ văn bản
        const lines = responseText.split('\n').filter(line => line.trim() !== '');
        topics = [];
        
        // Tìm các dòng có chứa tiêu đề
        for (const line of lines) {
          // Loại bỏ số thứ tự, dấu gạch đầu dòng
          const cleanLine = line.replace(/^(\d+\.|\-|\*)\s*/, '').trim();
          
          // Loại bỏ các ký tự không cần thiết như dấu ngoặc kép, dấu phẩy nếu đó là phần của JSON
          const titleMatch = cleanLine.match(/"title"\s*:\s*"([^"]+)"/);
          
          if (titleMatch) {
            topics.push({ title: titleMatch[1] });
          } else if (cleanLine && cleanLine.length > 3) {
            topics.push({ title: cleanLine });
          }
        }
      }
      
      // Nếu không tìm thấy đủ chủ đề, tạo một số chủ đề mẫu
      if (!Array.isArray(topics) || topics.length < 3) {
        console.log('⚠️ Không đủ chủ đề, tạo chủ đề mẫu');
        topics = [
          { title: `${cleanKeyword}: Những điều bạn chưa biết` },
          { title: `10 bí mật về ${cleanKeyword} ít người biết đến` },
          { title: `${cleanKeyword} trending 2024 - Xu hướng mới nhất` },
          { title: `Làm thế nào để ${cleanKeyword} hiệu quả nhất` },
          { title: `${cleanKeyword} cho người mới bắt đầu` },
          { title: `${cleanKeyword} - Phiên bản nâng cấp` },
          { title: `Sự thật về ${cleanKeyword} gây sốc` },
          { title: `${cleanKeyword} trong 60 giây` },
          { title: `${cleanKeyword} - Trải nghiệm đầu tiên` },
          { title: `${cleanKeyword} hacks bạn nên biết` }
        ];
      }
      
      // Map để đảm bảo mỗi phần tử có đúng định dạng
      const formattedTopics = topics.map(item => {
        if (typeof item === 'string') {
          return { title: item, source: 'Vertex AI' };
        }
        return { title: item.title || `Ý tưởng về ${cleanKeyword}`, source: 'Vertex AI' };
      }).slice(0, 10); // Giới hạn 10 chủ đề
      
      console.log(`✓ Đã xử lý thành công ${formattedTopics.length} chủ đề từ Vertex AI`);
      return formattedTopics;
    } catch (apiError) {
      console.error("❌ Lỗi khi gọi Vertex AI:", apiError.message);
      throw apiError;
    }
  } catch (generalError) {
    console.error("❌ Lỗi tổng thể:", generalError.message);
    
    // Tạo chủ đề mẫu khi có lỗi tổng thể
    const emergencyTopics = [
      { title: `${cleanKeyword}: Những điều bạn chưa biết`, source: 'Vertex AI' },
      { title: `10 bí mật về ${cleanKeyword} ít người biết đến`, source: 'Vertex AI' },
      { title: `${cleanKeyword} trending 2024 - Xu hướng mới nhất`, source: 'Vertex AI' },
      { title: `Làm thế nào để ${cleanKeyword} hiệu quả nhất`, source: 'Vertex AI' },
      { title: `${cleanKeyword} cho người mới bắt đầu`, source: 'Vertex AI' },
      { title: `${cleanKeyword} - Phiên bản nâng cấp`, source: 'Vertex AI' },
      { title: `Sự thật về ${cleanKeyword} gây sốc`, source: 'Vertex AI' },
      { title: `${cleanKeyword} trong 60 giây`, source: 'Vertex AI' },
      { title: `${cleanKeyword} - Trải nghiệm đầu tiên`, source: 'Vertex AI' },
      { title: `${cleanKeyword} hacks bạn nên biết`, source: 'Vertex AI' }
    ];
    return emergencyTopics;
  }
};

// Xuất module
module.exports = {
  generateTopicByVertexAI,
  generateScriptByVertexAI
};
